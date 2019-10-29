'use strict';

const AlexaResponse = require('./AlexaResponse');
const SmartHomeError = require('./Errors').SmartHomeError;
const _ = require('lodash');

/**
 * Helper class to generate an AlexaResponse for a thermostat.
 * @class
 */
class AlexaResponseBuilder {
    constructor(logger) {
        this._logger = logger;
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

        this._options = {
            correlationToken: correlationToken
        };

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

    currentTemperature(currentTemperature) {
        this._currentTemperature = currentTemperature;
        return this;
    }

    mode(mode) {
        this._mode = mode;
        return this;
    }

    stateReport() {
        _.merge(this._options, {
            name: 'StateReport'
        });
        return this;
    }

    response() {
        if (this._error) {
            return this.errorResponseFrom(this._error);
        }

        let response = new AlexaResponse(this._options);

        this.addThermostatDetailsIfRequired(response,
            this._thermostatDetails);

        this.addTemperaturePropertyIfRequired(response,
            'Alexa.ThermostatController', 'targetSetpoint',
            this._targetTemperature);

        this.addTemperaturePropertyIfRequired(response,
            'Alexa.TemperatureSensor', 'temperature',
            this._currentTemperature);

        this.addModePropertyIfRequired(response, this._mode);

        this._logger.debug('Response details:');
        this._logger.debug(JSON.stringify(response));

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

    get sensorCapability() {
        return {
            interface: 'Alexa.TemperatureSensor',
            supported: [{
                name: 'temperature'
            }],
            proactivelyReported: false,
            retrievable: true
        };
    }

    get thermostatCapability() {
        return {
            interface: 'Alexa.ThermostatController',
            supported: [{
                name: 'targetSetpoint'
            },
            {
                name: 'thermostatMode'
            }
            ],
            proactivelyReported: false,
            retrievable: true,
            configuration: {
                supportsScheduling: true,
                supportedModes: ['HEAT']
            }
        };
    }

    addModePropertyIfRequired(response, mode) {
        if (!mode) {
            return;
        }

        response.addContextProperty({
            namespace: 'Alexa.ThermostatController',
            name: 'thermostatMode',
            value: {
                value: this._mode,
            }
        });
    }

    addTemperaturePropertyIfRequired(response, namespace, name, value) {
        if (!value) {
            return;
        }

        response.addContextProperty({
            namespace: namespace,
            name: name,
            value: {
                value: value,
                scale: 'CELSIUS'
            }
        });
    }

    addThermostatDetailsIfRequired(response, thermostatDetails) {
        if (!thermostatDetails) {
            return;
        }

        let capability = response.createPayloadEndpointCapability();
        let thermostat = response.createPayloadEndpointCapability(
            this.thermostatCapability
        );
        let sensor = response.createPayloadEndpointCapability(
            this.sensorCapability
        );
        thermostatDetails.capabilities = [
            capability, thermostat, sensor
        ];
        response.addPayloadEndpoint(thermostatDetails);
    }

    errorResponseFrom(error) {
        if (error instanceof SmartHomeError) {
            return new AlexaResponse({
                'name': 'ErrorResponse',
                'payload': {
                    'type': error.data.type,
                    'message': error.message
                }
            });
        }
        return new AlexaResponse({
            'name': 'ErrorResponse',
            'payload': {
                'type': 'INTERNAL_ERROR',
                'message': error.message
            }
        });
    }
}

module.exports = AlexaResponseBuilder;