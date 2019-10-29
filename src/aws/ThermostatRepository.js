'use strict';

const DynamoDB = require('aws-sdk/clients/dynamodb');
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
            this._client = new DynamoDB.DocumentClient(options);
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

    async findByUserId(userId) {
        const params = {
            TableName
        };
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

    async findByLinkedUserId(userId) {
        const params = {
            TableName
        };
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

    async find(userId) {
        if (userId.startsWith('amzn1.ask.') || userId === 'template') {
            return await this.findByUserId(userId);
        }

        return await this.findByLinkedUserId(userId);
    }

    async save(thermostat) {
        const { updateField, updateValue } = await this.determineUpdatedField(thermostat);

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

    async determineUpdatedField(thermostat) {
        let existingThermostat = await this.find(thermostat.userId);

        if (existingThermostat.executionId !== thermostat.executionId) {
            return {
                updateField: 'executionId',
                updateValue: thermostat.executionId
            };
        }
        if (existingThermostat.defaultDuration !== thermostat.defaultDuration) {
            return {
                updateField: 'defaultDuration',
                updateValue: thermostat.defaultDuration
            };
        }
        if (existingThermostat.defaultOnTemp !== thermostat.defaultOnTemp) {
            return {
                updateField: 'defaultOnTemp',
                updateValue: thermostat.defaultOnTemp
            };
        }
        if (existingThermostat.defaultOffTemp !== thermostat.defaultOffTemp) {
            return {
                updateField: 'defaultOffTemp',
                updateValue: thermostat.defaultOffTemp
            };
        }
        if (existingThermostat.defaultWaterDuration !== thermostat.defaultWaterDuration) {
            return {
                updateField: 'defaultWaterDuration',
                updateValue: thermostat.defaultWaterDuration
            };
        }
    }
}

module.exports = ThermostatRepository;