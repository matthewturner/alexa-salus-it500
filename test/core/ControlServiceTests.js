const expect = require('chai').expect;
const sinon = require('sinon');
const ControlService = require('../../src/core/ControlService');
const Mock = require('../../src/thermostats/Mock');
const HoldStrategy = require('../../src/core/HoldStrategy');
const Logger = require('../../src/core/Logger');

const createTarget = () => {
    let logger = new Logger();
    let context = { userId: 'user123' };
    let holdStrategy = new HoldStrategy();
    let thermostatRepository = sinon.fake();
    thermostatRepository.find = sinon.stub();
    let thermostat = { type: 'mock', options: {} };
    thermostatRepository.find.withArgs('user123').returns(thermostat);
    let thermostatFactory = sinon.fake();
    thermostatFactory.create = sinon.stub();
    thermostatFactory.create.withArgs(thermostat.type, {}).returns(new Mock(logger));

    return {
        logger: logger,
        context: context, 
        holdStrategy: holdStrategy,
        thermostatFactory: thermostatFactory,
        thermostatRepository: thermostatRepository,
        object: () => {
            return new ControlService(logger, context, holdStrategy, 
                thermostatFactory, thermostatRepository);
        }
    };
};

it('returns the default status', async () => {
    let target = createTarget().object();

    let messages = await target.status();

    expect(messages[0]).to.equal('The current temperature is 20 degrees.');
    expect(messages[1]).to.equal('The target is 22 degrees.');
    expect(messages[2]).to.equal('The heating is on.');
});