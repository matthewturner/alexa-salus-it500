class HoldStrategy {
    constructor(logger) {
        this._logger = logger;
    }

    async holdIfRequiredFor(durationValue) {
        this._logger.debug(`Hold request for ${durationValue} will be ignored`);
        return {
            holding: false,
            duration: null,
            executionId: null
        };
    }

    async status() {
        return {
            status: 'n/a',
            duration: null,
            startDate: null
        };
    }
}

module.exports = HoldStrategy;