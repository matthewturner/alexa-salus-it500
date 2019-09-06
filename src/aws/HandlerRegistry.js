const AdjustTargetTemperatureHandler = require('./handlers/AdjustTargetTemperatureHandler');
const SetTargetTemperatureHandler = require('./handlers/SetTargetTemperatureHandler');
const DiscoveryHandler = require('./handlers/DiscoveryHandler');
const AuthorizationHandler = require('./handlers/AuthorizationHandler');
const SetThermostatModeHandler = require('./handlers/SetThermostatModeHandler');
const ReportStateHandler = require('./handlers/ReportStateHandler');
const DefaultHandler = require('./handlers/DefaultHandler');

const all = () => {
    return [
        ReportStateHandler,
        SetTargetTemperatureHandler,
        AdjustTargetTemperatureHandler,
        SetThermostatModeHandler,
        DiscoveryHandler,
        AuthorizationHandler,
        DefaultHandler
    ]
};

module.exports.all = all;