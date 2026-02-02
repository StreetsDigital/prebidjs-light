/**
 * Route registration and middleware setup
 */

import { FastifyInstance } from 'fastify';
import authRoutes from '../routes/auth';
import impersonationRoutes from '../routes/impersonation';
import publisherRoutes from '../routes/publishers';
import websiteRoutes from '../routes/websites';
import userRoutes from '../routes/users';
import dashboardRoutes from '../routes/dashboard';
import auditLogsRoutes from '../routes/audit-logs';
import scheduledReportsRoutes from '../routes/scheduled-reports';
import analyticsRoutes from '../routes/analytics';
import abTestRoutes from '../routes/ab-tests';
import abTestAnalyticsRoutes from '../routes/ab-test-analytics';
import bidderHealthRoutes from '../routes/bidder-health';
import optimizationRulesRoutes from '../routes/optimization-rules';
import auctionInspectorRoutes from '../routes/auction-inspector';
import revenueForecastingRoutes from '../routes/revenue-forecasting';
import notificationsRoutes from '../routes/notifications';
import customReportsRoutes from '../routes/custom-reports';
import yieldAdvisorRoutes from '../routes/yield-advisor';
import adUnitsRoutes from '../routes/ad-units';
import wrapperRoutes from '../routes/wrapper';
import wrapperConfigsRoutes from '../routes/wrapper-configs';
import monitoringRoutes from '../routes/monitoring';
import systemRoutes from '../routes/system';
import chatRoutes from '../routes/chat';
import customBiddersRoutes from '../routes/custom-bidders';
import biddersRoutes from '../routes/bidders';
import prebidComponentsRoutes from '../routes/prebid-components';
import publisherModulesRoutes from '../routes/publisher-modules';
import publisherAnalyticsRoutes from '../routes/publisher-analytics';
import componentParametersRoutes from '../routes/component-parameters';
import templatesRoutes from '../routes/templates';
import bulkOperationsRoutes from '../routes/bulk-operations';
import analyticsDashboardRoutes from '../routes/analytics-dashboard';
import prebidBuildsRoutes from '../routes/prebid-builds';
import publicRoutes from '../routes/public-routes';
import currencyRoutes from '../routes/currency';

/**
 * Register all application routes
 */
export async function registerRoutes(app: FastifyInstance) {
  // Public routes (no authentication required)
  await app.register(publicRoutes);

  // Authentication routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(impersonationRoutes, { prefix: '/api/auth' });

  // Core resource routes
  await app.register(publisherRoutes, { prefix: '/api/publishers' });
  await app.register(websiteRoutes, { prefix: '/api' });
  await app.register(adUnitsRoutes, { prefix: '/api' });
  await app.register(userRoutes, { prefix: '/api/users' });

  // Dashboard and reporting routes
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(auditLogsRoutes, { prefix: '/api/audit-logs' });
  await app.register(scheduledReportsRoutes, { prefix: '/api/scheduled-reports' });
  await app.register(customReportsRoutes, { prefix: '/api/publishers' });

  // Analytics routes
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(analyticsDashboardRoutes, { prefix: '/api' });

  // A/B testing routes
  await app.register(abTestRoutes, { prefix: '/api/publishers' });
  await app.register(abTestAnalyticsRoutes, { prefix: '/api/publishers' });

  // Bidder management routes
  await app.register(biddersRoutes, { prefix: '/api/bidders' });
  await app.register(customBiddersRoutes, { prefix: '/api/publishers' });
  await app.register(bidderHealthRoutes, { prefix: '/api/publishers' });

  // Optimization and monitoring routes
  await app.register(optimizationRulesRoutes, { prefix: '/api/publishers' });
  await app.register(auctionInspectorRoutes, { prefix: '/api/publishers' });
  await app.register(revenueForecastingRoutes, { prefix: '/api/publishers' });
  await app.register(yieldAdvisorRoutes, { prefix: '/api/publishers' });

  // Notification routes
  await app.register(notificationsRoutes, { prefix: '/api/publishers' });

  // System routes
  await app.register(systemRoutes, { prefix: '/api/system' });
  await app.register(monitoringRoutes, { prefix: '/api/system' });

  // Chat routes
  await app.register(chatRoutes, { prefix: '/api' });

  // Wrapper routes
  await app.register(wrapperRoutes); // No prefix - serves at root level
  await app.register(wrapperConfigsRoutes, { prefix: '/api/publishers/:publisherId/configs' });

  // Prebid component routes
  await app.register(prebidComponentsRoutes, { prefix: '/api/prebid' });
  await app.register(publisherModulesRoutes, { prefix: '/api/publishers' });
  await app.register(publisherAnalyticsRoutes, { prefix: '/api/publishers' });
  await app.register(componentParametersRoutes, { prefix: '/api' });

  // Phase 2 features
  await app.register(templatesRoutes, { prefix: '/api' });
  await app.register(bulkOperationsRoutes, { prefix: '/api' });
  await app.register(prebidBuildsRoutes, { prefix: '/api' });

  // Currency conversion
  await app.register(currencyRoutes, { prefix: '/api/currency' });

  // Note: Old build system routes commented out - replaced by prebidBuildsRoutes
  // await app.register(buildsRoutes, { prefix: '/api' });
}
