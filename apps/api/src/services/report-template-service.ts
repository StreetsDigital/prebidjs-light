import { randomUUID } from 'crypto';
import { db } from '../db';
import { customReports } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  dimensions: string[];
  filters: any[];
  dateRange: any;
  visualization: any;
  isBuiltIn: boolean;
}

/**
 * Built-in report templates
 */
const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
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

/**
 * Get all templates for a publisher (built-in + custom)
 */
export function getAllTemplates(publisherId: string): TemplateDefinition[] {
  // Get custom templates created by this publisher
  const customTemplates = db.select().from(customReports)
    .where(and(
      eq(customReports.publisherId, publisherId),
      eq(customReports.isTemplate, true)
    ))
    .all();

  const customTemplatesFormatted: TemplateDefinition[] = customTemplates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    metrics: safeJsonParseArray(t.metrics, []),
    dimensions: safeJsonParseArray(t.dimensions, []),
    filters: safeJsonParseArray(t.filters, []),
    dateRange: safeJsonParseObject(t.dateRange, {}),
    visualization: safeJsonParse(t.visualization, null),
    isBuiltIn: false,
  }));

  return [...BUILT_IN_TEMPLATES, ...customTemplatesFormatted];
}

/**
 * Get a single template by ID
 */
export function getTemplate(templateId: string, publisherId?: string): TemplateDefinition | null {
  // Check built-in templates first
  const builtIn = BUILT_IN_TEMPLATES.find(t => t.id === templateId);
  if (builtIn) {
    return builtIn;
  }

  // Check custom templates
  if (publisherId) {
    const customTemplate = db.select().from(customReports)
      .where(eq(customReports.id, templateId))
      .get();

    if (customTemplate) {
      return {
        id: customTemplate.id,
        name: customTemplate.name,
        description: customTemplate.description || '',
        metrics: safeJsonParseArray(customTemplate.metrics, []),
        dimensions: safeJsonParseArray(customTemplate.dimensions, []),
        filters: safeJsonParseArray(customTemplate.filters, []),
        dateRange: safeJsonParseObject(customTemplate.dateRange, {}),
        visualization: safeJsonParse(customTemplate.visualization, null),
        isBuiltIn: false,
      };
    }
  }

  return null;
}

/**
 * Get template configuration (metrics, dimensions, etc.)
 */
export function getTemplateConfig(templateId: string): any | null {
  // Check built-in templates
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

  if (templateId.startsWith('template_')) {
    return builtInTemplates[templateId] || null;
  }

  // Check custom template
  const customTemplate = db.select().from(customReports)
    .where(eq(customReports.id, templateId))
    .get();

  if (customTemplate) {
    return {
      metrics: safeJsonParseArray(customTemplate.metrics, []),
      dimensions: safeJsonParseArray(customTemplate.dimensions, []),
      filters: safeJsonParseArray(customTemplate.filters, []),
      dateRange: safeJsonParseObject(customTemplate.dateRange, {}),
      visualization: safeJsonParse(customTemplate.visualization, null),
    };
  }

  return null;
}

/**
 * Create a report from a template
 */
export function createReportFromTemplate(
  publisherId: string,
  templateId: string,
  name: string
): any | null {
  const template = getTemplateConfig(templateId);

  if (!template) {
    return null;
  }

  // Create new report from template
  const reportId = randomUUID();
  const now = new Date().toISOString();

  db.insert(customReports).values({
    id: reportId,
    publisherId,
    name,
    description: 'Created from template',
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
  }).run();

  const report = db.select().from(customReports)
    .where(eq(customReports.id, reportId))
    .get();

  if (report) {
    return {
      ...report,
      metrics: safeJsonParseArray(report.metrics, []),
      dimensions: safeJsonParseArray(report.dimensions, []),
      filters: safeJsonParseArray(report.filters, []),
      dateRange: safeJsonParseObject(report.dateRange, {}),
      visualization: safeJsonParse(report.visualization, null),
    };
  }

  return null;
}
