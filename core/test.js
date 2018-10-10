const ControlService = require('../core/ControlService');

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
	var service = new ControlService({ userId: 'someUserx' });
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