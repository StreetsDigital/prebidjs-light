import { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ConfirmDialog, Pagination } from '../../components/ui';

type SortField = 'name' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function PublishersPage() {
  const { token } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    publisher: Publisher | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    publisher: null,
    isDeleting: false,
  });

  // Get filter values from URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const statusFilter = searchParams.get('status') || '';
  const searchQuery = searchParams.get('search') || '';
  const sortField = (searchParams.get('sortBy') || 'name') as SortField;
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as SortOrder;

  const fetchPublishers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/publishers?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch publishers');
      }

      const data = await response.json();
      setPublishers(data.publishers);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishers();
  }, [token, currentPage, statusFilter, searchQuery, sortField, sortOrder]);

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };

  const handleStatusChange = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status) {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    newParams.set('page', '1'); // Reset to first page when filter changes
    setSearchParams(newParams);
  };

  const handleSearchChange = (search: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (search) {
      newParams.set('search', search);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1'); // Reset to first page when search changes
    setSearchParams(newParams);
  };

  const handleSort = (field: SortField) => {
    const newParams = new URLSearchParams(searchParams);
    if (sortField === field) {
      // Toggle order if same field
      newParams.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, start with ascending
      newParams.set('sortBy', field);
      newParams.set('sortOrder', 'asc');
    }
    newParams.set('page', '1'); // Reset to first page when sort changes
    setSearchParams(newParams);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="ml-1 w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="ml-1 w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="ml-1 w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const handleDeleteClick = (publisher: Publisher) => {
    console.log('Delete clicked for publisher:', publisher.name);
    setDeleteDialog({
      isOpen: true,
      publisher,
      isDeleting: false,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      publisher: null,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.publisher) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      const response = await fetch(`/api/publishers/${deleteDialog.publisher.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete publisher');
      }

      // Refetch to update pagination correctly
      await fetchPublishers();
      handleDeleteCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete publisher');
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
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

  if (isLoading && publishers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Publishers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all publishers and their configurations.
          </p>
        </div>
        <Link
          to="/admin/publishers/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <svg
            className="-ml-0.5 mr-1.5 h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
          Add Publisher
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search publishers..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3 pr-10"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          {(statusFilter || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSearchParams(new URLSearchParams());
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Unable to load publishers
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error.toLowerCase().includes('fetch') || error.toLowerCase().includes('network') || error.toLowerCase().includes('failed')
                  ? 'There was a problem connecting to the server. Please check your internet connection and try again.'
                  : error}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => fetchPublishers()}
                  disabled={isLoading}
                  className="inline-flex items-center rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-800" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Retrying...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Again
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Publisher
                  {getSortIcon('name')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Domains
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">
                  Created
                  {getSortIcon('createdAt')}
                </div>
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {publishers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {statusFilter || searchQuery
                    ? 'No publishers match your filters.'
                    : 'No publishers found. Create your first publisher to get started.'}
                </td>
              </tr>
            ) : (
              publishers.map((publisher) => (
                <tr key={publisher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {publisher.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {publisher.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {publisher.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {publisher.domains.length > 0 ? (
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {publisher.domains[0]}
                          {publisher.domains.length > 1 && (
                            <span className="ml-1 text-gray-400">
                              +{publisher.domains.length - 1}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">No domains</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(publisher.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(publisher.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/publishers/${publisher.id}`}
                      state={{ returnUrl: location.pathname + location.search }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(publisher)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Show pagination info */}
      {pagination && (
        <div className="text-sm text-gray-500">
          Showing {publishers.length} of {pagination.total} publishers
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Publisher"
        message={`Are you sure you want to delete "${deleteDialog.publisher?.name}"? This action cannot be undone and will remove all associated ad units, bidder configurations, and analytics data.`}
        confirmText="Delete Publisher"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteDialog.isDeleting}
      />
    </div>
  );
}
