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

start();

export default app;
