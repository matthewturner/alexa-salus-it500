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

const turnOffCallbackPayload = (duration) => {
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
};

const speakTemperature = (temp) => {
	var t = parseFloat(temp);
	if (parseFloat(t.toFixed(0)) != t) return t.toFixed(1);
	else return t.toFixed(0);
};

const logStatus = (device) => {
	console.log(`${logTimeString(' ', false)} ${device.currentTemperature} => ${device.targetTemperature} (${device.status})`);
};

module.exports = { 
	logTimeString, 
	turnOffCallbackPayload, 
	speakTemperature,
	logStatus
};