const SalusClient = require('./SalusClient');
const HoldStrategy = require('./AwsHoldStrategy');
const helpers = require('./helpers');

class ControlService {
    async login() {
        var client = new SalusClient();
        await client.login(process.env.USERNAME, process.env.PASSWORD);
        return client;
    };

    async verifyOnline(client) {
        var online = await client.online();
        if (!online) {
            throw "Sorry, the boiler is offline at the moment.";
        }
    };

    verifyContactable(device) {
        if (!device.contactable) {
            throw "Sorry, I couldn't contact the boiler.";
        }
    };

    async launch() {
        var client = await this.login();
        if (await client.online()) {
            return "Boiler is online";
        } else {
            return "Sorry, the boiler is offline at the moment.";
        }
    };

    async status() {
        console.log('Requesting status...');
        var client = await this.login();
        await this.verifyOnline(client);
        var device = await client.device();
        this.verifyContactable(device);

        var messages = [];
        messages.push(`The current temperature is ${helpers.speakTemperature(device.currentTemperature)} degrees.`);
        messages.push(`The target is ${helpers.speakTemperature(device.targetTemperature)} degrees.`);
        if (device.status == 'on') messages.push('The heating is on');

        helpers.logStatus(device);
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
        messages.push(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        if (updatedDevice.status == 'on') messages.push('The heating is now on.');
        helpers.logStatus(device);
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
        messages.push(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        if (updatedDevice.status == 'on') messages.push('The heating is still on though.');
        helpers.logStatus(updatedDevice);
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
        messages.push(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        if (updatedDevice.status == 'on') messages.push('The heating is now on.');
        helpers.logStatus(updatedDevice);
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
        messages.push(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        helpers.logStatus(updatedDevice);

        var holdStrategy = new HoldStrategy();
        var intent = await holdStrategy.holdIfRequiredFor(duration);
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

    async holdStatus() {
        var executionId = 'x';
        var holdStrategy = new HoldStrategy();
        var status = await holdStrategy.statusOf(executionId);
        return status;
    }
}

module.exports = ControlService;