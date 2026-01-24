import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Breadcrumb, BreadcrumbItem, ConfirmDialog, FormModal, Tabs, Tab } from '../../components/ui';

interface Publisher {
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

interface EditFormData {
  name: string;
  slug: string;
  status: 'active' | 'paused' | 'disabled';
  domains: string;
  notes: string;
}

interface AdUnit {
  id: string;
  code: string;
  name: string;
  sizes: string[];
  mediaTypes: string[];
  status: 'active' | 'paused';
  floorPrice: string | null;
  sizeMapping: SizeMappingRule[] | null;
  videoConfig?: VideoConfig;
}

interface SizeMappingRule {
  minViewport: [number, number];
  sizes: number[][];
}

interface VideoConfig {
  playerSize: string;
  context: 'instream' | 'outstream' | 'adpod';
  mimes: string[];
  protocols: number[];
  playbackMethods: number[];
  minDuration?: number;
  maxDuration?: number;
}

interface NativeAsset {
  required: boolean;
  len?: number;
  sizes?: { width: number; height: number };
  aspectRatios?: { minWidth: number; minHeight: number; ratio_width: number; ratio_height: number };
}

interface NativeConfig {
  title: NativeAsset;
  image: NativeAsset;
  icon: NativeAsset;
  body: NativeAsset;
  sponsoredBy: NativeAsset;
  cta: NativeAsset;
}

interface AdUnitFormData {
  code: string;
  name: string;
  sizes: string;
  mediaTypes: string[];
  floorPrice: string;
  sizeMapping: SizeMappingRule[];
  videoConfig: VideoConfig;
  nativeConfig: NativeConfig;
}

interface ConfigVersion {
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

// Config versions are now loaded from API

interface Build {
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

interface PublisherBidder {
  id: string;
  bidderCode: string;
  bidderName: string;
  enabled: boolean;
  params: Record<string, string>;
  priority: number;
}

interface AvailableBidder {
  id: string;
  code: string;
  name: string;
  description: string;
  paramsSchema: { key: string; label: string; required: boolean }[];
}

interface UserIdModule {
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, string>;
  configSchema: { key: string; label: string; required: boolean }[];
}

interface ConsentManagementConfig {
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

const MOCK_BUILDS: Build[] = [
  {
    id: 'build_1',
    version: '1.3.0',
    status: 'success',
    startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    duration: 120,
    triggeredBy: 'Super Admin',
    commitHash: 'a1b2c3d',
    fileSize: '245 KB',
    modules: 12,
    bidders: 5,
    scriptUrl: '/cdn/prebid-bundle.min.js',
  },
  {
    id: 'build_2',
    version: '1.2.1',
    status: 'success',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 4 + 1000 * 95).toISOString(),
    duration: 95,
    triggeredBy: 'Staff Admin',
    commitHash: 'e4f5g6h',
    fileSize: '238 KB',
    modules: 11,
    bidders: 5,
    scriptUrl: '/cdn/prebid-bundle.min.js',
  },
  {
    id: 'build_3',
    version: '1.2.0',
    status: 'failed',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 45).toISOString(),
    duration: 45,
    triggeredBy: 'Super Admin',
    commitHash: 'i7j8k9l',
    fileSize: null,
    modules: 11,
    bidders: 4,
  },
  {
    id: 'build_4',
    version: '1.1.0',
    status: 'success',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 48 + 1000 * 88).toISOString(),
    duration: 88,
    triggeredBy: 'Super Admin',
    commitHash: 'm0n1o2p',
    fileSize: '220 KB',
    modules: 10,
    bidders: 4,
    scriptUrl: '/cdn/prebid-bundle.min.js',
  },
];

// Available Prebid bidder adapters
const AVAILABLE_BIDDERS: AvailableBidder[] = [
  {
    id: '1',
    code: 'appnexus',
    name: 'AppNexus',
    description: 'AppNexus (Xandr) bidder adapter for programmatic advertising.',
    paramsSchema: [
      { key: 'placementId', label: 'Placement ID', required: true },
    ],
  },
  {
    id: '2',
    code: 'rubicon',
    name: 'Rubicon Project',
    description: 'Rubicon Project bidder adapter for premium inventory.',
    paramsSchema: [
      { key: 'accountId', label: 'Account ID', required: true },
      { key: 'siteId', label: 'Site ID', required: true },
      { key: 'zoneId', label: 'Zone ID', required: true },
    ],
  },
  {
    id: '3',
    code: 'openx',
    name: 'OpenX',
    description: 'OpenX bidder adapter for display and video advertising.',
    paramsSchema: [
      { key: 'delDomain', label: 'Delivery Domain', required: true },
      { key: 'unit', label: 'Ad Unit ID', required: true },
    ],
  },
  {
    id: '4',
    code: 'pubmatic',
    name: 'PubMatic',
    description: 'PubMatic bidder adapter for header bidding.',
    paramsSchema: [
      { key: 'publisherId', label: 'Publisher ID', required: true },
      { key: 'adSlot', label: 'Ad Slot', required: true },
    ],
  },
  {
    id: '5',
    code: 'ix',
    name: 'Index Exchange',
    description: 'Index Exchange bidder adapter for real-time bidding.',
    paramsSchema: [
      { key: 'siteId', label: 'Site ID', required: true },
    ],
  },
];

// Available User ID modules
const AVAILABLE_USER_ID_MODULES: Omit<UserIdModule, 'enabled'>[] = [
  {
    code: 'uid2',
    name: 'Unified ID 2.0',
    description: 'The Trade Desk Unified ID 2.0 for cross-device identity.',
    config: { apiBaseUrl: '' },
    configSchema: [
      { key: 'apiBaseUrl', label: 'API Base URL', required: false },
    ],
  },
  {
    code: 'id5',
    name: 'ID5',
    description: 'ID5 universal ID for cookieless identity resolution.',
    config: { partnerId: '' },
    configSchema: [
      { key: 'partnerId', label: 'Partner ID', required: true },
    ],
  },
  {
    code: 'identityLink',
    name: 'LiveRamp IdentityLink',
    description: 'LiveRamp identity resolution for authenticated users.',
    config: { pid: '' },
    configSchema: [
      { key: 'pid', label: 'Publisher ID', required: true },
    ],
  },
  {
    code: 'sharedId',
    name: 'SharedID',
    description: 'Prebid shared ID for first-party identity.',
    config: { storage: 'cookie' },
    configSchema: [
      { key: 'storage', label: 'Storage Type', required: false },
    ],
  },
  {
    code: 'criteoRtus',
    name: 'Criteo RTUS',
    description: 'Criteo real-time user sync for retargeting.',
    config: { pubId: '' },
    configSchema: [
      { key: 'pubId', label: 'Publisher ID', required: true },
    ],
  },
];

export function PublisherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const location = useLocation();
  const returnUrl = (location.state as { returnUrl?: string })?.returnUrl || '/admin/publishers';
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerateDialog, setRegenerateDialog] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEmbedCode, setCopiedEmbedCode] = useState(false);
  const [editModal, setEditModal] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    slug: '',
    status: 'active',
    domains: '',
    notes: '',
  });
  const [originalEditForm, setOriginalEditForm] = useState<EditFormData | null>(null);
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState({
    isOpen: false,
    pendingAction: null as (() => void) | null,
  });

  // Ad Units state
  const [adUnits, setAdUnits] = useState<AdUnit[]>([]);
  const [adUnitModal, setAdUnitModal] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [adUnitForm, setAdUnitForm] = useState<AdUnitFormData>({
    code: '',
    name: '',
    sizes: '',
    mediaTypes: ['banner'],
    floorPrice: '',
    sizeMapping: [],
    videoConfig: {
      playerSize: '640x480',
      context: 'instream',
      mimes: ['video/mp4', 'video/webm'],
      protocols: [2, 3, 5, 6],
      playbackMethods: [1, 2],
      minDuration: 5,
      maxDuration: 30,
    },
    nativeConfig: {
      title: { required: true, len: 90 },
      image: { required: true, sizes: { width: 300, height: 250 } },
      icon: { required: false, sizes: { width: 50, height: 50 } },
      body: { required: true, len: 200 },
      sponsoredBy: { required: true, len: 50 },
      cta: { required: false, len: 20 },
    },
  });
  const [deleteAdUnitDialog, setDeleteAdUnitDialog] = useState({
    isOpen: false,
    isLoading: false,
    adUnit: null as AdUnit | null,
  });
  const [editingAdUnit, setEditingAdUnit] = useState<AdUnit | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Config version history state
  const [configVersions, setConfigVersions] = useState<ConfigVersion[]>([]);
  const [currentConfig, setCurrentConfig] = useState<{ bidderTimeout: number; priceGranularity: string; sendAllBids: boolean; bidderSequence: string; debugMode: boolean } | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ConfigVersion | null>(null);
  const [rollbackDialog, setRollbackDialog] = useState({
    isOpen: false,
    isLoading: false,
    version: null as ConfigVersion | null,
  });

  // Build state
  const [builds, setBuilds] = useState<Build[]>(MOCK_BUILDS);
  const [isBuildTriggering, setIsBuildTriggering] = useState(false);

  // Bidder state
  const [publisherBidders, setPublisherBidders] = useState<PublisherBidder[]>([]);
  const [availableBidders, setAvailableBidders] = useState<AvailableBidder[]>([]);
  const [bidderModal, setBidderModal] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [bidderForm, setBidderForm] = useState({
    bidderCode: '',
    params: {} as Record<string, string>,
  });
  const [bidderSearchQuery, setBidderSearchQuery] = useState('');
  const [deleteBidderDialog, setDeleteBidderDialog] = useState({
    isOpen: false,
    isLoading: false,
    bidder: null as PublisherBidder | null,
  });

  // Config editing state
  const [configModal, setConfigModal] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [configForm, setConfigForm] = useState({
    bidderTimeout: 1500,
    priceGranularity: 'medium',
    sendAllBids: true,
    bidderSequence: 'random',
    debugMode: false,
  });

  // Import config state
  const [importModal, setImportModal] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importValidation, setImportValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);

  // Copy bidders state
  const [copyBiddersModal, setCopyBiddersModal] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [copyFromPublisherId, setCopyFromPublisherId] = useState('');
  const [allPublishers, setAllPublishers] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [copyBiddersError, setCopyBiddersError] = useState<string | null>(null);
  const [copyBiddersSuccess, setCopyBiddersSuccess] = useState<string | null>(null);

  // User ID modules state
  const [userIdModules, setUserIdModules] = useState<UserIdModule[]>([]);
  const [userIdModuleModal, setUserIdModuleModal] = useState({
    isOpen: false,
    isLoading: false,
    module: null as UserIdModule | null,
  });
  const [userIdModuleForm, setUserIdModuleForm] = useState<Record<string, string>>({});

  // Consent management state
  const [consentManagement, setConsentManagement] = useState<ConsentManagementConfig | null>(null);
  const [consentModal, setConsentModal] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [consentForm, setConsentForm] = useState({
    gdprEnabled: false,
    gdprCmpApi: 'iab',
    gdprTimeout: 10000,
    gdprDefaultScope: true,
    uspEnabled: false,
    uspCmpApi: 'iab',
    uspTimeout: 10000,
  });

  const fetchPublisher = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/publishers/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Publisher not found');
        }
        throw new Error('Failed to fetch publisher');
      }

      const data = await response.json();
      setPublisher(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdUnits = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/publishers/${id}/ad-units`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdUnits(data.adUnits.map((u: {
          id: string;
          code: string;
          name: string;
          mediaTypes?: {
            banner?: { sizes: number[][] };
            video?: {
              playerSize?: number[];
              context?: string;
              mimes?: string[];
              protocols?: number[];
              playbackmethod?: number[];
              minduration?: number;
              maxduration?: number;
            };
          };
          status: string;
          floorPrice?: string | null;
          sizeMapping?: SizeMappingRule[] | null
        }) => ({
          id: u.id,
          code: u.code,
          name: u.name,
          sizes: u.mediaTypes?.banner?.sizes?.map((s: number[]) => s.join('x')) || [],
          mediaTypes: u.mediaTypes ? Object.keys(u.mediaTypes) : ['banner'],
          status: u.status,
          floorPrice: u.floorPrice || null,
          sizeMapping: u.sizeMapping || null,
          videoConfig: u.mediaTypes?.video ? {
            playerSize: u.mediaTypes.video.playerSize ? `${u.mediaTypes.video.playerSize[0]}x${u.mediaTypes.video.playerSize[1]}` : '640x480',
            context: (u.mediaTypes.video.context as 'instream' | 'outstream' | 'adpod') || 'instream',
            mimes: u.mediaTypes.video.mimes || ['video/mp4', 'video/webm'],
            protocols: u.mediaTypes.video.protocols || [2, 3, 5, 6],
            playbackMethods: u.mediaTypes.video.playbackmethod || [1, 2],
            minDuration: u.mediaTypes.video.minduration,
            maxDuration: u.mediaTypes.video.maxduration,
          } : undefined,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch ad units:', err);
    }
  };

  const fetchConfig = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/publishers/${id}/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentConfig({
          bidderTimeout: data.bidderTimeout,
          priceGranularity: data.priceGranularity,
          sendAllBids: data.enableSendAllBids,
          bidderSequence: data.bidderSequence,
          debugMode: data.debugMode,
        });
        setCurrentVersion(data.version || 1);

        // Load User ID modules - merge with available modules to get full schema
        const savedModules = data.userIdModules || [];
        const mergedModules = AVAILABLE_USER_ID_MODULES.map(availableModule => {
          const saved = savedModules.find((m: { code: string }) => m.code === availableModule.code);
          return {
            ...availableModule,
            enabled: saved?.enabled || false,
            config: saved?.config || availableModule.config,
          };
        });
        setUserIdModules(mergedModules);

        // Load consent management config
        if (data.consentManagement) {
          setConsentManagement(data.consentManagement);
        }
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchConfigVersions = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/publishers/${id}/config/versions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfigVersions(data.versions.map((v: { id: string; version: number; createdAt: string; changedBy: string; changeSummary: string; config: { bidderTimeout: number; priceGranularity: string; enableSendAllBids: boolean; bidderSequence: string; debugMode: boolean } }) => ({
          id: v.id,
          version: v.version,
          createdAt: v.createdAt,
          createdBy: v.changedBy,
          changes: v.changeSummary,
          config: {
            bidderTimeout: v.config.bidderTimeout,
            priceGranularity: v.config.priceGranularity,
            sendAllBids: v.config.enableSendAllBids,
            bidderSequence: v.config.bidderSequence,
            debugMode: v.config.debugMode,
          },
        })));
        if (data.currentConfig) {
          setCurrentConfig({
            bidderTimeout: data.currentConfig.bidderTimeout,
            priceGranularity: data.currentConfig.priceGranularity,
            sendAllBids: data.currentConfig.enableSendAllBids,
            bidderSequence: data.currentConfig.bidderSequence,
            debugMode: data.currentConfig.debugMode,
          });
          setCurrentVersion(data.currentVersion);
        }
      }
    } catch (err) {
      console.error('Failed to fetch config versions:', err);
    }
  };

  const fetchPublisherBidders = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/publishers/${id}/bidders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPublisherBidders(data.bidders.map((b: { id: string; bidderCode: string; enabled: boolean; params?: Record<string, string> | null; priority?: number }) => ({
          id: b.id,
          bidderCode: b.bidderCode,
          bidderName: AVAILABLE_BIDDERS.find(ab => ab.code === b.bidderCode)?.name || b.bidderCode,
          enabled: b.enabled,
          params: b.params || {},
          priority: b.priority || 0,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch publisher bidders:', err);
    }
  };

  const fetchAvailableBidders = async () => {
    // For now, use the static list of available bidders
    // In the future, this could fetch from /api/modules?type=bidder
    setAvailableBidders(AVAILABLE_BIDDERS);
  };

  const fetchAllPublishers = async () => {
    try {
      const response = await fetch(`/api/publishers?limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out the current publisher from the list
        setAllPublishers(data.publishers.filter((p: { id: string; name: string; slug: string }) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to fetch all publishers:', err);
    }
  };

  useEffect(() => {
    fetchPublisher();
    fetchAdUnits();
    fetchConfig();
    fetchPublisherBidders();
    fetchAvailableBidders();
    fetchAllPublishers();
  }, [id, token]);

  // Hash navigation - handle URL hash to switch tabs and scroll to sections
  useEffect(() => {
    const hash = location.hash.slice(1); // Remove the # prefix
    if (!hash) return;

    // Mapping of hash values to tab and optional section
    const hashMapping: Record<string, { tab: string; section?: string }> = {
      'consent-section': { tab: 'config', section: 'consent-section' },
      'config': { tab: 'config' },
      'ad-units': { tab: 'ad-units' },
      'bidders': { tab: 'bidders' },
      'build': { tab: 'build' },
      'overview': { tab: 'overview' },
    };

    const mapping = hashMapping[hash];
    if (mapping) {
      setActiveTab(mapping.tab);

      // If there's a section to scroll to, wait for the tab to render then scroll
      if (mapping.section) {
        setTimeout(() => {
          const element = document.getElementById(mapping.section!);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [location.hash]);

  const handleRegenerateClick = () => {
    setRegenerateDialog({
      isOpen: true,
      isLoading: false,
    });
  };

  const handleRegenerateCancel = () => {
    setRegenerateDialog({
      isOpen: false,
      isLoading: false,
    });
  };

  const handleRegenerateConfirm = async () => {
    if (!publisher) return;

    setRegenerateDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/regenerate-key`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate API key');
      }

      const data = await response.json();
      setPublisher((prev) => prev ? { ...prev, apiKey: data.apiKey } : null);
      handleRegenerateCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate API key');
      setRegenerateDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const copyApiKey = async () => {
    if (publisher?.apiKey) {
      await navigator.clipboard.writeText(publisher.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleEditClick = () => {
    if (!publisher) return;
    const formData = {
      name: publisher.name,
      slug: publisher.slug,
      status: publisher.status,
      domains: publisher.domains.join(', '),
      notes: publisher.notes || '',
    };
    setEditForm(formData);
    setOriginalEditForm(formData);
    setEditModal({ isOpen: true, isLoading: false });
  };

  const hasUnsavedChanges = () => {
    if (!originalEditForm) return false;
    return (
      editForm.name !== originalEditForm.name ||
      editForm.slug !== originalEditForm.slug ||
      editForm.status !== originalEditForm.status ||
      editForm.domains !== originalEditForm.domains ||
      editForm.notes !== originalEditForm.notes
    );
  };

  const handleEditClose = () => {
    if (hasUnsavedChanges()) {
      setUnsavedChangesDialog({
        isOpen: true,
        pendingAction: () => {
          setEditModal({ isOpen: false, isLoading: false });
          setOriginalEditForm(null);
        },
      });
    } else {
      setEditModal({ isOpen: false, isLoading: false });
      setOriginalEditForm(null);
    }
  };

  const handleDiscardChanges = () => {
    if (unsavedChangesDialog.pendingAction) {
      unsavedChangesDialog.pendingAction();
    }
    setUnsavedChangesDialog({ isOpen: false, pendingAction: null });
  };

  const handleCancelDiscard = () => {
    setUnsavedChangesDialog({ isOpen: false, pendingAction: null });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher) return;

    setEditModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const domainsArray = editForm.domains
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      const response = await fetch(`/api/publishers/${publisher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          status: editForm.status,
          domains: domainsArray,
          notes: editForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update publisher');
      }

      const updatedPublisher = await response.json();
      setPublisher(updatedPublisher);
      handleEditClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publisher');
      setEditModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Default video config for new ad units
  const defaultVideoConfig: VideoConfig = {
    playerSize: '640x480',
    context: 'instream',
    mimes: ['video/mp4', 'video/webm'],
    protocols: [2, 3, 5, 6],
    playbackMethods: [1, 2],
    minDuration: 5,
    maxDuration: 30,
  };

  // Default native config for new ad units
  const defaultNativeConfig: NativeConfig = {
    title: { required: true, len: 90 },
    image: { required: true, sizes: { width: 300, height: 250 } },
    icon: { required: false, sizes: { width: 50, height: 50 } },
    body: { required: true, len: 200 },
    sponsoredBy: { required: true, len: 50 },
    cta: { required: false, len: 20 },
  };

  // Ad Unit handlers
  const handleAddAdUnitClick = () => {
    setEditingAdUnit(null);
    setAdUnitForm({
      code: '',
      name: '',
      sizes: '',
      mediaTypes: ['banner'],
      floorPrice: '',
      sizeMapping: [],
      videoConfig: defaultVideoConfig,
      nativeConfig: defaultNativeConfig,
    });
    setAdUnitModal({ isOpen: true, isLoading: false });
  };

  const handleEditAdUnitClick = (adUnit: AdUnit) => {
    setEditingAdUnit(adUnit);
    setAdUnitForm({
      code: adUnit.code,
      name: adUnit.name,
      sizes: adUnit.sizes.join(', '),
      mediaTypes: adUnit.mediaTypes,
      floorPrice: adUnit.floorPrice || '',
      sizeMapping: adUnit.sizeMapping || [],
      videoConfig: adUnit.videoConfig || defaultVideoConfig,
      nativeConfig: (adUnit as AdUnit & { nativeConfig?: NativeConfig }).nativeConfig || defaultNativeConfig,
    });
    setAdUnitModal({ isOpen: true, isLoading: false });
  };

  const handleDuplicateAdUnitClick = (adUnit: AdUnit) => {
    setEditingAdUnit(null); // This is a new ad unit, not editing
    setAdUnitForm({
      code: `${adUnit.code}-copy`,
      name: `${adUnit.name} (Copy)`,
      sizes: adUnit.sizes.join(', '),
      mediaTypes: adUnit.mediaTypes,
      floorPrice: adUnit.floorPrice || '',
      sizeMapping: adUnit.sizeMapping || [],
      videoConfig: adUnit.videoConfig || defaultVideoConfig,
      nativeConfig: (adUnit as AdUnit & { nativeConfig?: NativeConfig }).nativeConfig || defaultNativeConfig,
    });
    setAdUnitModal({ isOpen: true, isLoading: false });
  };

  const handleAdUnitClose = () => {
    setAdUnitModal({ isOpen: false, isLoading: false });
  };

  const handleAdUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher) return;
    setAdUnitModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const sizesArray = adUnitForm.sizes
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => {
          const [width, height] = s.split('x').map(Number);
          return [width, height];
        });

      const isEditing = !!editingAdUnit;
      const url = isEditing
        ? `/api/publishers/${publisher.id}/ad-units/${editingAdUnit.id}`
        : `/api/publishers/${publisher.id}/ad-units`;
      const method = isEditing ? 'PUT' : 'POST';

      // Build mediaTypes object based on selected types
      const mediaTypesObj: Record<string, unknown> = {};

      if (adUnitForm.mediaTypes.includes('banner')) {
        mediaTypesObj.banner = { sizes: sizesArray };
      }

      if (adUnitForm.mediaTypes.includes('video')) {
        const [width, height] = adUnitForm.videoConfig.playerSize.split('x').map(Number);
        mediaTypesObj.video = {
          playerSize: [width || 640, height || 480],
          context: adUnitForm.videoConfig.context,
          mimes: adUnitForm.videoConfig.mimes,
          protocols: adUnitForm.videoConfig.protocols,
          playbackmethod: adUnitForm.videoConfig.playbackMethods,
          minduration: adUnitForm.videoConfig.minDuration,
          maxduration: adUnitForm.videoConfig.maxDuration,
        };
      }

      if (adUnitForm.mediaTypes.includes('native')) {
        // Build native assets array based on configuration
        const nativeAssets = [];

        // Title asset (id: 1)
        if (adUnitForm.nativeConfig.title.required || adUnitForm.nativeConfig.title.len) {
          nativeAssets.push({
            id: 1,
            required: adUnitForm.nativeConfig.title.required,
            title: { len: adUnitForm.nativeConfig.title.len || 90 }
          });
        }

        // Image asset (id: 2)
        if (adUnitForm.nativeConfig.image.required || adUnitForm.nativeConfig.image.sizes) {
          nativeAssets.push({
            id: 2,
            required: adUnitForm.nativeConfig.image.required,
            img: {
              type: 3, // Main image
              w: adUnitForm.nativeConfig.image.sizes?.width || 300,
              h: adUnitForm.nativeConfig.image.sizes?.height || 250
            }
          });
        }

        // Body/Description asset (id: 3)
        if (adUnitForm.nativeConfig.body.required || adUnitForm.nativeConfig.body.len) {
          nativeAssets.push({
            id: 3,
            required: adUnitForm.nativeConfig.body.required,
            data: { type: 2, len: adUnitForm.nativeConfig.body.len || 200 }
          });
        }

        // Sponsored By asset (id: 4)
        if (adUnitForm.nativeConfig.sponsoredBy.required || adUnitForm.nativeConfig.sponsoredBy.len) {
          nativeAssets.push({
            id: 4,
            required: adUnitForm.nativeConfig.sponsoredBy.required,
            data: { type: 1, len: adUnitForm.nativeConfig.sponsoredBy.len || 50 }
          });
        }

        // Icon asset (id: 5)
        if (adUnitForm.nativeConfig.icon.required || adUnitForm.nativeConfig.icon.sizes) {
          nativeAssets.push({
            id: 5,
            required: adUnitForm.nativeConfig.icon.required,
            img: {
              type: 1, // Icon
              w: adUnitForm.nativeConfig.icon.sizes?.width || 50,
              h: adUnitForm.nativeConfig.icon.sizes?.height || 50
            }
          });
        }

        // CTA asset (id: 6)
        if (adUnitForm.nativeConfig.cta.required || adUnitForm.nativeConfig.cta.len) {
          nativeAssets.push({
            id: 6,
            required: adUnitForm.nativeConfig.cta.required,
            data: { type: 12, len: adUnitForm.nativeConfig.cta.len || 20 }
          });
        }

        mediaTypesObj.native = {
          ortb: {
            assets: nativeAssets
          }
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: adUnitForm.code,
          name: adUnitForm.name,
          mediaTypes: Object.keys(mediaTypesObj).length > 0 ? mediaTypesObj : undefined,
          floorPrice: adUnitForm.floorPrice || null,
          sizeMapping: adUnitForm.sizeMapping.length > 0 ? adUnitForm.sizeMapping : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} ad unit`);
      }

      const updatedAdUnit = await response.json();

      if (isEditing) {
        setAdUnits((prev) => prev.map((u) =>
          u.id === editingAdUnit.id
            ? {
                id: updatedAdUnit.id,
                code: updatedAdUnit.code,
                name: updatedAdUnit.name,
                sizes: sizesArray.map(s => s.join('x')),
                mediaTypes: adUnitForm.mediaTypes,
                status: updatedAdUnit.status,
                floorPrice: updatedAdUnit.floorPrice || null,
                sizeMapping: updatedAdUnit.sizeMapping || null,
              }
            : u
        ));
      } else {
        setAdUnits((prev) => [...prev, {
          id: updatedAdUnit.id,
          code: updatedAdUnit.code,
          name: updatedAdUnit.name,
          sizes: sizesArray.map(s => s.join('x')),
          mediaTypes: adUnitForm.mediaTypes,
          status: updatedAdUnit.status,
          floorPrice: updatedAdUnit.floorPrice || null,
          sizeMapping: updatedAdUnit.sizeMapping || null,
        }]);
      }
      handleAdUnitClose();
      setEditingAdUnit(null);
      // Switch to ad-units tab to show the new ad unit
      setActiveTab('ad-units');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingAdUnit ? 'update' : 'create'} ad unit`);
      setAdUnitModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleMediaTypeToggle = (type: string) => {
    setAdUnitForm((prev) => ({
      ...prev,
      mediaTypes: prev.mediaTypes.includes(type)
        ? prev.mediaTypes.filter((t) => t !== type)
        : [...prev.mediaTypes, type],
    }));
  };

  // Delete ad unit handlers
  const handleDeleteAdUnitClick = (adUnit: AdUnit) => {
    setDeleteAdUnitDialog({
      isOpen: true,
      isLoading: false,
      adUnit,
    });
  };

  const handleDeleteAdUnitCancel = () => {
    setDeleteAdUnitDialog({
      isOpen: false,
      isLoading: false,
      adUnit: null,
    });
  };

  const handleDeleteAdUnitConfirm = async () => {
    if (!publisher || !deleteAdUnitDialog.adUnit) return;

    setDeleteAdUnitDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `/api/publishers/${publisher.id}/ad-units/${deleteAdUnitDialog.adUnit.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete ad unit');
      }

      // Remove the ad unit from state
      setAdUnits((prev) => prev.filter((u) => u.id !== deleteAdUnitDialog.adUnit?.id));
      handleDeleteAdUnitCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ad unit');
      setDeleteAdUnitDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Version history handlers
  const handleVersionHistoryClick = () => {
    fetchConfigVersions();
    setShowVersionHistory(true);
    setSelectedVersion(null);
  };

  const handleVersionSelect = (version: ConfigVersion) => {
    setSelectedVersion(version);
  };

  const handleVersionHistoryBack = () => {
    if (selectedVersion) {
      setSelectedVersion(null);
    } else {
      setShowVersionHistory(false);
    }
  };

  const handleRollbackClick = (version: ConfigVersion) => {
    setRollbackDialog({
      isOpen: true,
      isLoading: false,
      version,
    });
  };

  const handleRollbackCancel = () => {
    setRollbackDialog({
      isOpen: false,
      isLoading: false,
      version: null,
    });
  };

  const handleRollbackConfirm = async () => {
    if (!publisher || !rollbackDialog.version) return;
    setRollbackDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/config/rollback/${rollbackDialog.version.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to rollback config');
      }

      // Refetch config data
      await fetchConfig();
      await fetchConfigVersions();

      setRollbackDialog({
        isOpen: false,
        isLoading: false,
        version: null,
      });
      setSelectedVersion(null);
      setShowVersionHistory(false);
    } catch (err) {
      console.error('Rollback failed:', err);
      setRollbackDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Config export handler
  const handleExportConfig = () => {
    if (!publisher || !currentConfig) return;

    // Build Prebid.js compatible config object
    const prebidConfig = {
      debug: currentConfig.debugMode,
      bidderTimeout: currentConfig.bidderTimeout,
      priceGranularity: currentConfig.priceGranularity,
      sendAllBids: currentConfig.sendAllBids,
      bidderSequence: currentConfig.bidderSequence,
      publisherId: publisher.id,
      publisherName: publisher.name,
      publisherSlug: publisher.slug,
      domains: publisher.domains,
      adUnits: adUnits.map(unit => ({
        code: unit.code,
        mediaTypes: unit.mediaTypes,
        bids: publisherBidders
          .filter(b => b.enabled)
          .map(b => ({
            bidder: b.bidderCode,
            params: b.params || {},
          })),
      })),
      exportedAt: new Date().toISOString(),
    };

    // Download as JSON file
    const filename = `${publisher.slug}-prebid-config.json`;
    const blob = new Blob([JSON.stringify(prebidConfig, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Config import handlers
  const handleImportConfigClick = () => {
    setImportData('');
    setImportError(null);
    setImportValidation(null);
    setImportModal({ isOpen: true, isLoading: false });
  };

  const handleImportClose = () => {
    setImportModal({ isOpen: false, isLoading: false });
    setImportData('');
    setImportError(null);
    setImportValidation(null);
  };

  const validateImportConfig = (config: unknown): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('Invalid JSON: must be an object');
      return { valid: false, errors, warnings };
    }

    const cfg = config as Record<string, unknown>;

    // Validate bidderTimeout
    if (cfg.bidderTimeout !== undefined) {
      if (typeof cfg.bidderTimeout !== 'number') {
        errors.push('bidderTimeout must be a number');
      } else if (cfg.bidderTimeout < 100 || cfg.bidderTimeout > 10000) {
        errors.push('bidderTimeout must be between 100 and 10000');
      }
    }

    // Validate priceGranularity
    if (cfg.priceGranularity !== undefined) {
      const validGranularities = ['low', 'medium', 'high', 'auto', 'dense'];
      if (!validGranularities.includes(cfg.priceGranularity as string)) {
        errors.push(`priceGranularity must be one of: ${validGranularities.join(', ')}`);
      }
    }

    // Validate sendAllBids
    if (cfg.sendAllBids !== undefined && typeof cfg.sendAllBids !== 'boolean') {
      errors.push('sendAllBids must be a boolean');
    }

    // Validate bidderSequence
    if (cfg.bidderSequence !== undefined) {
      const validSequences = ['random', 'fixed'];
      if (!validSequences.includes(cfg.bidderSequence as string)) {
        errors.push(`bidderSequence must be one of: ${validSequences.join(', ')}`);
      }
    }

    // Validate debug
    if (cfg.debug !== undefined && typeof cfg.debug !== 'boolean') {
      errors.push('debug must be a boolean');
    }

    // Check for unrecognized fields (warnings only)
    const knownFields = ['bidderTimeout', 'priceGranularity', 'sendAllBids', 'bidderSequence', 'debug', 'debugMode', 'publisherId', 'publisherName', 'publisherSlug', 'domains', 'adUnits', 'exportedAt'];
    Object.keys(cfg).forEach(key => {
      if (!knownFields.includes(key)) {
        warnings.push(`Unknown field "${key}" will be ignored`);
      }
    });

    // Warning if importing from different publisher
    if (cfg.publisherId && cfg.publisherId !== publisher?.id) {
      warnings.push(`Config was exported from a different publisher (${cfg.publisherName || cfg.publisherId})`);
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  const handleImportDataChange = (value: string) => {
    setImportData(value);
    setImportError(null);
    setImportValidation(null);

    if (!value.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const validation = validateImportConfig(parsed);
      setImportValidation(validation);
    } catch (e) {
      setImportError('Invalid JSON format');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher || !importValidation?.valid) return;

    setImportModal(prev => ({ ...prev, isLoading: true }));
    try {
      const parsed = JSON.parse(importData);

      // Extract config values
      const newConfig = {
        bidderTimeout: parsed.bidderTimeout ?? currentConfig?.bidderTimeout ?? 1500,
        priceGranularity: parsed.priceGranularity ?? currentConfig?.priceGranularity ?? 'medium',
        sendAllBids: parsed.sendAllBids ?? currentConfig?.sendAllBids ?? true,
        bidderSequence: parsed.bidderSequence ?? currentConfig?.bidderSequence ?? 'random',
        debugMode: parsed.debug ?? parsed.debugMode ?? currentConfig?.debugMode ?? false,
      };

      // Save the config
      const response = await fetch(`/api/publishers/${publisher.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to import config');
      }

      // Reload config
      const configResponse = await fetch(`/api/publishers/${publisher.id}/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (configResponse.ok) {
        const data = await configResponse.json();
        setCurrentConfig(data.config);
        setCurrentVersion(data.version || 1);
      }

      handleImportClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import config');
    } finally {
      setImportModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Config editing handlers
  const handleEditConfigClick = () => {
    if (currentConfig) {
      setConfigForm({
        bidderTimeout: currentConfig.bidderTimeout,
        priceGranularity: currentConfig.priceGranularity,
        sendAllBids: currentConfig.sendAllBids,
        bidderSequence: currentConfig.bidderSequence,
        debugMode: currentConfig.debugMode,
      });
    }
    setConfigModal({ isOpen: true, isLoading: false });
  };

  const handleConfigClose = () => {
    setConfigModal({ isOpen: false, isLoading: false });
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher) return;

    setConfigModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bidderTimeout: configForm.bidderTimeout,
          priceGranularity: configForm.priceGranularity,
          enableSendAllBids: configForm.sendAllBids,
          bidderSequence: configForm.bidderSequence,
          debugMode: configForm.debugMode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update config');
      }

      const updated = await response.json();
      setCurrentConfig({
        bidderTimeout: updated.bidderTimeout,
        priceGranularity: updated.priceGranularity,
        sendAllBids: updated.enableSendAllBids,
        bidderSequence: updated.bidderSequence,
        debugMode: updated.debugMode,
      });
      setCurrentVersion(updated.version);
      handleConfigClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
      setConfigModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Bidder handlers
  const handleAddBidderClick = () => {
    setBidderForm({ bidderCode: '', params: {} });
    setBidderSearchQuery('');
    setBidderModal({ isOpen: true, isLoading: false });
  };

  const handleBidderClose = () => {
    setBidderModal({ isOpen: false, isLoading: false });
    setBidderSearchQuery('');
  };

  const handleBidderSelect = (bidderCode: string) => {
    const selectedBidder = availableBidders.find(b => b.code === bidderCode);
    const initialParams: Record<string, string> = {};
    if (selectedBidder) {
      selectedBidder.paramsSchema.forEach(p => {
        initialParams[p.key] = '';
      });
    }
    setBidderForm({ bidderCode, params: initialParams });
  };

  const handleBidderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher || !bidderForm.bidderCode) return;

    setBidderModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/bidders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bidderCode: bidderForm.bidderCode,
          params: bidderForm.params,
          enabled: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add bidder');
      }

      await fetchPublisherBidders();
      handleBidderClose();
      setActiveTab('bidders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bidder');
      setBidderModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteBidderClick = (bidder: PublisherBidder) => {
    setDeleteBidderDialog({
      isOpen: true,
      isLoading: false,
      bidder,
    });
  };

  const handleDeleteBidderCancel = () => {
    setDeleteBidderDialog({
      isOpen: false,
      isLoading: false,
      bidder: null,
    });
  };

  const handleDeleteBidderConfirm = async () => {
    if (!publisher || !deleteBidderDialog.bidder) return;

    setDeleteBidderDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `/api/publishers/${publisher.id}/bidders/${deleteBidderDialog.bidder.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete bidder');
      }

      setPublisherBidders((prev) => prev.filter((b) => b.id !== deleteBidderDialog.bidder?.id));
      handleDeleteBidderCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bidder');
      setDeleteBidderDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleToggleBidder = async (bidder: PublisherBidder) => {
    if (!publisher) return;

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/bidders/${bidder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: !bidder.enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update bidder');
      }

      setPublisherBidders((prev) =>
        prev.map((b) => (b.id === bidder.id ? { ...b, enabled: !b.enabled } : b))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bidder');
    }
  };

  // Copy bidders handlers
  const handleCopyBiddersClick = () => {
    setCopyFromPublisherId('');
    setCopyBiddersError(null);
    setCopyBiddersSuccess(null);
    setCopyBiddersModal({ isOpen: true, isLoading: false });
  };

  const handleCopyBiddersClose = () => {
    setCopyBiddersModal({ isOpen: false, isLoading: false });
    setCopyBiddersError(null);
    setCopyBiddersSuccess(null);
    setCopyFromPublisherId('');
  };

  const handleCopyBiddersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher || !copyFromPublisherId) return;

    setCopyBiddersModal((prev) => ({ ...prev, isLoading: true }));
    setCopyBiddersError(null);
    setCopyBiddersSuccess(null);

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/bidders/copy-from`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromPublisherId: copyFromPublisherId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy bidders');
      }

      setCopyBiddersSuccess(data.message);
      // Refresh the bidder list
      await fetchPublisherBidders();

      // Close modal after a short delay to show success message
      setTimeout(() => {
        handleCopyBiddersClose();
      }, 1500);
    } catch (err) {
      setCopyBiddersError(err instanceof Error ? err.message : 'Failed to copy bidders');
      setCopyBiddersModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const filteredAvailableBidders = availableBidders.filter(
    (b) =>
      (b.name.toLowerCase().includes(bidderSearchQuery.toLowerCase()) ||
       b.code.toLowerCase().includes(bidderSearchQuery.toLowerCase())) &&
      !publisherBidders.some((pb) => pb.bidderCode === b.code)
  );

  const selectedBidderSchema = availableBidders.find(b => b.code === bidderForm.bidderCode);

  // User ID module handlers
  const handleUserIdModuleToggle = async (moduleCode: string) => {
    if (!publisher) return;

    const module = userIdModules.find(m => m.code === moduleCode);
    if (!module) return;

    const updatedModules = userIdModules.map(m =>
      m.code === moduleCode ? { ...m, enabled: !m.enabled } : m
    );

    // Save to API
    try {
      const response = await fetch(`/api/publishers/${publisher.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIdModules: updatedModules.map(m => ({
            code: m.code,
            enabled: m.enabled,
            config: m.config,
          })),
        }),
      });

      if (response.ok) {
        setUserIdModules(updatedModules);
      }
    } catch (err) {
      console.error('Failed to update User ID modules:', err);
    }
  };

  const handleUserIdModuleConfigClick = (module: UserIdModule) => {
    setUserIdModuleForm({ ...module.config });
    setUserIdModuleModal({
      isOpen: true,
      isLoading: false,
      module,
    });
  };

  const handleUserIdModuleConfigClose = () => {
    setUserIdModuleModal({
      isOpen: false,
      isLoading: false,
      module: null,
    });
    setUserIdModuleForm({});
  };

  const handleUserIdModuleConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher || !userIdModuleModal.module) return;

    setUserIdModuleModal((prev) => ({ ...prev, isLoading: true }));

    const moduleCode = userIdModuleModal.module.code;
    const updatedModules = userIdModules.map(m =>
      m.code === moduleCode ? { ...m, config: { ...userIdModuleForm } } : m
    );

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIdModules: updatedModules.map(m => ({
            code: m.code,
            enabled: m.enabled,
            config: m.config,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update module config');
      }

      setUserIdModules(updatedModules);
      handleUserIdModuleConfigClose();
    } catch (err) {
      console.error('Failed to save module config:', err);
      setUserIdModuleModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Consent management handlers
  const handleConsentConfigClick = () => {
    setConsentForm({
      gdprEnabled: consentManagement?.gdpr?.enabled || false,
      gdprCmpApi: consentManagement?.gdpr?.cmpApi || 'iab',
      gdprTimeout: consentManagement?.gdpr?.timeout || 10000,
      gdprDefaultScope: consentManagement?.gdpr?.defaultGdprScope ?? true,
      uspEnabled: consentManagement?.usp?.enabled || false,
      uspCmpApi: consentManagement?.usp?.cmpApi || 'iab',
      uspTimeout: consentManagement?.usp?.timeout || 10000,
    });
    setConsentModal({ isOpen: true, isLoading: false });
  };

  const handleConsentConfigClose = () => {
    setConsentModal({ isOpen: false, isLoading: false });
  };

  const handleConsentConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisher) return;

    setConsentModal((prev) => ({ ...prev, isLoading: true }));

    const newConsentConfig: ConsentManagementConfig = {
      gdpr: {
        enabled: consentForm.gdprEnabled,
        cmpApi: consentForm.gdprCmpApi,
        timeout: consentForm.gdprTimeout,
        defaultGdprScope: consentForm.gdprDefaultScope,
      },
      usp: {
        enabled: consentForm.uspEnabled,
        cmpApi: consentForm.uspCmpApi,
        timeout: consentForm.uspTimeout,
      },
    };

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consentManagement: newConsentConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update consent config');
      }

      setConsentManagement(newConsentConfig);
      handleConsentConfigClose();
    } catch (err) {
      console.error('Failed to save consent config:', err);
      setConsentModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Build handlers
  const handleTriggerBuild = async () => {
    setIsBuildTriggering(true);

    // Create new build with "building" status
    const newBuild: Build = {
      id: `build_${Date.now()}`,
      version: builds.length > 0 ?
        `1.${parseInt(builds[0].version.split('.')[1] || '0') + 1}.0` : '1.0.0',
      status: 'building',
      startedAt: new Date().toISOString(),
      completedAt: null,
      duration: null,
      triggeredBy: 'Super Admin',
      commitHash: Math.random().toString(36).substring(2, 9),
      fileSize: null,
      modules: 12,
      bidders: publisherBidders.filter(b => b.enabled).length || 5,
    };

    // Add building state to top of list
    setBuilds([newBuild, ...builds]);

    // Simulate build process (3 seconds)
    setTimeout(() => {
      const completedBuild: Build = {
        ...newBuild,
        status: 'success',
        completedAt: new Date().toISOString(),
        duration: 120 + Math.floor(Math.random() * 60),
        fileSize: `${240 + Math.floor(Math.random() * 20)} KB`,
        scriptUrl: '/cdn/prebid-bundle.min.js',
      };

      setBuilds((prev) => [completedBuild, ...prev.slice(1)]);
      setIsBuildTriggering(false);
    }, 3000);
  };

  const handleDownloadBuild = () => {
    if (builds.length === 0 || builds[0].status !== 'success') return;

    // Generate a mock Prebid.js bundle content
    const bundleContent = `// Prebid.js Bundle for Publisher: ${publisher.id}
// Version: ${builds[0].version}
// Generated: ${new Date().toISOString()}
// Modules: ${builds[0].modules}
// Bidders: ${builds[0].bidders}

var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

// Publisher Config
pbjs.setConfig({
  priceGranularity: "medium",
  enableSendAllBids: true,
  bidderTimeout: 1500,
  publisherId: "${publisher.id}"
});

// Ad Units
pbjs.addAdUnits(${JSON.stringify(adUnits.map(u => ({
  code: u.code,
  mediaTypes: { banner: { sizes: u.sizes.map(s => s.split('x').map(Number)) } }
})), null, 2)});

// Bidder Adapters
${publisherBidders.filter(b => b.enabled).map(b => `// ${b.bidderName} adapter loaded`).join('\\n')}

// GPT Integration
pbjs.que.push(function() {
  pbjs.requestBids({
    bidsBackHandler: function() {
      pbjs.setTargetingForGPTAsync();
    }
  });
});

console.log("[pbjs_engine] Prebid.js bundle loaded for ${publisher.slug}");
`;

    // Create and download the file
    const blob = new Blob([bundleContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prebid-bundle-${publisher.slug}-v${builds[0].version}.min.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatVersionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      disabled: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  const getBuildStatusBadge = (status: Build['status']) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      building: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
    };
    const icons = {
      success: (
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      failed: (
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      building: (
        <svg className="mr-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      ),
      pending: (
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {icons[status]}
        {status}
      </span>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <Link
          to={returnUrl}
          className="text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Publishers
        </Link>
      </div>
    );
  }

  if (!publisher) {
    return null;
  }

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          {/* API Key Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">API Key</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={publisher.apiKey}
                      readOnly
                      className="block w-full rounded-md border-gray-300 bg-gray-50 py-2 pl-3 pr-20 text-sm font-mono shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={copyApiKey}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {copiedKey ? (
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateClick}
                  className="inline-flex items-center rounded-md bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-700 shadow-sm ring-1 ring-inset ring-yellow-600/20 hover:bg-yellow-100"
                >
                  <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate Key
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Use this API key to integrate pbjs_engine with your website. Keep it secure and never expose it in client-side code.
              </p>
            </div>
          </div>

          {/* Publisher Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Publisher Details</h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{publisher.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Slug</dt>
                <dd className="mt-1 text-sm text-gray-900">{publisher.slug}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">{getStatusBadge(publisher.status)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(publisher.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(publisher.updatedAt).toLocaleString()}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Domains</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {publisher.domains.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {publisher.domains.map((domain) => (
                        <span
                          key={domain}
                          className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">No domains configured</span>
                  )}
                </dd>
              </div>
              {publisher.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{publisher.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      ),
    },
    {
      id: 'config',
      label: 'Config',
      content: (
        <div className="space-y-6">
          {/* Main Config View */}
          {!showVersionHistory && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Prebid Configuration</h2>
                  <p className="text-sm text-gray-500">
                    Configure Prebid.js settings for this publisher.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleExportConfig}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Config
                  </button>
                  <button
                    type="button"
                    onClick={handleImportConfigClick}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Config
                  </button>
                  <button
                    type="button"
                    onClick={handleEditConfigClick}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Config
                  </button>
                  <button
                    type="button"
                    onClick={handleVersionHistoryClick}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Version History
                  </button>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bidder Timeout</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentConfig?.bidderTimeout || 1500}ms</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Price Granularity</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentConfig?.priceGranularity || 'medium'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Send All Bids</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentConfig?.sendAllBids ? 'Enabled' : 'Disabled'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bidder Sequence</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentConfig?.bidderSequence || 'random'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Debug Mode</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentConfig?.debugMode ? 'Enabled' : 'Disabled'}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* User ID Modules Section */}
          {!showVersionHistory && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">User ID Modules</h2>
                <p className="text-sm text-gray-500">
                  Configure identity modules for cross-device user identification.
                </p>
              </div>
              <div className="space-y-4">
                {userIdModules.map((module) => (
                  <div
                    key={module.code}
                    className={`border rounded-lg p-4 ${module.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${module.enabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <span className={`font-semibold text-sm ${module.enabled ? 'text-blue-600' : 'text-gray-600'}`}>
                            {module.code.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-900">{module.name}</h3>
                          <p className="text-xs text-gray-500">{module.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => handleUserIdModuleConfigClick(module)}
                          className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Configure
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserIdModuleToggle(module.code)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${module.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                          role="switch"
                          aria-checked={module.enabled}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${module.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                    </div>
                    {module.enabled && Object.keys(module.config).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <dl className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(module.config).map(([key, value]) => (
                            <div key={key}>
                              <dt className="font-medium text-gray-500">{key}</dt>
                              <dd className="text-gray-900">{value || <span className="text-gray-400 italic">Not set</span>}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consent Management Section */}
          {!showVersionHistory && (
            <div id="consent-section" className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Consent Management</h2>
                  <p className="text-sm text-gray-500">
                    Configure GDPR TCF and US Privacy (CCPA) consent settings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConsentConfigClick}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Configure
                </button>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* GDPR Section */}
                <div className={`border rounded-lg p-4 ${consentManagement?.gdpr?.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">GDPR TCF 2.0</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${consentManagement?.gdpr?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {consentManagement?.gdpr?.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {consentManagement?.gdpr?.enabled && (
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">CMP API</dt>
                        <dd className="text-gray-900">{consentManagement.gdpr.cmpApi || 'iab'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Timeout</dt>
                        <dd className="text-gray-900">{consentManagement.gdpr.timeout || 10000}ms</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Default Scope</dt>
                        <dd className="text-gray-900">{consentManagement.gdpr.defaultGdprScope ? 'Yes' : 'No'}</dd>
                      </div>
                    </dl>
                  )}
                </div>
                {/* USP Section */}
                <div className={`border rounded-lg p-4 ${consentManagement?.usp?.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">US Privacy (CCPA)</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${consentManagement?.usp?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {consentManagement?.usp?.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {consentManagement?.usp?.enabled && (
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">CMP API</dt>
                        <dd className="text-gray-900">{consentManagement.usp.cmpApi || 'iab'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Timeout</dt>
                        <dd className="text-gray-900">{consentManagement.usp.timeout || 10000}ms</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Version History View */}
          {showVersionHistory && !selectedVersion && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <button
                  type="button"
                  onClick={handleVersionHistoryBack}
                  className="mr-3 text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Version History</h2>
                  <p className="text-sm text-gray-500">
                    View and manage previous configuration versions.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {/* Current version */}
                {currentConfig && (
                  <div
                    className="py-4 hover:bg-gray-50 cursor-pointer rounded-lg px-2 -mx-2"
                    onClick={() => handleVersionSelect({
                      id: 'current',
                      version: currentVersion,
                      createdAt: new Date().toISOString(),
                      createdBy: 'Current',
                      changes: 'Current configuration',
                      config: currentConfig,
                    })}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-700">
                          <span className="text-sm font-semibold">v{currentVersion}</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            Current configuration
                            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Current
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">Active configuration</p>
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
                {/* Historical versions */}
                {configVersions.map((version) => (
                  <div
                    key={version.id}
                    className="py-4 hover:bg-gray-50 cursor-pointer rounded-lg px-2 -mx-2"
                    onClick={() => handleVersionSelect(version)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                          <span className="text-sm font-semibold">v{version.version}</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {version.changes}
                          </p>
                          <p className="text-sm text-gray-500">
                            by {version.createdBy} • {formatVersionDate(version.createdAt)}
                          </p>
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version Detail View */}
          {showVersionHistory && selectedVersion && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handleVersionHistoryBack}
                    className="mr-3 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Version {selectedVersion.version}
                      {selectedVersion.id === configVersions[0]?.id && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Current
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedVersion.changes}
                    </p>
                  </div>
                </div>
                {selectedVersion.id !== configVersions[0]?.id && (
                  <button
                    type="button"
                    onClick={() => handleRollbackClick(selectedVersion)}
                    className="inline-flex items-center rounded-md bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-700 shadow-sm ring-1 ring-inset ring-yellow-600/20 hover:bg-yellow-100"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Rollback to this version
                  </button>
                )}
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">
                  Created by <span className="font-medium text-gray-900">{selectedVersion.createdBy}</span>
                  {' '}on {formatVersionDate(selectedVersion.createdAt)}
                </p>
              </div>

              <h3 className="text-sm font-medium text-gray-900 mb-3">Configuration Settings</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <dt className="text-sm font-medium text-gray-500">Bidder Timeout</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.bidderTimeout}ms</dd>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <dt className="text-sm font-medium text-gray-500">Price Granularity</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.priceGranularity}</dd>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <dt className="text-sm font-medium text-gray-500">Send All Bids</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.sendAllBids ? 'Enabled' : 'Disabled'}</dd>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <dt className="text-sm font-medium text-gray-500">Bidder Sequence</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.bidderSequence}</dd>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <dt className="text-sm font-medium text-gray-500">Debug Mode</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.debugMode ? 'Enabled' : 'Disabled'}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'ad-units',
      label: 'Ad Units',
      content: (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Ad Units</h2>
              <p className="text-sm text-gray-500">
                Manage ad unit placements for this publisher.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddAdUnitClick}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Add Ad Unit
            </button>
          </div>

          {adUnits.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No ad units</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new ad unit for this publisher.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{unit.name}</h3>
                      <p className="text-sm text-gray-500">
                        <code className="bg-gray-100 px-1 rounded">{unit.code}</code>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(unit.status)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAdUnitClick(unit);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                        title="Edit ad unit"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateAdUnitClick(unit);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        title="Duplicate ad unit"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAdUnitClick(unit);
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="Delete ad unit"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">Sizes</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {unit.sizes.map((size) => (
                          <span
                            key={size}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                          >
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">Media Types</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {unit.mediaTypes.map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                    {unit.floorPrice && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Floor Price</span>
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            ${unit.floorPrice} CPM
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'bidders',
      label: 'Bidders',
      content: (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Bidders</h2>
              <p className="text-sm text-gray-500">
                Configure bidder adapters for this publisher.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleCopyBiddersClick}
                className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 ring-1 ring-inset ring-gray-300"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                </svg>
                Copy from Publisher
              </button>
              <button
                type="button"
                onClick={handleAddBidderClick}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                </svg>
                Add Bidder
              </button>
            </div>
          </div>

          {publisherBidders.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No bidders configured</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add bidder adapters to enable programmatic advertising.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {publisherBidders.map((bidder) => (
                <div
                  key={bidder.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {bidder.bidderCode.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {bidder.bidderName}
                          </p>
                          <span className="ml-2 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            {bidder.bidderCode}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {Object.keys(bidder.params).length > 0
                            ? `${Object.keys(bidder.params).length} parameters configured`
                            : 'No parameters configured'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => handleToggleBidder(bidder)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                          bidder.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={bidder.enabled}
                        aria-label={`Toggle ${bidder.bidderName}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            bidder.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBidderClick(bidder)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove bidder"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'build',
      label: 'Build',
      content: (
        <div className="space-y-6">
          {/* Current Build Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Build Status</h2>
                <p className="text-sm text-gray-500">
                  Current Prebid.js build for this publisher.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {builds.length > 0 && builds[0].status === 'success' && (
                  <button
                    type="button"
                    onClick={handleDownloadBuild}
                    className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTriggerBuild}
                  disabled={isBuildTriggering || (builds.length > 0 && builds[0].status === 'building')}
                  className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                    isBuildTriggering || (builds.length > 0 && builds[0].status === 'building')
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  {isBuildTriggering || (builds.length > 0 && builds[0].status === 'building') ? (
                    <>
                      <svg className="-ml-0.5 mr-1.5 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Building...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Trigger Build
                    </>
                  )}
                </button>
              </div>
            </div>

            {builds.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      builds[0].status === 'success' ? 'bg-green-100' :
                      builds[0].status === 'failed' ? 'bg-red-100' :
                      builds[0].status === 'building' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {builds[0].status === 'success' && (
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {builds[0].status === 'failed' && (
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {builds[0].status === 'building' && (
                        <svg className="h-6 w-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        Build v{builds[0].version} {getBuildStatusBadge(builds[0].status)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Started {formatVersionDate(builds[0].startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{builds[0].fileSize || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{formatDuration(builds[0].duration)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Modules</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{builds[0].modules}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Bidders</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{builds[0].bidders}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Commit</p>
                    <p className="mt-1 text-sm font-mono text-gray-900">{builds[0].commitHash}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Embed Code Section */}
          {builds.length > 0 && builds[0].status === 'success' && builds[0].scriptUrl && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Embed Code</h2>
                <p className="text-sm text-gray-500">
                  Add this single script tag to your website to load the minified Prebid.js bundle with all your configurations.
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 relative">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all">
{`<script async src="https://cdn.pbjs-engine.com${builds[0].scriptUrl}?key=${publisher.apiKey}&v=${builds[0].version}"></script>`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<script async src="https://cdn.pbjs-engine.com${builds[0].scriptUrl}?key=${publisher.apiKey}&v=${builds[0].version}"></script>`
                    );
                    setCopiedEmbedCode(true);
                    setTimeout(() => setCopiedEmbedCode(false), 2000);
                  }}
                  className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white rounded"
                  title="Copy to clipboard"
                >
                  {copiedEmbedCode ? (
                    <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">What's Included</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Prebid.js library (minified)
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {builds[0].bidders} bidder adapters
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {builds[0].modules} modules configured
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ad unit definitions
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      GPT integration
                    </li>
                  </ul>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Quick Start</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Simply add the embed code to your website's &lt;head&gt; section. The script loads asynchronously and won't block page rendering.
                  </p>
                  <a
                    href={`https://cdn.pbjs-engine.com${builds[0].scriptUrl}?key=${publisher.apiKey}&v=${builds[0].version}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Script
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Build History */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Build History</h2>
              <p className="text-sm text-gray-500">Previous builds for this publisher.</p>
            </div>
            <div className="divide-y divide-gray-200">
              {builds.map((build, index) => (
                <div key={build.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getBuildStatusBadge(build.status)}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          v{build.version}
                          {index === 0 && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              Latest
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          by {build.triggeredBy} • {formatVersionDate(build.startedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-mono">{build.commitHash}</span>
                      <span>{formatDuration(build.duration)}</span>
                      <span>{build.fileSize || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Build breadcrumb items based on current tab
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Admin', href: '/admin/dashboard' },
      { label: 'Publishers', href: '/admin/publishers' },
      { label: publisher.name, href: `/admin/publishers/${publisher.id}` },
    ];

    // Add current tab to breadcrumb if not on Overview
    const currentTabLabel = tabs.find(t => t.id === activeTab)?.label;
    if (currentTabLabel && activeTab !== 'overview') {
      items.push({ label: currentTabLabel });
    }

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={getBreadcrumbItems()} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to={returnUrl}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {publisher.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{publisher.name}</h1>
              <p className="text-sm text-gray-500">{publisher.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(publisher.status)}
          <button
            type="button"
            onClick={handleEditClick}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Edit Publisher
          </button>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Regenerate API Key Confirmation Dialog */}
      <ConfirmDialog
        isOpen={regenerateDialog.isOpen}
        onClose={handleRegenerateCancel}
        onConfirm={handleRegenerateConfirm}
        title="Regenerate API Key"
        message={`Are you sure you want to regenerate the API key for "${publisher.name}"? The current key will be invalidated immediately and any integrations using it will stop working until updated with the new key.`}
        confirmText="Regenerate Key"
        cancelText="Cancel"
        variant="warning"
        isLoading={regenerateDialog.isLoading}
      />

      {/* Edit Publisher Modal */}
      <FormModal
        isOpen={editModal.isOpen}
        onClose={handleEditClose}
        title="Edit Publisher"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug
            </label>
            <input
              type="text"
              id="slug"
              value={editForm.slug}
              onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={editForm.status}
              onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'paused' | 'disabled' }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label htmlFor="domains" className="block text-sm font-medium text-gray-700">
              Domains (comma-separated)
            </label>
            <input
              type="text"
              id="domains"
              value={editForm.domains}
              onChange={(e) => setEditForm((prev) => ({ ...prev, domains: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="example.com, www.example.com"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              value={editForm.notes}
              onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleEditClose}
              disabled={editModal.isLoading}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editModal.isLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {editModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Changes
            </button>
          </div>
        </form>
      </FormModal>

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={unsavedChangesDialog.isOpen}
        onClose={handleCancelDiscard}
        onConfirm={handleDiscardChanges}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard Changes"
        variant="warning"
      />

      {/* Add/Edit Ad Unit Modal */}
      <FormModal
        isOpen={adUnitModal.isOpen}
        onClose={handleAdUnitClose}
        title={editingAdUnit ? 'Edit Ad Unit' : 'Add Ad Unit'}
      >
        <form onSubmit={handleAdUnitSubmit} className="space-y-4">
          <div>
            <label htmlFor="adUnitCode" className="block text-sm font-medium text-gray-700">
              Code *
            </label>
            <input
              type="text"
              id="adUnitCode"
              value={adUnitForm.code}
              onChange={(e) => setAdUnitForm((prev) => ({ ...prev, code: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="header-banner"
              required
            />
            <p className="mt-1 text-sm text-gray-500">Unique identifier for this ad unit</p>
          </div>
          <div>
            <label htmlFor="adUnitName" className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              id="adUnitName"
              value={adUnitForm.name}
              onChange={(e) => setAdUnitForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Header Banner"
              required
            />
          </div>
          <div>
            <label htmlFor="adUnitSizes" className="block text-sm font-medium text-gray-700">
              Sizes *
            </label>
            <input
              type="text"
              id="adUnitSizes"
              value={adUnitForm.sizes}
              onChange={(e) => setAdUnitForm((prev) => ({ ...prev, sizes: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="300x250, 728x90"
              required
            />
            <p className="mt-1 text-sm text-gray-500">Comma-separated list of sizes (e.g., 300x250, 728x90)</p>
          </div>
          <div>
            <label htmlFor="adUnitFloorPrice" className="block text-sm font-medium text-gray-700">
              Floor Price (CPM)
            </label>
            <input
              type="text"
              id="adUnitFloorPrice"
              value={adUnitForm.floorPrice}
              onChange={(e) => setAdUnitForm((prev) => ({ ...prev, floorPrice: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="1.50"
            />
            <p className="mt-1 text-sm text-gray-500">Minimum CPM price for this ad unit (e.g., 1.50)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media Types
            </label>
            <div className="flex flex-wrap gap-3">
              {['banner', 'video', 'native'].map((type) => (
                <label
                  key={type}
                  className={`inline-flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    adUnitForm.mediaTypes.includes(type)
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={adUnitForm.mediaTypes.includes(type)}
                    onChange={() => handleMediaTypeToggle(type)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Video Configuration - shown when video media type is selected */}
          {adUnitForm.mediaTypes.includes('video') && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Video Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="videoPlayerSize" className="block text-sm font-medium text-gray-700">
                    Player Size
                  </label>
                  <input
                    type="text"
                    id="videoPlayerSize"
                    value={adUnitForm.videoConfig.playerSize}
                    onChange={(e) => setAdUnitForm((prev) => ({
                      ...prev,
                      videoConfig: { ...prev.videoConfig, playerSize: e.target.value }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="640x480"
                  />
                  <p className="mt-1 text-xs text-gray-500">Width x Height (e.g., 640x480)</p>
                </div>
                <div>
                  <label htmlFor="videoContext" className="block text-sm font-medium text-gray-700">
                    Video Context
                  </label>
                  <select
                    id="videoContext"
                    value={adUnitForm.videoConfig.context}
                    onChange={(e) => setAdUnitForm((prev) => ({
                      ...prev,
                      videoConfig: { ...prev.videoConfig, context: e.target.value as 'instream' | 'outstream' | 'adpod' }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="instream">Instream</option>
                    <option value="outstream">Outstream</option>
                    <option value="adpod">Adpod</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MIME Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['video/mp4', 'video/webm', 'video/ogg', 'video/3gpp'].map((mime) => (
                      <label
                        key={mime}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                          adUnitForm.videoConfig.mimes.includes(mime)
                            ? 'bg-green-100 text-green-700 ring-1 ring-green-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={adUnitForm.videoConfig.mimes.includes(mime)}
                          onChange={() => setAdUnitForm((prev) => ({
                            ...prev,
                            videoConfig: {
                              ...prev.videoConfig,
                              mimes: prev.videoConfig.mimes.includes(mime)
                                ? prev.videoConfig.mimes.filter((m) => m !== mime)
                                : [...prev.videoConfig.mimes, mime]
                            }
                          }))}
                          className="sr-only"
                        />
                        {mime.replace('video/', '')}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protocols
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 1, label: 'VAST 1.0' },
                      { value: 2, label: 'VAST 2.0' },
                      { value: 3, label: 'VAST 3.0' },
                      { value: 4, label: 'VAST 1.0 Wrapper' },
                      { value: 5, label: 'VAST 2.0 Wrapper' },
                      { value: 6, label: 'VAST 3.0 Wrapper' },
                      { value: 7, label: 'VAST 4.0' },
                      { value: 8, label: 'VAST 4.0 Wrapper' },
                    ].map((protocol) => (
                      <label
                        key={protocol.value}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                          adUnitForm.videoConfig.protocols.includes(protocol.value)
                            ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={adUnitForm.videoConfig.protocols.includes(protocol.value)}
                          onChange={() => setAdUnitForm((prev) => ({
                            ...prev,
                            videoConfig: {
                              ...prev.videoConfig,
                              protocols: prev.videoConfig.protocols.includes(protocol.value)
                                ? prev.videoConfig.protocols.filter((p) => p !== protocol.value)
                                : [...prev.videoConfig.protocols, protocol.value]
                            }
                          }))}
                          className="sr-only"
                        />
                        {protocol.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Playback Methods
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 1, label: 'Auto-Play Sound On' },
                      { value: 2, label: 'Auto-Play Sound Off' },
                      { value: 3, label: 'Click-to-Play' },
                      { value: 4, label: 'Mouse-Over' },
                      { value: 5, label: 'Enter Viewport Sound On' },
                      { value: 6, label: 'Enter Viewport Sound Off' },
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                          adUnitForm.videoConfig.playbackMethods.includes(method.value)
                            ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={adUnitForm.videoConfig.playbackMethods.includes(method.value)}
                          onChange={() => setAdUnitForm((prev) => ({
                            ...prev,
                            videoConfig: {
                              ...prev.videoConfig,
                              playbackMethods: prev.videoConfig.playbackMethods.includes(method.value)
                                ? prev.videoConfig.playbackMethods.filter((m) => m !== method.value)
                                : [...prev.videoConfig.playbackMethods, method.value]
                            }
                          }))}
                          className="sr-only"
                        />
                        {method.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration Limits (seconds)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={adUnitForm.videoConfig.minDuration || ''}
                      onChange={(e) => setAdUnitForm((prev) => ({
                        ...prev,
                        videoConfig: { ...prev.videoConfig, minDuration: parseInt(e.target.value) || undefined }
                      }))}
                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Min"
                      min="0"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      value={adUnitForm.videoConfig.maxDuration || ''}
                      onChange={(e) => setAdUnitForm((prev) => ({
                        ...prev,
                        videoConfig: { ...prev.videoConfig, maxDuration: parseInt(e.target.value) || undefined }
                      }))}
                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Max"
                      min="0"
                    />
                    <span className="text-xs text-gray-500">seconds</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Native Configuration - shown when native media type is selected */}
          {adUnitForm.mediaTypes.includes('native') && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Native Configuration</h4>
              <p className="text-xs text-gray-500 mb-3">Configure the native ad assets. Check "Required" to make an asset mandatory.</p>
              <div className="space-y-4">
                {/* Title Asset */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Title</span>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={adUnitForm.nativeConfig.title.required}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            title: { ...prev.nativeConfig.title, required: e.target.checked }
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Required</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Length</label>
                    <input
                      type="number"
                      value={adUnitForm.nativeConfig.title.len || ''}
                      onChange={(e) => setAdUnitForm((prev) => ({
                        ...prev,
                        nativeConfig: {
                          ...prev.nativeConfig,
                          title: { ...prev.nativeConfig.title, len: parseInt(e.target.value) || undefined }
                        }
                      }))}
                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="90"
                    />
                  </div>
                </div>
                {/* Image Asset */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Main Image</span>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={adUnitForm.nativeConfig.image.required}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            image: { ...prev.nativeConfig.image, required: e.target.checked }
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Required</span>
                    </label>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Width</label>
                      <input
                        type="number"
                        value={adUnitForm.nativeConfig.image.sizes?.width || ''}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            image: {
                              ...prev.nativeConfig.image,
                              sizes: {
                                width: parseInt(e.target.value) || 300,
                                height: prev.nativeConfig.image.sizes?.height || 250
                              }
                            }
                          }
                        }))}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="300"
                      />
                    </div>
                    <span className="text-gray-400 mt-5">x</span>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Height</label>
                      <input
                        type="number"
                        value={adUnitForm.nativeConfig.image.sizes?.height || ''}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            image: {
                              ...prev.nativeConfig.image,
                              sizes: {
                                width: prev.nativeConfig.image.sizes?.width || 300,
                                height: parseInt(e.target.value) || 250
                              }
                            }
                          }
                        }))}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="250"
                      />
                    </div>
                  </div>
                </div>
                {/* Body/Description Asset */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Body/Description</span>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={adUnitForm.nativeConfig.body.required}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            body: { ...prev.nativeConfig.body, required: e.target.checked }
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Required</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Length</label>
                    <input
                      type="number"
                      value={adUnitForm.nativeConfig.body.len || ''}
                      onChange={(e) => setAdUnitForm((prev) => ({
                        ...prev,
                        nativeConfig: {
                          ...prev.nativeConfig,
                          body: { ...prev.nativeConfig.body, len: parseInt(e.target.value) || undefined }
                        }
                      }))}
                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="200"
                    />
                  </div>
                </div>
                {/* Sponsored By Asset */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Sponsored By</span>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={adUnitForm.nativeConfig.sponsoredBy.required}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            sponsoredBy: { ...prev.nativeConfig.sponsoredBy, required: e.target.checked }
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Required</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Length</label>
                    <input
                      type="number"
                      value={adUnitForm.nativeConfig.sponsoredBy.len || ''}
                      onChange={(e) => setAdUnitForm((prev) => ({
                        ...prev,
                        nativeConfig: {
                          ...prev.nativeConfig,
                          sponsoredBy: { ...prev.nativeConfig.sponsoredBy, len: parseInt(e.target.value) || undefined }
                        }
                      }))}
                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="50"
                    />
                  </div>
                </div>
                {/* Icon Asset */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Icon</span>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={adUnitForm.nativeConfig.icon.required}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            icon: { ...prev.nativeConfig.icon, required: e.target.checked }
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Required</span>
                    </label>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Width</label>
                      <input
                        type="number"
                        value={adUnitForm.nativeConfig.icon.sizes?.width || ''}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            icon: {
                              ...prev.nativeConfig.icon,
                              sizes: {
                                width: parseInt(e.target.value) || 50,
                                height: prev.nativeConfig.icon.sizes?.height || 50
                              }
                            }
                          }
                        }))}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="50"
                      />
                    </div>
                    <span className="text-gray-400 mt-5">x</span>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Height</label>
                      <input
                        type="number"
                        value={adUnitForm.nativeConfig.icon.sizes?.height || ''}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            icon: {
                              ...prev.nativeConfig.icon,
                              sizes: {
                                width: prev.nativeConfig.icon.sizes?.width || 50,
                                height: parseInt(e.target.value) || 50
                              }
                            }
                          }
                        }))}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="50"
                      />
                    </div>
                  </div>
                </div>
                {/* CTA Asset */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Call to Action (CTA)</span>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={adUnitForm.nativeConfig.cta.required}
                        onChange={(e) => setAdUnitForm((prev) => ({
                          ...prev,
                          nativeConfig: {
                            ...prev.nativeConfig,
                            cta: { ...prev.nativeConfig.cta, required: e.target.checked }
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Required</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Length</label>
                    <input
                      type="number"
                      value={adUnitForm.nativeConfig.cta.len || ''}
                      onChange={(e) => setAdUnitForm((prev) => ({
                        ...prev,
                        nativeConfig: {
                          ...prev.nativeConfig,
                          cta: { ...prev.nativeConfig.cta, len: parseInt(e.target.value) || undefined }
                        }
                      }))}
                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Size Mapping Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Size Mapping (Responsive Ads)
              </label>
              <button
                type="button"
                onClick={() => setAdUnitForm((prev) => ({
                  ...prev,
                  sizeMapping: [...prev.sizeMapping, { minViewport: [0, 0], sizes: [[300, 250]] }],
                }))}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                + Add Rule
              </button>
            </div>
            {adUnitForm.sizeMapping.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No size mapping rules. Ad will use default sizes.</p>
            ) : (
              <div className="space-y-3">
                {adUnitForm.sizeMapping.map((rule, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Rule {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setAdUnitForm((prev) => ({
                          ...prev,
                          sizeMapping: prev.sizeMapping.filter((_, i) => i !== index),
                        }))}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Viewport (WxH)</label>
                        <input
                          type="text"
                          value={`${rule.minViewport[0]}x${rule.minViewport[1]}`}
                          onChange={(e) => {
                            const [w, h] = e.target.value.split('x').map(Number);
                            setAdUnitForm((prev) => ({
                              ...prev,
                              sizeMapping: prev.sizeMapping.map((r, i) =>
                                i === index ? { ...r, minViewport: [w || 0, h || 0] } : r
                              ),
                            }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          placeholder="1024x768"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Sizes</label>
                        <input
                          type="text"
                          value={rule.sizes.map(s => s.join('x')).join(', ')}
                          onChange={(e) => {
                            const sizes = e.target.value.split(',').map(s => {
                              const [w, h] = s.trim().split('x').map(Number);
                              return [w || 0, h || 0];
                            });
                            setAdUnitForm((prev) => ({
                              ...prev,
                              sizeMapping: prev.sizeMapping.map((r, i) =>
                                i === index ? { ...r, sizes } : r
                              ),
                            }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          placeholder="300x250, 728x90"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Define different ad sizes for different viewport widths. Rules are applied in order.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleAdUnitClose}
              disabled={adUnitModal.isLoading}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adUnitModal.isLoading || !adUnitForm.code || !adUnitForm.name || !adUnitForm.sizes}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {adUnitModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {editingAdUnit ? 'Save Changes' : 'Create Ad Unit'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Rollback Confirmation Dialog */}
      <ConfirmDialog
        isOpen={rollbackDialog.isOpen}
        onClose={handleRollbackCancel}
        onConfirm={handleRollbackConfirm}
        title="Rollback Configuration"
        message={`Are you sure you want to rollback to version ${rollbackDialog.version?.version}? This will replace the current configuration with the settings from "${rollbackDialog.version?.changes}".`}
        confirmText="Rollback"
        cancelText="Cancel"
        variant="warning"
        isLoading={rollbackDialog.isLoading}
      />

      {/* Edit Config Modal */}
      <FormModal
        isOpen={configModal.isOpen}
        onClose={handleConfigClose}
        title="Edit Prebid Configuration"
      >
        <form onSubmit={handleConfigSubmit} className="space-y-4">
          <div>
            <label htmlFor="bidderTimeout" className="block text-sm font-medium text-gray-700">
              Bidder Timeout (ms)
            </label>
            <input
              type="number"
              id="bidderTimeout"
              value={configForm.bidderTimeout}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, bidderTimeout: parseInt(e.target.value, 10) || 1500 }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              min={100}
              max={10000}
              required
            />
          </div>
          <div>
            <label htmlFor="priceGranularity" className="block text-sm font-medium text-gray-700">
              Price Granularity
            </label>
            <select
              id="priceGranularity"
              value={configForm.priceGranularity}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, priceGranularity: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="auto">Auto</option>
              <option value="dense">Dense</option>
            </select>
          </div>
          <div>
            <label htmlFor="bidderSequence" className="block text-sm font-medium text-gray-700">
              Bidder Sequence
            </label>
            <select
              id="bidderSequence"
              value={configForm.bidderSequence}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, bidderSequence: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="random">Random</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendAllBids"
              checked={configForm.sendAllBids}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, sendAllBids: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sendAllBids" className="ml-2 block text-sm text-gray-900">
              Send All Bids
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="debugMode"
              checked={configForm.debugMode}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, debugMode: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="debugMode" className="ml-2 block text-sm text-gray-900">
              Debug Mode
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleConfigClose}
              disabled={configModal.isLoading}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={configModal.isLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {configModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Changes
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete Ad Unit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteAdUnitDialog.isOpen}
        onClose={handleDeleteAdUnitCancel}
        onConfirm={handleDeleteAdUnitConfirm}
        title="Delete Ad Unit"
        message={`Are you sure you want to delete "${deleteAdUnitDialog.adUnit?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteAdUnitDialog.isLoading}
      />

      {/* Add Bidder Modal */}
      <FormModal
        isOpen={bidderModal.isOpen}
        onClose={handleBidderClose}
        title="Add Bidder"
      >
        <form onSubmit={handleBidderSubmit} className="space-y-4">
          {/* Bidder Selection */}
          {!bidderForm.bidderCode ? (
            <>
              <div>
                <label htmlFor="bidderSearch" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Bidders
                </label>
                <input
                  type="text"
                  id="bidderSearch"
                  placeholder="Search by name or code..."
                  value={bidderSearchQuery}
                  onChange={(e) => setBidderSearchQuery(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                {filteredAvailableBidders.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {bidderSearchQuery
                      ? 'No bidders found matching your search.'
                      : 'All available bidders have been added.'}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {filteredAvailableBidders.map((bidder) => (
                      <li
                        key={bidder.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleBidderSelect(bidder.code)}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-xs">
                              {bidder.code.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{bidder.name}</p>
                            <p className="text-xs text-gray-500">{bidder.code}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected Bidder Configuration */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {bidderForm.bidderCode.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedBidderSchema?.name}
                      </p>
                      <p className="text-xs text-gray-500">{bidderForm.bidderCode}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBidderForm({ bidderCode: '', params: {} })}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Change
                  </button>
                </div>
                {selectedBidderSchema?.description && (
                  <p className="mt-2 text-sm text-gray-600">{selectedBidderSchema.description}</p>
                )}
              </div>

              {/* Bidder Parameters */}
              {selectedBidderSchema && selectedBidderSchema.paramsSchema.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Configuration Parameters</h4>
                  {selectedBidderSchema.paramsSchema.map((param) => (
                    <div key={param.key}>
                      <label
                        htmlFor={`param-${param.key}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        {param.label}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        id={`param-${param.key}`}
                        value={bidderForm.params[param.key] || ''}
                        onChange={(e) =>
                          setBidderForm((prev) => ({
                            ...prev,
                            params: { ...prev.params, [param.key]: e.target.value },
                          }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required={param.required}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleBidderClose}
              disabled={bidderModal.isLoading}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bidderModal.isLoading || !bidderForm.bidderCode}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {bidderModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Add Bidder
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete Bidder Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteBidderDialog.isOpen}
        onClose={handleDeleteBidderCancel}
        onConfirm={handleDeleteBidderConfirm}
        title="Remove Bidder"
        message={`Are you sure you want to remove "${deleteBidderDialog.bidder?.bidderName}" from this publisher? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteBidderDialog.isLoading}
      />

      {/* Copy Bidders Modal */}
      <FormModal
        isOpen={copyBiddersModal.isOpen}
        onClose={handleCopyBiddersClose}
        title="Copy Bidders from Publisher"
      >
        <form onSubmit={handleCopyBiddersSubmit} className="space-y-4">
          <div>
            <label htmlFor="sourcePublisher" className="block text-sm font-medium text-gray-700">
              Select Source Publisher
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Choose a publisher to copy bidder configurations from. Only bidders not already configured for the current publisher will be copied.
            </p>
            <select
              id="sourcePublisher"
              value={copyFromPublisherId}
              onChange={(e) => setCopyFromPublisherId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            >
              <option value="">Select a publisher...</option>
              {allPublishers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
          </div>

          {copyBiddersError && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{copyBiddersError}</p>
                </div>
              </div>
            </div>
          )}

          {copyBiddersSuccess && (
            <div className="rounded-md bg-green-50 p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{copyBiddersSuccess}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCopyBiddersClose}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={copyBiddersModal.isLoading || !copyFromPublisherId}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {copyBiddersModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Copy Bidders
            </button>
          </div>
        </form>
      </FormModal>

      {/* User ID Module Config Modal */}
      <FormModal
        isOpen={userIdModuleModal.isOpen}
        onClose={handleUserIdModuleConfigClose}
        title={`Configure ${userIdModuleModal.module?.name || 'Module'}`}
      >
        <form onSubmit={handleUserIdModuleConfigSave} className="space-y-4">
          {userIdModuleModal.module && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">{userIdModuleModal.module.description}</p>
              </div>
              {userIdModuleModal.module.configSchema.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`uid-${field.key}`} className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    id={`uid-${field.key}`}
                    value={userIdModuleForm[field.key] || ''}
                    onChange={(e) => setUserIdModuleForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required={field.required}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}
            </>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleUserIdModuleConfigClose}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={userIdModuleModal.isLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {userIdModuleModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Configuration
            </button>
          </div>
        </form>
      </FormModal>

      {/* Consent Management Config Modal */}
      <FormModal
        isOpen={consentModal.isOpen}
        onClose={handleConsentConfigClose}
        title="Configure Consent Management"
      >
        <form onSubmit={handleConsentConfigSave} className="space-y-6">
          {/* GDPR Section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">GDPR TCF 2.0</h3>
              <button
                type="button"
                onClick={() => setConsentForm((prev) => ({ ...prev, gdprEnabled: !prev.gdprEnabled }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${consentForm.gdprEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={consentForm.gdprEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${consentForm.gdprEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
            {consentForm.gdprEnabled && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="gdprCmpApi" className="block text-sm font-medium text-gray-700">
                    CMP API
                  </label>
                  <select
                    id="gdprCmpApi"
                    value={consentForm.gdprCmpApi}
                    onChange={(e) => setConsentForm((prev) => ({ ...prev, gdprCmpApi: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="iab">IAB TCF</option>
                    <option value="static">Static</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gdprTimeout" className="block text-sm font-medium text-gray-700">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    id="gdprTimeout"
                    value={consentForm.gdprTimeout}
                    onChange={(e) => setConsentForm((prev) => ({ ...prev, gdprTimeout: parseInt(e.target.value, 10) || 10000 }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min={1000}
                    max={30000}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="gdprDefaultScope"
                    checked={consentForm.gdprDefaultScope}
                    onChange={(e) => setConsentForm((prev) => ({ ...prev, gdprDefaultScope: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="gdprDefaultScope" className="ml-2 block text-sm text-gray-900">
                    Default GDPR Scope (applies to all users by default)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* USP Section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">US Privacy (CCPA)</h3>
              <button
                type="button"
                onClick={() => setConsentForm((prev) => ({ ...prev, uspEnabled: !prev.uspEnabled }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${consentForm.uspEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={consentForm.uspEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${consentForm.uspEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
            {consentForm.uspEnabled && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="uspCmpApi" className="block text-sm font-medium text-gray-700">
                    CMP API
                  </label>
                  <select
                    id="uspCmpApi"
                    value={consentForm.uspCmpApi}
                    onChange={(e) => setConsentForm((prev) => ({ ...prev, uspCmpApi: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="iab">IAB USP</option>
                    <option value="static">Static</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="uspTimeout" className="block text-sm font-medium text-gray-700">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    id="uspTimeout"
                    value={consentForm.uspTimeout}
                    onChange={(e) => setConsentForm((prev) => ({ ...prev, uspTimeout: parseInt(e.target.value, 10) || 10000 }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min={1000}
                    max={30000}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleConsentConfigClose}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={consentModal.isLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {consentModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Configuration
            </button>
          </div>
        </form>
      </FormModal>

      {/* Import Config Modal */}
      <FormModal
        isOpen={importModal.isOpen}
        onClose={handleImportClose}
        title="Import Prebid Configuration"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div>
            <label htmlFor="importConfig" className="block text-sm font-medium text-gray-700">
              Paste JSON Configuration
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Paste a previously exported Prebid configuration JSON to import settings.
            </p>
            <textarea
              id="importConfig"
              value={importData}
              onChange={(e) => handleImportDataChange(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm font-mono text-xs ${
                importError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : importValidation?.valid
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              rows={12}
              placeholder='{"bidderTimeout": 1500, "priceGranularity": "medium", ...}'
              required
            />
          </div>

          {/* Validation Results */}
          {importError && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{importError}</p>
                </div>
              </div>
            </div>
          )}

          {importValidation && !importValidation.valid && importValidation.errors.length > 0 && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                  <ul className="mt-1 list-disc list-inside text-sm text-red-700">
                    {importValidation.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {importValidation?.valid && (
            <div className="rounded-md bg-green-50 p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Configuration is valid</p>
                </div>
              </div>
            </div>
          )}

          {importValidation?.warnings && importValidation.warnings.length > 0 && (
            <div className="rounded-md bg-yellow-50 p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Warnings</h3>
                  <ul className="mt-1 list-disc list-inside text-sm text-yellow-700">
                    {importValidation.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleImportClose}
              disabled={importModal.isLoading}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importModal.isLoading || !importValidation?.valid}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importModal.isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Import Configuration
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
