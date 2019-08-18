'use strict';

const DynamodbThermostatRepository = require('./ThermostatRepository');
const DefaultThermostatRepository = require('../core/ThermostatRepository');
const AwsHoldStrategy = require('./HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');
const ControlService = require('../core/ControlService');
const Logger = require('../core/Logger');
const axios = require('axios');
const helpers = require('./helpers');
const Factory = require('../thermostats/Factory');
const AlexaResponse = require('./AlexaResponse');

const logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG);

exports.handler = async (event, context) => {
    logEntry(event, context);

    let validationFailedResponse = validateEvent(event);
    if (validationFailedResponse) {
        return sendResponse(validationFailedResponse.get());
    }

    let namespace = ((event.directive || {}).header || {}).namespace;

    if (namespace === 'Alexa.Authorization') {
        let aar = new AlexaResponse({'namespace': 'Alexa.Authorization', 'name': 'AcceptGrant.Response',});
        return sendResponse(aar.get());
    }

    if (namespace === 'Alexa.Discovery') {
        let response = await handleDiscovery(event);
        return sendResponse(response.get());
    }

    if (namespace === 'Alexa.ThermostatController') {
        if (event.directive.header.name === 'SetTargetTemperature') {
            let response = await handleSetTargetTemperature(event);
            return sendResponse(response.get());
        }
        if (event.directive.header.name === 'AdjustTargetTemperature') {
            let response = await handleAdjustTargetTemperature(event);
            return sendResponse(response.get());
        }
    }
};

const handleSetTargetTemperature = async (event) => {
    let profile = await retrieveProfile(event);
    const service = createControlService(profile);
    try {
        let targetTemp = event.directive.payload.targetSetpoint.value;
        let optionalDuration = event.directive.payload.schedule.duration;
        const output = await service.setTemperature(targetTemp, optionalDuration);
        let response = createResponse(event);
        response.addContextProperty({
            namespace: 'Alexa.ThermostatController', 
            name: 'targetSetpoint', 
            value: { 
                value: targetTemp,
                scale: 'CELSIUS'
            }
        });
        return response;
    } catch (e) {
        report(e);
    }
};

const createResponse = (event) => {
    let endpointId = event.directive.endpoint.endpointId;
    let token = event.directive.endpoint.scope.token;
    let correlationToken = event.directive.header.correlationToken;

    let ar = new AlexaResponse({
        correlationToken: correlationToken,
        token: token,
        endpointId: endpointId
    });

    return ar;
};

const handleAdjustTargetTemperature = async (event) => {
    let profile = await retrieveProfile(event);
    const service = createControlService(profile);
    try {
        let targetTempDelta = event.directive.payload.targetSetpointDelta.value;
        if (targetTempDelta >= 0) {
            const output = await service.turnUp();
        } else {
            const output = await service.turnDown();
        }
    } catch (e) {
        report(e);
    }
};

const report = (message) => {
    // response.say(message);
    logger.error(message);
    // response.send();
};

const logEntry = (event, context) => {
    logger.debug('Event details:');
    logger.debug(JSON.stringify(event));

    if (context !== undefined) {
        logger.debug('Context details:');
        logger.debug(JSON.stringify(context));
    }
}

const validateEvent = (event) => {
    // Validate we have an Alexa directive
    if (!('directive' in event)) {
        return new AlexaResponse({
            'name': 'ErrorResponse',
            'payload': {
                'type': 'INVALID_DIRECTIVE',
                'message': 'Missing key: directive, Is request a valid Alexa directive?'
            }
        });
    }

    // Check the payload version
    if (event.directive.header.payloadVersion !== '3') {
        return new AlexaResponse({
            'name': 'ErrorResponse',
            'payload': {
                'type': 'INTERNAL_ERROR',
                'message': 'This skill only supports Smart Home API version 3'
            }
        });
    }
    return null;
}

const sendResponse = (response) => {
    // TODO Validate the response
    logger.debug('Response details:');
    logger.debug(JSON.stringify(response));
    return response;
};

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

const retrieveProfile = async (event) => {
    logger.debug('Retrieving profile data...');
    const tokenContainer = event.directive.endpoint || event.directive.payload;
    const accessToken = tokenContainer.scope.token;
    const headers = {
        Authorization: 'Bearer ' + accessToken,
        'content-type': 'application/json'
    };
    const res = await axios.get('https://api.amazon.com/user/profile', { headers: headers });
    logger.debug(JSON.stringify(res.data));
    return res.data;
};

const handleDiscovery = async (event) => {
    let profile = await retrieveProfile(event);
    const service = createControlService(profile);
    let thermostatDetails = await service.thermostatDetails();
    logger.debug(JSON.stringify(thermostatDetails));

    let adr = new AlexaResponse({
        namespace: 'Alexa.Discovery',
        name: 'Discover.Response'
    });
    let capability = adr.createPayloadEndpointCapability();
    let thermostat = adr.createPayloadEndpointCapability({
        interface: 'Alexa.ThermostatController',
        supported: [
            {name: 'targetSetpoint'},
            {name: 'thermostatMode'}
        ],
        proactivelyReported: false,
        retrievable: true,
        configuration: {
            supportsScheduling: false,
            supportedModes: ['HEAT']
        }
    });
    let sensor = adr.createPayloadEndpointCapability({
        interface: 'Alexa.TemperatureSensor',
        supported: [
            {name: 'temperature'}
        ],
        proactivelyReported: false,
        retrievable: true
    });
    thermostatDetails.capabilities = [
        capability, thermostat, sensor
    ];
    adr.addPayloadEndpoint(thermostatDetails);
    return adr;
};