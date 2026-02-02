interface EscalationPolicy {
  id: string;
  name: string;
  description: string | null;
  levels: Array<{ delayMinutes: number; channels: string[] }>;
  enabled: boolean;
}

interface EscalationPolicyCardProps {
  policy: EscalationPolicy;
}

export function EscalationPolicyCard({ policy }: EscalationPolicyCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
          {policy.description && (
            <p className="text-sm text-gray-600 mt-1">{policy.description}</p>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          policy.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {policy.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Escalation Levels:</h4>
        {policy.levels.map((level, idx) => (
          <div key={idx} className="flex items-center space-x-4 text-sm">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="font-semibold text-blue-600">{idx + 1}</span>
            </div>
            <div className="flex-1">
              <p className="text-gray-900">
                After <span className="font-medium">{level.delayMinutes} minutes</span>
              </p>
              <p className="text-gray-600">
                Notify {level.channels.length} channel(s)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
