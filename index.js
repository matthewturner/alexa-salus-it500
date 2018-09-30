const alexa = require('alexa-app');
const helpers = require('./helpers');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 0;

var app = new alexa.app('boiler');

app.pre = (request, response, type) => { };

app.launch(async (request, response) => {
	console.log('Launching...');
	var client = await helpers.login();
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
	var client = await helpers.login();
	if (await !helpers.verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!helpers.verifyContactable(device, response)) {
		return false;
	}

	response.say(`The current temperature is ${helpers.speakTemperature(device.currentTemperature)} degrees.`);
	response.say(`The target is ${helpers.speakTemperature(device.targetTemperature)} degrees.`);
	if (device.status == 'on') response.say('The heating is on.');
	helpers.logStatus(device);
	response.send();

	return false;
});

app.intent('TurnUpIntent', {
	"utterances": ["to increase", "to turn up", "set warmer", "set higher"]
}, async (request, response) => {
	var client = await helpers.login();
	if (await !helpers.verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!helpers.verifyContactable(device, response)) {
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
	response.say(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is now on.');
	helpers.logStatus(device);
	response.send();
	return false;
});

app.intent('TurnDownIntent', {
	"utterances": ["to decrease", "to turn down", "set cooler", "set lower"]
}, async (request, response) => {
	var client = await helpers.login();
	if (await !helpers.verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!helpers.verifyContactable(device, response)) {
		return false;
	}

	var t = device.targetTemperature - 1.0;
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is still on though.');
	helpers.logStatus(updatedDevice);
	response.send();
	return false;
});

app.intent('SetTempIntent', {
	"slots": {
		"temp": "AMAZON.NUMBER"
	},
	"utterances": ["to set to {temp} degrees", "to set the temperature to {temp} degrees", "to set the temp to {temp} degrees"]
}, async (request, response) => {
	var client = await helpers.login();
	if (await !helpers.verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!helpers.verifyContactable(device, response)) {
		return false;
	}

	var t = request.slot('temp');
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is now on.');
	helpers.logStatus(updatedDevice);
	response.send();
	return false;
});

app.intent('TurnIntent', {
	"slots": {
		"onoff": "ONOFF"
	},
	"utterances": ["to turn {onoff}", "to turn heating {onoff}", "to turn the heating {onoff}"]
}, async (request, response) => {
	var onoff = request.slot("onoff");
	var t = process.env.DEFAULT_ON_TEMP || '20';
	if (onoff === 'off') {
		t = process.env.DEFAULT_OFF_TEMP || '14';
	}
	var client = await helpers.login();
	if (await !helpers.verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!helpers.verifyContactable(device, response)) {
		return false;
	}

	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	helpers.logStatus(updatedDevice);

	var intent = await helpers.andHoldIfRequiredFor(request.slot('duration'));
	console.log(`Intent: ${intent}`);
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
	var client = await helpers.login();
	if (await !helpers.verifyOnline(client, response)) {
		return false;
	}
	var device = await client.device();
	if (!helpers.verifyContactable(device, response)) {
		return false;
	}

	var t = process.env.DEFAULT_OFF_TEMP || '14';
	await client.setTemperature(t);
	var updatedDevice = await client.device();
	response.say(`The target temperature is now ${helpers.speakTemperature(updatedDevice.targetTemperature)} degrees.`);
	if (updatedDevice.status == 'on') response.say('The heating is now on.');
	helpers.logStatus(updatedDevice);
	response.send();
	return false;
});

module.exports = app;

exports.handler = app.lambda();