const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle specific Mongoose errors
const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists.`, 409);
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map(e => e.message);
  return new AppError(`Validation error: ${messages.join(', ')}`, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpired = () =>
  new AppError('Token expired. Please log in again.', 401);

// Global error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };

  // Mongoose errors
  if (err.name === 'CastError')             error = handleCastError(err);
  if (err.code === 11000)                   error = handleDuplicateKeyError(err);
  if (err.name === 'ValidationError')       error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError')     error = handleJWTError();
  if (err.name === 'TokenExpiredError')     error = handleJWTExpired();

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${req.method} ${req.originalUrl} — ${message}`, {
      stack: err.stack,
      body: req.body,
      user: req.user?._id
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
};

module.exports = { AppError, globalErrorHandler };
