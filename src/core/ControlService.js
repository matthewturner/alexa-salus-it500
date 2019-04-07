const moment = require('moment');
const Duration = require('durationjs');

class ControlService {
    constructor(logger, context, holdStrategy, thermostatFactory, thermostatRepository) {
        this._logger = logger;
        this._context = context;
        this._holdStrategy = holdStrategy;
        this._thermostatRepository = thermostatRepository;
        this._thermostatFactory = thermostatFactory;
    }

    async login() {
        this._logger.debug('Finding thermostat...');
        let thermostat = await this.obtainThermostat();
        let options = thermostat.options;
        let client = this._thermostatFactory.create(thermostat.type, options);
        await client.login();
        return client;
    }

    async obtainThermostat() {
        let thermostat = await this._thermostatRepository.find(this._context.userId);
        if (thermostat) {
            return thermostat;
        }

        thermostat = await this._thermostatRepository.find('template');
        if (thermostat) {
            thermostat.userId = this._context.userId;
        } else {
            thermostat = { userId: this._context.userId, executionId: null };
        }
        await this._thermostatRepository.add(thermostat);
        return thermostat;
    }

    async verifyOnline(client) {
        let online = await client.online();
        if (!online) {
            throw 'Sorry, the thermostat is offline at the moment.';
        }
    }

    verifyContactable(device) {
        if (!device.contactable) {
            throw 'Sorry, I couldn\'t contact the thermostat.';
        }
    }

    async launch() {
        let client = await this.login();
        try {
            if (await client.online()) {
                return 'Thermostat is online.';
            } else {
                return 'Sorry, the thermostat is offline at the moment.';
            }
        } finally {
            await client.logout();
        }
    }

    async status() {
        this._logger.debug('Requesting status...');
        let client = await this.login();
        try {
            await this.verifyOnline(client);
            let device = await client.device();
            this.verifyContactable(device);

            let messages = [];
            messages.push(`The current temperature is ${this.speakTemperature(device.currentTemperature)} degrees.`);
            messages.push(`The target is ${this.speakTemperature(device.targetTemperature)} degrees.`);
            await this.determineIfHolding(device, messages);

            this.logStatus(device);
            return messages;
        } finally {
            await client.logout();
        }
    }

    async determineIfHolding(device, messages, qualifier = '') {
        if (device.status !== 'on') { return; }

        if (qualifier !== '') { qualifier = ` ${qualifier}`; }
        
        let status = await this._holdStrategy.status();
        this._logger.debug(status);
        if (status.status === 'running') {
            let timeSinceStart = (moment().diff(status.startDate) / 1000).toFixed(0);
            let durationSinceStart = new Duration(`PT${timeSinceStart}S`);
            let timeToGo = status.duration.subtract(durationSinceStart);
            messages.push(`The heating is${qualifier} on and will turn off in ${this.speakDuration(timeToGo)}.`);
        }
        else {
            messages.push(`The heating is${qualifier} on.`);
        }
    }

    async turnUp() {
        this._logger.debug('Turning up...');
        let client = await this.login();

        try {
            await this.verifyOnline(client);
            let device = await client.device();
            this.verifyContactable(device);

            if (device.status === 'on') {
                throw 'The heating is already on.';
            }

            let t = device.targetTemperature + 1.0;
            await client.setTemperature(t);
            let updatedDevice = await client.device();

            let messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            await this.determineIfHolding(updatedDevice, messages, 'now');

            this.logStatus(device);
            return messages;
        } finally {
            await client.logout();
        }
    }

    async turnDown() {
        this._logger.debug('Turning down...');
        let client = await this.login();
        try {
            await this.verifyOnline(client);
            let device = await client.device();
            this.verifyContactable(device);

            let t = device.targetTemperature - 1.0;
            await client.setTemperature(t);
            let updatedDevice = await client.device();

            let messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            await this.determineIfHolding(updatedDevice, messages, 'still');

            this.logStatus(updatedDevice);
            return messages;
        } finally {
            await client.logout();
        }
    }

    async turn(onOff, duration) {
        this._logger.debug(`Turning ${onOff}...`);

        let thermostat = await this.obtainThermostat();
        let t = thermostat.defaultOnTemp;
        if (onOff === 'off') {
            t = thermostat.defaultOffTemp;
        }

        return this.setTemperature(t, duration, onOff);
    }

    async setTemperature(targetTemperature, forDuration, onOff = 'on') {
        this._logger.debug(`Setting temperature to ${targetTemperature}...`);
        let client = await this.login();
        try {
            await this.verifyOnline(client);
            let device = await client.device();
            this.verifyContactable(device);

            await client.setTemperature(targetTemperature);
            let updatedDevice = await client.device();

            let messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            this.logStatus(updatedDevice);

            if (this._context.source === 'user') {
                let thermostat = await this.obtainThermostat();
                if (onOff === 'on') {
                    let duration = forDuration || thermostat.defaultDuration;
                    let intent = await this._holdStrategy.holdIfRequiredFor(duration);
                    return messages.concat(this.summarize(duration, intent, updatedDevice));
                } else {
                    await this._holdStrategy.stopHoldIfRequired(thermostat.executionId);
                }
            }
            return messages;
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

        let durationText = this.speakDuration(intent.duration);
        this._logger.debug(`Holding for ${durationText} {${intent.executionId}}`);
        if (updatedDevice.status === 'on') {
            return [`The heating is now on and will turn off in ${durationText}.`];
        }
        
        return [`The heating will turn off in ${durationText}.`];
    }

    async setDefault(name, value) {
        this._logger.debug(`Setting default ${name} to ${value}...`);

        let thermostat = await this.obtainThermostat();
        let nameText = '';
        let valueText = '';
        switch(name) {
        case 'on':
            thermostat.defaultOnTemp = value;
            nameText = 'on temperature';
            valueText = `${value} degrees`;
            break;
        case 'off':
            thermostat.defaultOffTemp = value;
            nameText = 'off temperature';
            valueText = `${value} degrees`;
            break;
        case 'duration':
            thermostat.defaultDuration = value;
            nameText = 'duration';
            valueText = this.speakDuration(new Duration(value));
            break;
        }

        await this._thermostatRepository.save(thermostat);

        return [`The default ${nameText} has been set to ${valueText}.`];
    }

    async defaults() {
        this._logger.debug('Retrieving default values...');

        let thermostat = await this.obtainThermostat();

        return [
            `The default on temperature is ${thermostat.defaultOnTemp} degrees.`,
            `The default off temperature is ${thermostat.defaultOffTemp} degrees.`,
            `The default duration is ${this.speakDuration(new Duration(thermostat.defaultDuration))}.`
        ];
    }

    logStatus(device) {
        this._logger.debug(`${new Date().toISOString()} ${device.currentTemperature} => ${device.targetTemperature} (${device.status})`);
    }
    
    speakDuration(duration) {
        if (duration.inHours() > 1 && duration.inHours() < 2) {
            return `1 hour and ${duration.subtract(new Duration('PT1H')).ago().replace(' ago', '')}`;
        } else {
            return duration.ago().replace(' ago', '');
        }
    }

    speakTemperature(temp) {
        if (parseFloat(temp.toFixed(0)) != temp) return temp.toFixed(1);
        else return temp.toFixed(0);
    }
}

module.exports = ControlService;