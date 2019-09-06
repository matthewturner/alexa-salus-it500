'use strict';

const Logger = require('../core/Logger');
const HandlerRegistry = require('./HandlerRegistry');

const logger = new Logger(process.env.LOG_LEVEL || Logger.DEBUG);

exports.handler = async (event, context) => {
    logger.level = process.env.LOG_LEVEL || Logger.DEBUG;
    logEntry(event, context);

    const handlers = HandlerRegistry.all();

    for (let index = 0; index < handlers.length; index++) {
        let handlerType = handlers[index];
        if (handlerType.handles(event)) {
            const handler = new handlerType(logger);
            return await handler.handle(event);
        }
    }
};

const logEntry = (event, context) => {
    logger.debug('Event details:');
    logger.debug(JSON.stringify(event));

    if (context !== undefined) {
        logger.debug('Context details:');
        logger.debug(JSON.stringify(context));
    }
};