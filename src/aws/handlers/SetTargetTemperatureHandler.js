const Handler = require('./Handler');

class SetTargetTemperatureHandler extends Handler {
    static handles(event) {
        return Handler.namespaceFor(event) === 'Alexa.ThermostatController' &&
            event.directive.header.name === 'SetTargetTemperature';
    }

    async handle(event) {
        try {
            const service = await this.createControlService(event);
            let targetTemp = event.directive.payload.targetSetpoint.value;
            let optionalDuration = null;
            if (event.directive.payload.schedule) {
                optionalDuration = event.directive.payload.schedule.duration;
            }
            const output = await service.setTemperature(targetTemp, optionalDuration);
            return this.responseFor(event)
                .with.targetSetpoint(output.targetTemperature)
                .and.currentTemperature(output.currentTemperature)
                .response();
        } catch (e) {
            this._logger.error(e);
            this._logger.error(e.stack);
            return this.responseFor(event).as.error(e).response();
        }
    };
}

module.exports = SetTargetTemperatureHandler;