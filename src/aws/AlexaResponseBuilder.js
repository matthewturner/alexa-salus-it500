'use strict';

const AlexaResponse = require('./AlexaResponse');
const SmartHomeError = require('./Errors').SmartHomeError;
const Logger = require('../core/Logger');
const _ = require('lodash');

const logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG);

/**
 * Helper class to generate an AlexaResponse for a thermostat.
 * @class
 */
class AlexaResponseBuilder {
    constructor() {
        this._options = null;
        this._event = null;
        this._thermostatDetails = null;
        this._targetTemperature = null;
        this._error = null;
    }

    from(event) {
        this.validate(event);

        this._event = event;

        let correlationToken = event.directive.header.correlationToken;

        this._options = { correlationToken: correlationToken };

        if (event.directive.endpoint) {
            this._options.endpointId = event.directive.endpoint.endpointId;
            this._options.token = event.directive.endpoint.scope.token;
        }

        return this;
    }

    acceptAuthorizationRequest() {
        _.merge(this._options, {
            'namespace': 'Alexa.Authorization',
            'name': 'AcceptGrant.Response',
        });
        return this;
    }

    capabilities(thermostatDetails) {
        _.merge(this._options, {
            namespace: 'Alexa.Discovery',
            name: 'Discover.Response'
        });
        this._thermostatDetails = thermostatDetails;
        return this;
    }

    targetSetpoint(targetTemperature) {
        this._targetTemperature = targetTemperature;
        return this;
    }

    stateReport() {
        _.merge(this._options, { name: 'StateReport' });
        return this;
    }

    response() {
        if (this._error) {
            if (this._error instanceof SmartHomeError) {
                return new AlexaResponse({
                    'name': 'ErrorResponse',
                    'payload': {
                        'type': this._error.data.type,
                        'message': this._error.message
                    }
                });
            }
            return new AlexaResponse({
                'name': 'ErrorResponse',
                'payload': {
                    'type': 'INTERNAL_ERROR',
                    'message': this._error.message
                }
            });
        }

        let response = new AlexaResponse(this._options);

        if (this._thermostatDetails) {
            let capability = response.createPayloadEndpointCapability();
            let thermostat = response.createPayloadEndpointCapability({
                interface: 'Alexa.ThermostatController',
                supported: [
                    { name: 'targetSetpoint' },
                    { name: 'thermostatMode' }
                ],
                proactivelyReported: false,
                retrievable: true,
                configuration: {
                    supportsScheduling: false,
                    supportedModes: ['HEAT']
                }
            });
            let sensor = response.createPayloadEndpointCapability({
                interface: 'Alexa.TemperatureSensor',
                supported: [
                    { name: 'temperature' }
                ],
                proactivelyReported: false,
                retrievable: true
            });
            this._thermostatDetails.capabilities = [
                capability, thermostat, sensor
            ];
            response.addPayloadEndpoint(this._thermostatDetails);
        }

        if (this._targetTemperature) {
            response.addContextProperty({
                namespace: 'Alexa.ThermostatController',
                name: 'targetSetpoint',
                value: {
                    value: this._targetTemperature,
                    scale: 'CELSIUS'
                }
            });
        }

        logger.debug('Response details:');
        logger.debug(JSON.stringify(response));

        return response.get();
    }

    error(error) {
        this._error = error;
        return this;
    }

    validate(event) {
        if (!('directive' in event)) {
            throw new AlexaResponse('INVALID_DIRECTIVE', 'Missing key: directive; is request a valid Alexa directive?');
        }

        if (event.directive.header.payloadVersion !== '3') {
            throw new AlexaResponse('INTERNAL_ERROR', 'This skill only supports Smart Home API version 3');
        }
    }

    get with() {
        return this;
    }

    get and() {
        return this;
    }

    get as() {
        return this;
    }
}

module.exports = AlexaResponseBuilder;