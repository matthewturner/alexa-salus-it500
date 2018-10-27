class ControlService {
    constructor(context, holdStrategy, thermostatFactory, thermostatRepository) {
        this._context = context;
        this._holdStrategy = holdStrategy;
        this._thermostatRepository = thermostatRepository;
        this._thermostatFactory = thermostatFactory;
    }

    async login() {
        console.log('Finding thermostat...');
        let thermostat = await this._thermostatRepository.find(this._context.userId);
        let options = thermostat.options;
        let client = this._thermostatFactory.create(thermostat.type, options);
        await client.login();
        return client;
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
        if (await client.online()) {
            return 'Thermostat is online';
        } else {
            return 'Sorry, the thermostat is offline at the moment.';
        }
    }

    async status() {
        console.log('Requesting status...');
        let client = await this.login();
        await this.verifyOnline(client);
        let device = await client.device();
        this.verifyContactable(device);

        let messages = [];
        messages.push(`The current temperature is ${this.speakTemperature(device.currentTemperature)} degrees.`);
        messages.push(`The target is ${this.speakTemperature(device.targetTemperature)} degrees.`);
        await this.determineIfHolding(device, messages);

        this.logStatus(device);
        return messages;
    }

    async determineIfHolding(device, messages, qualifier = '') {
        if (device.status !== 'on') { return; }
        
        let status = await this._holdStrategy.status();
        console.log(status);
        if (status.status === 'running') {
            messages.push(`The heating is ${qualifier} on and will turn off in ${status.duration.ago().replace(' ago', '')}`);
        }
        else {
            messages.push(`The heating is ${qualifier} on`);
        }
    }

    async turnUp() {
        console.log('Turning up...');
        let client = await this.login();
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
    }

    async turnDown() {
        console.log('Turning down...');
        let client = await this.login();
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
    }

    async setTemperature(targetTemperature) {
        console.log(`Setting temperature to ${targetTemperature}...`);
        let client = await this.login();
        await this.verifyOnline(client);
        let device = await client.device();
        this.verifyContactable(device);

        await client.setTemperature(targetTemperature);
        let updatedDevice = await client.device();

        let messages = [];
        messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        await this.determineIfHolding(updatedDevice, messages, 'now');

        this.logStatus(updatedDevice);
        return messages;
    }

    async turn(onOff, duration) {
        console.log(`Turning ${onOff}...`);
        let client = await this.login();
        await this.verifyOnline(client);
        let device = await client.device();
        this.verifyContactable(device);

        let t = process.env.DEFAULT_ON_TEMP || '20';
        if (onOff === 'off') {
            t = process.env.DEFAULT_OFF_TEMP || '14';
        }

        console.log(`Setting temperature to ${t}...`);
        await client.setTemperature(t);
        let updatedDevice = await client.device();

        let messages = [];
        messages.push(`The target temperature is now ${this.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
        this.logStatus(updatedDevice);

        let intent = await this._holdStrategy.holdIfRequiredFor(duration);
        if (intent.holding) {
            let durationText = intent.duration.ago().replace(' ago', '');
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
        let t = parseFloat(temp);
        if (parseFloat(t.toFixed(0)) != t) return t.toFixed(1);
        else return t.toFixed(0);
    }
}

module.exports = ControlService;