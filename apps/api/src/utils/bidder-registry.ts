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

/**
 * Dynamic IDs (SSP IDs) - Per-ad-unit bidder parameter definitions.
 *
 * Inspired by Nexx360's Prebid adapter (Prebid 10.17+), Dynamic IDs allow
 * each ad unit to specify its own bidder-specific parameters (placement IDs,
 * site IDs, etc.) rather than sharing a single set of params across all ad units.
 *
 * Usage in wrapper config adUnits:
 * {
 *   "header-banner": {
 *     "mediaTypes": { "banner": { "sizes": [[728, 90]] } },
 *     "bidders": {
 *       "appnexus": { "placement_id": "13144369" },
 *       "rubicon": { "account_id": "123", "site_id": "456", "zone_id": "789" }
 *     }
 *   }
 * }
 */
export type SspIds = {
  adagio?: { organization_id: string; placement: string; site: string };
  adasta?: { placement_id: string };
  adbility?: { zone_id: string; script: string };
  adform?: { mid: string };
  adkernel?: { zone_id: string };
  admatic?: { host: string; network_id: string };
  adnuntius?: { au_id: string };
  adgeneration?: { id: string };
  adgrid?: { domain_id: string; placement?: string };
  adoppler?: { adunit: string; client?: string };
  adot?: { publisher_id: string; placement_id: string };
  adswizz?: {
    url_prefix: string;
    preroll_zonealias: string;
    midroll_zonealias: string;
    preroll_companion_zonealias: string;
    midroll_companion_zonealias: string;
  };
  adtarget?: { host: string; network_id: string };
  adtelligent?: { endpoint: string };
  adyoulike?: { placement: string };
  alkimi?: { token: string };
  amx?: { tag_id: string };
  appnexus?: { placement_id: string; account?: string };
  between?: { publisher_id: string };
  bliink?: { tag_id: string };
  brave?: { placement_id: string };
  cadent?: { tag_id: string };
  colossus?: { tag_id: string; group_id: string };
  concert?: { partner_id: string };
  connectad?: { site_id: string; network_id: string };
  conversant?: { site_id: string };
  cpmstar?: { placement_id: string; subpool_id?: string };
  criteo?: { zone_id: string; network_id: string; pub_id?: string; uid?: string };
  cwire?: { placement_id: string; page_id: string; domain_id: string };
  datablocks?: { source_id: string };
  dax?: { cid: string };
  definemedia?: { mandant_id: string; adslot_id: string };
  dspx?: { placement: string };
  dxkulture?: { placement_id: string; publisher_id: string };
  eplanning?: { cid: string; endpoint_code: string };
  equativdirect?: { caller_id: string };
  evolution?: { key: string };
  feedad?: { token: string; placement_id: string };
  flowerads?: { cid: string };
  freewheel?: { zone_id: string };
  freewheelssp?: { profile_id: string; network_id: string; section_id: string };
  fueldigital?: { network_id: string; site_id: string; page_id: string; format_id: string };
  fueldigitalix?: { site_id: string };
  goldbach?: { placement_id: string };
  goldbachvast?: { placement_id: string; price: string; currency: string };
  goldvertisepbs?: { ad_code: string; seat_code: string };
  goodad?: { invcode: string };
  gravity?: { placement_id: string };
  groupm?: { placement_id: string };
  gumgum?: { zone?: string; pub_id?: string; slot?: string; product?: string };
  iion?: { publisher_id: string };
  imds?: { seat_id: string; tag_id: string };
  impactify?: { app_id: string; format: string; style: string };
  improve?: { placement_id: string; publisher_id: string };
  inmobi?: { plc: string };
  insticator?: { adunit_id: string; publisher_id: string };
  ix?: { site_id: string };
  kargo?: { placement_id: string };
  kivi?: { endpoint: string };
  kuantyx?: { zone: string };
  kueez?: { cid: string };
  lemma?: { pid: string; aid: string };
  logicad?: { tid: string };
  loopme?: { publisher_id?: string };
  mcgads?: { pid: string };
  mediafuse?: { placement_id: string };
  mediagrid?: { uuid: string };
  mediasquare?: { owner: string; code: string };
  medianet?: { cid: string; crid: string };
  minutemedia?: { org: string };
  mobkoi?: { placement_id: string; adserver_url: string };
  monetix?: { host: string; network_id: string };
  moneytag?: { placement_id: string };
  missena?: { api_key: string; placement?: string };
  nativo?: { epid?: string; placement_id?: string };
  netaddiction?: { host: string; network_id: string };
  nextmillennium?: { placement_id: string; group_id: string };
  ogury?: { asset_key: string; adunit_id: string };
  omnidex?: { cid: string };
  oms?: { pid: string };
  onefiftytwomedia?: { zone_id: string };
  onefiftytwomediaxandr?: { placement_id: string };
  onetag?: { pub_id: string; ext?: string };
  openx?: { unit: string; del_domain: string };
  optidigital?: { publisher_id: string; placement_id: string };
  orbidder?: { account_id: string; placement_id: string };
  outbrain?: { publisher_id: string; tag_id: string };
  pgam?: { endpoint: string };
  placeexchange?: { id: string };
  plista?: { placement_id: string };
  pubmatic?: { publisher_id: string; ad_slot?: string; placement_id?: string };
  pulsepoint?: { cp: string; ct: string };
  quantum?: { placement_id: string };
  r2b2?: { pid: string };
  redpineapplemedia?: { pkey: string };
  resetdigital?: { pub_id: string };
  richaudience?: { pid: string };
  rise?: { org: string; placement_id?: string };
  robustapps?: { env: string; pid: string };
  rtbhouse?: { publisher_id: string };
  rubicon?: { account_id: string; site_id: string; zone_id: string };
  seedtag?: { ad_unit_id: string };
  sharethrough?: { pkey: string };
  smartadserver?: { network_id: string; site_id: string; page_id: string; format_id: string };
  smartclip?: { site_id: string; publisher_id: string };
  smartclipvast?: { s: string; sz: string };
  smaato?: { publisher_id: string; adspace_id: string };
  smilewanted?: { zone_id: string };
  sonobi?: { placement_id: string };
  sovrn?: { tag_id: string };
  sparteo?: { network_id: string; custom1?: string };
  spinx?: { zone_id: string };
  stroeercore?: { sid: string; adunit1?: string };
  taboola?: { tag_id: string; publisher_id: string };
  tadvertising?: { placement_id: string; publisher_id: string };
  tappx?: { key: string; host: string };
  targetspot?: { publisher_id: string };
  teal?: { account: string; placement: string };
  telariapbs?: { ad_code: string; seat_code: string };
  thirtythreeacross?: { site_id: string; product_id: string };
  traffective?: { placement_id: string };
  triplelift?: { inventory_code: string };
  triton?: { stid: string };
  trustedstack?: { cid: string; crid: string };
  ttd?: { endpoint?: string };
  ttdopenpath?: { supply_id: string; publisher_id: string };
  undertone?: { placement_id: string; publisher_id: string };
  unruly?: { site_id: string };
  vidazoo?: { cid: string };
  vidoomy?: { zone_id: string };
  visx?: { uid: string };
  xapads?: { zone_id: string };
  yahoodsp?: { pub_id: string; site_id: string; placement_id: string };
  yieldlab?: { adslot_id: string; supply_id: string };
  yieldmo?: { placement_id: string };
  yieldone?: { placement_id: string };
  zeta?: { sid: string };
  // Catch-all for unknown/custom bidders
  [bidderCode: string]: Record<string, string | undefined> | undefined;
};

