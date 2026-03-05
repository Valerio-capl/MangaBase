// src/errors/SourceErrors.js

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
    this.retryable = true;
  }
}

export class HTTPError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HTTPError';
    this.statusCode = statusCode;
    this.retryable = statusCode >= 500;
  }
}

export class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ParseError';
    this.retryable = false;
  }
}