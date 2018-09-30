var request = require('request');
const alexa = require('alexa-app');
const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');

const host = 'https://salus-it500.com';

// Allow this module to be reloaded by hotswap when changed
module.change_code = 0;

// The crucial pieces of information
var devId;
var token;

// Enable cookies
var request = request.defaults({
	jar: true
});

function timeString() {
	var dat = new Date();
	var days = (dat.getYear() * 365) + (dat.getMonth() * 31) + dat.getDate();
	return (days * 86400) + ((dat.getUTCHours() * 60) + dat.getUTCMinutes()) * 60 + dat.getUTCSeconds();
}

function logTimeString(timeDelimiter, zulu) {
	var dat = new Date();
	var y = dat.getFullYear() + "";
	var m = dat.getMonth() + 1;
	if (m < 10) m = "0" + m;
	else m = m + "";
	var d = dat.getDate();
	if (d < 10) d = "0" + d;
	else d = d + "";

	var h = dat.getHours();
	if (h < 10) h = "0" + h;
	else h = h + "";
	var mm = dat.getMinutes();
	if (mm < 10) mm = "0" + mm;
	else mm = mm + "";
	var ss = dat.getSeconds();
	if (ss < 10) ss = "0" + ss;
	else ss = ss + "";

	var z = '';
	if (zulu) z = 'Z';

	return (`${y}-${m}-${d}${timeDelimiter}${h}:${mm}:${ss}${z}`);
}

async function login() {
	client = new SalusClient();
	await client.login(process.env.USERNAME, process.env.PASSWORD);
	var credentials = client.credentials();
	devId = credentials.devId;
	token = credentials.token;
}

function whenOnline(callback, offlineCallback) {
	request.get(`${host}/public/ajax_device_online_status.php?devId=${devId}&token=${token}&_=${timeString()}`,
		(error, response, body) => {
			if (!error && response.statusCode == 200) {
				if ((body == '"online"') || (body == '"online lowBat"')) callback();
				else offlineCallback();
			} else offlineCallback();
		});
}

function withDeviceValues(callback) {
	request.get(`${host}/public/ajax_device_values.php?devId=${devId}&token=${token}&_=${timeString()}`,
		(error, response, body) => {
			if (!error && response.statusCode == 200) {
				callback(JSON.parse(body));
			}
		});
}

function setTemperature(temp, callback) {
	var t = parseFloat(temp).toFixed(1);
	console.log("Setting temp: " + t);
	var form = {
		form: {
			'token': token,
			'tempUnit': 0,
			'devId': devId,
			'current_tempZ1_set': 1,
			'current_tempZ1': t
		}
	};

	request.post(`${host}/includes/set.php`, form,
		(error, response, body) => {
			if (!error) callback();
		});
}

function speakTemperature(temp) {
	var t = parseFloat(temp);
	if (parseFloat(t.toFixed(0)) != t) return t.toFixed(1);
	else return t.toFixed(0);
}

function andHoldIfRequiredFor(durationValue, callback) {
	console.log('Duration: ' + durationValue);
	if (typeof durationValue == 'undefined') {
		callback(false, null);
	} else {
		var duration = new Duration(durationValue);
		var stepfunctions = new AWS.StepFunctions();
		var params = {
			stateMachineArn: process.env.STEP_FUNCTION_ARN,
			input: JSON.stringify(turnOffCallbackPayload(duration.inSeconds()))
		};
		console.log('Registering callback...');
		stepfunctions.startExecution(params, (err, data) => {
			if (err) { console.log(err, err.stack); }
			callback(true, duration);
		});
	}
}

function logStatus(v) {
	console.log(`${logTimeString(' ', false)}, ${v.CH1currentRoomTemp}, ${v.CH1currentSetPoint}, ${v.CH1heatOnOffStatus}`);
}

