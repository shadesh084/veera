import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.nodeEnv} mode on http://localhost:${PORT}`);
  logger.info(`Frontend URL configured as: ${config.frontendUrl}`);
});

// Graceful shutdown handling
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown triggered after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
