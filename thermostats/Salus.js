const cheerio = require('cheerio');

// Enable cookies
const request = require('request-promise').defaults({
    jar: true
});

const host = 'https://salus-it500.com';

class Salus {
    constructor(options) {
        this._options = options;
    }

    get credentials() {
        return {
            devId: this._devId,
            token: this._token
        };
    }

    timeString() {
        let dat = new Date();
        let days = (dat.getYear() * 365) + (dat.getMonth() * 31) + dat.getDate();
        return (days * 86400) + ((dat.getUTCHours() * 60) + dat.getUTCMinutes()) * 60 + dat.getUTCSeconds();
    }

    async login() {
        let options = {
            form: {
                'IDemail': this._options.username,
                'password': this._options.password,
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
            let body = await request.get(`${host}/public/devices.php`);
            let $ = cheerio.load(body);
            this._devId = $('input[name="devId"]').val();
            this._token = $('#token').val();
            console.log(`Logged on (${this._devId}, ${this._token})`);
        } catch(error) {
            console.log('Error occurred:');
            console.log(error);
        }
    }

    async online() {
        console.log('Checking device status...');
        let body = await request.get(`${host}/public/ajax_device_online_status.php?devId=${this._devId}&token=${this._token}&_=${this.timeString()}`);
        console.log(`Status: ${body}`);
        return ((body == '"online"') || (body == '"online lowBat"'));
    }

    async device() {
        let body = await request.get(`${host}/public/ajax_device_values.php?devId=${this._devId}&token=${this._token}&_=${this.timeString()}`);
        let deviceInfo = JSON.parse(body);
        return {
            contactable: !(deviceInfo.CH1currentSetPoint == 32.0),
            currentTemperature: parseFloat(deviceInfo.CH1currentRoomTemp),
            targetTemperature: parseFloat(deviceInfo.CH1currentSetPoint),
            status: (deviceInfo.CH1heatOnOffStatus == 1 ? 'on' : 'off')
        };
    }

    async setTemperature(temp) {
        let t = parseFloat(temp).toFixed(1);
        console.log(`Setting temp: ${t}...`);
        let form = {
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

module.exports = Salus;