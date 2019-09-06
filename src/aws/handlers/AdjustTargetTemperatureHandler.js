const Handler = require('./Handler');

class AdjustTargetTemperatureHandler extends Handler {
    static handles(event) {
        return Handler.namespaceFor(event) === 'Alexa.ThermostatController' &&
            event.directive.header.name === 'AdjustTargetTemperature';
    }

    async handle(event) {
        try {
            let profile = await this.retrieveProfile(event);
            const service = this.createControlService(profile);
            let targetTempDelta = event.directive.payload.targetSetpointDelta.value;
            let output = null;
            if (targetTempDelta >= 0) {
                output = await service.turnUp();
            } else {
                output = await service.turnDown();
            }
            return this.responseFor(event)
                .with.targetSetpoint(output.targetTemperature)
                .and.currentTemperature(output.currentTemperature)
                .response();
        } catch (e) {
            return this.responseFor(event).as.error(e).response();
        }
    }
}

module.exports = AdjustTargetTemperatureHandler;