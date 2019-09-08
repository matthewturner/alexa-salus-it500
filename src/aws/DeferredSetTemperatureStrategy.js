const AWS = require('aws-sdk');

/**
 * Publishes a message to an SNS topic rather than set
 * the temperature directly. The lambda will be recalled
 * later and has the opportunity to actually set the 
 * temperature.
 * @class
 */
class DeferredSetTemperatureStrategy {
    constructor(logger, event) {
        this._logger = logger;
        this._event = event;
        this._publisher = new AWS.SNS({
            apiVersion: '2010-03-31'
        });
    }

    async setTemperature(client, temperature) {
        let defer = true;
        if (this._event.directive.payload.defer !== undefined) {
            defer = this._event.directive.payload.defer;
        }
        this._logger.debug(`Defer: ${defer}; Should Defer: ${client.shouldDefer}`);
        if (defer && client.shouldDefer) {
            this._logger.debug('Setting temperature will be deferred...');
            this._event.directive.payload.defer = false;

            const params = {
                Message: JSON.stringify(this._event),
                TopicArn: process.env.DEFERRED_SET_TEMPERATURE_TOPIC
            };

            this._logger.debug(`Publishing event to topic ${params.TopicArn}:`);
            this._logger.debug(params.Message);

            const response = await this._publisher.publish(params).promise();
            this._logger.debug(JSON.stringify(response));

            const updatedDevice = await client.device();
            updatedDevice.targetTemperature = temperature;
            this._logger.debug('Reporting device state as:');
            this._logger.debug(JSON.stringify(updatedDevice));

            return updatedDevice;
        } else {
            this._logger.debug('Setting temperature...');
            await client.setTemperature(temperature);
            const updatedDevice = await client.device();
            return updatedDevice;
        }
    }
}

module.exports = DeferredSetTemperatureStrategy;