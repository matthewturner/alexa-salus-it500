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

const controlService = (profile) => {
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

exports.handler = async (event, context) => {
    logger.debug('index.handler request  -----');
    logger.debug(JSON.stringify(event));

    if (context !== undefined) {
        logger.debug('index.handler context  -----');
        logger.debug(JSON.stringify(context));
    }

    // Validate we have an Alexa directive
    if (!('directive' in event)) {
        let aer = new AlexaResponse(
            {
                'name': 'ErrorResponse',
                'payload': {
                    'type': 'INVALID_DIRECTIVE',
                    'message': 'Missing key: directive, Is request a valid Alexa directive?'
                }
            });
        return sendResponse(aer.get());
    }

    // Check the payload version
    if (event.directive.header.payloadVersion !== '3') {
        let aer = new AlexaResponse(
            {
                'name': 'ErrorResponse',
                'payload': {
                    'type': 'INTERNAL_ERROR',
                    'message': 'This skill only supports Smart Home API version 3'
                }
            });
        return sendResponse(aer.get());
    }

    let namespace = ((event.directive || {}).header || {}).namespace;

    logger.debug('Retrieving profile data...');
    let profile = await retrieveProfile(event);

    if (namespace.toLowerCase() === 'alexa.authorization') {
        let aar = new AlexaResponse({'namespace': 'Alexa.Authorization', 'name': 'AcceptGrant.Response',});
        return sendResponse(aar.get());
    }

    if (namespace.toLowerCase() === 'alexa.discovery') {
        return await handleDiscovery(profile, event);
    }
};

const sendResponse = (response) => {
    // TODO Validate the response
    logger.debug('index.handler response -----');
    logger.debug(JSON.stringify(response));
    return response;
};

const retrieveProfile = async (event) => {
    const accessToken = event.directive.payload.scope.token;
    const headers = {
        Authorization: 'Bearer ' + accessToken,
        'content-type': 'application/json'
    };
    const res = await axios.get('https://api.amazon.com/user/profile', { headers: headers });
    logger.debug(JSON.stringify(res.data));
    return res.data;
};

const handleDiscovery = async (profile, event) => {
    const controlService = controlService(profile);

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
    let description = await controlService.summary();
    description.capabilities = [
        capability, thermostat, sensor
    ];
    adr.addPayloadEndpoint(description);
    return sendResponse(adr.get());
};