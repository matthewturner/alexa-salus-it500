const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');

class AwsHoldStrategy {
    holdIfRequiredFor(durationValue) {
        return new Promise((resolve, reject) => {
            console.log(`Duration: ${durationValue}`);
            if (typeof durationValue == 'undefined') {
                console.log('No callback required...');
                resolve({ holding: false, duration: null });
            } else {
                console.log('Configuring callback...');
                var duration = new Duration(durationValue);
                var stepfunctions = new AWS.StepFunctions();
                var params = {
                    stateMachineArn: process.env.STEP_FUNCTION_ARN,
                    input: JSON.stringify(helpers.turnOffCallbackPayload(duration.inSeconds()))
                };
                console.log('Registering callback...');
                stepfunctions.startExecution(params, (err, data) => {
                    if (err) { console.log(err, err.stack); reject(err); }
                    console.log('Registered callback');
                    resolve({ 
                        holding: true,
                        duration: duration,
                        executionId: data.executionArn
                    });
                });
            }
        });
    }

    statusOf(executionId) {
        return new Promise((resolve, reject) => {
            var stepfunctions = new AWS.StepFunctions();
            var params = {
                executionArn: executionId 
            };
            stepfunctions.describeExecution(params, (err, data) => {
                if (err) { console.log(err, err.stack); reject(err); }
                resolve({
                    status: data.status,
                    duration: JSON.parse(data.input).duration
                });
            });
        });
    }
}

module.exports = AwsHoldStrategy;