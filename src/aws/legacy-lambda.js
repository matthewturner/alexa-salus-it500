const alexa = require('alexa-app');
const DynamodbThermostatRepository = require('./ThermostatRepository');
const DefaultThermostatRepository = require('../core/ThermostatRepository');
const AwsHoldStrategy = require('./HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const SetTemperatureStrategy = require('../core/SetTemperatureStrategy');
const ThermostatService = require('../core/ThermostatService');
const WaterService = require('../core/WaterService');
const DefaultsService = require('../core/DefaultsService');
const Logger = require('../core/Logger');
const helpers = require('./helpers');
const Factory = require('../thermostats/Factory');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 0;

let app = new alexa.app('boiler');

const controlService = (request, serviceType = ThermostatService, logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG)) => {
    const userId = request.userId || request.data.session.user.userId;
    const shortUserId = helpers.truncateUserId(userId);
    logger.prefix = shortUserId;
    let source = 'user';
    if (!request.data.context) {
        source = 'callback';
    }
    const context = {
        userId: userId,
        shortUserId: shortUserId,
        source: source
    };
    logger.debug(`Creating context for source: ${context.source}...`);
    const repository = createRepository(logger);
    const holdStrategy = createHoldStrategy(logger, context);
    const setTemperatureStrategy = new SetTemperatureStrategy(logger);
    const factory = new Factory(logger);
    const service = new serviceType(logger, context, factory, repository,
        holdStrategy, setTemperatureStrategy);
    return {
        logger,
        service
    };
};

const createHoldStrategy = (logger, context) => {
    if (process.env.HOLD_STRATEGY === 'aws') {
        return new AwsHoldStrategy(logger, context);
    }
    return new DefaultHoldStrategy(logger, context);
};

const createRepository = (logger) => {
    if (process.env.THERMOSTAT_REPOSITORY === 'dynamodb') {
        return new DynamodbThermostatRepository(logger);
    }
    return new DefaultThermostatRepository(logger);
};

const say = (response, output, logger) => {
    const {
        messages,
        card
    } = output;
    let text = '';
    if (messages instanceof Array) {
        for (const message of messages) {
            response.say(message);
            logger.debug(message);
        }
        text = messages.join('\n');
    } else {
        response.say(messages);
        text += messages;
        logger.debug(messages);
    }
    card.type = 'Standard';
    card.text = text;
    response.card(card);
    response.send();
};

const report = (response, message, logger) => {
    response.say(message);
    logger.error(message);
    response.send();
};

const reportOn = async (request, response, serviceType, action) => {
    const {
        logger,
        service
    } = controlService(request, serviceType);
    try {
        const output = await action(service);
        say(response, output, logger);
    } catch (e) {
        report(response, e, logger);
    }
    return false;
};

app.launch(async (request, response) => {
    return await reportOn(request, response, ThermostatService,
        service => service.launch());
});

app.intent('TempIntent', {
    'utterances': ['what the temperature is', 'the temperature', 'how hot it is']
}, async (request, response) => {
    return await reportOn(request, response, ThermostatService,
        service => service.status());
});

app.intent('TurnUpIntent', {
    'utterances': ['to increase', 'to turn up', 'set warmer', 'set higher']
}, async (request, response) => {
    return await reportOn(request, response, ThermostatService,
        service => service.turnUp());
});

app.intent('TurnDownIntent', {
    'utterances': ['to decrease', 'to turn down', 'set cooler', 'set lower']
}, async (request, response) => {
    return await reportOn(request, response, ThermostatService,
        service => service.turnDown());
});

app.intent('SetTempIntent', {
    'slots': {
        'temp': 'AMAZON.NUMBER'
    },
    'utterances': ['to set to {temp} degrees', 'to set the temperature to {temp} degrees', 'to set the temp to {temp} degrees']
}, async (request, response) => {
    const targetTemp = parseFloat(request.slot('temp'));
    const optionalDuration = request.slot('duration', null);
    
    return await reportOn(request, response, ThermostatService,
        service => service.setTemperature(targetTemp, optionalDuration));
});

app.intent('TurnIntent', {
    'slots': {
        'onoff': 'ONOFF',
        'duration': 'AMAZON.DURATION'
    },
    'utterances': ['to turn {onoff}', 'to turn heating {onoff}', 'to turn the heating {onoff}']
}, async (request, response) => {
    let onOff = request.slot('onoff');
    let duration = request.slot('duration');
    
    // this could be a callback from a step function
    const {
        logger,
        service
    } = controlService(request);
    try {
        if (onOff === 'on') {
            const output = await service.turnOn(duration);
            say(response, output, logger);
        } else {
            const output = await service.turnOff();
            say(response, output, logger);
        }
    } catch (e) {
        report(response, e, logger);
    }
    return false;
});

app.intent('TurnWaterIntent', {
    'slots': {
        'onoff': 'ONOFF',
        'duration': 'AMAZON.DURATION'
    },
    'utterances': ['to boost the water', 'to boost the water for {duration}',
        'to turn water {onoff}', 'to turn the water {onoff}',
        'to turn the water on for {duration}'
    ]
}, async (request, response) => {
    const onOff = request.slot('onoff') || 'on';
    const duration = request.slot('duration');

    const {
        logger,
        service
    } = controlService(request, WaterService);
    try {
        if (onOff === 'on') {
            const output = await service.turnOn(duration);
            say(response, output, logger);
        } else {
            const output = await service.turnOff();
            say(response, output, logger);
        }
    } catch (e) {
        report(response, e, logger);
    }
    return false;
});

app.intent('SetDefaultTempIntent', {
    'slots': {
        'onoff': 'ONOFF',
        'temp': 'AMAZON.NUMBER'
    },
    'utterances': ['to set the default {onoff} temperature to {temp} degrees']
}, async (request, response) => {
    const onOff = request.slot('onoff');
    const temp = parseFloat(request.slot('temp'));
    
    return await reportOn(request, response, DefaultsService,
        service => service.setDefault(onOff, temp));
});

app.intent('SetDefaultDurationIntent', {
    'slots': {
        'duration': 'AMAZON.DURATION'
    },
    'utterances': ['to set the default duration to {duration}']
}, async (request, response) => {
    const duration = request.slot('duration');

    return await reportOn(request, response, DefaultsService,
        service => service.setDefault('duration', duration));
});

app.intent('DefaultsIntent', {
    'slots': {},
    'utterances': ['the current default values', 'the default values', 'the current defaults', 'the defaults']
}, async (request, response) => {
    return await reportOn(request, response, DefaultsService,
        service => service.defaults());
});

app.intent('AMAZON.HelpIntent', {
    'slots': {},
    'utterances': []
}, (request, response) => {
    let helpOutput = 'You can say \'set the temperature to 18 degrees\' or ask \'the temperature\'. You can also say stop or exit to quit.';
    let reprompt = 'What would you like to do?';
    // AMAZON.HelpIntent must leave session open -> .shouldEndSession(false)
    response.say(helpOutput).reprompt(reprompt).shouldEndSession(false);
});

app.intent('AMAZON.StopIntent', {
    'slots': {},
    'utterances': []
}, async (request, response) => {
    return await reportOn(request, response, ThermostatService,
        service => service.turnOff());
});

module.exports = app;

exports.handler = app.lambda();