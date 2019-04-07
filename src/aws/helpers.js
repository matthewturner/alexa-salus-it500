const turnOffCallbackPayload = (userId, duration) => {
    return {
        'duration': duration,
        'version': '1.0',
        'session': {
            'new': true,
            'user': {
                'userId': userId
            }
        },

        'request': {
            'type': 'IntentRequest',
            'requestId': process.env.ALEXA_REQUEST_ID,
            'timestamp': new Date().toISOString(),
            'locale': 'en-GB',
            'intent': {
                'name': 'TurnIntent',
                'confirmationStatus': 'NONE',
                'slots': {
                    'onoff': {
                        'name': 'onoff',
                        'value': 'off',
                        'resolutions': {
                            'resolutionsPerAuthority': [
                                {
                                    'authority': process.env.ALEXA_AUTHORITY,
                                    'status': {
                                        'code': 'ER_SUCCESS_MATCH'
                                    },
                                    'values': [
                                        {
                                            'value': {
                                                'name': 'off',
                                                'id': process.env.ALEXA_OFF_VALUE_ID
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        'confirmationStatus': 'NONE'
                    }
                }
            }
        }
    };
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