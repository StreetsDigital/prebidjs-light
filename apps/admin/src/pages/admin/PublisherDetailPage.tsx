import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ConfirmDialog, FormModal, Tabs, Tab } from '../../components/ui';

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
}

interface AdUnitFormData {
  code: string;
  name: string;
  sizes: string;
  mediaTypes: string[];
  floorPrice: string;
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

export function PublisherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerateDialog, setRegenerateDialog] = useState({
    isOpen: false,
    isLoading: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
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
  });
  const [deleteAdUnitDialog, setDeleteAdUnitDialog] = useState({
    isOpen: false,
    isLoading: false,
    adUnit: null as AdUnit | null,
  });
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
  const [builds] = useState<Build[]>(MOCK_BUILDS);

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
        setAdUnits(data.adUnits.map((u: { id: string; code: string; name: string; mediaTypes?: { banner?: { sizes: number[][] } }; status: string; floorPrice?: string | null }) => ({
          id: u.id,
          code: u.code,
          name: u.name,
          sizes: u.mediaTypes?.banner?.sizes?.map((s: number[]) => s.join('x')) || [],
          mediaTypes: u.mediaTypes ? Object.keys(u.mediaTypes) : ['banner'],
          status: u.status,
          floorPrice: u.floorPrice || null,
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
        setPublisherBidders(data.bidders.map((b: { id: string; bidderCode: string; enabled: boolean; params?: string; priority?: number }) => ({
          id: b.id,
          bidderCode: b.bidderCode,
          bidderName: AVAILABLE_BIDDERS.find(ab => ab.code === b.bidderCode)?.name || b.bidderCode,
          enabled: b.enabled,
          params: b.params ? JSON.parse(b.params) : {},
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

  useEffect(() => {
    fetchPublisher();
    fetchAdUnits();
    fetchConfig();
    fetchPublisherBidders();
    fetchAvailableBidders();
  }, [id, token]);

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
    setEditForm({
      name: publisher.name,
      slug: publisher.slug,
      status: publisher.status,
      domains: publisher.domains.join(', '),
      notes: publisher.notes || '',
    });
    setEditModal({ isOpen: true, isLoading: false });
  };

  const handleEditClose = () => {
    setEditModal({ isOpen: false, isLoading: false });
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

  // Ad Unit handlers
  const handleAddAdUnitClick = () => {
    setAdUnitForm({
      code: '',
      name: '',
      sizes: '',
      mediaTypes: ['banner'],
      floorPrice: '',
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

      const response = await fetch(`/api/publishers/${publisher.id}/ad-units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: adUnitForm.code,
          name: adUnitForm.name,
          mediaTypes: adUnitForm.mediaTypes.includes('banner') ? {
            banner: { sizes: sizesArray },
          } : undefined,
          floorPrice: adUnitForm.floorPrice || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create ad unit');
      }

      const newAdUnit = await response.json();
      setAdUnits((prev) => [...prev, {
        id: newAdUnit.id,
        code: newAdUnit.code,
        name: newAdUnit.name,
        sizes: sizesArray.map(s => s.join('x')),
        mediaTypes: adUnitForm.mediaTypes,
        status: newAdUnit.status,
        floorPrice: newAdUnit.floorPrice || null,
      }]);
      handleAdUnitClose();
      // Switch to ad-units tab to show the new ad unit
      setActiveTab('ad-units');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ad unit');
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
    setRollbackDialog((prev) => ({ ...prev, isLoading: true }));
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRollbackDialog({
      isOpen: false,
      isLoading: false,
      version: null,
    });
    setSelectedVersion(null);
    setShowVersionHistory(false);
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

  const filteredAvailableBidders = availableBidders.filter(
    (b) =>
      (b.name.toLowerCase().includes(bidderSearchQuery.toLowerCase()) ||
       b.code.toLowerCase().includes(bidderSearchQuery.toLowerCase())) &&
      !publisherBidders.some((pb) => pb.bidderCode === b.code)
  );

  const selectedBidderSchema = availableBidders.find(b => b.code === bidderForm.bidderCode);

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
          to="/admin/publishers"
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
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Trigger Build
              </button>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/publishers"
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

      {/* Add Ad Unit Modal */}
      <FormModal
        isOpen={adUnitModal.isOpen}
        onClose={handleAdUnitClose}
        title="Add Ad Unit"
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
              Create Ad Unit
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
    </div>
  );
}
