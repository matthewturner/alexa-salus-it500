const heatmiser = require('heatmiser');

class Heatmiser {
    constructor(logger, options) {
        this._logger = logger;
        this._heatmiser = new heatmiser.Wifi(options.host, options.pin, options.port, options.model);
        this._heatmiser.on('success', (data) => {
            console.log(data);
        });
        this._heatmiser.on('error', (data) => {
            console.log(data);
            this._lastError = data;
        });
    }

    async login() {
        console.log('Logging in...');
    }

    async online() {
        console.log('Checking device status...');

        return this.device().status === 'on';
    }

    async device() {
        console.log('Contacting device...');
        // what to do here?
        return {
            contactable: true,
            currentTemperature: 20,
            targetTemperature: 22,
            status: 'on'
        };
    }

    async setTemperature(temp) {
        console.log(`Setting temp: ${temp}...`);
        let dcb = {
            heating: {
                target: temp
            }
        }
        this._heatmiser.write_device(dcb);
    }

    async turnWaterOnFor(hours) {
        this._logger.debug(`Boosting water for: ${hours} hours`);
    }

    card() {
        return {
            title: 'Mock Thermostat',
            image: {
                smallImageUrl: 'http://smallimage.url',
                largeImageUrl: 'http://largeimage.url',
            }
        };
    }

    get friendlyName() {
        return 'Mock Thermostat';
    }

    get manufacturerName() {
        return 'Acme Ltd';
    }

    get description() {
        return 'Mock thermostat used for testing';
    }

    get shouldDefer() {
        return false;
    }

    async readDevice() {
        this._lastError = null;
        let result = this._heatmiser.read_device();

        if (this._lastError) {
            throw this._lastError;
        }
        return result;
    }

    async writeDevice(dcb) {
        this._lastError = null;
        let result = this._heatmiser.write_device(dcb);

        if (this._lastError) {
            throw this._lastError;
        }
        return result;
    }
}

module.exports = Heatmiser;