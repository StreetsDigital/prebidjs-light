import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ReportBuilder, ReportData } from '../../components/ReportBuilder';
import { ReportPreview } from '../../components/ReportPreview';
import { ReportsTab } from '../../components/reports/ReportsTab';
import { TemplatesTab } from '../../components/reports/TemplatesTab';
import { HistoryTab } from '../../components/reports/HistoryTab';

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

  // Preview state
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

  const saveReport = async (reportData: ReportData) => {
    try {
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

  const previewReport = async (reportData: ReportData) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/custom-reports/preview`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: reportData.metrics,
          dimensions: reportData.dimensions,
          filters: [],
          dateRange: reportData.dateRange,
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

  const openBuilder = (report?: CustomReport) => {
    if (report) {
      setEditingReport(report);
    } else {
      setEditingReport(null);
    }
    setShowBuilder(true);
  };

  const closeBuilder = () => {
    setShowBuilder(false);
    setEditingReport(null);
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
            {activeTab === 'reports' && (
              <ReportsTab
                reports={reports}
                onCreateNew={() => openBuilder()}
                onEdit={openBuilder}
                onRun={runReport}
                onDelete={deleteReport}
              />
            )}

            {activeTab === 'templates' && (
              <TemplatesTab templates={templates} onUseTemplate={createFromTemplate} />
            )}

            {activeTab === 'history' && (
              <HistoryTab executions={executions} reports={reports} />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ReportBuilder
        isOpen={showBuilder}
        onClose={closeBuilder}
        onSave={saveReport}
        onPreview={previewReport}
        initialData={
          editingReport
            ? {
                name: editingReport.name,
                description: editingReport.description || '',
                metrics: editingReport.metrics,
                dimensions: editingReport.dimensions,
                dateRange: editingReport.dateRange,
                exportFormat: editingReport.exportFormat,
              }
            : undefined
        }
        previewLoading={previewLoading}
      />

      <ReportPreview isOpen={showPreview} onClose={() => setShowPreview(false)} data={previewData} />
    </div>
  );
}
