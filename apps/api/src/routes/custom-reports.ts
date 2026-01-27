import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { customReports, reportExecutions, analyticsEvents } from '../db/schema';
import { eq, and, gte, desc, sql, asc } from 'drizzle-orm';

export default async function customReportsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CUSTOM REPORTS - CRUD
  // ============================================================================

  // List all reports for a publisher
  fastify.get('/:publisherId/custom-reports', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { includeTemplates = 'false' } = request.query as any;

    let reports = db.select().from(customReports)
      .where(eq(customReports.publisherId, publisherId))
      .orderBy(desc(customReports.createdAt))
      .all();

    if (includeTemplates === 'false') {
      reports = reports.filter(r => !r.isTemplate);
    }

    const reportsWithData = reports.map(report => ({
      ...report,
      metrics: JSON.parse(report.metrics),
      dimensions: JSON.parse(report.dimensions),
      filters: report.filters ? JSON.parse(report.filters) : null,
      dateRange: JSON.parse(report.dateRange),
      visualization: report.visualization ? JSON.parse(report.visualization) : null,
      schedule: report.schedule ? JSON.parse(report.schedule) : null,
    }));

    return reply.send({ reports: reportsWithData });
  });

  // Get a single report
  fastify.get('/:publisherId/custom-reports/:reportId', async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };

    const report = db.select().from(customReports)
      .where(and(
        eq(customReports.id, reportId),
        eq(customReports.publisherId, publisherId)
      ))
      .get();

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    return reply.send({
      report: {
        ...report,
        metrics: JSON.parse(report.metrics),
        dimensions: JSON.parse(report.dimensions),
        filters: report.filters ? JSON.parse(report.filters) : null,
        dateRange: JSON.parse(report.dateRange),
        visualization: report.visualization ? JSON.parse(report.visualization) : null,
        schedule: report.schedule ? JSON.parse(report.schedule) : null,
      }
    });
  });

  // Create a new report
  fastify.post('/:publisherId/custom-reports', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      name,
      description,
      metrics,
      dimensions,
      filters,
      dateRange,
      visualization,
      schedule,
      exportFormat,
      isTemplate,
      isPublic,
      createdBy
    } = request.body as any;

    const reportId = randomUUID();
    const now = new Date().toISOString();

    db.insert(customReports).values({
      id: reportId,
      publisherId,
      name,
      description: description || null,
      metrics: JSON.stringify(metrics),
      dimensions: JSON.stringify(dimensions),
      filters: filters ? JSON.stringify(filters) : null,
      dateRange: JSON.stringify(dateRange),
      visualization: visualization ? JSON.stringify(visualization) : null,
      schedule: schedule ? JSON.stringify(schedule) : null,
      exportFormat: exportFormat || 'csv',
      isTemplate: isTemplate || false,
      isPublic: isPublic || false,
      createdBy: createdBy || null,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const report = db.select().from(customReports)
      .where(eq(customReports.id, reportId))
      .get();

    return reply.status(201).send({
      report: report ? {
        ...report,
        metrics: JSON.parse(report.metrics),
        dimensions: JSON.parse(report.dimensions),
        filters: report.filters ? JSON.parse(report.filters) : null,
        dateRange: JSON.parse(report.dateRange),
        visualization: report.visualization ? JSON.parse(report.visualization) : null,
        schedule: report.schedule ? JSON.parse(report.schedule) : null,
      } : null
    });
  });

  // Update a report
  fastify.put('/:publisherId/custom-reports/:reportId', async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };
    const updates = request.body as any;

    const setValues: any = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.metrics !== undefined) setValues.metrics = JSON.stringify(updates.metrics);
    if (updates.dimensions !== undefined) setValues.dimensions = JSON.stringify(updates.dimensions);
    if (updates.filters !== undefined) setValues.filters = updates.filters ? JSON.stringify(updates.filters) : null;
    if (updates.dateRange !== undefined) setValues.dateRange = JSON.stringify(updates.dateRange);
    if (updates.visualization !== undefined) setValues.visualization = updates.visualization ? JSON.stringify(updates.visualization) : null;
    if (updates.schedule !== undefined) setValues.schedule = updates.schedule ? JSON.stringify(updates.schedule) : null;
    if (updates.exportFormat !== undefined) setValues.exportFormat = updates.exportFormat;
    if (updates.isTemplate !== undefined) setValues.isTemplate = updates.isTemplate;
    if (updates.isPublic !== undefined) setValues.isPublic = updates.isPublic;

    db.update(customReports)
      .set(setValues)
      .where(and(
        eq(customReports.id, reportId),
        eq(customReports.publisherId, publisherId)
      ))
      ;

    const report = db.select().from(customReports)
      .where(eq(customReports.id, reportId))
      .get();

    return reply.send({
      report: report ? {
        ...report,
        metrics: JSON.parse(report.metrics),
        dimensions: JSON.parse(report.dimensions),
        filters: report.filters ? JSON.parse(report.filters) : null,
        dateRange: JSON.parse(report.dateRange),
        visualization: report.visualization ? JSON.parse(report.visualization) : null,
        schedule: report.schedule ? JSON.parse(report.schedule) : null,
      } : null
    });
  });

  // Delete a report
  fastify.delete('/:publisherId/custom-reports/:reportId', async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };

    db.delete(customReports)
      .where(and(
        eq(customReports.id, reportId),
        eq(customReports.publisherId, publisherId)
      ))
      ;

    return reply.send({ success: true });
  });

  // ============================================================================
  // REPORT EXECUTION
  // ============================================================================

  // Run a report
  fastify.post('/:publisherId/custom-reports/:reportId/run', async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };
    const { triggeredBy = 'manual', parameters } = request.body as any;

    const report = db.select().from(customReports)
      .where(and(
        eq(customReports.id, reportId),
        eq(customReports.publisherId, publisherId)
      ))
      .get();

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    const executionId = randomUUID();
    const startTime = new Date();

    // Create execution record
    db.insert(reportExecutions).values({
      id: executionId,
      reportId,
      publisherId,
      status: 'running',
      startedAt: startTime.toISOString(),
      triggeredBy,
      parameters: parameters ? JSON.stringify(parameters) : null,
    });

    try {
      // Parse report configuration
      const metrics = JSON.parse(report.metrics);
      const dimensions = JSON.parse(report.dimensions);
      const filters = report.filters ? JSON.parse(report.filters) : [];
      const dateRange = parameters?.dateRange || JSON.parse(report.dateRange);

      // Execute report query
      const data = await executeReport(publisherId, metrics, dimensions, filters, dateRange);

      // Calculate duration
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update execution record
      db.update(reportExecutions)
        .set({
          status: 'completed',
          completedAt: endTime.toISOString(),
          duration,
          rowCount: data.length,
          outputFormat: report.exportFormat,
        })
        .where(eq(reportExecutions.id, executionId))
        ;

      // Update report stats
      db.update(customReports)
        .set({
          lastRunAt: endTime.toISOString(),
          runCount: report.runCount + 1,
        })
        .where(eq(customReports.id, reportId))
        ;

      return reply.send({
        executionId,
        status: 'completed',
        rowCount: data.length,
        duration,
        data,
      });
    } catch (error) {
      // Mark execution as failed
      db.update(reportExecutions)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString(),
          errorMessage: String(error),
        })
        .where(eq(reportExecutions.id, executionId))
        ;

      return reply.status(500).send({
        error: 'Report execution failed',
        message: String(error),
      });
    }
  });

  // Get report execution history
  fastify.get('/:publisherId/custom-reports/:reportId/executions', async (request, reply) => {
    const { publisherId, reportId } = request.params as { publisherId: string; reportId: string };
    const { limit = '50' } = request.query as any;

    const executions = db.select().from(reportExecutions)
      .where(and(
        eq(reportExecutions.reportId, reportId),
        eq(reportExecutions.publisherId, publisherId)
      ))
      .orderBy(desc(reportExecutions.startedAt))
      .limit(parseInt(limit))
      .all();

    const executionsWithData = executions.map(exec => ({
      ...exec,
      parameters: exec.parameters ? JSON.parse(exec.parameters) : null,
    }));

    return reply.send({ executions: executionsWithData });
  });

  // Get all executions for a publisher
  fastify.get('/:publisherId/report-executions', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { limit = '100', status } = request.query as any;

    let executions = db.select().from(reportExecutions)
      .where(eq(reportExecutions.publisherId, publisherId))
      .orderBy(desc(reportExecutions.startedAt))
      .limit(parseInt(limit))
      .all();

    if (status) {
      executions = executions.filter(e => e.status === status);
    }

    const executionsWithData = executions.map(exec => ({
      ...exec,
      parameters: exec.parameters ? JSON.parse(exec.parameters) : null,
    }));

    return reply.send({ executions: executionsWithData });
  });

  // ============================================================================
  // REPORT TEMPLATES
  // ============================================================================

  // Get report templates (pre-built report configurations)
  fastify.get('/:publisherId/report-templates', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    // Get custom templates created by this publisher
    const customTemplates = db.select().from(customReports)
      .where(and(
        eq(customReports.publisherId, publisherId),
        eq(customReports.isTemplate, true)
      ))
      .all();

    // Built-in templates
    const builtInTemplates = [
      {
        id: 'template_daily_revenue',
        name: 'Daily Revenue Report',
        description: 'Revenue breakdown by day with bidder comparison',
        metrics: ['revenue', 'impressions', 'cpm', 'fillRate'],
        dimensions: ['date', 'bidderCode'],
        filters: [],
        dateRange: { type: 'last_30_days' },
        visualization: { type: 'line', metric: 'revenue' },
        isBuiltIn: true,
      },
      {
        id: 'template_bidder_performance',
        name: 'Bidder Performance Report',
        description: 'Comprehensive bidder metrics including timeout and error rates',
        metrics: ['revenue', 'impressions', 'cpm', 'timeoutRate', 'errorRate', 'bidCount'],
        dimensions: ['bidderCode'],
        filters: [],
        dateRange: { type: 'last_7_days' },
        visualization: { type: 'table' },
        isBuiltIn: true,
      },
      {
        id: 'template_ad_unit_breakdown',
        name: 'Ad Unit Performance',
        description: 'Revenue and performance by ad unit',
        metrics: ['revenue', 'impressions', 'cpm', 'fillRate'],
        dimensions: ['adUnitCode'],
        filters: [],
        dateRange: { type: 'last_7_days' },
        visualization: { type: 'bar', metric: 'revenue' },
        isBuiltIn: true,
      },
      {
        id: 'template_hourly_analysis',
        name: 'Hourly Revenue Analysis',
        description: 'Revenue patterns by hour of day',
        metrics: ['revenue', 'impressions', 'cpm'],
        dimensions: ['hour'],
        filters: [],
        dateRange: { type: 'last_7_days' },
        visualization: { type: 'line', metric: 'revenue' },
        isBuiltIn: true,
      },
    ];

    return reply.send({
      templates: [
        ...builtInTemplates,
        ...customTemplates.map(t => ({
          ...t,
          metrics: JSON.parse(t.metrics),
          dimensions: JSON.parse(t.dimensions),
          filters: t.filters ? JSON.parse(t.filters) : [],
          dateRange: JSON.parse(t.dateRange),
          visualization: t.visualization ? JSON.parse(t.visualization) : null,
          isBuiltIn: false,
        }))
      ]
    });
  });

  // Create report from template
  fastify.post('/:publisherId/report-templates/:templateId/create', async (request, reply) => {
    const { publisherId, templateId } = request.params as { publisherId: string; templateId: string };
    const { name } = request.body as { name: string };

    // Check if it's a built-in template
    const builtInTemplates: Record<string, any> = {
      template_daily_revenue: {
        metrics: ['revenue', 'impressions', 'cpm', 'fillRate'],
        dimensions: ['date', 'bidderCode'],
        filters: [],
        dateRange: { type: 'last_30_days' },
        visualization: { type: 'line', metric: 'revenue' },
      },
      template_bidder_performance: {
        metrics: ['revenue', 'impressions', 'cpm', 'timeoutRate', 'errorRate', 'bidCount'],
        dimensions: ['bidderCode'],
        filters: [],
        dateRange: { type: 'last_7_days' },
        visualization: { type: 'table' },
      },
      template_ad_unit_breakdown: {
        metrics: ['revenue', 'impressions', 'cpm', 'fillRate'],
        dimensions: ['adUnitCode'],
        filters: [],
        dateRange: { type: 'last_7_days' },
        visualization: { type: 'bar', metric: 'revenue' },
      },
      template_hourly_analysis: {
        metrics: ['revenue', 'impressions', 'cpm'],
        dimensions: ['hour'],
        filters: [],
        dateRange: { type: 'last_7_days' },
        visualization: { type: 'line', metric: 'revenue' },
      },
    };

    let template: any;

    if (templateId.startsWith('template_')) {
      template = builtInTemplates[templateId];
    } else {
      const customTemplate = db.select().from(customReports)
        .where(eq(customReports.id, templateId))
        .get();

      if (customTemplate) {
        template = {
          metrics: JSON.parse(customTemplate.metrics),
          dimensions: JSON.parse(customTemplate.dimensions),
          filters: customTemplate.filters ? JSON.parse(customTemplate.filters) : [],
          dateRange: JSON.parse(customTemplate.dateRange),
          visualization: customTemplate.visualization ? JSON.parse(customTemplate.visualization) : null,
        };
      }
    }

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    // Create new report from template
    const reportId = randomUUID();
    const now = new Date().toISOString();

    db.insert(customReports).values({
      id: reportId,
      publisherId,
      name,
      description: `Created from template`,
      metrics: JSON.stringify(template.metrics),
      dimensions: JSON.stringify(template.dimensions),
      filters: JSON.stringify(template.filters),
      dateRange: JSON.stringify(template.dateRange),
      visualization: template.visualization ? JSON.stringify(template.visualization) : null,
      schedule: null,
      exportFormat: 'csv',
      isTemplate: false,
      isPublic: false,
      createdBy: null,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const report = db.select().from(customReports)
      .where(eq(customReports.id, reportId))
      .get();

    return reply.status(201).send({
      report: report ? {
        ...report,
        metrics: JSON.parse(report.metrics),
        dimensions: JSON.parse(report.dimensions),
        filters: report.filters ? JSON.parse(report.filters) : [],
        dateRange: JSON.parse(report.dateRange),
        visualization: report.visualization ? JSON.parse(report.visualization) : null,
      } : null
    });
  });

  // ============================================================================
  // REPORT PREVIEW (without saving)
  // ============================================================================

  // Preview a report configuration
  fastify.post('/:publisherId/custom-reports/preview', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { metrics, dimensions, filters, dateRange } = request.body as any;

    try {
      const data = await executeReport(publisherId, metrics, dimensions, filters || [], dateRange);

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function executeReport(
  publisherId: string,
  metrics: string[],
  dimensions: string[],
  filters: any[],
  dateRange: any
): Promise<any[]> {
  // Parse date range
  const { startDate, endDate } = parseDateRange(dateRange);

  // Get analytics events
  let events = db.select().from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.publisherId, publisherId),
      gte(analyticsEvents.timestamp, startDate),
      sql`${analyticsEvents.timestamp} <= ${endDate}`
    ))
    .all();

  // Apply filters
  events = applyFilters(events, filters);

  // Group by dimensions
  const groupedData = groupByDimensions(events, dimensions);

  // Calculate metrics
  const results = Object.entries(groupedData).map(([key, eventGroup]: [string, any]) => {
    const row: any = {};

    // Add dimension values
    if (dimensions.length === 1) {
      row[dimensions[0]] = key;
    } else {
      const keys = key.split('|');
      dimensions.forEach((dim, idx) => {
        row[dim] = keys[idx];
      });
    }

    // Calculate metrics
    metrics.forEach(metric => {
      row[metric] = calculateMetric(metric, eventGroup);
    });

    return row;
  });

  return results;
}

function parseDateRange(dateRange: any): { startDate: string; endDate: string } {
  const now = new Date();

  if (dateRange.type === 'last_7_days') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  } else if (dateRange.type === 'last_30_days') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  } else if (dateRange.type === 'custom') {
    return { startDate: dateRange.start, endDate: dateRange.end };
  }

  // Default to last 7 days
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

