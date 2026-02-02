import { Link, useLocation } from 'react-router-dom';
import { Publisher } from '../../types/publisher';

interface PublisherTableRowProps {
  publisher: Publisher;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onDelete: (publisher: Publisher) => void;
  onRestore: (publisher: Publisher) => void;
}

function getStatusBadge(status: string, isDeleted: boolean = false) {
  if (isDeleted) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
        deleted
      </span>
    );
  }
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
}

export function PublisherTableRow({
  publisher,
  isSelected,
  onSelect,
  onDelete,
  onRestore,
}: PublisherTableRowProps) {
  const location = useLocation();

  return (
    <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="w-12 px-3 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(publisher.id, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {publisher.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-4 min-w-0 max-w-[250px]">
            <div className="text-sm font-medium text-gray-900 truncate" title={publisher.name}>
              {publisher.name}
            </div>
            <div className="text-sm text-gray-500 truncate" title={publisher.slug}>
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
        {getStatusBadge(publisher.status, !!publisher.deletedAt)}
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
        {publisher.deletedAt ? (
          <button
            type="button"
            onClick={() => onRestore(publisher)}
            className="text-green-600 hover:text-green-900"
          >
            Restore
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(publisher)}
            className="text-red-600 hover:text-red-900"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}
