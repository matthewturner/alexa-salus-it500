// const expect = require('chai').expect;
const sinon = require('sinon');
const ControlService = require('../../src/core/ControlService');
const Mock = require('../../src/thermostats/Mock');

it('Main page content', async (done) => {
    let context = { userId: 'xyz' };
    let holdStrategy = sinon.fake();
    let thermostatRepository = sinon.fake();
    thermostatRepository.find = sinon.stub();
    let thermostat = { type: 'mock', options: {} };
    thermostatRepository.find.withArgs('xyz').returns(thermostat);
    let thermostatFactory = sinon.fake();
    thermostatFactory.create = sinon.stub();
    thermostatFactory.create.withArgs(thermostat.type, {}).returns(new Mock());

    let target = new ControlService(context, holdStrategy, thermostatFactory, thermostatRepository);

    let messages = target.status();

    console.log(messages);
    // expect('Hello World').to.equal('Hello World');
    done();
});