interface Website {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'disabled';
  notes: string | null;
  adUnitCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WebsitesTabProps {
  websites: Website[];
  onAddWebsite: () => void;
  onEditWebsite: (website: Website) => void;
  onDeleteWebsite: (website: Website) => void;
}

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

export function WebsitesTab({
  websites,
  onAddWebsite,
  onEditWebsite,
  onDeleteWebsite
}: WebsitesTabProps) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Websites</h2>
          <p className="text-sm text-gray-500">
            Manage websites for this publisher. Each website can contain multiple ad units.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddWebsite}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
          Add Website
        </button>
      </div>

      {websites.length === 0 ? (
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
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No websites</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a website for this publisher.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((website) => (
            <div
              key={website.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{website.name}</h3>
                  <p className="text-sm text-gray-500 truncate">
                    <code className="bg-gray-100 px-1 rounded">{website.domain}</code>
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  {getStatusBadge(website.status)}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {website.adUnitCount} ad unit{website.adUnitCount !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onEditWebsite(website)}
                    className="text-blue-500 hover:text-blue-700"
                    title="Edit website"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteWebsite(website)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete website"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {website.notes && (
                <p className="mt-2 text-xs text-gray-400 truncate">{website.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