function turnOffCallbackPayload(duration) {
	return {
		"duration": duration,
		"version": "1.0",
		"session": {
			"new": true,
			"user": {
				"userId": process.env.ALEXA_USER_ID
			}
		},

		"request": {
			"type": "IntentRequest",
			"requestId": process.env.ALEXA_REQUEST_ID,
			"timestamp": logTimeString('T', true),
			"locale": "en-GB",
			"intent": {
				"name": "TurnIntent",
				"confirmationStatus": "NONE",
				"slots": {
					"onoff": {
						"name": "onoff",
						"value": "off",
						"resolutions": {
							"resolutionsPerAuthority": [
								{
									"authority": process.env.ALEXA_AUTHORITY,
									"status": {
										"code": "ER_SUCCESS_MATCH"
									},
									"values": [
										{
											"value": {
												"name": "off",
												"id": process.env.ALEXA_OFF_VALUE_ID
											}
										}
									]
								}
							]
						},
						"confirmationStatus": "NONE"
					}
				}
			}
		}
	};
}

// Define an alexa-app
var app = new alexa.app('boiler');

app.pre = (request, response, type) => { };

app.launch(async (req, res) => {
	console.log('Launching...');
	await login();
	whenOnline(() => {
		res.say("Boiler is online");
		res.send();
	},
		() => {
			res.say("Sorry, the boiler is offline at the moment.");
			res.send();
		});
	console.log("before return");
	return false;
});

app.intent('TempIntent', {
	"utterances": ["what the temperature is", "the temperature", "how hot it is"]
}, async (req, res) => {
	await login();
	whenOnline(() => {
		withDeviceValues((v) => {
			if (v.CH1currentSetPoint == 32.0) {
				res.say("Sorry, I couldn't contact the boiler.");
			} else {
				res.say(`The current temperature is ${speakTemperature(v.CH1currentRoomTemp)} degrees.`);
				res.say(`The target is ${speakTemperature(v.CH1currentSetPoint)} degrees.`);
				if (v.CH1heatOnOffStatus == 1) res.say('The heating is on.');
			}
			logStatus(v);
			res.send();
		});
	}, () => {
		res.say("Sorry, the boiler is offline at the moment.");
		res.send();
	});

	return false;
});

app.intent('TurnUpIntent', {
	"utterances": ["to increase", "to turn up", "set warmer", "set higher"]
}, async (req, res) => {
	await login();
	whenOnline(() => {
		withDeviceValues((v) => {

			// Heating is already on, don't make any changes 
			if (v.CH1heatOnOffStatus == 1) {
				res.say('The heating is already on.');
				res.send();
			} else if (v.CH1currentSetPoint == 32.0) {
				res.say("Sorry, I couldn't contact the boiler.");
				res.send();
			} else {
				var t = parseFloat(v.CH1currentSetPoint) + 0.5;
				setTemperature(t, () => {
					withDeviceValues((v) => {
						res.say(`The target temperature is now ${speakTemperature(v.CH1currentSetPoint)} degrees.`);
						if (v.CH1heatOnOffStatus == 1) res.say('The heating is now on.');
						logStatus(v);
						res.send();
					});
				});
			}
		});
	}, () => {
		res.say("Sorry, the boiler is offline at the moment.");
		res.send();
	});
	return false;
});

app.intent('TurnDownIntent', {
	"utterances": ["to decrease", "to turn down", "set cooler", "set lower"]
}, async (req, res) => {
	await login();
	whenOnline(() => {
		withDeviceValues((v) => {

			if (v.CH1currentSetPoint == 32.0) {
				res.say("Sorry, I couldn't contact the boiler.");
				res.send();
			} else {
				var t = parseFloat(v.CH1currentSetPoint) - 1.0;
				setTemperature(t, () => {
					withDeviceValues((v) => {
						res.say(`The target temperature is now ${speakTemperature(v.CH1currentSetPoint)} degrees.`);
						if (v.CH1heatOnOffStatus == 1) res.say('The heating is still on though.');
						logStatus(v);
						res.send();
					});
				});
			}
		});
	}, () => {
		res.say("Sorry, the boiler is offline at the moment.");
		res.send();
	});
	return false;
});

