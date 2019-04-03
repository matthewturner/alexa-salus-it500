class Mock {
    constructor(options) { // eslint-disable-line no-unused-vars
    }

    async login() {
        console.log('Logging in...');
    }

    async online() {
        console.log('Checking device status...');
        return true;
    }

    async device() {
        console.log('Contacting device...');
        return {
            contactable: true,
            currentTemperature: 20,
            targetTemperature: 22,
            status: 'on'
        };
    }

    async setTemperature(temp) {
        console.log(`Setting temp: ${temp}`);
    }
}

module.exports = Mock;