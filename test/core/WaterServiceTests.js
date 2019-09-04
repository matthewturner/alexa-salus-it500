const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const WaterService = require('../../src/core/WaterService');
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
            return new WaterService(logger, context,
                thermostatFactory, thermostatRepository);
        }
    };
};

describe('WaterService', async () => {
    describe('TurnOn', async () => {
        it('returns the new boost time', async () => {
            const target = createTarget();

            const {
                messages,
            } = await target.object().turnOn('PT1H');

            expect(messages[0]).to.equal('The water is now on for 1 hour.');
        });

        it('converts the boost time to integer hours', async () => {
            const target = createTarget();
            target.client.turnWaterOnFor = sinon.mock().withExactArgs(1);

            await target.object().turnOn('PT1H');

            target.client.turnWaterOnFor.verify();
        });

        it('returns the new boost time as hours', async () => {
            const target = createTarget();

            const {
                messages,
            } = await target.object().turnOn('PT2H30M');

            expect(messages[0]).to.equal('The water is now on for 2 hours.');
        });
    });

    describe('TurnOff', async () => {
        it('returns the off message', async () => {
            const target = createTarget();

            const {
                messages,
            } = await target.object().turnOff();

            expect(messages[0]).to.equal('The water is now off.');
        });
    });
});