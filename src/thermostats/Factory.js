const Mock = require('./Mock');
const Salus = require('./Salus');

class Factory {
    constructor(logger) {
        this._logger = logger;
    }

    create(type, options) {
        switch (type) {
        case 'mock':
            return new Mock(this._logger, options);
        case 'salus':
            return new Salus(this._logger, options);
        default:
            throw `Unknown thermostat type ${type}`;
        }
    }
}

module.exports = Factory;