function applyFilters(events: any[], filters: any[]): any[] {
  let filtered = events;

  filters.forEach(filter => {
    const { field, operator, value } = filter;

    filtered = filtered.filter(event => {
      const eventValue = event[field];

      switch (operator) {
        case 'equals':
          return eventValue === value;
        case 'not_equals':
          return eventValue !== value;
        case 'contains':
          return String(eventValue).includes(value);
        case 'greater_than':
          return Number(eventValue) > Number(value);
        case 'less_than':
          return Number(eventValue) < Number(value);
        default:
          return true;
      }
    });
  });

  return filtered;
}

function groupByDimensions(events: any[], dimensions: string[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  events.forEach(event => {
    let key: string;

    if (dimensions.length === 0) {
      key = 'all';
    } else if (dimensions.length === 1) {
      const dim = dimensions[0];
      if (dim === 'date') {
        key = event.timestamp.split('T')[0];
      } else if (dim === 'hour') {
        key = new Date(event.timestamp).getHours().toString();
      } else {
        key = event[dim] || 'unknown';
      }
    } else {
      key = dimensions.map(dim => {
        if (dim === 'date') {
          return event.timestamp.split('T')[0];
        } else if (dim === 'hour') {
          return new Date(event.timestamp).getHours().toString();
        }
        return event[dim] || 'unknown';
      }).join('|');
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(event);
  });

  return grouped;
}

function calculateMetric(metric: string, events: any[]): number {
  switch (metric) {
    case 'revenue':
      return events
        .filter(e => e.eventType === 'bidWon')
        .reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);

    case 'impressions':
      return events.filter(e => e.eventType === 'bidWon').length;

    case 'cpm':
      const bidWins = events.filter(e => e.eventType === 'bidWon');
      const totalRevenue = bidWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);
      return bidWins.length > 0 ? totalRevenue / bidWins.length : 0;

    case 'fillRate':
      const auctionInits = events.filter(e => e.eventType === 'auctionInit').length;
      const wins = events.filter(e => e.eventType === 'bidWon').length;
      return auctionInits > 0 ? (wins / auctionInits) * 100 : 0;

    case 'timeoutRate':
      const bidResponses = events.filter(e => e.eventType === 'bidResponse');
      const timeouts = bidResponses.filter(e => e.timeout).length;
      return bidResponses.length > 0 ? (timeouts / bidResponses.length) * 100 : 0;

    case 'errorRate':
      const bids = events.filter(e => e.eventType === 'bidResponse' || e.eventType === 'bidError');
      const errors = events.filter(e => e.eventType === 'bidError').length;
      return bids.length > 0 ? (errors / bids.length) * 100 : 0;

    case 'bidCount':
      return events.filter(e => e.eventType === 'bidResponse').length;

    default:
      return 0;
  }
}
