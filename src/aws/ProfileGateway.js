const axios = require('axios');
const Logger = require('../core/Logger');

const logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG);

class ProfileGateway {
    async get(accessToken) {
        const headers = {
            Authorization: 'Bearer ' + accessToken,
            'content-type': 'application/json'
        };
        const res = await axios.get('https://api.amazon.com/user/profile', {
            headers: headers
        });
        logger.debug(JSON.stringify(res.data));
        return res.data;
    }
}

class MockProfileGateway {
    async get(accessToken) { // eslint-disable-line no-unused-vars
        return {
            email: 'matt@alexa.com',
            name: 'Matt',
            user_id: 'amzn1.account.3413randomdkj20394'
        };
    }
}

module.exports = {
    ProfileGateway,
    MockProfileGateway
};