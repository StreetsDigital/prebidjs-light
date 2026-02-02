import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import {
  AuditLogFilters,
  AuditLogTable,
  AuditLogDetailModal,
  Pagination,
  AuditLog,
} from '../../components/audit-logs';

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

  switch (preset) {
    case 'today':
      return {
        startDate: today.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: yesterday.toISOString(),
        endDate: new Date(today.getTime() - 1).toISOString(),
      };
    }
    case 'last_7_days': {
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: sevenDaysAgo.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    }
    case 'last_30_days': {
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: thirtyDaysAgo.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    }
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    }
    default:
      return { startDate: '', endDate: '' };
  }
}

function exportToCSV(logs: AuditLog[], filename: string): void {
  const headers = ['Timestamp', 'Action', 'Resource', 'Resource ID', 'User Name', 'User Email', 'IP Address', 'User Agent', 'Old Values', 'New Values'];
  const rows = logs.map(log => [
    new Date(log.timestamp).toISOString(),
    log.action,
    log.resource,
    log.resourceId || '',
    log.userName,
    log.userEmail,
    log.ipAddress,
    log.userAgent,
    log.details.oldValues ? JSON.stringify(log.details.oldValues) : '',
    log.details.newValues ? JSON.stringify(log.details.newValues) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AuditLogsPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [datePreset, setDatePreset] = useState('last_7_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const itemsPerPage = 50;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        page: currentPage.toString(),
      });
      if (actionFilter) {
        params.append('action', actionFilter);
      }

      // Apply date filters
      if (datePreset === 'custom') {
        if (customStartDate) {
          params.append('startDate', new Date(customStartDate).toISOString());
        }
        if (customEndDate) {
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          params.append('endDate', endDate.toISOString());
        }
      } else if (datePreset) {
        const { startDate, endDate } = getDateRange(datePreset);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      // Apply sort order
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotalLogs(data.pagination?.total || data.logs.length);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, actionFilter, datePreset, customStartDate, customEndDate, sortOrder, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, datePreset, customStartDate, customEndDate]);

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `audit-logs-${timestamp}.csv`;
    exportToCSV(logs, filename);
  };

  const handleClearFilters = () => {
    setActionFilter('');
    setDatePreset('last_7_days');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track all system activities and user actions.
        </p>
      </div>

      {/* Filters */}
      <AuditLogFilters
        actionFilter={actionFilter}
        datePreset={datePreset}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        totalLogs={totalLogs}
        isLoading={isLoading}
        onActionFilterChange={setActionFilter}
        onDatePresetChange={setDatePreset}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        onClearFilters={handleClearFilters}
        onExport={handleExport}
      />

      {/* Logs List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <AuditLogTable
          logs={logs}
          isLoading={isLoading}
          sortOrder={sortOrder}
          onSortChange={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          onRowClick={setSelectedLog}
        />
        {!isLoading && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalLogs}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Detail Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
