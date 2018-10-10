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

        var response = await this.client.get(params).promise();
        if (response.Item) {
            var thermostat = response.Item;
            thermostat.duration = new Duration(thermostat.duration);
            return thermostat;
        }
        return null;
    }

    async save(thermostat) {
        const params = {
            TableName,
            Key: {
                userId: thermostat.userId
            },
            UpdateExpression: "set executionId=:eid",
            ExpressionAttributeValues: {
                ":eid": thermostat.executionId
            },
            ReturnValues: "UPDATED_NEW"
        };

        await this.client.update(params).promise();
    }
}

module.exports = ThermostatRepository;