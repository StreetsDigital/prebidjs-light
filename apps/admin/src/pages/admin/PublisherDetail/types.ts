// Shared TypeScript interfaces for PublisherDetail components
// Extracted from PublisherDetailPage.tsx

export interface Publisher {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  domains: string[];
  status: 'active' | 'paused' | 'disabled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EditFormData {
  name: string;
  slug: string;
  status: 'active' | 'paused' | 'disabled';
  domains: string;
  notes: string;
}

export interface SizeMappingRule {
  minViewport: [number, number];
  sizes: number[][];
}

export interface VideoConfig {
  playerSize: string;
  context: 'instream' | 'outstream' | 'adpod';
  mimes: string[];
  protocols: number[];
  playbackMethods: number[];
  minDuration?: number;
  maxDuration?: number;
}

export interface NativeAsset {
  required: boolean;
  len?: number;
  sizes?: { width: number; height: number };
  aspectRatios?: { minWidth: number; minHeight: number; ratio_width: number; ratio_height: number };
}

export interface NativeConfig {
  title: NativeAsset;
  image: NativeAsset;
  icon: NativeAsset;
  body: NativeAsset;
  sponsoredBy: NativeAsset;
  cta: NativeAsset;
}

export interface AdUnit {
  id: string;
  websiteId: string; // REQUIRED - ad unit must belong to a website
  code: string;
  name: string;
  sizes: string[];
  mediaTypes: string[];
  status: 'active' | 'paused';
  floorPrice: string | null;
  sizeMapping: SizeMappingRule[] | null;
  videoConfig?: VideoConfig;
}

export interface AdUnitFormData {
  websiteId: string; // REQUIRED - must select website when creating ad unit
  code: string;
  name: string;
  sizes: string;
  mediaTypes: string[];
  floorPrice: string;
  sizeMapping: SizeMappingRule[];
  videoConfig: VideoConfig;
  nativeConfig: NativeConfig;
}

export interface ConfigVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changes: string;
  config: {
    bidderTimeout: number;
    priceGranularity: string;
    sendAllBids: boolean;
    bidderSequence: string;
    debugMode: boolean;
  };
}

export interface Build {
  id: string;
  version: string;
  status: 'success' | 'failed' | 'building' | 'pending';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  triggeredBy: string;
  commitHash: string;
  fileSize: string | null;
  modules: number;
  bidders: number;
  scriptUrl?: string;
}

export interface PublisherBidder {
  id: string;
  bidderCode: string;
  bidderName: string;
  enabled: boolean;
  params: Record<string, string>;
  priority: number;
}

export interface AvailableBidder {
  id: string;
  code: string;
  name: string;
  description: string;
  paramsSchema: { key: string; label: string; required: boolean }[];
}

export interface UserIdModule {
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, string>;
  configSchema: { key: string; label: string; required: boolean; type?: 'text' | 'url' | 'number' }[];
}

export interface ConsentManagementConfig {
  gdpr?: {
    enabled: boolean;
    cmpApi?: string;
    timeout?: number;
    defaultGdprScope?: boolean;
  };
  usp?: {
    enabled: boolean;
    cmpApi?: string;
    timeout?: number;
  };
}

export interface FloorRule {
  id: string;
  type: 'mediaType' | 'bidder' | 'adUnit';
  value: string; // mediaType name, bidder code, or ad unit code
  floor: number;
}

export interface PriceFloorsConfig {
  enabled: boolean;
  defaultFloor: number;
  currency: string;
  enforcement: {
    floorDeals: boolean;
    bidAdjustment: boolean;
  };
  rules: FloorRule[];
}

export interface Website {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'disabled';
  notes: string | null;
  adUnitCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteFormData {
  name: string;
  domain: string;
  notes: string;
}

export interface AssignedAdmin {
  userId: string;
  name: string;
  email: string;
  role: string;
  assignedAt: string;
}

export interface AvailableAdmin {
  id: string;
  name: string;
  email: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  trafficPercent: number;
  isControl: boolean;
  bidderTimeout?: number;
  priceGranularity?: string;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  floorsConfig?: any;
  bidderOverrides?: any;
}

export interface ABTest {
  id: string;
  publisherId: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
  variants: ABTestVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ABTestFormData {
  name: string;
  description: string;
  variants: Array<{
    name: string;
    trafficPercent: number;
    isControl: boolean;
    bidderTimeout?: number;
    priceGranularity?: string;
    enableSendAllBids?: boolean;
    bidderSequence?: string;
  }>;
}
