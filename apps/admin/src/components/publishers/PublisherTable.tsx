import { PublisherTableRow } from './PublisherTableRow';
import { Publisher, SortField, SortOrder } from '../../types/publisher';

interface PublisherTableProps {
  publishers: Publisher[];
  selectedIds: Set<string>;
  sortField: SortField;
  sortOrder: SortOrder;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onSort: (field: SortField) => void;
  onDelete: (publisher: Publisher) => void;
  onRestore: (publisher: Publisher) => void;
  statusFilter?: string;
  searchQuery?: string;
}

function getSortIcon(field: SortField, sortField: SortField, sortOrder: SortOrder) {
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
}

export function PublisherTable({
  publishers,
  selectedIds,
  sortField,
  sortOrder,
  onSelectAll,
  onSelectOne,
  onSort,
  onDelete,
  onRestore,
  statusFilter,
  searchQuery,
}: PublisherTableProps) {
  const isAllSelected = publishers.length > 0 && selectedIds.size === publishers.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < publishers.length;

  return (
    <div className="bg-white shadow rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="w-12 px-3 py-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center">
                Publisher
                {getSortIcon('name', sortField, sortOrder)}
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
              onClick={() => onSort('status')}
            >
              <div className="flex items-center">
                Status
                {getSortIcon('status', sortField, sortOrder)}
              </div>
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('createdAt')}
            >
              <div className="flex items-center">
                Created
                {getSortIcon('createdAt', sortField, sortOrder)}
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
                colSpan={6}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                {statusFilter || searchQuery
                  ? 'No publishers match your filters.'
                  : 'No publishers found. Create your first publisher to get started.'}
              </td>
            </tr>
          ) : (
            publishers.map((publisher) => (
              <PublisherTableRow
                key={publisher.id}
                publisher={publisher}
                isSelected={selectedIds.has(publisher.id)}
                onSelect={onSelectOne}
                onDelete={onDelete}
                onRestore={onRestore}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
