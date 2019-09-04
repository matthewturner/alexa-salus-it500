const ControlService = require('../core/ControlService');
const AwsHoldStrategy = require('../aws/HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const Logger = require('../core/Logger');
const ThermostatRepository = require('../aws/ThermostatRepository');
const Factory = require('../thermostats/Factory');

const say = (messages, logger) => {
    if (messages instanceof Array) {
        for (const message of messages) {
            logger.debug(message);
        }
    } else {
        logger.debug(messages);
    }
};

const main = async () => {
    const logger = new Logger(Logger.DEBUG);
    const duration = process.env.DURATION;
    const context = {
        userId: process.env.ALEXA_USER_ID,
        source: 'user'
    };
    let holdStrategy;
    if (process.env.HOLD_STRATEGY === 'aws') {
        holdStrategy = new AwsHoldStrategy(logger, context);
    } else {
        holdStrategy = new DefaultHoldStrategy(logger, context);
    }
    const factory = new Factory(logger);
    const repository = new ThermostatRepository(logger);
    const service = new ControlService(logger, context, holdStrategy, factory, repository);

    try {
        const {
            messages,
        } = await service.defaults();
        say(messages, logger);
    } catch (e) {
        say(e, logger);
    }

    try {
        const {
            messages,
        } = await service.setDefault('defaultOnTemp', 22);
        say(messages, logger);
    } catch (e) {
        say(e, logger);
    }

    try {
        const {
            messages,
        } = await service.defaults();
        say(messages, logger);
    } catch (e) {
        say(e, logger);
    }

    try {
        const {
            messages,
        } = await service.turnOn(duration);
        say(messages, logger);
    } catch (e) {
        say(e, logger);
    }

    try {
        const {
            messages,
        } = await service.status();
        say(messages, logger);
    } catch (e) {
        say(e, logger);
    }

    try {
        const {
            messages,
        } = await service.turnOff();
        say(messages, logger);
    } catch (e) {
        say(e, logger);
    }
};

main();