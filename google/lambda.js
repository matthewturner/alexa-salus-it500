const DynamodbThermostatRepository = require('../aws/ThermostatRepository');
const DefaultThermostatRepository = require('../core/ThermostatRepository');
const AwsHoldStrategy = require('../aws/HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const ControlService = require('../core/ControlService');
const Factory = require('../thermostats/Factory');

const controlService = (userId) => {
    let context = { userId };
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

const say = (messages) => {
    var m = '';
    if (messages instanceof Array) {
        for (const message of messages) {
            console.log(message);
            m += ' ' + message;
        }
    } else {
        console.log(messages);
        m += ' ' + messages;
    }
    return m;
};

const handler = async (event) => {
    console.log(event);
    let onOff = event.queryResult.parameters.onOff;
    let duration = event.queryResult.parameters.duration.amount;
    // let userId = process.env.ALEXA_USER_ID;
    // let service = controlService(userId);
    try {
        let messages = [ `You have asked to turn the heating ${onOff} for ${duration}` ]; // await service.turn(onOff, duration);
        return {
            fulfillmentText: say(messages)
        };
    } catch (e) {
        return {
            fulfillmentText: say(e)
        };
    }
};

exports.handler = handler;