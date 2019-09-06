const Handler = require('./Handler');

class DiscoveryHandler extends Handler {
    static handles(event) {
        return Handler.namespaceFor(event) === 'Alexa.Discovery';
    }

    async handle(event) {
        try {
            let profile = await this.retrieveProfile(event);
            const service = this.createControlService(profile);
            let thermostatDetails = await service.thermostatDetails();
            this._logger.debug(JSON.stringify(thermostatDetails));
            return this.responseFor(event).with.capabilities(thermostatDetails).response();
        } catch (e) {
            return this.responseFor(event).as.error(e).response();
        }
    }
}

module.exports = DiscoveryHandler;