/**
 * Get the known parameter schema for a bidder code.
 * Returns an array of required/optional parameter names.
 */
export function getBidderParamSchema(bidderCode: string): { required: string[]; optional: string[] } | null {
  const schemas: Record<string, { required: string[]; optional: string[] }> = {
    appnexus: { required: ['placement_id'], optional: ['account'] },
    rubicon: { required: ['account_id', 'site_id', 'zone_id'], optional: [] },
    pubmatic: { required: ['publisher_id'], optional: ['ad_slot', 'placement_id'] },
    ix: { required: ['site_id'], optional: [] },
    openx: { required: ['unit', 'del_domain'], optional: [] },
    criteo: { required: ['zone_id', 'network_id'], optional: ['pub_id', 'uid'] },
    sovrn: { required: ['tag_id'], optional: [] },
    sharethrough: { required: ['pkey'], optional: [] },
    triplelift: { required: ['inventory_code'], optional: [] },
    gumgum: { required: [], optional: ['zone', 'pub_id', 'slot', 'product'] },
    medianet: { required: ['cid', 'crid'], optional: [] },
    conversant: { required: ['site_id'], optional: [] },
    adyoulike: { required: ['placement'], optional: [] },
    undertone: { required: ['placement_id', 'publisher_id'], optional: [] },
    yieldmo: { required: ['placement_id'], optional: [] },
    smartadserver: { required: ['network_id', 'site_id', 'page_id', 'format_id'], optional: [] },
    taboola: { required: ['tag_id', 'publisher_id'], optional: [] },
    onetag: { required: ['pub_id'], optional: ['ext'] },
    unruly: { required: ['site_id'], optional: [] },
  };

  return schemas[bidderCode.toLowerCase()] || null;
}
