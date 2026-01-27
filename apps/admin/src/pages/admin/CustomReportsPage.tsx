import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

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

interface ReportExecution {
  id: string;
  reportId: string;
  publisherId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  rowCount: number | null;
  outputPath: string | null;
  outputFormat: string | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  parameters: any;
}

type TabType = 'reports' | 'templates' | 'history';

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

export function CustomReportsPage() {
  const { publisherId } = useParams<{ publisherId: string }>();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<TabType>('reports');

  // State
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState<CustomReport | null>(null);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'impressions']);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['date']);
  const [dateRangeType, setDateRangeType] = useState('last_7_days');
  const [exportFormat, setExportFormat] = useState('csv');

  // Preview
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'history') fetchExecutions();
  }, [activeTab, publisherId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/custom-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/report-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/report-executions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setExecutions(data.executions || []);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    try {
      const reportData = {
        name: reportName,
        description: reportDescription,
        metrics: selectedMetrics,
        dimensions: selectedDimensions,
        filters: [],
        dateRange: { type: dateRangeType },
        visualization: null,
        schedule: null,
        exportFormat,
      };

      const url = editingReport
        ? `/api/publishers/${publisherId}/custom-reports/${editingReport.id}`
        : `/api/publishers/${publisherId}/custom-reports`;

      const method = editingReport ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      setShowBuilder(false);
      setEditingReport(null);
      resetBuilder();
      fetchReports();
    } catch (error) {
      alert('Failed to save report');
    }
  };

  const runReport = async (report: CustomReport) => {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/custom-reports/${report.id}/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggeredBy: 'manual' }),
      });
      const data = await response.json();

      if (data.status === 'completed') {
        setPreviewData(data.data);
        setShowPreview(true);
      } else {
        alert('Report execution started');
      }

      fetchReports();
      fetchExecutions();
    } catch (error) {
      alert('Failed to run report');
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      await fetch(`/api/publishers/${publisherId}/custom-reports/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchReports();
    } catch (error) {
      alert('Failed to delete report');
    }
  };

  const createFromTemplate = async (template: any) => {
    const name = prompt('Report name:');
    if (!name) return;

    try {
      await fetch(`/api/publishers/${publisherId}/report-templates/${template.id}/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      setActiveTab('reports');
      fetchReports();
    } catch (error) {
      alert('Failed to create report');
    }
  };

  const previewReport = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/custom-reports/preview`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: selectedMetrics,
          dimensions: selectedDimensions,
          filters: [],
          dateRange: { type: dateRangeType },
        }),
      });
      const data = await response.json();
      setPreviewData(data.data);
      setShowPreview(true);
    } catch (error) {
      alert('Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const resetBuilder = () => {
    setReportName('');
    setReportDescription('');
    setSelectedMetrics(['revenue', 'impressions']);
    setSelectedDimensions(['date']);
    setDateRangeType('last_7_days');
    setExportFormat('csv');
  };

  const openBuilder = (report?: CustomReport) => {
    if (report) {
      setEditingReport(report);
      setReportName(report.name);
      setReportDescription(report.description || '');
      setSelectedMetrics(report.metrics);
      setSelectedDimensions(report.dimensions);
      setDateRangeType(report.dateRange.type);
      setExportFormat(report.exportFormat);
    } else {
      setEditingReport(null);
      resetBuilder();
    }
    setShowBuilder(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Report Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create custom reports with flexible metrics, dimensions, and filters
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to={`/admin/publishers/${publisherId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Back to Publisher
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'reports' as TabType, label: 'My Reports', icon: '📊' },
            { id: 'templates' as TabType, label: 'Templates', icon: '📋' },
            { id: 'history' as TabType, label: 'Run History', icon: '🕐' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Your Custom Reports</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Reports you've created and saved
                    </p>
                  </div>
                  <button
                    onClick={() => openBuilder()}
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
                            onClick={() => runReport(report)}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                          >
                            Run
                          </button>
                          <button
                            onClick={() => openBuilder(report)}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteReport(report.id)}
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
            )}

            {/* TEMPLATES TAB */}
            {activeTab === 'templates' && (
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
                        onClick={() => createFromTemplate(template)}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Use This Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Report Execution History</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Track all report runs and their status
                  </p>
                </div>

                {executions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No executions yet</p>
                    <p className="mt-1">Run a report to see execution history here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Report
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Started
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rows
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Triggered By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {executions.map((execution) => {
                          const report = reports.find(r => r.id === execution.reportId);
                          return (
                            <tr key={execution.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {report?.name || execution.reportId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  execution.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : execution.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {execution.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(execution.startedAt).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {execution.duration ? `${(execution.duration / 1000).toFixed(1)}s` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {execution.rowCount || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {execution.triggeredBy || 'unknown'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* REPORT BUILDER MODAL */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              {editingReport ? 'Edit Report' : 'Create New Report'}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
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
                    <label key={metric.id} className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMetrics([...selectedMetrics, metric.id]);
                          } else {
                            setSelectedMetrics(selectedMetrics.filter(m => m !== metric.id));
                          }
                        }}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Group By (Dimensions)</label>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_DIMENSIONS.map((dimension) => (
                    <label key={dimension.id} className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedDimensions.includes(dimension.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDimensions([...selectedDimensions, dimension.id]);
                          } else {
                            setSelectedDimensions(selectedDimensions.filter(d => d !== dimension.id));
                          }
                        }}
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
                onClick={previewReport}
                disabled={previewLoading || selectedMetrics.length === 0 || selectedDimensions.length === 0}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
              >
                {previewLoading ? 'Loading...' : 'Preview'}
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowBuilder(false);
                    setEditingReport(null);
                    resetBuilder();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveReport}
                  disabled={!reportName || selectedMetrics.length === 0 || selectedDimensions.length === 0}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Report Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>

            {previewData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No data available for this report</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.slice(0, 50).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((value: any, colIdx) => (
                          <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 50 && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Showing first 50 of {previewData.length} rows
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6 pt-6 border-t">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
