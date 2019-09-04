const cheerio = require('cheerio');

// Enable cookies
const request = require('request-promise');

const host = 'https://salus-it500.com';

class Salus {
    constructor(logger, options) {
        this._logger = logger;
        this._options = options;
        this._jar = request.jar();
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

    urlTo(page, authenticated = true) {
        let url = `${host}/public/${page}.php`;
        if (authenticated) {
            url += `?devId=${this._devId}&token=${this._token}&_=${this.timeString()}`;
        }
        return url;
    }

    async login() {
        let options = {
            form: {
                'IDemail': this._options.username,
                'password': this._options.password,
                'login': 'Login'
            },
            jar: this._jar,
            followRedirect: true,
            simple: false
        };

        try {
            this._logger.debug('Logging in...');
            this._logger.debug(host);
            await request.post(this.urlTo('login', false), options);
            this._logger.debug('Loading devices page...');
            let body = await request.get(this.urlTo('devices', false), {
                jar: this._jar
            });
            let $ = cheerio.load(body);
            this._devId = $('input[name="devId"]').val();
            this._token = $('#token').val();
            this._logger.debug(`Logged on (${this._devId}, ${this._token})`);
        } catch (error) {
            this._logger.debug('Error occurred:');
            this._logger.debug(error);
        }
    }

    async online() {
        this._logger.debug('Checking device status...');
        let body = await request.get(this.urlTo('ajax_device_online_status'), {
            jar: this._jar
        });
        this._logger.debug(`Status: ${body}`);
        return ((body == '"online"') || (body == '"online lowBat"'));
    }

    async device() {
        let body = await request.get(this.urlTo('ajax_device_values'), {
            jar: this._jar
        });
        let deviceInfo = JSON.parse(body);
        return {
            contactable: !(deviceInfo.CH1currentSetPoint == 32.0),
            currentTemperature: parseFloat(deviceInfo.CH1currentRoomTemp),
            targetTemperature: parseFloat(deviceInfo.CH1currentSetPoint),
            status: (deviceInfo.CH1heatOnOffStatus == 1 ? 'on' : 'off')
        };
    }

    async setTemperature(temp) {
        let t = temp.toFixed(1);
        this._logger.debug(`Setting temp: ${t}...`);
        let options = {
            form: {
                'token': this._token,
                'tempUnit': 0,
                'devId': this._devId,
                'current_tempZ1_set': 1,
                'current_tempZ1': t
            },
            jar: this._jar
        };

        await request.post(`${host}/includes/set.php`, options);
    }

    async turnWaterOnFor(hours) {
        this._logger.debug(`Setting water boost time: ${hours} hours...`);
        let options = {
            form: {
                'token': this._token,
                'devId': this._devId,
                'hwboosthours_set': 1,
                'hwboosthours': hours
            },
            jar: this._jar
        };

        await request.post(`${host}/includes/set.php`, options);
    }

    async logout() {
        this._logger.debug('Logging out...');
        await request.get(this.urlTo('logout', false), {
            jar: this._jar
        });
    }

    card() {
        return {
            title: 'Salus',
            image: {
                smallImageUrl: 'https://salus-it500.com/public/assets/it500_icon.png',
                largeImageUrl: 'https://salus-it500.com/public/assets/logo.png',
            }
        };
    }

    get friendlyName() {
        return 'thermostat';
    }

    get manufacturerName() {
        return 'Salus';
    }

    get description() {
        return 'Controls the Salus IT-500';
    }
}

module.exports = Salus;