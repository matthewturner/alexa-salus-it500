const _ = require('lodash');
const Duration = require('durationjs');

class Service {
    constructor(logger, context, thermostatFactory, thermostatRepository) {
        this._logger = logger;
        this._context = context;
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
            thermostat = {
                userId: this._context.userId,
                executionId: null
            };
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

    speakDuration(duration) {
        if (duration.inHours() > 1 && duration.inHours() < 2) {
            return `1 hour and ${duration.subtract(new Duration('PT1H')).ago().replace(' ago', '')}`;
        } else {
            return duration.ago().replace(' ago', '');
        }
    }

    createResponse(messages, client, options = {}) {
        const card = client.card();
        return _.merge({
            messages,
            card
        }, options);
    }
}

module.exports = Service;