app.intent('SetTempIntent', {
	"slots": {
		"temp": "AMAZON.NUMBER"
	},
	"utterances": ["to set to {temp} degrees", "to set the temperature to {temp} degrees", "to set the temp to {temp} degrees"]
}, async (req, res) => {
	await login();
	whenOnline(() => {
		withDeviceValues((v) => {
			if (v.CH1currentSetPoint == 32.0) {
				res.say("Sorry, I couldn't contact the boiler.");
				res.send();
			} else {
				var t = req.slot("temp");
				setTemperature(t, () => {
					withDeviceValues((v) => {
						res.say(`The target temperature is now ${speakTemperature(v.CH1currentSetPoint)} degrees.`);
						if (v.CH1heatOnOffStatus == 1) res.say('The heating is now on.');
						logStatus(v);
						res.send();
					});
				});
			}
		});
	}, () => {
		res.say("Sorry, the boiler is offline at the moment.");
		res.send();
	});
	return false;
});

app.intent('TurnIntent', {
	"slots": {
		"onoff": "ONOFF"
	},
	"utterances": ["to turn {onoff}", "to turn heating {onoff}", "to turn the heating {onoff}"]
}, async (req, res) => {
	await login();
	whenOnline(() => {
		withDeviceValues((v) => {
			if (v.CH1currentSetPoint == 32.0) {
				res.say("Sorry, I couldn't contact the boiler.");
				res.send();
			} else {
				var onoff = req.slot("onoff");
				var t = process.env.DEFAULT_ON_TEMP || '20';
				if (onoff === 'off') {
					t = process.env.DEFAULT_OFF_TEMP || '14';
				}
				setTemperature(t, () => {
					withDeviceValues((v) => {
						res.say(`The target temperature is now ${speakTemperature(v.CH1currentSetPoint)} degrees.`);
						res.card("Salus", `The target temperature is now ${speakTemperature(v.CH1currentSetPoint)}\xB0`);
						logStatus(v);

						andHoldIfRequiredFor(req.slot("duration"), (holding, duration) => {
							if (holding) {
								var durationText = duration.ago().replace(' ago', '');
								if (v.CH1heatOnOffStatus == 1) {
									res.say(`The heating is now on and will turn off in ${durationText}`);
								} else {
									res.say(`The heating will turn off in ${durationText}`);
								}
							} else {
								if (v.CH1heatOnOffStatus == 1) { res.say('The heating is now on.'); }
							}
							res.send();
						});
					});
				});
			}
		});
	}, () => {
		res.say("Sorry, the boiler is offline at the moment.");
		res.send();
	});
	return false;
});

app.intent("AMAZON.HelpIntent", {
	"slots": {},
	"utterances": []
},
	(request, response) => {
		var helpOutput = "You can say 'set the temperature to 18 degrees' or ask 'the temperature'. You can also say stop or exit to quit.";
		var reprompt = "What would you like to do?";
		// AMAZON.HelpIntent must leave session open -> .shouldEndSession(false)
		response.say(helpOutput).reprompt(reprompt).shouldEndSession(false);
	}
);

app.intent("AMAZON.StopIntent", {
	"slots": {},
	"utterances": []
}, async (req, res) => {
	await login();
	whenOnline(() => {
		withDeviceValues((v) => {
			if (v.CH1currentSetPoint == 32.0) {
				res.say("Sorry, I couldn't contact the boiler.");
				res.send();
			} else {
				var t = process.env.DEFAULT_OFF_TEMP || '14';
				setTemperature(t, () => {
					withDeviceValues((v) => {
						res.say(`The target temperature is now ${speakTemperature(v.CH1currentSetPoint)} degrees.`);
						if (v.CH1heatOnOffStatus == 1) res.say('The heating is now on.');
						logStatus(v);
						res.send();
					});
				});
			}
		});
	}, () => {
		res.say("Sorry, the boiler is offline at the moment.");
		res.send();
	});
	return false;
});

module.exports = app;

exports.handler = app.lambda();