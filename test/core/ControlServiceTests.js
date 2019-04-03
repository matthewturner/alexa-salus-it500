// const expect = require('chai').expect;
const sinon = require('sinon');
const ControlService = require('../../src/core/ControlService');

it('Main page content', async (done) => {
    let context = sinon.fake.returns({ userId: 'xyz' });
    let holdStrategy = sinon.fake();
    let thermostatRepository = sinon.fake();
    let thermostatFactory = sinon.fake();

    let target = new ControlService(context, holdStrategy, thermostatRepository, thermostatFactory);

    let messages = target.status();

    console.log(messages);
    // expect('Hello World').to.equal('Hello World');
    done();
});