import { useState } from 'react';

export interface ReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reportData: ReportData) => void;
  onPreview: (reportData: ReportData) => void;
  initialData?: ReportData;
  previewLoading: boolean;
}

export interface ReportData {
  name: string;
  description: string;
  metrics: string[];
  dimensions: string[];
  dateRange: { type: string };
  exportFormat: string;
}

const AVAILABLE_METRICS = [
  { id: 'revenue', label: 'Revenue', description: 'Total revenue earned' },
  { id: 'impressions', label: 'Impressions', description: 'Number of ad impressions' },
  { id: 'cpm', label: 'CPM', description: 'Average cost per thousand impressions' },
  { id: 'fillRate', label: 'Fill Rate', description: 'Percentage of auctions won' },
  { id: 'timeoutRate', label: 'Timeout Rate', description: 'Percentage of bid timeouts' },
  { id: 'errorRate', label: 'Error Rate', description: 'Percentage of bid errors' },
  { id: 'bidCount', label: 'Bid Count', description: 'Total number of bids' },
];

const AVAILABLE_DIMENSIONS = [
  { id: 'date', label: 'Date', description: 'Group by date' },
  { id: 'hour', label: 'Hour of Day', description: 'Group by hour' },
  { id: 'bidderCode', label: 'Bidder', description: 'Group by bidder' },
  { id: 'adUnitCode', label: 'Ad Unit', description: 'Group by ad unit' },
  { id: 'deviceType', label: 'Device Type', description: 'Group by device' },
  { id: 'domain', label: 'Domain', description: 'Group by domain' },
];

export function ReportBuilder({
  isOpen,
  onClose,
  onSave,
  onPreview,
  initialData,
  previewLoading,
}: ReportBuilderProps) {
  const [reportName, setReportName] = useState(initialData?.name || '');
  const [reportDescription, setReportDescription] = useState(initialData?.description || '');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    initialData?.metrics || ['revenue', 'impressions']
  );
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(
    initialData?.dimensions || ['date']
  );
  const [dateRangeType, setDateRangeType] = useState(initialData?.dateRange?.type || 'last_7_days');
  const [exportFormat, setExportFormat] = useState(initialData?.exportFormat || 'csv');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      name: reportName,
      description: reportDescription,
      metrics: selectedMetrics,
      dimensions: selectedDimensions,
      dateRange: { type: dateRangeType },
      exportFormat,
    });
  };

  const handlePreview = () => {
    onPreview({
      name: reportName,
      description: reportDescription,
      metrics: selectedMetrics,
      dimensions: selectedDimensions,
      dateRange: { type: dateRangeType },
      exportFormat,
    });
  };

  const toggleMetric = (metricId: string, checked: boolean) => {
    if (checked) {
      setSelectedMetrics([...selectedMetrics, metricId]);
    } else {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metricId));
    }
  };

  const toggleDimension = (dimensionId: string, checked: boolean) => {
    if (checked) {
      setSelectedDimensions([...selectedDimensions, dimensionId]);
    } else {
      setSelectedDimensions(selectedDimensions.filter((d) => d !== dimensionId));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          {initialData ? 'Edit Report' : 'Create New Report'}
        </h3>

        <div className="space-y-6">
          {/* Report Name & Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="My Custom Report"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="What does this report show?"
            />
          </div>

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Metrics</label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_METRICS.map((metric) => (
                <label
                  key={metric.id}
                  className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={(e) => toggleMetric(metric.id, e.target.checked)}
                  />
                  <div>
                    <div className="font-medium text-sm">{metric.label}</div>
                    <div className="text-xs text-gray-500">{metric.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dimensions Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group By (Dimensions)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_DIMENSIONS.map((dimension) => (
                <label
                  key={dimension.id}
                  className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedDimensions.includes(dimension.id)}
                    onChange={(e) => toggleDimension(dimension.id, e.target.checked)}
                  />
                  <div>
                    <div className="font-medium text-sm">{dimension.label}</div>
                    <div className="text-xs text-gray-500">{dimension.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
            </select>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6 pt-6 border-t">
          <button
            onClick={handlePreview}
            disabled={
              previewLoading || selectedMetrics.length === 0 || selectedDimensions.length === 0
            }
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            {previewLoading ? 'Loading...' : 'Preview'}
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                !reportName || selectedMetrics.length === 0 || selectedDimensions.length === 0
              }
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
