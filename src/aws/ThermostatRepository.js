'use strict';

const AWS = require('aws-sdk');
const helpers = require('./helpers');

const TableName = 'thermostats';

class ThermostatRepository {
    constructor(logger) {
        this._logger = logger;
    }

    get client() {
        if (!this._client) {
            const options = {
                region: 'eu-west-1'
            };
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
            TableName
        };

        if (userId.startsWith('amzn1.ask.') || userId === 'template') {
            this._logger.debug(`Searching by userId ${userId}...`);
            params.Key = {
                userId
            };
            let response = await this.client.get(params).promise();
            if (response.Item) {

                this._logger.debug(`Found thermostat for user ${helpers.truncateUserId(userId)} with username ${response.Item.options.username}`);
                return response.Item;
            }
            return null;
        }

        this._logger.debug(`Searching by linkedUserId ${userId}...`);
        params.IndexName = 'linkedUserId-index';
        params.KeyConditionExpression = 'linkedUserId = :linkedUserId';
        params.ExpressionAttributeValues = {
            ':linkedUserId': userId
        };
        this._logger.debug(JSON.stringify(params));
        let response = await this.client.query(params).promise();
        if (response.Count == 1) {
            this._logger.debug(`Found thermostat for user ${helpers.truncateUserId(userId)} with username ${response.Items[0].options.username}`);
            return response.Items[0];
        }
        return null;
    }

    async save(thermostat) {
        let existingThermostat = await this.find(thermostat.userId);

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
        } else if (existingThermostat.defaultWaterDuration !== thermostat.defaultWaterDuration) {
            updateField = 'defaultWaterDuration';
            updateValue = thermostat.defaultWaterDuration;
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