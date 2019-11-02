const turnOffCallbackPayloadLegacy = (userId, duration) => {
    return {
        duration: duration,
        version: '1.0',
        session: {
            new: true,
            user: {
                'userId': userId
            }
        },

        request: {
            type: 'IntentRequest',
            intent: {
                name: 'TurnIntent',
                slots: {
                    onoff: {
                        name: 'onoff',
                        value: 'off'
                    }
                }
            }
        }
    };
};

const turnOffCallbackPayloadSmartHome = (userId, duration) => {
    return {
        duration: duration,
        directive: {
            header: {
                namespace: 'Alexa.ThermostatController',
                name: 'SetThermostatMode',
                payloadVersion: '3'
            },
            endpoint: {
                userId: userId
            },
            payload: {
                defer: false,
                thermostatMode: {
                    value: 'OFF'
                }
            }
        }
    };
};

const turnOffCallbackPayload = (userId, duration) => {
    if (process.env.TURN_OFF_CALLBACK_PAYLOAD === 'smarthome') {
        return turnOffCallbackPayloadSmartHome(userId, duration);
    }
    return turnOffCallbackPayloadLegacy(userId, duration);
};

const truncateUserId = (userId) => {
    let id = userId.split('.').pop();
    let startUserId = id.substr(0, 5);
    let endUserId = id.substr(id.length - 5);
    return `${startUserId}...${endUserId}`;
};

module.exports = {
    turnOffCallbackPayload,
    truncateUserId
};