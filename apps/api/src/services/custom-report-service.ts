import { randomUUID } from 'crypto';
import { db } from '../db';
import { customReports } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

export interface ReportData {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  metrics: any;
  dimensions: any;
  filters: any;
  dateRange: any;
  visualization: any;
  schedule: any;
  exportFormat: string;
  isTemplate: boolean;
  isPublic: boolean;
  createdBy: string | null;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportInput {
  name: string;
  description?: string;
  metrics: string[];
  dimensions: string[];
  filters?: any;
  dateRange: any;
  visualization?: any;
  schedule?: any;
  exportFormat?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  createdBy?: string;
}

export interface UpdateReportInput {
  name?: string;
  description?: string;
  metrics?: string[];
  dimensions?: string[];
  filters?: any;
  dateRange?: any;
  visualization?: any;
  schedule?: any;
  exportFormat?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
}

/**
 * Parse a report record from the database into a properly typed object
 */
export function parseReportRecord(report: any): ReportData {
  return {
    ...report,
    metrics: safeJsonParseArray(report.metrics, []),
    dimensions: safeJsonParseArray(report.dimensions, []),
    filters: safeJsonParse(report.filters, null),
    dateRange: safeJsonParseObject(report.dateRange, {}),
    visualization: safeJsonParse(report.visualization, null),
    schedule: safeJsonParse(report.schedule, null),
  };
}

/**
 * List all reports for a publisher
 */
export function listReports(publisherId: string, includeTemplates = false): ReportData[] {
  let reports = db.select().from(customReports)
    .where(eq(customReports.publisherId, publisherId))
    .orderBy(desc(customReports.createdAt))
    .all();

  if (!includeTemplates) {
    reports = reports.filter(r => !r.isTemplate);
  }

  return reports.map(parseReportRecord);
}

/**
 * Get a single report by ID
 */
export function getReport(publisherId: string, reportId: string): ReportData | null {
  const report = db.select().from(customReports)
    .where(and(
      eq(customReports.id, reportId),
      eq(customReports.publisherId, publisherId)
    ))
    .get();

  return report ? parseReportRecord(report) : null;
}

/**
 * Create a new report
 */
export function createReport(publisherId: string, input: CreateReportInput): ReportData | null {
  const reportId = randomUUID();
  const now = new Date().toISOString();

  db.insert(customReports).values({
    id: reportId,
    publisherId,
    name: input.name,
    description: input.description || null,
    metrics: JSON.stringify(input.metrics),
    dimensions: JSON.stringify(input.dimensions),
    filters: input.filters ? JSON.stringify(input.filters) : null,
    dateRange: JSON.stringify(input.dateRange),
    visualization: input.visualization ? JSON.stringify(input.visualization) : null,
    schedule: input.schedule ? JSON.stringify(input.schedule) : null,
    exportFormat: input.exportFormat || 'csv',
    isTemplate: input.isTemplate || false,
    isPublic: input.isPublic || false,
    createdBy: input.createdBy || null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
  }).run();

  const report = db.select().from(customReports)
    .where(eq(customReports.id, reportId))
    .get();

  return report ? parseReportRecord(report) : null;
}

/**
 * Update an existing report
 */
export function updateReport(
  publisherId: string,
  reportId: string,
  updates: UpdateReportInput
): ReportData | null {
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
    )).run();

  const report = db.select().from(customReports)
    .where(eq(customReports.id, reportId))
    .get();

  return report ? parseReportRecord(report) : null;
}

/**
 * Delete a report
 */
export function deleteReport(publisherId: string, reportId: string): void {
  db.delete(customReports)
    .where(and(
      eq(customReports.id, reportId),
      eq(customReports.publisherId, publisherId)
    )).run();
}

/**
 * Update report statistics after execution
 */
export function updateReportStats(reportId: string, lastRunAt: string): void {
  const report = db.select().from(customReports)
    .where(eq(customReports.id, reportId))
    .get();

  if (report) {
    db.update(customReports)
      .set({
        lastRunAt,
        runCount: report.runCount + 1,
      })
      .where(eq(customReports.id, reportId)).run();
  }
}
