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
}