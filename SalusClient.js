const cheerio = require('cheerio');

// Enable cookies
const request = require('request-promise').defaults({
	jar: true
});

const host = 'https://salus-it500.com';

class SalusClient {
    get credentials() {
        return {
            devId: this._devId,
            token: this._token
        };
    }

    timeString() {
        var dat = new Date();
        var days = (dat.getYear() * 365) + (dat.getMonth() * 31) + dat.getDate();
        return (days * 86400) + ((dat.getUTCHours() * 60) + dat.getUTCMinutes()) * 60 + dat.getUTCSeconds();
    }

    async login(username, password) {
        var options = {
            form: {
                'IDemail': username,
                'password': password,
                'login': 'Login'
            },
            followRedirect: true,
            simple: false
        };

        try {
            console.log('Logging in...');
            console.log(host);
            await request.post(`${host}/public/login.php`, options);
            console.log('Loading devices page...');
            var body = await request.get(`${host}/public/devices.php`);
            var $ = cheerio.load(body);
            this._devId = $('input[name="devId"]').val();
            this._token = $('#token').val();
            console.log(`Logged on (${this._devId}, ${this._token})`);
        } catch(error) {
            console.log('Error occurred:');
            console.log(error);
        }
    }

    async online() {
        var body = await request.get(`${host}/public/ajax_device_online_status.php?devId=${this._devId}&token=${this._token}&_=${this.timeString()}`);
        return (body == '"online"' || body == '"online lowBat"');
    }

    async device() {
        var body = await request.get(`${host}/public/ajax_device_values.php?devId=${this._devId}&token=${this._token}&_=${this.timeString()}`);
        var deviceInfo = JSON.parse(body);
        return {
            contactable: (deviceInfo.CH1currentSetPoint == 32.0),
            currentTemperature: parseFloat(deviceInfo.CH1currentRoomTemp),
	        targetTemperature: parseFloat(deviceInfo.CH1currentSetPoint),
	        status: (deviceInfo.CH1heatOnOffStatus == 1 ? 'on' : 'off')
        };
    }

    async setTemperature(temp) {
        var t = parseFloat(temp).toFixed(1);
        console.log("Setting temp: " + t);
        var form = {
            form: {
                'token': this._token,
                'tempUnit': 0,
                'devId': this._devId,
                'current_tempZ1_set': 1,
                'current_tempZ1': t
            }
        };

        await request.post(`${host}/includes/set.php`, form);
    }
}

module.exports = SalusClient;