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
            'intent': {
                'name': 'TurnIntent',
                'slots': {
                    'onoff': {
                        'name': 'onoff',
                        'value': 'off'
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