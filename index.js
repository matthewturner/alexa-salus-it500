const alexa = require('alexa-app');
const Duration = require('durationjs');
const JSON = require('JSON');
const AWS = require('aws-sdk');
const SalusClient = require('./SalusClient');
const StepFunction = require('./StepFunction');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 0;

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
};

const login = async () => {
	var client = new SalusClient();
	await client.login(process.env.USERNAME, process.env.PASSWORD);
	return client;
};

const verifyOnline = async (client, response) => {
	if (await !client.online()) {
		response.say("Sorry, the boiler is offline at the moment.");
		response.send();
		return false;
	}
	return true;
};

const verifyContactable = (device, response) => {
	if (!device.contactable) {
		response.say("Sorry, I couldn't contact the boiler.");
		response.send();
		return false;
	}
	return true;
};

const speakTemperature = (temp) => {
	var t = parseFloat(temp);
	if (parseFloat(t.toFixed(0)) != t) return t.toFixed(1);
	else return t.toFixed(0);
};

const andHoldIfRequiredFor = (durationValue) => {
	return new Promise(resolve => {
		console.log(`Duration: ${durationValue}`);
		if (typeof durationValue == 'undefined') {
			resolve({holding: false, duration: null});
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
				resolve({holding: true, duration: duration});
			});
		}
	});
};

const logStatus = (device) => {
	console.log(`${logTimeString(' ', false)}, ${device.currentTemperature}, ${device.targetTemperature}, ${device.status}`);
};

var app = new alexa.app('boiler');

app.pre = (request, response, type) => { };

app.launch(async (request, response) => {
	console.log('Launching...');
	var client = await login();
	if (await client.online()) {
		response.say("Boiler is online");
	} else {
		response.say("Sorry, the boiler is offline at the moment.");
	}
	response.send();
	console.log("before return");
	return false;
});

app.intent('TempIntent', {
	"utterances": ["what the temperature is", "the temperature", "how hot it is"]
}, async (request, response) => {
	var client = await login();
	if (await !verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device, response)) {
		return false;
	}

	response.say(`The current temperature is ${speakTemperature(device.currentTemperature)} degrees.`);
	response.say(`The target is ${speakTemperature(device.targetTemperature)} degrees.`);
	if (device.status == 'on') response.say('The heating is on.');
	logStatus(device);
	response.send();

	return false;
});

app.intent('TurnUpIntent', {
	"utterances": ["to increase", "to turn up", "set warmer", "set higher"]
}, async (request, response) => {
	var client = await login();
	if (await !verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device, response)) {
		return false;
	}

	if (device.status == 'on') {
		response.say('The heating is already on.');
		response.send();
		return false;
	}

	var t = device.targetTemperature + 0.5;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is now on.');
	logStatus(device);
	response.send();
	return false;
});

app.intent('TurnDownIntent', {
	"utterances": ["to decrease", "to turn down", "set cooler", "set lower"]
}, async (request, response) => {
	var client = await login();
	if (await !verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device, response)) {
		return false;
	}

	var t = device.targetTemperature - 1.0;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is still on though.');
	logStatus(updatedDevice);
	response.send();
	return false;
});

app.intent('SetTempIntent', {
	"slots": {
		"temp": "AMAZON.NUMBER"
	},
	"utterances": ["to set to {temp} degrees", "to set the temperature to {temp} degrees", "to set the temp to {temp} degrees"]
}, async (request, response) => {
	var client = await login();
	if (await !verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device, response)) {
		return false;
	}

	var t = device.targetTemperature - 1.0;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is now on.');
	logStatus(updatedDevice);
	response.send();
	return false;
});

app.intent('TurnIntent', {
	"slots": {
		"onoff": "ONOFF"
	},
	"utterances": ["to turn {onoff}", "to turn heating {onoff}", "to turn the heating {onoff}"]
}, async (request, response) => {
	var onoff = req.slot("onoff");
	var t = process.env.DEFAULT_ON_TEMP || '20';
	if (onoff === 'off') {
		t = process.env.DEFAULT_OFF_TEMP || '14';
	}
	var client = await login();
	if (await !verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device, response)) {
		return false;
	}

	var t = device.targetTemperature - 1.0;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	logStatus(updatedDevice);

	var intent = andHoldIfRequiredFor(req.slot("duration"));
	if (intent.holding) {
		var durationText = intent.duration.ago().replace(' ago', '');
		if (updatedDevice.status == 'on') {
			response.say(`The heating is now on and will turn off in ${durationText}`);
		} else {
			response.say(`The heating will turn off in ${durationText}`);
		}
	} else {
		if (updatedDevice.status == 'on') { response.say('The heating is now on.'); }
	}
	response.send();
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
}, async (request, response) => {
	var client = await login();
	if (await !verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!verifyContactable(device, response)) {
		return false;
	}

	var t = process.env.DEFAULT_OFF_TEMP || '14';
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is now on.');
	logStatus(updatedDevice);
	response.send();
	return false;
});

module.exports = app;

exports.handler = app.lambda();