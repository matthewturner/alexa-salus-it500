const moment = require('moment');
const Duration = require('durationjs');

class ControlService {
    constructor(context, holdStrategy, thermostatFactory, thermostatRepository) {
        this._context = context;
        this._holdStrategy = holdStrategy;
        this._thermostatRepository = thermostatRepository;
        this._thermostatFactory = thermostatFactory;
    }

    async login() {
        console.log('Finding thermostat...');
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
        }
        else {
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
                return 'Thermostat is online';
            } else {
                return 'Sorry, the thermostat is offline at the moment.';
            }
        } finally {
            await client.logout();
        }
    }

    async status() {
        console.log('Requesting status...');
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
        
        let status = await this._holdStrategy.status();
        console.log(status);
        if (status.status === 'running') {
            let timeSinceStart = (moment().diff(status.startDate) / 1000).toFixed(0);
            let durationSinceStart = new Duration(`PT${timeSinceStart}S`);
            let timeToGo = status.duration.subtract(durationSinceStart);
            messages.push(`The heating is ${qualifier} on and will turn off in ${this.speakDuration(timeToGo)}`);
        }
        else {
            messages.push(`The heating is ${qualifier} on`);
        }
    }

    async turnUp() {
        console.log('Turning up...');
        let client = await this.login();

        try {
            await this.verifyOnline(client);
            let device = await client.device();
            this.verifyContactable(device);

            if (device.status == 'on') {
                throw 'The heating is already on.';
            }

            let t = device.targetTemperature + 0.5;
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
        console.log('Turning down...');
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
        console.log(`Turning ${onOff}...`);

        let thermostat = await this.obtainThermostat();
        let t = thermostat.defaultOnTemp;
        if (onOff === 'off') {
            t = thermostat.defaultOffTemp;
        }

        return this.setTemperature(t, duration);
    }

    async setTemperature(targetTemperature, forDuration) {
        console.log(`Setting temperature to ${targetTemperature}...`);
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
                let duration = forDuration || thermostat.defaultDuration;
                let intent = await this._holdStrategy.holdIfRequiredFor(duration);
                return messages.concat(this.summarize(intent, updatedDevice));
            }
            return messages;
        } finally {
            await client.logout();
        }
    }

    summarize(intent, updatedDevice) {
        if (!intent.holding) {
            if (updatedDevice.status == 'on') {
                return ['The heating is now on.'];
            }
            return [];
        }

        let durationText = this.speakDuration(intent.duration);
        console.log(`Holding for ${durationText} {${intent.executionId}}`);
        if (updatedDevice.status == 'on') {
            return [`The heating is now on and will turn off in ${durationText}`];
        }
        
        return [`The heating will turn off in ${durationText}`];
    }

    async setDefault(name, value) {
        console.log(`Setting default ${name} to ${value}...`);

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

        return [`The default ${nameText} has been set to ${valueText}`];
    }

    logStatus(device) {
        console.log(`${new Date().toISOString()} ${device.currentTemperature} => ${device.targetTemperature} (${device.status})`);
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