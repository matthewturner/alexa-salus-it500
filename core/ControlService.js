const Salus = require('../thermostats/Salus');
const HoldStrategy = require('../aws/HoldStrategy');

class ControlService {
    constructor(context) {
        this._context = context;
        this._holdStrategy = new HoldStrategy(this._context);
    }

    async login() {
        var client = new Salus();
        await client.login(process.env.USERNAME, process.env.PASSWORD);
        return client;
    };

    async verifyOnline(client) {
        var online = await client.online();
        if (!online) {
            throw "Sorry, the thermostat is offline at the moment.";
        }
    };

    verifyContactable(device) {
        if (!device.contactable) {
            throw "Sorry, I couldn't contact the thermostat.";
        }
    };

    async launch() {
        var client = await this.login();
        if (await client.online()) {
            return "thermostat is online";
        } else {
            return "Sorry, the thermostat is offline at the moment.";
        }
    };

    async status() {
        console.log('Requesting status...');
        var client = await this.login();
        await this.verifyOnline(client);
        var device = await client.device();
        this.verifyContactable(device);

        var status = await this._holdStrategy.status();

        var messages = [];
        messages.push(`The current temperature is ${this.speakTemperature(device.currentTemperature)} degrees.`);
        messages.push(`The target is ${this.speakTemperature(device.targetTemperature)} degrees.`);
        if (device.status == 'on') {
            console.log(status);
            if (status.status === 'running') {
                messages.push(`The heating is on and will turn off in ${status.duration.ago().replace(' ago', '')}`);
            } else {
                messages.push('The heating is on');
            }
        }

        this.logStatus(device);
        return messages;
    };

    async turnUp() {
        console.log('Turning up...');
        var client = await this.login();
        await this.verifyOnline(client);
        var device = await client.device();
        this.verifyContactable(device);

        if (device.status == 'on') {
            throw 'The heating is already on.';
        }

        var t = device.targetTemperature + 0.5;
        await client.setTemperature(t);
        var updatedDevice = await client.device();

        var messages = [];
        messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        if (updatedDevice.status == 'on') messages.push('The heating is now on.');
        this.logStatus(device);
        return messages;
    };

    async turnDown() {
        console.log('Turning down...');
        var client = await this.login();
        await this.verifyOnline(client);
        var device = await client.device();
        this.verifyContactable(device);

        var t = device.targetTemperature - 1.0;
        await client.setTemperature(t);
        var updatedDevice = await client.device();

        var messages = [];
        messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        if (updatedDevice.status == 'on') messages.push('The heating is still on though.');
        this.logStatus(updatedDevice);
        return messages;
    };

    async setTemperature(targetTemperature) {
        console.log(`Setting temperature to ${targetTemperature}...`);
        var client = await this.login();
        await this.verifyOnline(client);
        var device = await client.device();
        this.verifyContactable(device);

        await client.setTemperature(targetTemperature);
        var updatedDevice = await client.device();

        var messages = [];
        messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        if (updatedDevice.status == 'on') messages.push('The heating is now on.');
        this.logStatus(updatedDevice);
        return messages;
    };

    async turn(onOff, duration) {
        console.log(`Turning ${onOff}...`);
        var client = await this.login();
        await this.verifyOnline(client);
        var device = await client.device();
        this.verifyContactable(device);

        var t = process.env.DEFAULT_ON_TEMP || '20';
        if (onOff === 'off') {
            t = process.env.DEFAULT_OFF_TEMP || '14';
        }

        await client.setTemperature(t);
        var updatedDevice = await client.device();

        var messages = [];
        messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        this.logStatus(updatedDevice);

        var intent = await this._holdStrategy.holdIfRequiredFor(duration);
        if (intent.holding) {
            var durationText = intent.duration.ago().replace(' ago', '');
            console.log(`Holding for ${durationText} {${intent.executionId}}`);
            if (updatedDevice.status == 'on') {
                messages.push(`The heating is now on and will turn off in ${durationText}`);
            } else {
                messages.push(`The heating will turn off in ${durationText}`);
            }
        } else {
            if (updatedDevice.status == 'on') { messages.push('The heating is now on.'); }
        }
        return messages;
    }

    logStatus(device) {
        console.log(`${new Date().toISOString()} ${device.currentTemperature} => ${device.targetTemperature} (${device.status})`);
    }
    
    speakTemperature(temp) {
        var t = parseFloat(temp);
        if (parseFloat(t.toFixed(0)) != t) return t.toFixed(1);
        else return t.toFixed(0);
    }
}

module.exports = ControlService;