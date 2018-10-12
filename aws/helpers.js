const logTimeString = (timeDelimiter, zulu) => {
    let dat = new Date();
    let y = dat.getFullYear() + '';
    let m = dat.getMonth() + 1;
    if (m < 10) m = '0' + m;
    else m = m + '';
    let d = dat.getDate();
    if (d < 10) d = '0' + d;
    else d = d + '';

    let h = dat.getHours();
    if (h < 10) h = '0' + h;
    else h = h + '';
    let mm = dat.getMinutes();
    if (mm < 10) mm = '0' + mm;
    else mm = mm + '';
    let ss = dat.getSeconds();
    if (ss < 10) ss = '0' + ss;
    else ss = ss + '';

    let z = '';
    if (zulu) z = 'Z';

    return (`${y}-${m}-${d}${timeDelimiter}${h}:${mm}:${ss}${z}`);
};

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
            'timestamp': logTimeString('T', true),
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

module.exports = { 
    logTimeString, 
    turnOffCallbackPayload
};