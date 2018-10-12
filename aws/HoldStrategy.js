const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');
const helpers = require('./helpers');
const ThermostatRepository = require('./ThermostatRepository');

class HoldStrategy {
    constructor(context) {
        this._context = context;
        this._thermostatRepository = new ThermostatRepository();
        this._stepFunctions = new AWS.StepFunctions();
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

        if (!durationValue) {
            console.log('No callback required...');
            return { holding: false, duration: null };
        } 

        console.log('Configuring callback...');
        var duration = new Duration(durationValue);
        await this.stopHoldIfRequired(thermostat.executionId);
        var data = await this.startHold(duration);

        thermostat.executionId = data.executionArn;
        await this._thermostatRepository.save(thermostat);

        return {
                holding: true,
                duration: duration,
                executionId: data.executionArn
        };
    }

    async stopHoldIfRequired(executionId) {
        if (!executionId) {
            console.log('No current execution id');
            return;
        }
        console.log(`Stopping hold ${executionId}...`);
        var params = {
            cause: "Superceded by user request",
            executionArn: executionId
        };
        await this._stepFunctions.stopExecution(params).promise();
    }

    async startHold(duration) {
        var params = {
            stateMachineArn: process.env.STEP_FUNCTION_ARN,
            input: JSON.stringify(helpers.turnOffCallbackPayload(duration.inSeconds()))
        };

        return await this._stepFunctions.startExecution(params).promise();
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