// src/errors/SourceErrors.js

export class NetworkError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'NetworkError';
    this.retryable = true;
    this.isTimeout = !!options.isTimeout;
  }
}

export class HTTPError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HTTPError';
    this.statusCode = statusCode;
    this.retryable = statusCode >= 500 || statusCode === 429;
  }
}

export class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ParseError';
    this.retryable = false;
  }
}

export class CancelledError extends Error {
  constructor(message = 'Request cancelled') {
    super(message);
    this.name = 'CancelledError';
    this.retryable = false;
  }
}