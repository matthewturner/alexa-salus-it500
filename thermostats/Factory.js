const Mock = require('./Mock');
const Salus = require('./Salus');

class Factory {
    create(type, options) {
        switch (type) {
        case 'mock':
            return new Mock(options);
        case 'salus':
            return new Salus(options);
        default:
            throw `Unknown thermostat type ${type}`;
        }
    }
}

module.exports = Factory;