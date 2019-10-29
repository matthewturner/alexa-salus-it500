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

const createHoldStrategy = (context) => {
    if (process.env.HOLD_STRATEGY === 'aws') {
        return new AwsHoldStrategy(logger, context);
    }
    return new DefaultHoldStrategy(logger, context);
};

const createRepository = () => {
    if (process.env.THERMOSTAT_REPOSITORY === 'aws') {
        return new AwsThermostatRepository(logger);
    }
    return new DefaultThermostatRepository(logger);
};

const createContext = () => {
    return {
        userId: process.env.ALEXA_USER_ID,
        source: 'user'
    };
};

const main = async () => {
    const duration = process.env.DURATION;
    const context = createContext();
    let holdStrategy = createHoldStrategy(context);
    let repository = createRepository();
    let setTemperatureStrategy = new SetTemperatureStrategy();

    const factory = new Factory(logger);
    const thermostatService = new ThermostatService(logger, context, factory, repository, holdStrategy, setTemperatureStrategy);
    const defaultsService = new DefaultsService(logger, context, factory, repository);

    await reportOn(() => defaultsService.defaults());

    await reportOn(() => defaultsService.setDefault('defaultOnTemp', 22));

    await reportOn(() => defaultsService.defaults());

    await reportOn(() => thermostatService.turnOn(duration));

    await reportOn(() => thermostatService.status());

    await reportOn(() => thermostatService.turnOff());
};

main();