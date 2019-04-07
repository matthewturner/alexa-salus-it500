const expect = require('chai').expect;
const sinon = require('sinon');
const Duration = require('durationjs');
const ControlService = require('../../src/core/ControlService');
const Mock = require('../../src/thermostats/Mock');
const HoldStrategy = require('../../src/core/HoldStrategy');
const Logger = require('../../src/core/Logger');

const createTarget = () => {
    const logger = new Logger();
    const context = { userId: 'user123', source: 'user' };
    const holdStrategy = new HoldStrategy(logger);
    const thermostatRepository = sinon.fake();
    thermostatRepository.find = sinon.stub();
    const thermostat = { type: 'mock', defaultOnTemp: 22, 
        defaultOffTemp: 14, defaultDuration: 'PT1H', options: {}
    };
    thermostatRepository.find.withArgs('user123').returns(thermostat);
    const thermostatFactory = sinon.fake();
    thermostatFactory.create = sinon.stub();
    const mock = new Mock(logger);
    thermostatFactory.create.withArgs(thermostat.type, {}).returns(mock);

    return {
        logger: logger,
        context: context,
        holdStrategy: holdStrategy,
        mock: mock,
        thermostatFactory: thermostatFactory,
        thermostatRepository: thermostatRepository,
        object: () => {
            return new ControlService(logger, context, holdStrategy, 
                thermostatFactory, thermostatRepository);
        }
    };
};

describe('ControlService', async () => {
    describe('Launch', async () => {
        context('when the thermostat is online', async () => {
            it('returns online', async () => {
                const target = createTarget();
            
                const message = await target.object().launch();
            
                expect(message).to.equal('Thermostat is online.');
            });
        });

        context('when the thermostat is offline', async () => {
            it('returns offline', async () => {
                const target = createTarget();
                target.mock.online = async() => {
                    return false;
                };
            
                const message = await target.object().launch();
            
                expect(message).to.equal('Sorry, the thermostat is offline at the moment.');
            });
        });
    });

    describe('Status', async () => {
        context('when there is no hold time', async () => {
            it('returns the status', async () => {
                const target = createTarget();
            
                const messages = await target.object().status();
            
                expect(messages[0]).to.equal('The current temperature is 19 degrees.');
                expect(messages[1]).to.equal('The target is 20 degrees.');
                expect(messages[2]).to.equal('The heating is on.');
            });
        });

        context('when a hold time has been set', async () => {
            it('includes the hold time', async () => {
                const target = createTarget();
                target.holdStrategy.status = async () => {
                    return {
                        status: 'running',
                        duration: new Duration('PT1H'),
                        startDate: new Date()
                    };
                };
            
                const messages = await target.object().status();
            
                expect(messages[0]).to.equal('The current temperature is 19 degrees.');
                expect(messages[1]).to.equal('The target is 20 degrees.');
                expect(messages[2]).to.equal('The heating is on and will turn off in 1 hour.');
            });
        });
    });

    describe('Turn', async () => {
        context('when turning on', async () => {
            it('returns the new target temperature', async () => {
                const target = createTarget();
            
                const messages = await target.object().turn('on');
            
                expect(messages[0]).to.equal('The target temperature is now 22 degrees.');
            });

            it('returns the new target temperature with hold time', async () => {
                const target = createTarget();
            
                const messages = await target.object().turn('on', 'PT1H');
            
                expect(messages[0]).to.equal('The target temperature is now 22 degrees.');
                expect(messages[1]).to.equal('Hold time is not supported on this device.');
            });
        });

        context('when turning off', async () => {
            it('returns the new target temperature', async () => {
                const target = createTarget();
            
                const messages = await target.object().turn('off');
            
                expect(messages[0]).to.equal('The target temperature is now 14 degrees.');
            });
        });
    });

    describe('TurnUp', async () => {
        it('increases the target temperature by 1.0 degrees', async () => {
            const target = createTarget();
            target.mock.setTemperature(15);
        
            const messages = await target.object().turnUp();
        
            expect(messages[0]).to.equal('The target temperature is now 16 degrees.');
        });
    });

    describe('TurnDown', async () => {
        it('decreases the target temperature by 1.0 degrees', async () => {
            const target = createTarget();
            target.mock.setTemperature(15);
        
            const messages = await target.object().turnDown();
        
            expect(messages[0]).to.equal('The target temperature is now 14 degrees.');
        });
    });

    describe('Defaults', async () => {
        it('returns the current defaults', async () => {
            const target = createTarget();
        
            const messages = await target.object().defaults();
        
            expect(messages[0]).to.equal('The default on temperature is 22 degrees.');
            expect(messages[1]).to.equal('The default off temperature is 14 degrees.');
            expect(messages[2]).to.equal('The default duration is 1 hour.');
        });
    });
});