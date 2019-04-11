const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const lambda = require('../../src/aws/lambda');
const fs = require('promise-fs');
const util = require('util');

const createTarget = () => {
    process.env.HOLD_STRATEGY = 'default';
    process.env.THERMOSTAT_REPOSITORY = 'default';
    process.env.THERMOSTAT_TYPE = 'mock';
    process.env.LOG_LEVEL = 'OFF';

    return {
        lambda: lambda,
        object: () => {
            return lambda;
        }
    };
};

describe('lambda', async () => {
    describe('TempIntent', async () => {
        it('says the current temperature', async () => {
            const target = createTarget();
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TempIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.outputSpeech.ssml).to.equal('<speak>The current temperature is 19 degrees. The target is 20 degrees. The heating is on.</speak>');
        });

        it('shows the current temperature', async () => {
            const target = createTarget();
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TempIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.card.text).to.equal('The current temperature is 19 degrees.\nThe target is 20 degrees.\nThe heating is on.');
        });

        it('says the error', async () => {
            const target = createTarget();
            process.env.THERMOSTAT_TYPE = 'unknown';
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TempIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.outputSpeech.ssml).to.equal('<speak>Unknown thermostat type unknown</speak>');
        });
    });

    describe('DefaultsIntent', async () => {
        it('says the current temperature', async () => {
            const target = createTarget();
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/DefaultsIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.outputSpeech.ssml).to.equal('<speak>The default on temperature is 20 degrees. The default off temperature is 14 degrees. The default duration is 1 hour.</speak>');
        });

        it('shows the current temperature', async () => {
            const target = createTarget();
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/DefaultsIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.card.text).to.equal('The default on temperature is 20 degrees.\nThe default off temperature is 14 degrees.\nThe default duration is 1 hour.');
        });

        it('says the error', async () => {
            const target = createTarget();
            process.env.THERMOSTAT_TYPE = 'unknown';
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/DefaultsIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.outputSpeech.ssml).to.equal('<speak>Unknown thermostat type unknown</speak>');
        });
    });

    describe('TurnUpIntent', async () => {
        it('says the current temperature', async () => {
            const target = createTarget();
            process.env.MOCK_TARGET_TEMPERATURE = 18;
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnUpIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);

            process.env.MOCK_TARGET_TEMPERATURE = 20;
            expect(response.response.outputSpeech.ssml).to.equal('<speak>The target temperature is now 19 degrees.</speak>');
        });

        it('shows the current temperature', async () => {
            const target = createTarget();
            process.env.MOCK_TARGET_TEMPERATURE = 18;
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnUpIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            process.env.MOCK_TARGET_TEMPERATURE = 20;
            expect(response.response.card.text).to.equal('The target temperature is now 19 degrees.');
        });

        it('says the error', async () => {
            const target = createTarget();
            process.env.THERMOSTAT_TYPE = 'unknown';
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnUpIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.outputSpeech.ssml).to.equal('<speak>Unknown thermostat type unknown</speak>');
        });
    });

    describe('TurnDownIntent', async () => {
        it('says the current temperature', async () => {
            const target = createTarget();
            process.env.MOCK_TARGET_TEMPERATURE = 18;
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnDownIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);

            process.env.MOCK_TARGET_TEMPERATURE = 20;
            expect(response.response.outputSpeech.ssml).to.equal('<speak>The target temperature is now 17 degrees.</speak>');
        });

        it('shows the current temperature', async () => {
            const target = createTarget();
            process.env.MOCK_TARGET_TEMPERATURE = 18;
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnDownIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            process.env.MOCK_TARGET_TEMPERATURE = 20;
            expect(response.response.card.text).to.equal('The target temperature is now 17 degrees.');
        });

        it('says the error', async () => {
            const target = createTarget();
            process.env.THERMOSTAT_TYPE = 'unknown';
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnDownIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.outputSpeech.ssml).to.equal('<speak>Unknown thermostat type unknown</speak>');
        });
    });

    describe('TurnIntent', async () => {
        it('says the current temperature', async () => {
            const target = createTarget();
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);

            expect(response.response.outputSpeech.ssml).to.equal('<speak>The target temperature is now 20 degrees.</speak>');
        });

        it('shows the current temperature', async () => {
            const target = createTarget();
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.card.text).to.equal('The target temperature is now 20 degrees.');
        });

        it('says the error', async () => {
            const target = createTarget();
            process.env.THERMOSTAT_TYPE = 'unknown';
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/TurnIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);
            expect(response.response.outputSpeech.ssml).to.equal('<speak>Unknown thermostat type unknown</speak>');
        });
    });

    describe('HelpIntent', async () => {
        it('says the help text', async () => {
            const target = createTarget();
        
            const request = JSON.parse(await fs.readFile('./test/fixtures/HelpIntent.json'));
            const context = {};

            const handler = util.promisify(target.object().handler);

            const response = await handler(request, context);

            expect(response.response.outputSpeech.ssml).to.equal('<speak>You can say \'set the temperature to 18 degrees\' or ask \'the temperature\'. You can also say stop or exit to quit.</speak>');
        });
    });
});