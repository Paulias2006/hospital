import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.userId,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Erreur de validation',
      details: errors,
      code: 'VALIDATION_ERROR',
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      error: `${field} existe déjà`,
      code: 'DUPLICATE_FIELD',
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Format d\'ID invalide',
      code: 'INVALID_ID',
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erreur serveur';

  return res.status(statusCode).json({
    success: false,
    error: message,
    code: 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
