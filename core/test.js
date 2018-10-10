const ControlService = require('../core/ControlService');
const AwsHoldStrategy = require('../aws/HoldStrategy');
const DefaultHoldStrategy = require('../core/HoldStrategy');

const say = (messages) => {
	if (messages instanceof Array) {
		for (const message of messages) {
			console.log(message);
		}
	} else {
		console.log(messages);
	}
};

const main = async () => {
	var onOff = 'on';
	var duration = process.env.DURATION;
	var context = { userId: 'someUserx' };
	var holdStrategy;
	if (process.env.HOLD_STRATEGY === 'aws') {
		holdStrategy = new AwsHoldStrategy(context);
	} else {
		holdStrategy = new DefaultHoldStrategy(context);
	}
	var service = new ControlService(context, holdStrategy);
	try {
		var messages = await service.turn(onOff, duration);
		say(messages);
	} catch (e) {
		say(e);
	}
	try {
		var messages = await service.status();
		say(messages);
	} catch (e) {
		say(e);
	}
};

main();