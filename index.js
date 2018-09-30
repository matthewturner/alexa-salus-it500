var request = require('request');
const alexa = require('alexa-app');
const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');
const SalusClient = require('./SalusClient');
const StepFunction = require('./StepFunction');

const host = 'https://salus-it500.com';

// Allow this module to be reloaded by hotswap when changed
module.change_code = 0;

// Enable cookies
var request = request.defaults({
	jar: true
});

const logTimeString = (timeDelimiter, zulu) => {
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

const login = async () => {
	var client = new SalusClient();
	await client.login(process.env.USERNAME, process.env.PASSWORD);
	var credentials = client.credentials;
	devId = credentials.devId;
	token = credentials.token;
	return client;
}

const verifyOnline = async (client) => {
	if (await !client.online()) {
		res.say("Sorry, the boiler is offline at the moment.");
		res.send();
		return false;
	}
	return true;
}

const verifyContactable = (device) => {
	if (!device.contactable) {
		res.say("Sorry, I couldn't contact the boiler.");
		res.send();
		return false;
	}
	return true;
}

const speakTemperature = (temp) => {
	var t = parseFloat(temp);
	if (parseFloat(t.toFixed(0)) != t) return t.toFixed(1);
	else return t.toFixed(0);
}

const andHoldIfRequiredFor = (durationValue, callback) => {
	console.log('Duration: ' + durationValue);
	if (typeof durationValue == 'undefined') {
		callback(false, null);
	} else {
		var duration = new Duration(durationValue);
		var stepfunctions = new AWS.StepFunctions();
		var params = {
			stateMachineArn: process.env.STEP_FUNCTION_ARN,
			input: JSON.stringify(StepFunction.turnOffCallbackPayload(duration.inSeconds()))
		};
		console.log('Registering callback...');
		stepfunctions.startExecution(params, (err, data) => {
			if (err) { console.log(err, err.stack); }
			callback(true, duration);
		});
	}
}

const logStatus = (device) => {
	console.log(`${logTimeString(' ', false)}, ${device.currentTemperature}, ${device.targetTemperature}, ${device.status}`);
}

var app = new alexa.app('boiler');

app.pre = (request, response, type) => { };

app.launch(async (req, res) => {
	console.log('Launching...');
	await login();
	if (await client.online()) {
		res.say("Boiler is online");
	} else {
		res.say("Sorry, the boiler is offline at the moment.");
	}
	res.send();
	console.log("before return");
	return false;
});

app.intent('TempIntent', {
	"utterances": ["what the temperature is", "the temperature", "how hot it is"]
}, async (req, res) => {
	var client = await login();
	if (await !verifyOnline(client)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device)) {
		return false;
	}

	res.say(`The current temperature is ${speakTemperature(device.currentTemperature)} degrees.`);
	res.say(`The target is ${speakTemperature(device.targetTemperature)} degrees.`);
	if (device.status == 'on') res.say('The heating is on.');
	logStatus(device);
	res.send();

	return false;
});

app.intent('TurnUpIntent', {
	"utterances": ["to increase", "to turn up", "set warmer", "set higher"]
}, async (req, res) => {
	var client = await login();
	if (await !verifyOnline(client)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device)) {
		return false;
	}

	if (device.status == 'on') {
		res.say('The heating is already on.');
		res.send();
		return false;
	} 
	
	var t = device.targetTemperature + 0.5;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	res.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') res.say('The heating is now on.');
	logStatus(device);
	res.send();
	return false;
});

app.intent('TurnDownIntent', {
	"utterances": ["to decrease", "to turn down", "set cooler", "set lower"]
}, async (req, res) => {
	var client = await login();
	if (await !verifyOnline(client)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device)) {
		return false;
	}

	var t = device.targetTemperature - 1.0;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	res.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') res.say('The heating is still on though.');
	logStatus(updatedDevice);
	res.send();
	return false;
});

app.intent('SetTempIntent', {
	"slots": {
		"temp": "AMAZON.NUMBER"
	},
	"utterances": ["to set to {temp} degrees", "to set the temperature to {temp} degrees", "to set the temp to {temp} degrees"]
}, async (req, res) => {
	var client = await login();
	if (await !verifyOnline(client)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device)) {
		return false;
	}

	var t = device.targetTemperature - 1.0;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	res.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') res.say('The heating is now on.');
	logStatus(updatedDevice);
	res.send();
	return false;
});

app.intent('TurnIntent', {
	"slots": {
		"onoff": "ONOFF"
	},
	"utterances": ["to turn {onoff}", "to turn heating {onoff}", "to turn the heating {onoff}"]
}, async (req, res) => {
	var onoff = req.slot("onoff");
	var t = process.env.DEFAULT_ON_TEMP || '20';
	if (onoff === 'off') {
		t = process.env.DEFAULT_OFF_TEMP || '14';
	}
	var client = await login();
	if (await !verifyOnline(client)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device)) {
		return false;
	}

	var t = device.targetTemperature - 1.0;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	res.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	logStatus(updatedDevice);

	andHoldIfRequiredFor(req.slot("duration"), (holding, duration) => {
		if (holding) {
			var durationText = duration.ago().replace(' ago', '');
			if (updatedDevice.status == 'on') {
				res.say(`The heating is now on and will turn off in ${durationText}`);
			} else {
				res.say(`The heating will turn off in ${durationText}`);
			}
		} else {
			if (updatedDevice.status == 'on') { res.say('The heating is now on.'); }
		}
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
	var client = await login();
	if (await !verifyOnline(client)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device)) {
		return false;
	}

	var t = process.env.DEFAULT_OFF_TEMP || '14';
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	res.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') res.say('The heating is now on.');
	logStatus(updatedDevice);
	res.send();
	return false;
});

module.exports = app;

exports.handler = app.lambda();