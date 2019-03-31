const alexa = require('alexa-app');
const DynamodbThermostatRepository = require('./ThermostatRepository');
const DefaultThermostatRepository = require('../core/ThermostatRepository');
const AwsHoldStrategy = require('./HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const ControlService = require('../core/ControlService');
const Factory = require('../thermostats/Factory');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 0;

let app = new alexa.app('boiler');

const controlService = (request) => {
    let userId = request.userId || request.data.session.user.userId;
    let source = 'user';
    if (!request.data.context) {
        source = 'callback';
    }
    let context = { userId: userId, source: source };
    console.log(`Creating context for source: ${context.source}, user: ${context.userId}...`);
    let repository;
    if (process.env.THERMOSTAT_REPOSITORY === 'dynamodb') {
        repository = new DynamodbThermostatRepository();
    } else {
        repository = new DefaultThermostatRepository();
    }
    let holdStrategy;
    if (process.env.HOLD_STRATEGY === 'aws') {
        holdStrategy = new AwsHoldStrategy(context);
    } else {
        holdStrategy = new DefaultHoldStrategy(context);
    }
    let factory = new Factory();
    return new ControlService(context, holdStrategy, factory, repository);
};

const say = (response, messages) => {
    if (messages instanceof Array) {
        for (const message of messages) {
            response.say(message);
            console.log(message);
        }
    } else {
        response.say(messages);
        console.log(messages);
    }
    response.send();
};

app.launch(async (request, response) => {
    console.log('Launching...');
    let service = controlService(request);
    try {
        let messages = await service.launch();
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

app.intent('TempIntent', {
    'utterances': ['what the temperature is', 'the temperature', 'how hot it is']
}, async (request, response) => {
    let service = controlService(request);
    try {
        let messages = await service.status();
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

app.intent('TurnUpIntent', {
    'utterances': ['to increase', 'to turn up', 'set warmer', 'set higher']
}, async (request, response) => {
    let service = controlService(request);
    try {
        let messages = await service.turnUp();
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

app.intent('TurnDownIntent', {
    'utterances': ['to decrease', 'to turn down', 'set cooler', 'set lower']
}, async (request, response) => {
    let service = controlService(request);
    try {
        let messages = await service.turnDown();
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

app.intent('SetTempIntent', {
    'slots': {
        'temp': 'AMAZON.NUMBER'
    },
    'utterances': ['to set to {temp} degrees', 'to set the temperature to {temp} degrees', 'to set the temp to {temp} degrees']
}, async (request, response) => {
    let service = controlService(request);
    try {
        let targetTemp = parseFloat(request.slot('temp'));
        let optionalDuration = request.slot('duration', null);
        let messages = await service.setTemperature(targetTemp, optionalDuration);
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

app.intent('TurnIntent', {
    'slots': {
        'onoff': 'ONOFF'
    },
    'utterances': ['to turn {onoff}', 'to turn heating {onoff}', 'to turn the heating {onoff}']
}, async (request, response) => {    
    let onOff = request.slot('onoff');
    let duration = request.slot('duration');
    // this could be a callback from a step function
    let service = controlService(request);
    try {
        let messages = await service.turn(onOff, duration);
        say(response, messages);
    } catch (e) {
        say(response, e);
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
    let onOff = request.slot('onoff');
    let temp = parseFloat(request.slot('temp'));
    let service = controlService(request);
    try {
        let messages = await service.setDefault(onOff, temp);
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

app.intent('SetDefaultDurationIntent', {
    'slots': {
        'duration': 'AMAZON.DURATION'
    },
    'utterances': ['to set the default duration to {duration}']
}, async (request, response) => {    
    let duration = request.slot('duration');
    let service = controlService(request);
    try {
        let messages = await service.setDefault('duration', duration);
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

app.intent('DefaultsIntent', {
    'slots': {},
    'utterances': ['the current default values', 'the default values', 'the current defaults', 'the defaults']
}, async (request, response) => {
    let service = controlService(request);
    try {
        let messages = await service.defaults();
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
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
    let service = controlService(request);
    try {
        let messages = await service.turn('off');
        say(response, messages);
    } catch (e) {
        say(response, e);
    }
    return false;
});

module.exports = app;

exports.handler = app.lambda();