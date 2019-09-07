'use strict';

const Logger = require('../core/Logger');
const HandlerRegistry = require('./HandlerRegistry');

const logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG);

exports.handler = async (ev, context) => {
    logger.level = process.env.LOG_LEVEL || Logger.DEBUG;
    logEntry(ev, context);
    const event = extractEvent(ev);

    const handlers = HandlerRegistry.all();

    for (let index = 0; index < handlers.length; index++) {
        let handlerType = handlers[index];
        if (handlerType.handles(event)) {
            const handler = new handlerType(logger);
            const response = await handler.handle(event);
            logResponse(response);
            return response;
        }
    }
};

const extractEvent = (ev) => {
    if (ev.Records) {
        const event = JSON.parse(ev.Records[0].Sns.Message);
        logEntry(event, undefined);
        return event;
    }
    return ev;
}

const logResponse = (response) => {
    logger.debug('Response details:');
    logger.debug(JSON.stringify(response));
};

const logEntry = (event, context) => {
    logger.debug('Event details:');
    logger.debug(JSON.stringify(event));

    if (context !== undefined) {
        logger.debug('Context details:');
        logger.debug(JSON.stringify(context));
    }
};