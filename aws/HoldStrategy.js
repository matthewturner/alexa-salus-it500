const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');
const helpers = require('./helpers');
const ThermostatRepository = require('./ThermostatRepository');

class HoldStrategy {
    constructor(context) {
        this._context = context;
        this._thermostatRepository = new ThermostatRepository();
    }

    async holdIfRequiredFor(durationValue) {
        console.log(`Duration: ${durationValue}`);
        var thermostat = await this._thermostatRepository.find(this._context.userId);
        if (!thermostat) {
            thermostat = {
                userId: this._context.userId,
                executionId: null
            };
            await this._thermostatRepository.add(thermostat);
        }

        if (typeof durationValue == 'undefined') {
            console.log('No callback required...');
            thermostat.executionId = null;
            await this._thermostatRepository.save(thermostat);
            return { holding: false, duration: null };
        } else {
            console.log('Configuring callback...');
            var duration = new Duration(durationValue);
            var stepfunctions = new AWS.StepFunctions();
            var params = {
                stateMachineArn: process.env.STEP_FUNCTION_ARN,
                input: JSON.stringify(helpers.turnOffCallbackPayload(duration.inSeconds()))
            };

            var data = await stepfunctions.startExecution(params).promise();

            thermostat.executionId = data.executionArn;
            await this._thermostatRepository.save(thermostat);

            return {
                    holding: true,
                    duration: duration,
                    executionId: data.executionArn
            };
        }
    }

    async status() {
        var thermostat = await this._thermostatRepository.find(this._context.userId);

        if (!thermostat.executionId) {
            return {
                status: 'n/a',
                duration: null
            };
        }

        var stepfunctions = new AWS.StepFunctions();
        var params = {
            executionArn: thermostat.executionId
        };
        var currentExecution = await stepfunctions.describeExecution(params).promise();
        return {
            status: currentExecution.status.toLowerCase(),
            duration: new Duration(JSON.parse(currentExecution.input).duration)
        };
    }
}

module.exports = HoldStrategy;