const request = require('request-promise');
const cheerio = require('cheerio');

class SalusClient {
    get credentials() {
        return {
            devId: this._devId,
            token: this._token
        };
    }

    async login() {
        var form = {
            form: {
                'IDemail': username,
                'password': password,
                'login': 'Login'
            }
        };

        try {
            request.post(`${host}/public/login.php`, form);
            var response = request.get(`${host}/public/devices.php`);
            if (response.statusCode == 200) {
                var $ = cheerio.load(response.body);
                this._devId = $('input[name="devId"]').val();
                this._token = $('#token').val();
                console.log(`Logged on (${this._devId}, ${this._token})`);
            } else {
                console.log(response.statusCode);
            }
        } catch(error) {
            console.log(error);
        }
    }
}