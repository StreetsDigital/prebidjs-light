import { SettingsSection } from './SettingsSection';

interface SystemConfig {
  environment: string;
  apiPort: string | number;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  database: {
    type: string;
    path: string;
  };
  wrapper: {
    path: string;
    cacheControl: string;
  };
}

interface ConfigurationSectionProps {
  config: SystemConfig;
}

export function ConfigurationSection({ config }: ConfigurationSectionProps) {
  return (
    <SettingsSection title="System Configuration">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-gray-500">Environment</dt>
          <dd className="mt-1 text-sm text-gray-900">{config.environment}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">API Port</dt>
          <dd className="mt-1 text-sm text-gray-900">{config.apiPort}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">CORS Enabled</dt>
          <dd className="mt-1 text-sm text-gray-900">{config.cors.enabled ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">CORS Origins</dt>
          <dd className="mt-1 text-sm text-gray-900">{config.cors.origins.join(', ')}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Database Type</dt>
          <dd className="mt-1 text-sm text-gray-900">{config.database.type}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Database Path</dt>
          <dd className="mt-1 text-sm text-gray-900 font-mono">{config.database.path}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Wrapper Path</dt>
          <dd className="mt-1 text-sm text-gray-900 font-mono">{config.wrapper.path}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Wrapper Cache Control</dt>
          <dd className="mt-1 text-sm text-gray-900">{config.wrapper.cacheControl}</dd>
        </div>
      </dl>
    </SettingsSection>
  );
}
