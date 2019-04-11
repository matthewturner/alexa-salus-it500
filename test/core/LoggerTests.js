const sinon = require('sinon');
const Logger = require('../../src/core/Logger');

const createTarget = (level) => {
    const destination = sinon.stub();
    destination.log = sinon.mock();

    return {
        level: level,
        destination: destination,
        object: () => {
            return new Logger(level, destination);
        }
    };
};

describe('Logger', () => {
    it('can be set with number', () => {
        const target = createTarget(Logger.DEBUG);
        target.destination.log.withExactArgs('some message');
        target.object().debug('some message');
        target.destination.log.verify();
    });

    it('outputs no messages', () => {
        const target = createTarget('OFF');
        target.destination.log.withExactArgs('some message').never();
        target.object().debug('some message');
        target.destination.log.verify();
    });

    it('outputs debug messages', () => {
        const target = createTarget('DEBUG');
        target.destination.log.withExactArgs('some message');
        target.object().debug('some message');
        target.destination.log.verify();
    });

    it('outputs info messages', () => {
        const target = createTarget('INFO');
        target.destination.log.withExactArgs('some message');
        target.object().info('some message');
        target.destination.log.verify();
    });

    it('outputs warning messages', () => {
        const target = createTarget('WARNING');
        target.destination.log.withExactArgs('some message');
        target.object().warning('some message');
        target.destination.log.verify();
    });

    it('outputs error messages', () => {
        const target = createTarget('ERROR');
        target.destination.log.withExactArgs('some message');
        target.object().error('some message');
        target.destination.log.verify();
    });

    it('outputs messages with prefix', () => {
        const target = createTarget('ERROR');
        target.destination.log.withExactArgs('prefix: some message');
        const actual = target.object();
        actual.prefix = 'prefix';
        actual.error('some message');
        target.destination.log.verify();
    });
});