const heatmiser = require('heatmiser');

class Heatmiser {
    constructor(logger, options) {
        this._logger = logger;
        this._heatmiser = new heatmiser.Wifi(options.host, options.pin, options.port, options.model);
        this._heatmiser.on('success', (data) => {
            this._logger.debug('Success:');
            this._logger.debug(data);
        });
        this._heatmiser.on('error', (data) => {
            this._logger.error('Error:');
            this._logger.error(data);
            this._lastError = data;
        });
    }

    async login() {
        this._logger.debug('Logging in...');
    }

    async logout() {
        this._logger.debug('Logging out...');
    }

    async online() {
        this._logger.debug('Checking device status...');

        let status = await this.device().status;
        this._logger.debug(status);
        return status === 'on';
    }

    async device() {
        this._logger.debug('Contacting device...');
        let data = await this.readDevice();
        this._logger.debug(data);
        let info = {
            contactable: data.dcb.device_on,
            currentTemperature: data.dcb.built_in_air_temp,
            targetTemperature: data.dcb.set_room_temp,
            status: data.dcb.device_on ? 'on' : 'off'
        };
        this._logger.debug(JSON.stringify(info));
        return info;
    }

    async setTemperature(temp) {
        this._logger.debug(`Setting temp: ${temp}...`);
        let dcb = {
            heating: {
                target: temp
            }
        };
        this._heatmiser.write_device(dcb);
    }

    async turnWaterOnFor(hours) {
        this._logger.debug(`Boosting water for: ${hours} hours...`);
        throw new Error('Turning water on is not supported');
    }

    card() {
        return {
            title: 'Heatmiser',
            image: {
                smallImageUrl: 'https://748348.smushcdn.com/1298070/wp-content/uploads/2019/08/touch-carbon.png?lossy=1&strip=1&webp=1',
                largeImageUrl: 'https://748348.smushcdn.com/1298070/wp-content/uploads/2019/08/touch-carbon.png?lossy=1&strip=1&webp=1',
            }
        };
    }

    get friendlyName() {
        return 'thermostat';
    }

    get manufacturerName() {
        return 'Heatmiser';
    }

    get description() {
        return 'Controls the Heatmiser thermostat';
    }

    get shouldDefer() {
        return true;
    }

    async readDevice() {
        return new Promise((resolve) => {
            this._heatmiser.read_device(resolve);
        });
    }

    writeDevice(dcb) {
        this._lastError = null;
        let result = this._heatmiser.write_device(dcb);

        if (this._lastError) {
            throw this._lastError;
        }
        return result;
    }
}

module.exports = Heatmiser;