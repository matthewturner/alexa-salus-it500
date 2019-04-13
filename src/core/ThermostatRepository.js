'use strict';

class ThermostatRepository {
    constructor(logger) {
        this._logger = logger;
    }

    async add(thermostat) { // eslint-disable-line no-unused-vars
        this._logger.debug('Thermostat data will not be persisted');
    }

    async find(userId) {
        this._logger.debug('Retrieving thermostat data from environment...');
        return {
            userId: userId,
            type: process.env.THERMOSTAT_TYPE,
            options: {
                username: process.env.USERNAME,
                password: process.env.PASSWORD
            },
            defaultOnTemp: parseFloat(process.env.DEFAULT_ON_TEMP || '20'),
            defaultOffTemp: parseFloat(process.env.DEFAULT_OFF_TEMP || '14'),
            defaultDuration: process.env.DEFAULT_DURATION || 'PT1H',
            defaultWaterDuration: process.env.DEFAULT_WATER_DURATION || 'PT1H'
        };
    }

    async save(thermostat) { // eslint-disable-line no-unused-vars
        this._logger.debug('Thermostat data will not be persisted');
    }
}

module.exports = ThermostatRepository;