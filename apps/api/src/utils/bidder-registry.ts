/**
 * Prebid.js Bidder Registry
 *
 * Centralized knowledge base of Prebid.js bidder adapters.
 * Used to auto-detect client-side vs server-side capabilities.
 */

export interface BidderInfo {
  code: string;
  name: string;
  isClientSide: boolean;
  isServerSide: boolean;
  documentationUrl?: string;
  description?: string;
}

// Known Prebid.js bidders with their capabilities
const KNOWN_BIDDERS: Record<string, BidderInfo> = {
  // Server-side capable bidders (client + server)
  appnexus: {
    code: 'appnexus',
    name: 'AppNexus',
    isClientSide: true,
    isServerSide: true,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/appnexus.html',
    description: 'Premium programmatic advertising platform'
  },
  rubicon: {
    code: 'rubicon',
    name: 'Rubicon Project',
    isClientSide: true,
    isServerSide: true,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/rubicon.html',
    description: 'Global advertising exchange'
  },
  pubmatic: {
    code: 'pubmatic',
    name: 'PubMatic',
    isClientSide: true,
    isServerSide: true,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/pubmatic.html',
    description: 'Digital advertising technology'
  },

  // Client-side only bidders
  openx: {
    code: 'openx',
    name: 'OpenX',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/openx.html',
    description: 'Independent advertising exchange'
  },
  criteo: {
    code: 'criteo',
    name: 'Criteo',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/criteo.html',
    description: 'Commerce media platform'
  },
  ix: {
    code: 'ix',
    name: 'Index Exchange',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/ix.html',
    description: 'Global advertising exchange'
  },
  sovrn: {
    code: 'sovrn',
    name: 'Sovrn',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/sovrn.html',
    description: 'Independent advertising technology'
  },
  sharethrough: {
    code: 'sharethrough',
    name: 'Sharethrough',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/sharethrough.html',
    description: 'Native advertising platform'
  },
  triplelift: {
    code: 'triplelift',
    name: 'TripleLift',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/triplelift.html',
    description: 'Native advertising platform'
  },
  spotx: {
    code: 'spotx',
    name: 'SpotX',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/spotx.html',
    description: 'Video advertising platform'
  },
  unruly: {
    code: 'unruly',
    name: 'Unruly',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/unruly.html',
    description: 'Video advertising platform'
  },
  conversant: {
    code: 'conversant',
    name: 'Conversant',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/conversant.html',
    description: 'Personalized digital marketing'
  },
  districtm: {
    code: 'districtm',
    name: 'District M',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/districtm.html',
    description: 'Advertising technology platform'
  },
  pulsepoint: {
    code: 'pulsepoint',
    name: 'PulsePoint',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/pulsepoint.html',
    description: 'Programmatic advertising exchange'
  },
  '33across': {
    code: '33across',
    name: '33Across',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/33across.html',
    description: 'Attention platform for advertising'
  },
  adyoulike: {
    code: 'adyoulike',
    name: 'Adyoulike',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/adyoulike.html',
    description: 'Native advertising platform'
  },
  undertone: {
    code: 'undertone',
    name: 'Undertone',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/undertone.html',
    description: 'High-impact ad formats'
  },
  yieldmo: {
    code: 'yieldmo',
    name: 'Yieldmo',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/yieldmo.html',
    description: 'Attention-based advertising'
  },
  gumgum: {
    code: 'gumgum',
    name: 'GumGum',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/gumgum.html',
    description: 'Contextual intelligence platform'
  },
  medianet: {
    code: 'medianet',
    name: 'Media.net',
    isClientSide: true,
    isServerSide: false,
    documentationUrl: 'https://docs.prebid.org/dev-docs/bidders/medianet.html',
    description: 'Contextual advertising'
  }
};

/**
 * Get bidder information by code
 */
export function getBidderInfo(bidderCode: string): BidderInfo {
  const normalizedCode = bidderCode.toLowerCase().trim();
  const known = KNOWN_BIDDERS[normalizedCode];

  if (known) {
    return known;
  }

  // Default for unknown bidders (client-side only)
  return {
    code: normalizedCode,
    name: titleCase(bidderCode),
    isClientSide: true,
    isServerSide: false,
  };
}

/**
 * Search bidders by query string
 */
export function searchBidders(query: string): BidderInfo[] {
  const normalizedQuery = query.toLowerCase().trim();

  return Object.values(KNOWN_BIDDERS).filter(bidder => {
    return (
      bidder.code.includes(normalizedQuery) ||
      bidder.name.toLowerCase().includes(normalizedQuery) ||
      bidder.description?.toLowerCase().includes(normalizedQuery)
    );
  });
}

/**
 * Get all known bidders
 */
export function getAllKnownBidders(): BidderInfo[] {
  return Object.values(KNOWN_BIDDERS);
}

/**
 * Convert string to title case
 */
function titleCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate bidder code format
 */
export function isValidBidderCode(code: string): boolean {
  // Allow alphanumeric, underscore, hyphen
  // Min length: 2, Max length: 50
  const pattern = /^[a-zA-Z0-9_-]{2,50}$/;
  return pattern.test(code);
}
