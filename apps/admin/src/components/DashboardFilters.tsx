interface DashboardFiltersProps {
  dateRange: number;
  onDateRangeChange: (days: number) => void;
}

export function DashboardFilters({ dateRange, onDateRangeChange }: DashboardFiltersProps) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Performance metrics and insights for your Prebid configuration
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onDateRangeChange(7)}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            dateRange === 7
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => onDateRangeChange(30)}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            dateRange === 30
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 30 Days
        </button>
      </div>
    </div>
  );
}
