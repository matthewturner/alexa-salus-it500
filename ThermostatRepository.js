'use strict';

const Duration = require('durationjs');
const AWS = require('aws-sdk');

const TableName = 'thermostats';

class ThermostatRepository {
    get client() {
        if (!this._client) {
            const options = { region: 'eu-west-1' };
            this._client = new AWS.DynamoDB.DocumentClient(options)
        }
        return this._client;
    }

    async find(userId) {
        const params = {
            TableName,
            Key: {
                userId
            }
        };

        var response = await this.client.get(params).promise();
        if (response.Item) {
            var thermostat = response.Item;
            thermostat.duration = new Duration(thermostat.duration);
            return thermostat;
        }
        return null;
    }

    async update(thermostat) {
        const params = {
            TableName,
            Key: {
                userId: thermostat.userId
            },
            // UpdateExpression: `set ${expressions.join(', ')}`,
            // ExpressionAttributeValues: values,
            ReturnValues: 'ALL_NEW'
        };

        await client.update(params).promise();
    }
}

module.exports = ThermostatRepository;