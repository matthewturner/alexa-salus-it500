const ThermostatService = require('../core/ThermostatService');
const DefaultsService = require('../core/DefaultsService');
const AwsHoldStrategy = require('../aws/HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const Logger = require('../core/Logger');
const AwsThermostatRepository = require('../aws/ThermostatRepository');
const DefaultThermostatRepository = require('../core/ThermostatRepository');
const Factory = require('../thermostats/Factory');
const SetTemperatureStrategy = require('../core/SetTemperatureStrategy');

const logger = new Logger(Logger.DEBUG);

const report = (messages, logger) => {
    if (messages instanceof Array) {
        for (const message of messages) {
            logger.debug(message);
        }
    } else {
        logger.debug(messages);
    }
};

const reportOn = async (action) => {
    try {
        const {
            messages,
        } = await action();
        report(messages, logger);
    } catch (e) {
        report(e, logger);
    }
};

const main = async () => {
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
    let repository;
    if (process.env.THERMOSTAT_REPOSITORY === 'aws') {
        repository = new AwsThermostatRepository(logger);
    } else {
        repository = new DefaultThermostatRepository(logger);
    }
    let setTemperatureStrategy = new SetTemperatureStrategy();

    const factory = new Factory(logger);
    const thermostatService = new ThermostatService(logger, context, factory, repository, holdStrategy, setTemperatureStrategy);
    const defaultsService = new DefaultsService(logger, context, factory, repository);

    await reportOn(async () => await defaultsService.defaults());

    await reportOn(async () => await defaultsService.setDefault('defaultOnTemp', 22));

    await reportOn(async () => await defaultsService.defaults());

    await reportOn(async () => await thermostatService.turnOn(duration));

    await reportOn(async () => await thermostatService.status());

    await reportOn(async () => await thermostatService.turnOff());
};

main();