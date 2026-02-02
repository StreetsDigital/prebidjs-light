import { SettingsSection } from './SettingsSection';

interface DatabaseInfo {
  type: string;
  path: string;
  size: string;
  lastModified: string;
  walSize?: string;
  shmSize?: string;
  tables: Array<{ name: string; count: number }>;
}

interface DatabaseSectionProps {
  dbInfo: DatabaseInfo;
  clearingCache: boolean;
  onClearCache: () => void;
}

export function DatabaseSection({ dbInfo, clearingCache, onClearCache }: DatabaseSectionProps) {
  return (
    <div className="space-y-6">
      <SettingsSection title="Database Information">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{dbInfo.type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Size</dt>
            <dd className="mt-1 text-sm text-gray-900">{dbInfo.size}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Path</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{dbInfo.path}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(dbInfo.lastModified).toLocaleString()}
            </dd>
          </div>
          {dbInfo.walSize && (
            <div>
              <dt className="text-sm font-medium text-gray-500">WAL Size</dt>
              <dd className="mt-1 text-sm text-gray-900">{dbInfo.walSize}</dd>
            </div>
          )}
          {dbInfo.shmSize && (
            <div>
              <dt className="text-sm font-medium text-gray-500">SHM Size</dt>
              <dd className="mt-1 text-sm text-gray-900">{dbInfo.shmSize}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6">
          <button
            onClick={onClearCache}
            disabled={clearingCache}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {clearingCache ? 'Clearing...' : 'Clear Cache (WAL Checkpoint)'}
          </button>
        </div>
      </SettingsSection>

      {/* Table Statistics */}
      <SettingsSection title="Table Statistics">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Record Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dbInfo.tables.map((table) => (
                <tr key={table.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </div>
  );
}
