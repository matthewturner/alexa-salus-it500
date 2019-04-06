class Mock {
    constructor(logger, options) { // eslint-disable-line no-unused-vars
        this._logger = logger;
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
            currentTemperature: 20,
            targetTemperature: 22,
            status: 'on'
        };
    }

    async setTemperature(temp) {
        this._logger.debug(`Setting temp: ${temp}`);
    }

    async logout() {
        this._logger.debug('Logging out...');
    }
}

module.exports = Mock;