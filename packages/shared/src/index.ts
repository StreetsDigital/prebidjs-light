// Shared types and utilities for pbjs_engine

import { z } from 'zod';

// User roles
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PUBLISHER: 'publisher',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Publisher status
export const PublisherStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DISABLED: 'disabled',
} as const;

export type PublisherStatus = (typeof PublisherStatus)[keyof typeof PublisherStatus];

// Ad unit status
export const AdUnitStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
} as const;

export type AdUnitStatus = (typeof AdUnitStatus)[keyof typeof AdUnitStatus];

// Price granularity options
export const PriceGranularity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  AUTO: 'auto',
  DENSE: 'dense',
  CUSTOM: 'custom',
} as const;

export type PriceGranularity = (typeof PriceGranularity)[keyof typeof PriceGranularity];

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['super_admin', 'admin', 'publisher']),
  publisherId: z.string().uuid().optional(),
});

export const createPublisherSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  domains: z.array(z.string()).min(1, 'At least one domain required'),
  status: z.enum(['active', 'paused', 'disabled']).default('active'),
  notes: z.string().optional(),
});

export const createAdUnitSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code must be alphanumeric with underscores/hyphens'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  mediaTypes: z.object({
    banner: z
      .object({
        sizes: z.array(z.tuple([z.number(), z.number()])),
      })
      .optional(),
    video: z
      .object({
        playerSize: z.tuple([z.number(), z.number()]),
        context: z.enum(['instream', 'outstream', 'adpod']),
        mimes: z.array(z.string()).optional(),
        protocols: z.array(z.number()).optional(),
        playbackmethod: z.array(z.number()).optional(),
      })
      .optional(),
    native: z.record(z.unknown()).optional(),
  }),
  floorPrice: z.number().min(0).optional(),
  targeting: z.record(z.unknown()).optional(),
  sizeMapping: z.array(z.unknown()).optional(),
  status: z.enum(['active', 'paused']).default('active'),
});

export const prebidConfigSchema = z.object({
  bidderTimeout: z.number().min(100).max(10000).default(1500),
  priceGranularity: z.enum(['low', 'medium', 'high', 'auto', 'dense', 'custom']).default('medium'),
  customPriceBucket: z.record(z.unknown()).optional(),
  enableSendAllBids: z.boolean().default(false),
  bidderSequence: z.enum(['random', 'fixed']).default('random'),
  userSync: z.record(z.unknown()).optional(),
  targetingControls: z.record(z.unknown()).optional(),
  currencyConfig: z.record(z.unknown()).optional(),
  consentManagement: z.record(z.unknown()).optional(),
  floorsConfig: z.record(z.unknown()).optional(),
  userIdModules: z.array(z.unknown()).optional(),
  videoConfig: z.record(z.unknown()).optional(),
  s2sConfig: z.record(z.unknown()).optional(),
  debugMode: z.boolean().default(false),
});

// Types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreatePublisherInput = z.infer<typeof createPublisherSchema>;
export type CreateAdUnitInput = z.infer<typeof createAdUnitSchema>;
export type PrebidConfigInput = z.infer<typeof prebidConfigSchema>;

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Entity types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  publisherId?: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Publisher {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  domains: string[];
  status: PublisherStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AdUnit {
  id: string;
  publisherId: string;
  code: string;
  name: string;
  mediaTypes: Record<string, unknown>;
  floorPrice?: number;
  targeting?: Record<string, unknown>;
  sizeMapping?: unknown[];
  status: AdUnitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublisherBidder {
  id: string;
  publisherId: string;
  bidderCode: string;
  enabled: boolean;
  params?: Record<string, unknown>;
  timeoutOverride?: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublisherConfig {
  id: string;
  publisherId: string;
  bidderTimeout: number;
  priceGranularity: PriceGranularity;
  customPriceBucket?: Record<string, unknown>;
  enableSendAllBids: boolean;
  bidderSequence: 'random' | 'fixed';
  userSync?: Record<string, unknown>;
  targetingControls?: Record<string, unknown>;
  currencyConfig?: Record<string, unknown>;
  consentManagement?: Record<string, unknown>;
  floorsConfig?: Record<string, unknown>;
  userIdModules?: unknown[];
  videoConfig?: Record<string, unknown>;
  s2sConfig?: Record<string, unknown>;
  debugMode: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Analytics types
export interface AnalyticsEvent {
  eventId: string;
  publisherId: string;
  eventType: string;
  auctionId: string;
  adUnitCode: string;
  bidderCode: string;
  cpm: number;
  currency: string;
  latencyMs: number;
  timeout: boolean;
  won: boolean;
  rendered: boolean;
  pageUrl: string;
  domain: string;
  deviceType: string;
  country: string;
  timestamp: string;
}

export interface AnalyticsOverview {
  impressions: number;
  revenue: number;
  fillRate: number;
  avgCpm: number;
  avgLatency: number;
  timeoutRate: number;
}
