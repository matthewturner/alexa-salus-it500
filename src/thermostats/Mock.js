class Mock {
    constructor(logger, options) { // eslint-disable-line no-unused-vars
        this._logger = logger;
        this._targetTemperature = 20;
    }

    async login() {
        this._logger.debug('Logging in...');
    }

    async online() {
        this._logger.debug('Checking device status...');
        return true;
    }

    async device() {
        this._logger.debug('Contacting device...');
        return {
            contactable: true,
            currentTemperature: 19,
            targetTemperature: this._targetTemperature,
            status: this._targetTemperature > 19 ? 'on' : 'off'
        };
    }

    async setTemperature(temp) {
        this._logger.debug(`Setting temp: ${temp}`);
        this._targetTemperature = temp;
    }

    async logout() {
        this._logger.debug('Logging out...');
    }
}

module.exports = Mock;