const Handler = require('./Handler');

class SetThermostatModeHandler extends Handler {
    static handles(event) {
        return Handler.namespaceFor(event) === 'Alexa.ThermostatController' &&
            event.directive.header.name === 'SetThermostatMode';
    }

    async handle(event) {
        try {
            const service = await this.createControlService(event);
            const mode = event.directive.payload.thermostatMode.value;
            let output = null;
            switch (mode) {
                case 'HEAT':
                    output = await service.turnOn();
                    break;
                case 'OFF':
                    output = await service.turnOff();
                    break;
                default:
                    throw `Invalid mode ${mode}`;
            }
            return this.responseFor(event)
                .with.targetSetpoint(output.targetTemperature)
                .and.currentTemperature(output.currentTemperature)
                .and.mode(mode)
                .response();
        } catch (e) {
            this._logger.error(e);
            this._logger.error(e.stack);
            return this.responseFor(event).as.error(e).response();
        }
    }
}

module.exports = SetThermostatModeHandler;