const Handler = require('./Handler');

class AdjustTargetTemperatureHandler extends Handler {
    static handles(event) {
        return Handler.namespaceFor(event) === 'Alexa.ThermostatController' &&
            event.directive.header.name === 'AdjustTargetTemperature';
    }

    async handle(event) {
        try {
            const service = await this.createControlService(event);
            const targetTempDelta = event.directive.payload.targetSetpointDelta.value;
            const output = await service.adjustTemperature(targetTempDelta);
            return this.responseFor(event)
                .with.targetSetpoint(output.targetTemperature)
                .and.currentTemperature(output.currentTemperature)
                .response();
        } catch (e) {
            this._logger.error(e);
            this._logger.error(e.stack);
            return this.responseFor(event).as.error(e).response();
        }
    }
}

module.exports = AdjustTargetTemperatureHandler;