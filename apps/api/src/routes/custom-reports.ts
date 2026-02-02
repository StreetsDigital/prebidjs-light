import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/auth';
import { safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

// Import service modules
import * as reportService from '../services/custom-report-service';
import * as executionService from '../services/report-execution-service';
import * as templateService from '../services/report-template-service';

export default async function customReportsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CUSTOM REPORTS - CRUD
  // ============================================================================

  // List all reports for a publisher
  fastify.get('/:publisherId/custom-reports', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { includeTemplates = 'false' } = request.query as any;

    const reports = reportService.listReports(publisherId, includeTemplates === 'true');

    return reply.send({ reports });
  });

  // Get a single report
  fastify.get('/:publisherId/custom-reports/:reportId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };

    const report = reportService.getReport(publisherId, reportId);

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    return reply.send({ report });
  });

  // Create a new report
  fastify.post('/:publisherId/custom-reports', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const input = request.body as reportService.CreateReportInput;

    const report = reportService.createReport(publisherId, input);

    return reply.status(201).send({ report });
  });

  // Update a report
  fastify.put('/:publisherId/custom-reports/:reportId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };
    const updates = request.body as reportService.UpdateReportInput;

    const report = reportService.updateReport(publisherId, reportId, updates);

    return reply.send({ report });
  });

  // Delete a report
  fastify.delete('/:publisherId/custom-reports/:reportId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };

    reportService.deleteReport(publisherId, reportId);

    return reply.send({ success: true });
  });

  // ============================================================================
  // REPORT EXECUTION
  // ============================================================================

  // Run a report
  fastify.post('/:publisherId/custom-reports/:reportId/run', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };
    const { triggeredBy = 'manual', parameters } = request.body as any;

    const report = reportService.getReport(publisherId, reportId);

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    const startTime = new Date();
    const executionId = executionService.createExecution(reportId, publisherId, triggeredBy, parameters);

    try {
      // Parse report configuration
      const metrics = report.metrics;
      const dimensions = report.dimensions;
      const filters = Array.isArray(report.filters) ? report.filters : [];
      const dateRange = parameters?.dateRange || report.dateRange;

      // Execute report query
      const data = await executionService.executeReport(publisherId, metrics, dimensions, filters, dateRange);

      // Calculate duration
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update execution record
      executionService.completeExecution(executionId, data, report.exportFormat, startTime);

      // Update report stats
      reportService.updateReportStats(reportId, endTime.toISOString());

      return reply.send({
        executionId,
        status: 'completed',
        rowCount: data.length,
        duration,
        data,
      });
    } catch (error) {
      // Mark execution as failed
      executionService.failExecution(executionId, String(error));

      return reply.status(500).send({
        error: 'Report execution failed',
        message: String(error),
      });
    }
  });

  // Get report execution history
  fastify.get('/:publisherId/custom-reports/:reportId/executions', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };
    const { limit = '50' } = request.query as any;

    const executions = executionService.getReportExecutions(publisherId, reportId, parseInt(limit));

    return reply.send({ executions });
  });

  // Get all executions for a publisher
  fastify.get('/:publisherId/report-executions', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { limit = '100', status } = request.query as any;

    const executions = executionService.getPublisherExecutions(publisherId, parseInt(limit), status);

    return reply.send({ executions });
  });

  // ============================================================================
  // REPORT TEMPLATES
  // ============================================================================

  // Get report templates (pre-built report configurations)
  fastify.get('/:publisherId/report-templates', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    const templates = templateService.getAllTemplates(publisherId);

    return reply.send({ templates });
  });

  // Create report from template
  fastify.post('/:publisherId/report-templates/:templateId/create', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, templateId } = request.params as { publisherId: string; templateId: string };
    const { name } = request.body as { name: string };

    const report = templateService.createReportFromTemplate(publisherId, templateId, name);

    if (!report) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return reply.status(201).send({ report });
  });

  // ============================================================================
  // REPORT PREVIEW (without saving)
  // ============================================================================

  // Preview a report configuration
  fastify.post('/:publisherId/custom-reports/preview', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { metrics, dimensions, filters, dateRange } = request.body as any;

    try {
      const data = await executionService.executeReport(
        publisherId,
        metrics,
        dimensions,
        filters || [],
        dateRange
      );

      return reply.send({
        preview: true,
        rowCount: data.length,
        data: data.slice(0, 100), // Limit preview to 100 rows
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Preview failed',
        message: String(error),
      });
    }
  });
}
