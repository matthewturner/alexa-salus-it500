const DEBUG = 4;
const INFO = 3;
const WARNING = 2;
const ERROR = 1;
const OFF = 1;

class Logger {
    constructor(level = OFF) {
        this._level = level;
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
        if(this._level >= level) {
            console.log(message);
        }
    }
}

module.exports = Logger;