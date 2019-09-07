const moment = require('moment');
const Duration = require('durationjs');

const Service = require('./Service');

class ThermostatService extends Service {
    constructor(logger, context, thermostatFactory, thermostatRepository, holdStrategy, setTemperatureStrategy) {
        super(logger, context, thermostatFactory, thermostatRepository);

        this._holdStrategy = holdStrategy;
        this._setTemperatureStrategy = setTemperatureStrategy;
    }

    async launch() {
        const client = await this.login();
        try {
            if (await client.online()) {
                return this.createResponse(['Thermostat is online.'], client);
            } else {
                return this.createResponse(['Sorry, the thermostat is offline at the moment.'], client);
            }
        } finally {
            await client.logout();
        }
    }

    async status() {
        this._logger.debug('Requesting status...');
        const client = await this.login();
        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            const messages = [];
            messages.push(`The current temperature is ${this.speakTemperature(device.currentTemperature)} degrees.`);
            messages.push(`The target is ${this.speakTemperature(device.targetTemperature)} degrees.`);
            await this.determineIfHolding(device, messages);

            this.logStatus(device);
            return this.createResponse(messages, client, {
                currentTemperature: device.currentTemperature,
                targetTemperature: device.targetTemperature
            });
        } finally {
            await client.logout();
        }
    }

    async determineIfHolding(device, messages, qualifier = '') {
        if (device.status !== 'on') {
            return;
        }

        if (qualifier !== '') {
            qualifier = ` ${qualifier}`;
        }

        const status = await this._holdStrategy.status();
        this._logger.debug(status);
        if (status.status === 'running') {
            const timeSinceStart = (moment().diff(status.startDate) / 1000).toFixed(0);
            const durationSinceStart = new Duration(`PT${timeSinceStart}S`);
            const timeToGo = status.duration.subtract(durationSinceStart);
            messages.push(`The heating is${qualifier} on and will turn off in ${this.speakDuration(timeToGo)}.`);
        } else {
            messages.push(`The heating is${qualifier} on.`);
        }
    }

    async turnUp() {
        return this.adjustTemperature(1.0);
    }

    async turnDown() {
        return this.adjustTemperature(-1.0);
    }

    async turnOn(duration) {
        this._logger.debug('Turning heating on...');

        const thermostat = await this.obtainThermostat();
        let t = thermostat.defaultOnTemp;

        return this.setTemperature(t, duration, 'on');
    }

    async turnOff() {
        this._logger.debug('Turning heating off...');

        const thermostat = await this.obtainThermostat();
        let t = thermostat.defaultOffTemp;

        return this.setTemperature(t, null, 'off');
    }

    async setTemperature(targetTemperature, forDuration, onOff = 'on') {
        this._logger.debug(`Setting temperature to ${targetTemperature}...`);
        const client = await this.login();
        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            let updatedDevice = await this._setTemperatureStrategy.setTemperature(client, targetTemperature);

            let messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            this.logStatus(updatedDevice);

            if (this._context.source === 'user') {
                const thermostat = await this.obtainThermostat();
                if (onOff === 'on') {
                    const duration = forDuration || thermostat.defaultDuration;
                    const intent = await this._holdStrategy.holdIfRequiredFor(duration);
                    messages = messages.concat(this.summarize(duration, intent, updatedDevice));
                    return this.createResponse(messages, client, {
                        targetTemperature: updatedDevice.targetTemperature,
                        currentTemperature: updatedDevice.currentTemperature
                    });
                } else {
                    await this._holdStrategy.stopHoldIfRequired(thermostat.executionId);
                }
            }
            return this.createResponse(messages, client, {
                targetTemperature: updatedDevice.targetTemperature,
                currentTemperature: updatedDevice.currentTemperature
            });
        } finally {
            await client.logout();
        }
    }

    async adjustTemperature(tempDelta) {
        this._logger.debug(`Adjusting temperature by ${tempDelta}...`);
        const client = await this.login();

        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            const t = device.targetTemperature + tempDelta;
            let updatedDevice = await this._setTemperatureStrategy.setTemperature(client, t);

            const messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            let qualifier = 'now';
            if (tempDelta < 0) {
                qualifier = 'still';
            }
            await this.determineIfHolding(updatedDevice, messages, qualifier);

            this.logStatus(device);
            return this.createResponse(messages, client, {
                targetTemperature: updatedDevice.targetTemperature,
                currentTemperature: updatedDevice.currentTemperature
            });
        } finally {
            await client.logout();
        }
    }

    summarize(duration, intent, updatedDevice) {
        if (!intent.holding) {
            const messages = [];
            if (duration) {
                messages.push('Hold time is not supported on this device.');
            }
            if (updatedDevice.status === 'on') {
                messages.push('The heating is now on.');
            }
            return messages;
        }

        const durationText = this.speakDuration(intent.duration);
        this._logger.debug(`Holding for ${durationText} {${intent.executionId}}`);
        if (updatedDevice.status === 'on') {
            return [`The heating is now on and will turn off in ${durationText}.`];
        }

        return [`The heating will turn off in ${durationText}.`];
    }

    async thermostatDetails() {
        this._logger.debug('Retrieving client details...');

        const thermostat = await this.obtainThermostat();
        const client = this._thermostatFactory.create(thermostat.type, thermostat.options);

        return {
            friendlyName: client.friendlyName,
            manufacturerName: client.manufacturerName,
            description: client.description,
            displayCategories: ['THERMOSTAT'],
            endpointId: thermostat.guid
        };
    }

    logStatus(device) {
        this._logger.debug(`${new Date().toISOString()} ${device.currentTemperature} => ${device.targetTemperature} (${device.status})`);
    }

    speakTemperature(temp) {
        if (parseFloat(temp.toFixed(0)) != temp) return temp.toFixed(1);
        else return temp.toFixed(0);
    }
}

module.exports = ThermostatService;