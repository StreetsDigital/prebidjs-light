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

  useEffect(() => {
    fetchPublisher();
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
        tabs={[
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
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Prebid Configuration</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Configure Prebid.js settings for this publisher.
                </p>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bidder Timeout</dt>
                    <dd className="mt-1 text-sm text-gray-900">1500ms</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Price Granularity</dt>
                    <dd className="mt-1 text-sm text-gray-900">medium</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Send All Bids</dt>
                    <dd className="mt-1 text-sm text-gray-900">Enabled</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bidder Sequence</dt>
                    <dd className="mt-1 text-sm text-gray-900">random</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Debug Mode</dt>
                    <dd className="mt-1 text-sm text-gray-900">Disabled</dd>
                  </div>
                </dl>
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
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Add Ad Unit
                  </button>
                </div>
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
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Add Bidder
                  </button>
                </div>
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
              </div>
            ),
          },
        ] as Tab[]}
        defaultTab="overview"
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
    </div>
  );
}
