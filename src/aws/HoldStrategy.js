const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');
const helpers = require('./helpers');
const ThermostatRepository = require('./ThermostatRepository');

class HoldStrategy {
    constructor(logger, context) {
        this._logger = logger;
        this._context = context;
        this._thermostatRepository = new ThermostatRepository(logger);
        this._stepFunctions = new AWS.StepFunctions();
    }

    async holdIfRequiredFor(durationValue) {
        this._logger.debug(`Duration: ${durationValue}`);
        let thermostat = await this._thermostatRepository.find(this._context.userId);

        if (!durationValue) {
            this._logger.debug('No callback required...');
            return {
                holding: false,
                duration: null
            };
        }

        this._logger.debug('Configuring callback...');
        let duration = new Duration(durationValue);
        await this.stopHoldIfRequired(thermostat.executionId);
        let data = await this.startHold(duration);

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
            this._logger.debug('No current execution id');
            return;
        }
        this._logger.debug(`Stopping hold ${executionId}...`);
        let params = {
            executionArn: executionId
        };
        try {
            let currentExecution = await this._stepFunctions.describeExecution(params).promise();
            if (currentExecution.status === 'RUNNING') {
                params = {
                    cause: 'Superceded by user request',
                    executionArn: executionId
                };
                await this._stepFunctions.stopExecution(params).promise();
            }
        } catch (error) {
            this._logger.debug('Execution could not be stopped');
            this._logger.debug(error);
        }
    }

    async startHold(duration) {
        this._logger.debug(`Holding for ${duration.inSeconds()} seconds...`);
        let params = {
            stateMachineArn: process.env.STEP_FUNCTION_ARN,
            input: JSON.stringify(helpers.turnOffCallbackPayload(this._context.userId, duration.inSeconds()))
        };

        return await this._stepFunctions.startExecution(params).promise();
    }

    async status() {
        let thermostat = await this._thermostatRepository.find(this._context.userId);

        if (!thermostat.executionId) {
            return {
                status: 'n/a',
                duration: null,
                startDate: null
            };
        }

        let params = {
            executionArn: thermostat.executionId
        };
        let currentExecution = await this._stepFunctions.describeExecution(params).promise();
        return {
            status: currentExecution.status.toLowerCase(),
            duration: new Duration(JSON.parse(currentExecution.input).duration),
            startDate: currentExecution.startDate
        };
    }
}

module.exports = HoldStrategy;