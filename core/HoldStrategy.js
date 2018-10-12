class HoldStrategy {
    constructor() {
    }

    async holdIfRequiredFor(durationValue) {
        console.log(`Hold request for ${durationValue} will be ignored`);
        return {
            holding: false,
            duration: null,
            executionId: null
        };
    }

    async status() {
        return {
            status: 'n/a',
            duration: null
        };
    }
}

module.exports = HoldStrategy;