class DeferredSetTemperatureStrategy {
    constructor(logger, event) {
        this._logger = logger;
        this._event = event;
    }

    async setTemperature(client, temperature) {
        const defer = this._event.directive.payload.defer || true;
        if (defer && client.shouldDefer) {
            this._event.directive.payload.defer = false;
            // send message
            const updatedDevice = await client.device();
            updatedDevice.targetTemperature = temperature;
            return updatedDevice;
        } else {
            await client.setTemperature(temperature);
            const updatedDevice = await client.device();
            return updatedDevice;
        }
    }
}

module.exports = DeferredSetTemperatureStrategy;