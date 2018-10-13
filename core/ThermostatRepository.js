'use strict';

class ThermostatRepository {
    async add(thermostat) { // eslint-disable-line no-unused-vars
        console.log('Thermostat data will not be persisted');
    }

    async find(userId) { 
        return {
            userId: userId,
            type: process.env.THERMOSTAT_TYPE,
            options: {
                username: process.env.USERNAME,
                password: process.env.PASSWORD
            }
        };
    }

    async save(thermostat) { // eslint-disable-line no-unused-vars
        console.log('Thermostat data will not be persisted');
    }
}

module.exports = ThermostatRepository;