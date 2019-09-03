const moment = require('moment');
const Duration = require('durationjs');
const _ = require('lodash');

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
        const thermostat = await this.obtainThermostat();
        const options = thermostat.options;
        const client = this._thermostatFactory.create(thermostat.type, options);
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
        const online = await client.online();
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
        if (device.status !== 'on') { return; }

        if (qualifier !== '') { qualifier = ` ${qualifier}`; }

        const status = await this._holdStrategy.status();
        this._logger.debug(status);
        if (status.status === 'running') {
            const timeSinceStart = (moment().diff(status.startDate) / 1000).toFixed(0);
            const durationSinceStart = new Duration(`PT${timeSinceStart}S`);
            const timeToGo = status.duration.subtract(durationSinceStart);
            messages.push(`The heating is${qualifier} on and will turn off in ${this.speakDuration(timeToGo)}.`);
        }
        else {
            messages.push(`The heating is${qualifier} on.`);
        }
    }

    async turnUp() {
        this._logger.debug('Turning up...');
        const client = await this.login();

        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            if (device.status === 'on') {
                throw 'The heating is already on.';
            }

            const t = device.targetTemperature + 1.0;
            await client.setTemperature(t);
            const updatedDevice = await client.device();

            const messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            await this.determineIfHolding(updatedDevice, messages, 'now');

            this.logStatus(device);
            return this.createResponse(messages, client, {
                targetTemperature: updatedDevice.targetTemperature,
                currentTemperature: updatedDevice.currentTemperature
            });
        } finally {
            await client.logout();
        }
    }

    async turnDown() {
        this._logger.debug('Turning down...');
        const client = await this.login();
        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            const t = device.targetTemperature - 1.0;
            await client.setTemperature(t);
            const updatedDevice = await client.device();

            const messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            await this.determineIfHolding(updatedDevice, messages, 'still');

            this.logStatus(updatedDevice);
            return this.createResponse(messages, client, {
                targetTemperature: updatedDevice.targetTemperature,
                currentTemperature: updatedDevice.currentTemperature
            });
        } finally {
            await client.logout();
        }
    }

    async turnHeatingOn(duration) {
        this._logger.debug('Turning heating on...');

        const thermostat = await this.obtainThermostat();
        let t = thermostat.defaultOnTemp;

        return this.setTemperature(t, duration, 'on');
    }

    async turnHeatingOff() {
        this._logger.debug('Turning heating off...');

        const thermostat = await this.obtainThermostat();
        let t = thermostat.defaultOffTemp;

        return this.setTemperature(t, null, 'off');
    }

    async turnWaterOn(duration) {
        this._logger.debug(`Boosting water for ${duration}...`);

        const client = await this.login();
        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            let d = duration;
            if (!d) {
                const thermostat = await this.obtainThermostat();
                d = thermostat.defaultWaterDuration;
            }
            const actualDuration = parseInt(new Duration(d).inHours());

            client.turnWaterOnFor(actualDuration);

            return this.createResponse(
                [`The water is now on for ${this.speakDuration(new Duration(d))}.`],
                client);
        } finally {
            await client.logout();
        }
    }

    async turnWaterOff() {
        this._logger.debug('Turning water off...');

        const client = await this.login();
        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            client.turnWaterOnFor('PT0M');

            return this.createResponse(['The water is now off.'], client);
        } finally {
            await client.logout();
        }
    }

    async setTemperature(targetTemperature, forDuration, onOff = 'on') {
        this._logger.debug(`Setting temperature to ${targetTemperature}...`);
        const client = await this.login();
        try {
            await this.verifyOnline(client);
            const device = await client.device();
            this.verifyContactable(device);

            await client.setTemperature(targetTemperature);
            const updatedDevice = await client.device();

            let messages = [];
            messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
            this.logStatus(updatedDevice);

            if (this._context.source === 'user') {
                const thermostat = await this.obtainThermostat();
                if (onOff === 'on') {
                    const duration = forDuration || thermostat.defaultDuration;
                    const intent = await this._holdStrategy.holdIfRequiredFor(duration);
                    messages = messages.concat(this.summarize(duration, intent, updatedDevice));
                    return this.createResponse(messages, client, { targetTemperature: updatedDevice.targetTemperature });
                } else {
                    await this._holdStrategy.stopHoldIfRequired(thermostat.executionId);
                }
            }
            return this.createResponse(messages, client, { targetTemperature: updatedDevice.targetTemperature });
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

    async setDefault(name, value) {
        this._logger.debug(`Setting default ${name} to ${value}...`);

        const thermostat = await this.obtainThermostat();
        let nameText = '';
        let valueText = '';
        switch (name) {
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

        const client = this._thermostatFactory.create(thermostat.type, thermostat.options);

        return this.createResponse([
            `The default ${nameText} has been set to ${valueText}.`
        ], client);
    }

    async defaults() {
        this._logger.debug('Retrieving default values...');

        const thermostat = await this.obtainThermostat();
        const client = this._thermostatFactory.create(thermostat.type, thermostat.options);

        return this.createResponse([
            `The default on temperature is ${thermostat.defaultOnTemp} degrees.`,
            `The default off temperature is ${thermostat.defaultOffTemp} degrees.`,
            `The default duration is ${this.speakDuration(new Duration(thermostat.defaultDuration))}.`
        ], client);
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

    createResponse(messages, client, options = {}) {
        const card = client.card();
        return _.merge({ messages, card }, options);
    }
}

module.exports = ControlService;