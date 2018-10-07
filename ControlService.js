const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');
const SalusClient = require('./SalusClient');
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
        if (device.status == 'on') messages.push('The heating is on.');
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

        var intent = await this.andHoldIfRequiredFor(duration);
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

    andHoldIfRequiredFor(durationValue) {
        return new Promise((resolve, reject) => {
            console.log(`Duration: ${durationValue}`);
            if (typeof durationValue == 'undefined') {
                console.log('No callback required...');
                resolve({ holding: false, duration: null });
            } else {
                console.log('Configuring callback...');
                var duration = new Duration(durationValue);
                var stepfunctions = new AWS.StepFunctions();
                var params = {
                    stateMachineArn: process.env.STEP_FUNCTION_ARN,
                    input: JSON.stringify(helpers.turnOffCallbackPayload(duration.inSeconds()))
                };
                console.log('Registering callback...');
                stepfunctions.startExecution(params, (err, data) => {
                    if (err) { console.log(err, err.stack); reject(err); }
                    console.log('Registered callback');
                    resolve({ 
                        holding: true,
                        duration: duration,
                        executionId: data.executionArn
                    });
                });
            }
        });
    }

    statusOf(executionId) {
        return new Promise((resolve, reject) => {
            var stepfunctions = new AWS.StepFunctions();
            var params = {
                executionArn: executionId 
            };
            stepfunctions.describeExecution(params, (err, data) => {
                if (err) { console.log(err, err.stack); reject(err); }
                resolve({
                    status: data.status,
                    duration: JSON.parse(data.input).duration
                });
            });
        });
    }
}

module.exports = ControlService;