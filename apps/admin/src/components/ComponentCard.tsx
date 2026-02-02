import type { PrebidComponent, Bidder, Module } from './PrebidMarketplaceModal';

interface ComponentCardProps {
  component: PrebidComponent;
  type: 'bidder' | 'module' | 'analytics';
  isAdded: boolean;
  isAdding: boolean;
  onAdd: (component: PrebidComponent, type: 'bidder' | 'module' | 'analytics') => Promise<void>;
}

export default function ComponentCard({
  component,
  type,
  isAdded,
  isAdding,
  onAdd,
}: ComponentCardProps) {
  const isBidder = type === 'bidder';
  const isModule = type === 'module';
  const bidder = isBidder ? (component as Bidder) : null;
  const module = isModule ? (component as Module) : null;

  const handleAdd = () => {
    if (!isAdded) {
      onAdd(component, type);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{component.name}</h3>
          <p className="text-xs text-gray-500 truncate">{component.code}</p>
        </div>
        <div className="flex items-center space-x-2 ml-2">
          {component.documentation_url && (
            <a
              href={component.documentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Docs
            </a>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdded || isAdding}
            className={`text-xs px-3 py-1 rounded-md transition ${
              isAdded
                ? 'bg-green-50 text-green-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {isAdding ? 'Adding...' : isAdded ? 'Added ✓' : 'Add'}
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{component.description}</p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        {bidder?.is_built_in && (
          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
            Built-in
          </span>
        )}

        {bidder && (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              bidder.capability === 'both'
                ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                : bidder.capability === 'client'
                ? 'bg-green-50 text-green-700 ring-green-600/20'
                : 'bg-blue-50 text-blue-700 ring-blue-700/10'
            }`}
          >
            {bidder.capability === 'both'
              ? 'Client + Server'
              : bidder.capability === 'client'
              ? 'Client-side'
              : 'Server-side'}
          </span>
        )}

        {module && (
          <>
            {module.is_recommended && (
              <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                Recommended
              </span>
            )}
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              {module.category}
            </span>
          </>
        )}

        {/* Privacy compliance badges */}
        {component.privacy_compliance?.gdpr && (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            GDPR
          </span>
        )}
        {component.privacy_compliance?.coppa && (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            COPPA
          </span>
        )}
        {component.privacy_compliance?.gpp && (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            GPP
          </span>
        )}
        {component.privacy_compliance?.usp && (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            USP
          </span>
        )}

        {/* Bidder features */}
        {bidder?.features?.deals && (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
            Deals
          </span>
        )}
        {bidder?.features?.floors && (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
            Floors
          </span>
        )}
        {bidder?.features?.user_ids && (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
            User IDs
          </span>
        )}
        {bidder?.features?.first_party_data && (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
            FPD
          </span>
        )}
      </div>
    </div>
  );
}
