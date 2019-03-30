'use strict';

const AWS = require('aws-sdk');

const TableName = 'thermostats';

class ThermostatRepository {
    get client() {
        if (!this._client) {
            const options = { region: 'eu-west-1' };
            this._client = new AWS.DynamoDB.DocumentClient(options);
        }
        return this._client;
    }

    async add(thermostat) {
        const params = {
            TableName,
            Item: {
                userId: thermostat.userId,
                executionId: thermostat.executionId
            }
        };

        await this.client.put(params).promise();
    }

    async find(userId) {
        const params = {
            TableName,
            Key: {
                userId
            }
        };

        let response = await this.client.get(params).promise();
        if (response.Item) {
            console.log(`Found thermostat for user ${userId} with username ${response.Item.options.username}`);
            return response.Item;
        }
        return null;
    }

    async save(thermostat) {
        let existingThermostat = await find(thermostat.userId);

        let updateField = 'executionId';
        let updateValue = thermostat.executionId;
        if (existingThermostat.executionId !== thermostat.executionId) {
            updateField = 'executionId';
            updateValue = thermostat.executionId;
        } else if (existingThermostat.defaultDuration !== thermostat.defaultDuration) {
            updateField = 'defaultDuration';
            updateValue = thermostat.defaultDuration;
        } else if (existingThermostat.defaultOnTemp !== thermostat.defaultOnTemp) {
            updateField = 'defaultOnTemp';
            updateValue = thermostat.defaultOnTemp;
        } else if (existingThermostat.defaultOffTemp !== thermostat.defaultOffTemp) {
            updateField = 'defaultOffTemp';
            updateValue = thermostat.defaultOffTemp;
        }

        const params = {
            TableName,
            Key: {
                userId: thermostat.userId
            },
            UpdateExpression: `set ${updateField}=:updateField`,
            ExpressionAttributeValues: {
                ':updateField': updateValue
            },
            ReturnValues: 'UPDATED_NEW'
        };

        await this.client.update(params).promise();
    }
}

module.exports = ThermostatRepository;