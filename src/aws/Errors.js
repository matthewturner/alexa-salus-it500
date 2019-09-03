class DomainError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class SmartHomeError extends DomainError {
    constructor(type, message) {
        super(message);
        this.data = { type };
    }
}

class InternalError extends DomainError {
    constructor(error) {
        super(error.message);
        this.data = { error };
    }
}

module.exports = {
    SmartHomeError,
    InternalError,
};