const Duration = require('durationjs');

const Service = require('./Service');

class DefaultsService extends Service {
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
}

module.exports = DefaultsService;