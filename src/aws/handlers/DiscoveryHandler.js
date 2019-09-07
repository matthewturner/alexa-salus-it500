const Handler = require('./Handler');

class DiscoveryHandler extends Handler {
    static handles(event) {
        return Handler.namespaceFor(event) === 'Alexa.Discovery';
    }

    async handle(event) {
        try {
            const service = await this.createControlService(event);
            let thermostatDetails = await service.thermostatDetails();
            this._logger.debug(JSON.stringify(thermostatDetails));
            return this.responseFor(event).with.capabilities(thermostatDetails).response();
        } catch (e) {
            this._logger.error(e);
            this._logger.error(e.stack);
            return this.responseFor(event).as.error(e).response();
        }
    }
}

module.exports = DiscoveryHandler;