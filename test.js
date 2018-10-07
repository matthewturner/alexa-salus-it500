const ControlService = require('./ControlService');

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
	var service = new ControlService();
	try {
		var messages = await service.turn(onOff, duration);
		say(messages);
	} catch (e) {
		say(e);
    }
    // try {
    //     var duration = await service.statusOf('arn:aws:states:eu-west-1:327485730614:execution:Thermostat:547b7632-aca2-4f66-80e2-ead395487b78');
    //     console.log(duration);
	// } catch (e) {
	// 	say(e);
    // }
};

main();