/**
 * pbjs_engine API Server
 * Main entry point for the Fastify backend server
 */

import { initializeDatabase } from './db';
import { fetchPrebidData, startPeriodicRefresh } from './utils/prebid-data-fetcher';
import { seedParameterSchemas } from './utils/prebid-markdown-parser';
import { seedPresetTemplates } from './utils/preset-templates';
import {
  validateEnvironment,
  createFastifyInstance,
  registerPlugins,
  getServerConfig,
} from './config/server-config';
import { registerRoutes } from './middleware/setup';

// Validate environment variables
validateEnvironment();

// Create Fastify instance
const app = createFastifyInstance();

/**
 * Initialize and start the server
 */
const start = async () => {
  try {
    // Register plugins (middleware)
    app.log.info('Registering plugins...');
    await registerPlugins(app);
    app.log.info('Plugins registered');

    // Register routes
    app.log.info('Registering routes...');
    await registerRoutes(app);
    app.log.info('Routes registered');

    // Initialize database
    app.log.info('Initializing database...');
    initializeDatabase();
    app.log.info('Database initialized');

    // Fetch Prebid component data on startup
    app.log.info('Fetching Prebid component data...');
    await fetchPrebidData();
    app.log.info('Prebid component data loaded');

    // Seed parameter schemas
    app.log.info('Seeding parameter schemas...');
    await seedParameterSchemas();
    app.log.info('Parameter schemas seeded');

    // Seed preset templates
    app.log.info('Seeding preset templates...');
    await seedPresetTemplates();
    app.log.info('Preset templates seeded');

    // Start periodic refresh (every 24 hours)
    startPeriodicRefresh();

    // Get server configuration
    const { host, port } = getServerConfig();

    // Start listening
    await app.listen({ port, host });
    app.log.info(`Server running at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 * Properly closes connections and cleans up resources
 */
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    await app.close();

    // Close database connection
    const { db } = await import('./db');
    db.close();

    app.log.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    app.log.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Uncaught exception handler
 * Logs fatal errors and exits cleanly
 */
process.on('uncaughtException', (error) => {
  console.error('FATAL: Uncaught exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('FATAL: Unhandled promise rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Start the server
start();

export default app;
