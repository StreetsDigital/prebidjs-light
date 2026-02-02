import { randomUUID } from 'crypto';
import { db } from '../db';
import { reportExecutions, analyticsEvents } from '../db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { safeJsonParse, safeJsonParseObject } from '../utils/safe-json';

export interface ExecutionRecord {
  id: string;
  reportId: string;
  publisherId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  rowCount: number | null;
  outputFormat: string | null;
  triggeredBy: string;
  parameters: any;
  errorMessage: string | null;
}

/**
 * Parse an execution record from the database
 */
export function parseExecutionRecord(exec: any): ExecutionRecord {
  return {
    ...exec,
    parameters: safeJsonParse(exec.parameters, null),
  };
}

/**
 * Create a new execution record
 */
export function createExecution(
  reportId: string,
  publisherId: string,
  triggeredBy = 'manual',
  parameters?: any
): string {
  const executionId = randomUUID();
  const startTime = new Date();

  db.insert(reportExecutions).values({
    id: executionId,
    reportId,
    publisherId,
    status: 'running',
    startedAt: startTime.toISOString(),
    triggeredBy,
    parameters: parameters ? JSON.stringify(parameters) : null,
  }).run();

  return executionId;
}

/**
 * Mark execution as completed
 */
export function completeExecution(
  executionId: string,
  data: any[],
  exportFormat: string,
  startTime: Date
): void {
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  db.update(reportExecutions)
    .set({
      status: 'completed',
      completedAt: endTime.toISOString(),
      duration,
      rowCount: data.length,
      outputFormat: exportFormat,
    })
    .where(eq(reportExecutions.id, executionId)).run();
}

/**
 * Mark execution as failed
 */
export function failExecution(executionId: string, error: string): void {
  db.update(reportExecutions)
    .set({
      status: 'failed',
      completedAt: new Date().toISOString(),
      errorMessage: error,
    })
    .where(eq(reportExecutions.id, executionId)).run();
}

/**
 * Get execution history for a report
 */
export function getReportExecutions(
  publisherId: string,
  reportId: string,
  limit = 50
): ExecutionRecord[] {
  const executions = db.select().from(reportExecutions)
    .where(and(
      eq(reportExecutions.reportId, reportId),
      eq(reportExecutions.publisherId, publisherId)
    ))
    .orderBy(desc(reportExecutions.startedAt))
    .limit(limit)
    .all();

  return executions.map(parseExecutionRecord);
}

/**
 * Get all executions for a publisher
 */
export function getPublisherExecutions(
  publisherId: string,
  limit = 100,
  status?: string
): ExecutionRecord[] {
  let executions = db.select().from(reportExecutions)
    .where(eq(reportExecutions.publisherId, publisherId))
    .orderBy(desc(reportExecutions.startedAt))
    .limit(limit)
    .all();

  if (status) {
    executions = executions.filter(e => e.status === status);
  }

  return executions.map(parseExecutionRecord);
}

/**
 * Execute a report query
 */
export async function executeReport(
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

/**
 * Parse date range configuration into start and end dates
 */
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

/**
 * Apply filters to events
 */
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

/**
 * Group events by dimensions
 */
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

/**
 * Calculate a metric from events
 */
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
