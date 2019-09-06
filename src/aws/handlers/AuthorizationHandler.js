const Handler = require('./Handler');

class AuthorizationHandler extends Handler {
    static handles(event) {
        return Handler.namespaceFor(event) === 'Alexa.Authorization';
    }

    async handle(event) {
        return this.responseFor(event).and.acceptAuthorizationRequest().response();
    }
}

module.exports = AuthorizationHandler;