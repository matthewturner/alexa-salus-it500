const OFF = 0;
const DEBUG = 4;
const INFO = 3;
const WARNING = 2;
const ERROR = 1;

class Logger {
    constructor(level = OFF) {
        this._level = level;
        this._prefix = '';
    }

    set prefix(prefix) {
        this._prefix = prefix;
    }

    debug(message) {
        this.log(message, DEBUG);
    }

    info(message) {
        this.log(message, INFO);
    }

    warning(message) {
        this.log(message, WARNING);
    }

    error(message) {
        this.log(message, ERROR);
    }

    log(message, level) {
        if(level <= this._level) {
            if (this._prefix === '') {
                console.log(message);
            } else {
                console.log(`${this._prefix}: ${message}`);
            }
        }
    }
}

module.exports = Logger;