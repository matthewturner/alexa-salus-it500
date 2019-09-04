const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const lambda = require('../../src/aws/smarthome-lambda');
const fs = require('promise-fs');

const createTarget = () => {
    process.env.HOLD_STRATEGY = 'default';
    process.env.THERMOSTAT_REPOSITORY = 'default';
    process.env.THERMOSTAT_TYPE = 'mock';
    process.env.LOG_LEVEL = 'OFF';
    process.env.PROFILE_GATEWAY_TYPE = 'mock';

    return {
        lambda: lambda,
        object: () => {
            return lambda;
        }
    };
};

describe('SmartHome Lambda', async () => {
    describe('Discovery Directive', async () => {
        it('returns the current capabilities', async () => {
            const target = createTarget();

            const request = JSON.parse(await fs.readFile('./test/fixtures/smarthome/DiscoveryDirective.json'));
            const context = {};

            const handler = target.object().handler;
            const actual = await handler(request, context);

            delete actual.event.header.correlationToken;
            actual.event.header.messageId = 'messageId123';

            const expected = JSON.parse(await fs.readFile('./test/fixtures/smarthome/DiscoveryResponse.json'));

            expect(actual).to.deep.include(expected);
        });
    });

    describe('SetTargetTemperature Directive', async () => {
        it('sets the target temperature', async () => {
            const target = createTarget();

            const request = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetTargetTempDirective.json'));
            const context = {};

            const handler = target.object().handler;
            const actual = await handler(request, context);

            actual.event.header.messageId = 'messageId123';
            actual.context.properties[0].timeOfSample = '2019-09-03T10:45:31.258Z';
            actual.context.properties[1].timeOfSample = '2019-09-03T10:45:31.258Z';

            const expected = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetTargetTempResponse.json'));

            expect(actual).to.deep.include(expected);
        });

        it('sets the target temperature and schedule', async () => {
            const target = createTarget();

            const request = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetTargetTempWithScheduleDirective.json'));
            const context = {};

            const handler = target.object().handler;
            const actual = await handler(request, context);

            actual.event.header.messageId = 'messageId123';
            actual.context.properties[0].timeOfSample = '2019-09-03T10:45:31.258Z';
            actual.context.properties[1].timeOfSample = '2019-09-03T10:45:31.258Z';

            const expected = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetTargetTempWithScheduleResponse.json'));

            expect(actual).to.deep.include(expected);
        });
    });

    describe('AdjustTargetTemperature Directive', async () => {
        it('adjusts the target temperature', async () => {
            const target = createTarget();

            const request = JSON.parse(await fs.readFile('./test/fixtures/smarthome/AdjustTargetTempDirective.json'));
            const context = {};

            const handler = target.object().handler;
            const actual = await handler(request, context);

            actual.event.header.messageId = 'messageId123';
            actual.context.properties[0].timeOfSample = '2019-09-03T10:45:31.258Z';
            actual.context.properties[1].timeOfSample = '2019-09-03T10:45:31.258Z';

            const expected = JSON.parse(await fs.readFile('./test/fixtures/smarthome/AdjustTargetTempResponse.json'));

            expect(actual).to.deep.include(expected);
        });
    });

    describe('ReportState Directive', async () => {
        it('reports the current state', async () => {
            const target = createTarget();

            const request = JSON.parse(await fs.readFile('./test/fixtures/smarthome/ReportStateDirective.json'));
            const context = {};

            const handler = target.object().handler;
            const actual = await handler(request, context);

            actual.event.header.messageId = 'messageId123';

            const expected = JSON.parse(await fs.readFile('./test/fixtures/smarthome/ReportStateResponse.json'));

            expect(actual).to.deep.include(expected);
        });
    });

    describe('SetThermostatMode Directive', async () => {
        it('turns the heating on', async () => {
            const target = createTarget();

            const request = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetThermostatModeHeatDirective.json'));
            const context = {};

            const handler = target.object().handler;
            const actual = await handler(request, context);

            actual.event.header.messageId = 'messageId123';
            actual.context.properties[0].timeOfSample = '2019-09-03T10:45:31.258Z';
            actual.context.properties[1].timeOfSample = '2019-09-03T10:45:31.258Z';
            actual.context.properties[2].timeOfSample = '2019-09-03T10:45:31.258Z';

            const expected = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetThermostatModeHeatResponse.json'));

            expect(actual).to.deep.include(expected);
        });

        it('turns the heating off', async () => {
            const target = createTarget();

            const request = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetThermostatModeOffDirective.json'));
            const context = {};

            const handler = target.object().handler;
            const actual = await handler(request, context);

            actual.event.header.messageId = 'messageId123';
            actual.context.properties[0].timeOfSample = '2019-09-03T10:45:31.258Z';
            actual.context.properties[1].timeOfSample = '2019-09-03T10:45:31.258Z';
            actual.context.properties[2].timeOfSample = '2019-09-03T10:45:31.258Z';

            const expected = JSON.parse(await fs.readFile('./test/fixtures/smarthome/SetThermostatModeOffResponse.json'));

            expect(actual).to.deep.include(expected);
        });
    });
});