import { useState } from 'react';
import { Tabs, Tab, FormModal, ConfirmDialog } from '../../components/ui';

interface Module {
  id: string;
  name: string;
  code: string;
  description: string;
  enabled: boolean;
  config: Record<string, string>;
  docsUrl?: string;
  dependencies?: string[]; // List of module codes this depends on
  category: 'bidders' | 'userId' | 'rtd';
}

const BIDDER_ADAPTERS: Module[] = [
  {
    id: '1',
    name: 'AppNexus',
    code: 'appnexus',
    description: 'AppNexus (Xandr) bidder adapter for programmatic advertising.',
    enabled: true,
    config: { placementId: '12345678' },
    docsUrl: 'https://docs.prebid.org/dev-docs/bidders/appnexus.html',
    category: 'bidders',
  },
  {
    id: '2',
    name: 'Rubicon Project',
    code: 'rubicon',
    description: 'Rubicon Project bidder adapter for premium inventory.',
    enabled: false,
    config: { accountId: '', siteId: '', zoneId: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/bidders/rubicon.html',
    category: 'bidders',
  },
  {
    id: '3',
    name: 'OpenX',
    code: 'openx',
    description: 'OpenX bidder adapter for display and video advertising.',
    enabled: true,
    config: { delDomain: 'example-d.openx.net', unit: '123456' },
    docsUrl: 'https://docs.prebid.org/dev-docs/bidders/openx.html',
    category: 'bidders',
  },
  {
    id: '4',
    name: 'PubMatic',
    code: 'pubmatic',
    description: 'PubMatic bidder adapter for header bidding.',
    enabled: false,
    config: { publisherId: '', adSlot: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/bidders/pubmatic.html',
    category: 'bidders',
  },
  {
    id: '5',
    name: 'Index Exchange',
    code: 'ix',
    description: 'Index Exchange bidder adapter for real-time bidding.',
    enabled: false,
    config: { siteId: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/bidders/ix.html',
    category: 'bidders',
  },
];

const USER_ID_MODULES: Module[] = [
  {
    id: 'uid1',
    name: 'Unified ID 2.0',
    code: 'uid2',
    description: 'The Trade Desk Unified ID 2.0 for cross-device identity.',
    enabled: true,
    config: { apiBaseUrl: 'https://prod.uidapi.com' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/userid-submodules/unified2.html',
    category: 'userId',
    dependencies: ['sharedId'], // UID2 depends on SharedID for fallback
  },
  {
    id: 'uid2',
    name: 'ID5',
    code: 'id5',
    description: 'ID5 universal ID for cookieless identity resolution.',
    enabled: false,
    config: { partnerId: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/userid-submodules/id5id.html',
    category: 'userId',
  },
  {
    id: 'uid3',
    name: 'LiveRamp IdentityLink',
    code: 'identityLink',
    description: 'LiveRamp identity resolution for authenticated users.',
    enabled: false,
    config: { pid: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/userid-submodules/identitylink.html',
    category: 'userId',
    dependencies: ['sharedId'], // LiveRamp depends on SharedID
  },
  {
    id: 'uid4',
    name: 'SharedID',
    code: 'sharedId',
    description: 'Prebid shared ID for first-party identity.',
    enabled: true,
    config: { storage: 'cookie' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/userid-submodules/sharedid.html',
    category: 'userId',
  },
  {
    id: 'uid5',
    name: 'Criteo RTUS',
    code: 'criteoRtus',
    description: 'Criteo real-time user sync for retargeting.',
    enabled: false,
    config: { pubId: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/userid-submodules/criteo.html',
    category: 'userId',
  },
];

const RTD_MODULES: Module[] = [
  {
    id: 'rtd1',
    name: 'Permutive RTD',
    code: 'permutive',
    description: 'Permutive real-time data for audience targeting.',
    enabled: true,
    config: { projectId: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/permutiveRtdProvider.html',
    category: 'rtd',
  },
  {
    id: 'rtd2',
    name: 'Brand Metrics RTD',
    code: 'brandmetrics',
    description: 'Brand Metrics for attention measurement.',
    enabled: false,
    config: { scriptId: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/brandmetricsRtdProvider.html',
    category: 'rtd',
    dependencies: ['permutive'], // Brand Metrics enhances Permutive data
  },
  {
    id: 'rtd3',
    name: 'BlueKai RTD',
    code: 'bluekai',
    description: 'Oracle BlueKai for data management.',
    enabled: false,
    config: { siteId: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/bluekaiRtdProvider.html',
    category: 'rtd',
  },
  {
    id: 'rtd4',
    name: 'Greenbids RTD',
    code: 'greenbids',
    description: 'Greenbids for sustainable ad tech optimization.',
    enabled: false,
    config: { pbuid: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/greenbidsRtdProvider.html',
    category: 'rtd',
  },
  {
    id: 'rtd5',
    name: 'SirdataRTD',
    code: 'sirdata',
    description: 'Sirdata contextual and audience data.',
    enabled: true,
    config: { partnerId: '', key: '' },
    docsUrl: 'https://docs.prebid.org/dev-docs/modules/sirdataRtdProvider.html',
    category: 'rtd',
  },
];

function ModuleList({
  modules,
  allModules,
  onToggle,
  onConfigure,
  searchQuery,
  categoryLabel,
}: {
  modules: Module[];
  allModules: Module[];
  onToggle: (module: Module) => void;
  onConfigure: (module: Module) => void;
  searchQuery: string;
  categoryLabel: string;
}) {
  const filteredModules = modules.filter(
    (module) =>
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find modules that depend on a given module code
  const getDependentModules = (code: string): Module[] => {
    return allModules.filter(m => m.enabled && m.dependencies?.includes(code));
  };

  // Get dependency names for display
  const getDependencyNames = (module: Module): string[] => {
    if (!module.dependencies) return [];
    return module.dependencies.map(depCode => {
      const dep = allModules.find(m => m.code === depCode);
      return dep?.name || depCode;
    });
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">{categoryLabel}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {filteredModules.filter(m => m.enabled).length} of {filteredModules.length} modules enabled
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
        {filteredModules.map((module) => {
          const dependencyNames = getDependencyNames(module);
          const dependentModules = getDependentModules(module.code);

          return (
            <li key={module.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {module.code.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {module.name}
                      </p>
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        {module.code}
                      </span>
                      {dependencyNames.length > 0 && (
                        <span
                          className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
                          title={`Requires: ${dependencyNames.join(', ')}`}
                        >
                          <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Depends on: {dependencyNames.join(', ')}
                        </span>
                      )}
                      {dependentModules.length > 0 && module.enabled && (
                        <span
                          className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                          title={`Required by: ${dependentModules.map(m => m.name).join(', ')}`}
                        >
                          <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Required by {dependentModules.length} module{dependentModules.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {module.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 ml-4">
                  {module.docsUrl && (
                    <a
                      href={module.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title={`View ${module.name} documentation`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="sr-only">View documentation</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggle(module)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      module.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={module.enabled}
                    aria-label={`Toggle ${module.name}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        module.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfigure(module)}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Configure
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {filteredModules.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-gray-500">
          No modules found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}

export function ModulesPage() {
  const [bidders, setBidders] = useState<Module[]>(BIDDER_ADAPTERS);
  const [userIdModules, setUserIdModules] = useState<Module[]>(USER_ID_MODULES);
  const [rtdModules, setRtdModules] = useState<Module[]>(RTD_MODULES);
  const [configModal, setConfigModal] = useState<{
    isOpen: boolean;
    module: Module | null;
    category: 'bidders' | 'userId' | 'rtd' | null;
  }>({
    isOpen: false,
    module: null,
    category: null,
  });
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Dependency dialog state
  const [dependencyDialog, setDependencyDialog] = useState<{
    isOpen: boolean;
    type: 'enable' | 'disable';
    module: Module | null;
    relatedModules: Module[];
  }>({
    isOpen: false,
    type: 'enable',
    module: null,
    relatedModules: [],
  });

  // Get all modules combined for dependency resolution
  const allModules = [...bidders, ...userIdModules, ...rtdModules];

  const handleConfigureClick = (module: Module, category: 'bidders' | 'userId' | 'rtd') => {
    setConfigForm({ ...module.config });
    setConfigModal({ isOpen: true, module, category });
  };

  const handleConfigClose = () => {
    setConfigModal({ isOpen: false, module: null, category: null });
    setConfigForm({});
  };

  const handleConfigSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModal.module || !configModal.category) return;

    const updateModules = (prev: Module[]) =>
      prev.map((m) =>
        m.id === configModal.module?.id ? { ...m, config: configForm } : m
      );

    if (configModal.category === 'bidders') {
      setBidders(updateModules);
    } else if (configModal.category === 'userId') {
      setUserIdModules(updateModules);
    } else {
      setRtdModules(updateModules);
    }
    handleConfigClose();
  };

  // Get the setter function for a category
  const getSetterForCategory = (category: 'bidders' | 'userId' | 'rtd') => {
    if (category === 'bidders') return setBidders;
    if (category === 'userId') return setUserIdModules;
    return setRtdModules;
  };

  // Find unmet dependencies for a module (dependencies that are not enabled)
  const getUnmetDependencies = (module: Module): Module[] => {
    if (!module.dependencies) return [];
    return module.dependencies
      .map(depCode => allModules.find(m => m.code === depCode))
      .filter((m): m is Module => m !== undefined && !m.enabled);
  };

  // Find modules that depend on this module and are enabled
  const getDependentEnabledModules = (module: Module): Module[] => {
    return allModules.filter(m => m.enabled && m.dependencies?.includes(module.code));
  };

  // Enable a specific module by ID
  const enableModuleById = (id: string, category: 'bidders' | 'userId' | 'rtd') => {
    const setter = getSetterForCategory(category);
    setter(prev => prev.map(m => m.id === id ? { ...m, enabled: true } : m));
  };

  // Disable a specific module by ID
  const disableModuleById = (id: string, category: 'bidders' | 'userId' | 'rtd') => {
    const setter = getSetterForCategory(category);
    setter(prev => prev.map(m => m.id === id ? { ...m, enabled: false } : m));
  };

  const handleToggleModule = (module: Module) => {
    if (!module.enabled) {
      // Enabling - check for unmet dependencies
      const unmetDeps = getUnmetDependencies(module);
      if (unmetDeps.length > 0) {
        setDependencyDialog({
          isOpen: true,
          type: 'enable',
          module,
          relatedModules: unmetDeps,
        });
        return;
      }
      // No unmet dependencies, enable directly
      enableModuleById(module.id, module.category);
    } else {
      // Disabling - check for dependent modules
      const dependentModules = getDependentEnabledModules(module);
      if (dependentModules.length > 0) {
        setDependencyDialog({
          isOpen: true,
          type: 'disable',
          module,
          relatedModules: dependentModules,
        });
        return;
      }
      // No dependent modules, disable directly
      disableModuleById(module.id, module.category);
    }
  };

  const handleDependencyDialogConfirm = () => {
    if (!dependencyDialog.module) return;

    if (dependencyDialog.type === 'enable') {
      // Enable all dependencies first
      dependencyDialog.relatedModules.forEach(dep => {
        enableModuleById(dep.id, dep.category);
      });
      // Then enable the module
      enableModuleById(dependencyDialog.module.id, dependencyDialog.module.category);
    } else {
      // Disable the module (user confirmed despite warning)
      disableModuleById(dependencyDialog.module.id, dependencyDialog.module.category);
    }

    setDependencyDialog({ isOpen: false, type: 'enable', module: null, relatedModules: [] });
  };

  const handleDependencyDialogCancel = () => {
    setDependencyDialog({ isOpen: false, type: 'enable', module: null, relatedModules: [] });
  };

  const tabs: Tab[] = [
    {
      id: 'bidders',
      label: 'Bidder Adapters',
      content: (
        <ModuleList
          modules={bidders}
          allModules={allModules}
          onToggle={handleToggleModule}
          onConfigure={(m) => handleConfigureClick(m, 'bidders')}
          searchQuery={searchQuery}
          categoryLabel="Bidder Adapters"
        />
      ),
    },
    {
      id: 'userId',
      label: 'User ID Modules',
      content: (
        <ModuleList
          modules={userIdModules}
          allModules={allModules}
          onToggle={handleToggleModule}
          onConfigure={(m) => handleConfigureClick(m, 'userId')}
          searchQuery={searchQuery}
          categoryLabel="User ID Modules"
        />
      ),
    },
    {
      id: 'rtd',
      label: 'RTD Modules',
      content: (
        <ModuleList
          modules={rtdModules}
          allModules={allModules}
          onToggle={handleToggleModule}
          onConfigure={(m) => handleConfigureClick(m, 'rtd')}
          searchQuery={searchQuery}
          categoryLabel="Real-Time Data Modules"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage bidder adapters, User ID modules, and RTD modules.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="max-w-md">
          <label htmlFor="search" className="sr-only">
            Search modules
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="bidders" />

      {/* Configuration Modal */}
      <FormModal
        isOpen={configModal.isOpen}
        onClose={handleConfigClose}
        title={`Configure ${configModal.module?.name || 'Module'}`}
      >
        <form onSubmit={handleConfigSave} className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            {configModal.module?.description}
          </p>
          {configModal.module &&
            Object.keys(configModal.module.config).map((key) => (
              <div key={key}>
                <label
                  htmlFor={key}
                  className="block text-sm font-medium text-gray-700 capitalize"
                >
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="text"
                  id={key}
                  value={configForm[key] || ''}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={`Enter ${key}`}
                />
              </div>
            ))}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleConfigClose}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </FormModal>

      {/* Dependency Dialog */}
      <ConfirmDialog
        isOpen={dependencyDialog.isOpen}
        onClose={handleDependencyDialogCancel}
        onConfirm={handleDependencyDialogConfirm}
        title={
          dependencyDialog.type === 'enable'
            ? 'Enable Required Dependencies'
            : 'Warning: Module is Required'
        }
        message={
          dependencyDialog.type === 'enable'
            ? `"${dependencyDialog.module?.name}" requires the following modules to be enabled: ${dependencyDialog.relatedModules.map(m => m.name).join(', ')}. Would you like to enable them automatically?`
            : `Warning: The following modules depend on "${dependencyDialog.module?.name}" and may not work correctly if it is disabled: ${dependencyDialog.relatedModules.map(m => m.name).join(', ')}. Are you sure you want to disable it?`
        }
        confirmText={dependencyDialog.type === 'enable' ? 'Enable All' : 'Disable Anyway'}
        variant={dependencyDialog.type === 'enable' ? 'info' : 'danger'}
      />
    </div>
  );
}
