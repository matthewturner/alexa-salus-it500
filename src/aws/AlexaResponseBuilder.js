'use strict';

const AlexaResponse = require('./AlexaResponse');

/**
 * Helper class to generate an AlexaResponse for a thermostat.
 * @class
 */
class AlexaResponseBuilder {
    from(event) {
        let endpointId = event.directive.endpoint.endpointId;
        let token = event.directive.endpoint.scope.token;
        let correlationToken = event.directive.header.correlationToken;

        this._response = new AlexaResponse({
            correlationToken: correlationToken,
            token: token,
            endpointId: endpointId
        });

        return this;
    }

    get with() {
        return this;
    }

    targetSetpoint(targetTemperature) {
        this._response.addContextProperty({
            namespace: 'Alexa.ThermostatController', 
            name: 'targetSetpoint', 
            value: { 
                value: targetTemperature,
                scale: 'CELSIUS'
            }
        });
        return this;
    }

    get finish() {
        return this._response;
    }
}
    