'use strict';

const DynamodbThermostatRepository = require('./ThermostatRepository');
const DefaultThermostatRepository = require('../core/ThermostatRepository');
const AwsHoldStrategy = require('./HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const ControlService = require('../core/ControlService');
const { ProfileGateway, MockProfileGateway } = require('./ProfileGateway');
const Logger = require('../core/Logger');
const helpers = require('./helpers');
const Factory = require('../thermostats/Factory');
const AlexaResponseBuilder = require('./AlexaResponseBuilder');
const AlexaResponse = require('./AlexaResponse');

const logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG);

exports.handler = async (event, context) => {
    logEntry(event, context);

    let namespace = ((event.directive || {}).header || {}).namespace;

    if (namespace === 'Alexa.Authorization') {
        return responseFor(event).and.acceptAuthorizationRequest().response();
    }

    if (namespace === 'Alexa.Discovery') {
        let response = await handleDiscovery(event);
        return response;
    }

    if (namespace === 'Alexa') {
        if (event.directive.header.name === 'ReportState') {
            return await handleReportState(event);
        }
    }

    if (namespace === 'Alexa.ThermostatController') {
        if (event.directive.header.name === 'SetTargetTemperature') {
            return await handleSetTargetTemperature(event);
        }
        if (event.directive.header.name === 'AdjustTargetTemperature') {
            return await handleAdjustTargetTemperature(event);
        }
    }
};

const responseFor = (event) => {
    return new AlexaResponseBuilder().from(event);
}

const handleReportState = async (event) => {
    try {
        let profile = await retrieveProfile(event);
        const service = createControlService(profile);
        const status = await service.status();
        return responseFor(event).with.targetSetpoint(status.targetTemperature).as.stateReport().response();
    } catch (e) {
        return responseFor(event).as.error(e).response();
    }
};

const handleSetTargetTemperature = async (event) => {
    try {
        let profile = await retrieveProfile(event);
        const service = createControlService(profile);
        let targetTemp = event.directive.payload.targetSetpoint.value;
        let optionalDuration = null;
        if (event.directive.payload.schedule) {
            optionalDuration = event.directive.payload.schedule.duration;
        }
        const output = await service.setTemperature(targetTemp, optionalDuration);
        return responseFor(event).with.targetSetpoint(targetTemp).response();
    } catch (e) {
        return responseFor(event).as.error(e).response();
    }
};

const handleAdjustTargetTemperature = async (event) => {
    try {
        let profile = await retrieveProfile(event);
        const service = createControlService(profile);
        let targetTempDelta = event.directive.payload.targetSetpointDelta.value;
        if (targetTempDelta >= 0) {
            const output = await service.turnUp();
        } else {
            const output = await service.turnDown();
        }
    } catch (e) {
        return responseFor(event).as.error(e).response();
    }
};

const handleDiscovery = async (event) => {
    try {
        let profile = await retrieveProfile(event);
        const service = createControlService(profile);
        let thermostatDetails = await service.thermostatDetails();
        logger.debug(JSON.stringify(thermostatDetails));
        return responseFor(event).with.capabilities(thermostatDetails).response();
    } catch (e) {
        return responseFor(event).as.error(e).response();
    }
};

const logEntry = (event, context) => {
    logger.debug('Event details:');
    logger.debug(JSON.stringify(event));

    if (context !== undefined) {
        logger.debug('Context details:');
        logger.debug(JSON.stringify(context));
    }
}

const createControlService = (profile) => {
    const userId = profile.user_id;
    const shortUserId = helpers.truncateUserId(userId);
    logger.prefix = shortUserId;
    let source = 'user';
    const context = { userId: userId, shortUserId: shortUserId, source: source };
    logger.debug(`Creating context for source: ${context.source}...`);
    const repository = createRepository(logger);
    const holdStrategy = createHoldStrategy(logger, context);
    const factory = new Factory(logger);
    const service = new ControlService(logger, context, holdStrategy, factory, repository);
    return service;
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

const createProfileGateway = () => {
    if (process.env.PROFILE_GATEWAY_TYPE === 'aws') {
        return new ProfileGateway();
    }
    return new MockProfileGateway();
};

const retrieveProfile = async (event) => {
    logger.debug('Retrieving profile data...');
    const tokenContainer = event.directive.endpoint || event.directive.payload;
    const accessToken = tokenContainer.scope.token;
    let profileGateway = createProfileGateway();
    return await profileGateway.get(accessToken);
};