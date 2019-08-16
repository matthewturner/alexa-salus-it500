'use strict';

// const DynamodbThermostatRepository = require('./ThermostatRepository');
// const DefaultThermostatRepository = require('../core/ThermostatRepository');
// const AwsHoldStrategy = require('./HoldStrategy');
// const DefaultHoldStrategy = require('../core/HoldStrategy');
// const ControlService = require('../core/ControlService');
const Logger = require('../core/Logger');
const axios = require('axios');
// const helpers = require('./helpers');
// const Factory = require('../thermostats/Factory');
const AlexaResponse = require('./AlexaResponse');

const logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG);

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
    let adr = new AlexaResponse({'namespace': 'Alexa.Discovery', 'name': 'Discover.Response'});
    let capability_alexa = adr.createPayloadEndpointCapability();
    let capability_alexa_powercontroller = adr.createPayloadEndpointCapability({'interface': 'Alexa.PowerController', 'supported': [{'name': 'powerState'}]});
    adr.addPayloadEndpoint({'friendlyName': 'Sample Switch', 'endpointId': 'sample-switch-01', 'capabilities': [capability_alexa, capability_alexa_powercontroller]});
    return sendResponse(adr.get());
};