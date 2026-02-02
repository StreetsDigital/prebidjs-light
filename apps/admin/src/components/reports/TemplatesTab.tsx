export interface TemplatesTabProps {
  templates: any[];
  onUseTemplate: (template: any) => void;
}

export function TemplatesTab({ templates, onUseTemplate }: TemplatesTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Report Templates</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pre-built report configurations to get started quickly
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              </div>
              {template.isBuiltIn && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                  Built-in
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Metrics:</span>{' '}
                <span className="text-gray-900">{template.metrics.join(', ')}</span>
              </div>
              <div>
                <span className="text-gray-500">Dimensions:</span>{' '}
                <span className="text-gray-900">{template.dimensions.join(', ')}</span>
              </div>
            </div>

            <button
              onClick={() => onUseTemplate(template)}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Use This Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
