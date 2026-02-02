interface CustomReport {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  metrics: string[];
  dimensions: string[];
  filters: any[];
  dateRange: any;
  visualization: any;
  schedule: any;
  exportFormat: string;
  isTemplate: boolean;
  isPublic: boolean;
  createdBy: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportsTabProps {
  reports: CustomReport[];
  onCreateNew: () => void;
  onEdit: (report: CustomReport) => void;
  onRun: (report: CustomReport) => void;
  onDelete: (reportId: string) => void;
}

export function ReportsTab({ reports, onCreateNew, onEdit, onRun, onDelete }: ReportsTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Your Custom Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Reports you've created and saved</p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          + Create Report
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No reports yet</p>
          <p className="mt-1">Create your first custom report or start from a template</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
            >
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{report.name}</h3>
                {report.description && (
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                )}
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">Metrics:</span>
                  <span className="text-gray-900">{report.metrics.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">Dimensions:</span>
                  <span className="text-gray-900">{report.dimensions.join(', ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">Run count:</span>
                  <span className="text-gray-900">{report.runCount}</span>
                </div>
                {report.lastRunAt && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">Last run:</span>
                    <span className="text-gray-900 text-xs">
                      {new Date(report.lastRunAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => onRun(report)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Run
                </button>
                <button
                  onClick={() => onEdit(report)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(report.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
