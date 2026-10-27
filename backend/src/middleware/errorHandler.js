import { logger } from '../utils/logger.js';
import { isDev } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled request error:', {
    message: err.message,
    stack: isDev ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred.';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(isDev && { stack: err.stack }),
    },
  });
};
