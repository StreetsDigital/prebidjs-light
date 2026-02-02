import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { AuditLog } from './types';
import { AuditLogRow } from './AuditLogRow';

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading: boolean;
  sortOrder: 'asc' | 'desc';
  onSortChange: () => void;
  onRowClick: (log: AuditLog) => void;
}

export function AuditLogTable({
  logs,
  isLoading,
  sortOrder,
  onSortChange,
  onRowClick,
}: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={onSortChange}
            >
              <div className="flex items-center gap-1">
                Timestamp
                {sortOrder === 'desc' ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronUpIcon className="h-4 w-4" />
                )}
              </div>
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Action
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Resource
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              User
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              IP Address
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <AuditLogRow
              key={log.id}
              log={log}
              onClick={() => onRowClick(log)}
            />
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          No audit logs found matching your filter.
        </div>
      )}
    </>
  );
}
