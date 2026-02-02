import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'config_change', label: 'Config Change' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

interface AuditLogFiltersProps {
  actionFilter: string;
  datePreset: string;
  customStartDate: string;
  customEndDate: string;
  totalLogs: number;
  isLoading: boolean;
  onActionFilterChange: (value: string) => void;
  onDatePresetChange: (value: string) => void;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onClearFilters: () => void;
  onExport: () => void;
}

export function AuditLogFilters({
  actionFilter,
  datePreset,
  customStartDate,
  customEndDate,
  totalLogs,
  isLoading,
  onActionFilterChange,
  onDatePresetChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onClearFilters,
  onExport,
}: AuditLogFiltersProps) {
  const hasActiveFilters = actionFilter || datePreset !== 'last_7_days';

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Action Type Filter */}
        <div>
          <label htmlFor="action-filter" className="block text-xs font-medium text-gray-500 mb-1">
            Filter by action
          </label>
          <select
            id="action-filter"
            value={actionFilter}
            onChange={(e) => onActionFilterChange(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3 pr-10"
          >
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label htmlFor="date-preset" className="block text-xs font-medium text-gray-500 mb-1">
            Date range
          </label>
          <select
            id="date-preset"
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3 pr-10"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Range */}
        {datePreset === 'custom' && (
          <>
            <div>
              <label htmlFor="start-date" className="block text-xs font-medium text-gray-500 mb-1">
                Start date
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="start-date"
                  value={customStartDate}
                  onChange={(e) => onCustomStartDateChange(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                />
              </div>
            </div>
            <div>
              <label htmlFor="end-date" className="block text-xs font-medium text-gray-500 mb-1">
                End date
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="end-date"
                  value={customEndDate}
                  onChange={(e) => onCustomEndDateChange(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                />
              </div>
            </div>
          </>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 self-end pb-1.5"
          >
            Clear filters
          </button>
        )}

        {/* Export Button and Count */}
        <div className="ml-auto flex items-end gap-4">
          <div className="text-sm text-gray-500 pb-1.5">
            {isLoading ? 'Loading...' : `${totalLogs} total entries`}
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={isLoading || totalLogs === 0}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
