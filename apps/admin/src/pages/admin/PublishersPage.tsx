import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ConfirmDialog, Pagination } from '../../components/ui';
import {
  PublisherFilters,
  PublisherTable,
  BulkActionsBar,
  ErrorDisplay,
} from '../../components/publishers';
import { Publisher, SortField, SortOrder, PaginationInfo } from '../../types/publisher';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

function exportPublishersToCSV(publishers: Publisher[], filename: string): void {
  const headers = ['ID', 'Name', 'Slug', 'API Key', 'Domains', 'Status', 'Notes', 'Created At', 'Updated At'];
  const rows = publishers.map(pub => [
    pub.id,
    pub.name,
    pub.slug,
    pub.apiKey,
    pub.domains.join('; '),
    pub.status,
    pub.notes || '',
    pub.createdAt,
    pub.updatedAt
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function PublishersPage() {
  const { token } = useAuthStore();
  const { addToast } = useToastStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    publisher: Publisher | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    publisher: null,
    isDeleting: false,
  });

  const [bulkActionDialog, setBulkActionDialog] = useState<{
    isOpen: boolean;
    action: 'pause' | 'activate' | 'disable' | null;
    isProcessing: boolean;
  }>({
    isOpen: false,
    action: null,
    isProcessing: false,
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
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSearchChange = (search: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (search) {
      newParams.set('search', search);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSort = (field: SortField) => {
    const newParams = new URLSearchParams(searchParams);
    if (sortField === field) {
      newParams.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      newParams.set('sortBy', field);
      newParams.set('sortOrder', 'asc');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleDeleteClick = (publisher: Publisher) => {
    setDeleteDialog({
      isOpen: true,
      publisher,
      isDeleting: false,
    });
  };

  const handleRestoreClick = async (publisher: Publisher) => {
    try {
      const response = await fetch(`/api/publishers/${publisher.id}/restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to restore publisher');
      }

      addToast({
        type: 'success',
        message: `Publisher "${publisher.name}" restored successfully`,
      });

      await fetchPublishers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore publisher');
    }
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

    const publisherName = deleteDialog.publisher.name;
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

      addToast({
        type: 'success',
        message: `Publisher "${publisherName}" deleted successfully`,
      });

      await fetchPublishers();
      handleDeleteCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete publisher');
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '10000');
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/publishers?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch publishers for export');
      }

      const data = await response.json();
      const timestamp = new Date().toISOString().split('T')[0];
      const filterSuffix = statusFilter ? `-${statusFilter}` : '';
      const filename = `publishers${filterSuffix}-${timestamp}.csv`;
      exportPublishersToCSV(data.publishers, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export publishers');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(publishers.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkActionClick = (action: 'pause' | 'activate' | 'disable') => {
    setBulkActionDialog({
      isOpen: true,
      action,
      isProcessing: false,
    });
  };

  const handleBulkActionCancel = () => {
    setBulkActionDialog({
      isOpen: false,
      action: null,
      isProcessing: false,
    });
  };

  const handleBulkActionConfirm = async () => {
    if (!bulkActionDialog.action || selectedIds.size === 0) return;

    setBulkActionDialog((prev) => ({ ...prev, isProcessing: true }));

    const statusMap = {
      pause: 'paused',
      activate: 'active',
      disable: 'disabled',
    };

    try {
      const response = await fetch('/api/publishers/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status: statusMap[bulkActionDialog.action],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update publishers');
      }

      setSelectedIds(new Set());
      await fetchPublishers();
      handleBulkActionCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publishers');
      setBulkActionDialog((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const getBulkActionMessage = () => {
    const count = selectedIds.size;
    switch (bulkActionDialog.action) {
      case 'pause':
        return `Are you sure you want to pause ${count} publisher(s)? They will stop serving ads until reactivated.`;
      case 'activate':
        return `Are you sure you want to activate ${count} publisher(s)? They will start serving ads immediately.`;
      case 'disable':
        return `Are you sure you want to disable ${count} publisher(s)? This will completely stop all ad serving.`;
      default:
        return '';
    }
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportAll}
            disabled={isExporting}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-500" />
            {isExporting ? 'Exporting...' : (statusFilter || searchQuery) ? 'Export Filtered' : 'Export All'}
          </button>
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
      </div>

      <PublisherFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClearFilters={() => setSearchParams(new URLSearchParams())}
      />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onActivate={() => handleBulkActionClick('activate')}
        onPause={() => handleBulkActionClick('pause')}
        onDisable={() => handleBulkActionClick('disable')}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {error && (
        <ErrorDisplay
          error={error}
          isLoading={isLoading}
          onRetry={fetchPublishers}
        />
      )}

      <PublisherTable
        publishers={publishers}
        selectedIds={selectedIds}
        sortField={sortField}
        sortOrder={sortOrder}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onSort={handleSort}
        onDelete={handleDeleteClick}
        onRestore={handleRestoreClick}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
      />

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {pagination && (
        <div className="text-sm text-gray-500">
          Showing {publishers.length} of {pagination.total} publishers
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Publisher"
        message={`Are you sure you want to delete "${deleteDialog.publisher?.name}"? The publisher will be hidden from normal views but can be restored later from the "Deleted" filter.`}
        confirmText="Delete Publisher"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteDialog.isDeleting}
      />

      <ConfirmDialog
        isOpen={bulkActionDialog.isOpen}
        onClose={handleBulkActionCancel}
        onConfirm={handleBulkActionConfirm}
        title={`Bulk ${bulkActionDialog.action === 'activate' ? 'Activate' : bulkActionDialog.action === 'pause' ? 'Pause' : 'Disable'} Publishers`}
        message={getBulkActionMessage()}
        confirmText={bulkActionDialog.action === 'activate' ? 'Activate' : bulkActionDialog.action === 'pause' ? 'Pause' : 'Disable'}
        cancelText="Cancel"
        variant={bulkActionDialog.action === 'disable' ? 'danger' : bulkActionDialog.action === 'pause' ? 'warning' : 'info'}
        isLoading={bulkActionDialog.isProcessing}
      />
    </div>
  );
}
