const ControlService = require('../core/ControlService');
const AwsHoldStrategy = require('../aws/HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const ThermostatRepository = require('../aws/ThermostatRepository');
const Factory = require('../thermostats/Factory');

const say = (messages) => {
    if (messages instanceof Array) {
        for (const message of messages) {
            console.log(message);
        }
    } else {
        console.log(messages);
    }
};

const main = async () => {
    let onOff = 'on';
    let duration = process.env.DURATION;
    let context = { userId: process.env.ALEXA_USER_ID };
    let holdStrategy;
    if (process.env.HOLD_STRATEGY === 'aws') {
        holdStrategy = new AwsHoldStrategy(context);
    } else {
        holdStrategy = new DefaultHoldStrategy(context);
    }
    let factory = new Factory();
    let repository = new ThermostatRepository();
    let service = new ControlService(context, holdStrategy, factory, repository);
    try {
        let messages = await service.turn(onOff, duration);
        say(messages);
    } catch (e) {
        say(e);
    }
    try {
        let messages = await service.status();
        say(messages);
    } catch (e) {
        say(e);
    }
};

main();