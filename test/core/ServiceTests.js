const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const Service = require('../../src/core/Service');
const Mock = require('../../src/thermostats/Mock');
const Logger = require('../../src/core/Logger');

const createTarget = () => {
    const logger = new Logger();
    const context = {
        userId: 'user123',
        source: 'user'
    };
    const thermostatRepository = sinon.fake();
    thermostatRepository.find = sinon.stub();
    const thermostat = {
        type: 'mock',
        defaultOnTemp: 22,
        defaultOffTemp: 14,
        defaultDuration: 'PT1H',
        options: {}
    };
    thermostatRepository.find.withArgs('user123').returns(thermostat);

    thermostatRepository.save = sinon.stub();

    const thermostatFactory = sinon.fake();
    thermostatFactory.create = sinon.stub();
    const client = new Mock(logger);
    thermostatFactory.create.withArgs(thermostat.type, {}).returns(client);

    return {
        logger: logger,
        context: context,
        client: client,
        thermostatFactory: thermostatFactory,
        thermostatRepository: thermostatRepository,
        object: () => {
            return new Service(logger, context,
                thermostatFactory, thermostatRepository);
        }
    };
};

describe('Service', async () => {
    describe('ObtainThermostat', async () => {
        context('when user is not registered', async () => {
            it('creates a new thermostat', async () => {
                const target = createTarget();
                target.context.userId = 'user999';

                target.thermostatRepository.add = sinon.mock()
                    .withExactArgs({
                        userId: 'user999',
                        executionId: null
                    });

                const thermostat = await target.object().obtainThermostat();

                expect(thermostat.userId).to.equal('user999');
                target.thermostatRepository.add.verify();
            });

            it('copies the template thermostat', async () => {
                const target = createTarget();
                target.context.userId = 'user999';
                const template = {
                    userId: 'template',
                    type: 'mock',
                    defaultOnTemp: 25,
                    defaultOffTemp: 10,
                    defaultDuration: 'PT1H',
                    options: {}
                };
                target.thermostatRepository.find.withArgs('template').returns(template);

                target.thermostatRepository.add = sinon.mock()
                    .withExactArgs({
                        userId: 'user999',
                        type: 'mock',
                        defaultOnTemp: 25,
                        defaultOffTemp: 10,
                        defaultDuration: 'PT1H',
                        options: {}
                    });

                const thermostat = await target.object().obtainThermostat();

                expect(thermostat.userId).to.equal('user999');
                target.thermostatRepository.add.verify();
            });
        });
    });
});