import { TrendingUp, Activity, DollarSign, Target } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

function MetricCard({ label, value, icon: Icon, iconColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <Icon className={`w-10 h-10 ${iconColor}`} />
      </div>
    </div>
  );
}

interface Totals {
  revenue: number;
  impressions: number;
  avgCpm: number;
  winRate: number;
}

interface DashboardMetricsProps {
  totals: Totals;
}

export function DashboardMetrics({ totals }: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Revenue"
        value={`$${totals.revenue.toFixed(2)}`}
        icon={DollarSign}
        iconColor="text-green-600"
      />
      <MetricCard
        label="Impressions"
        value={totals.impressions.toLocaleString()}
        icon={TrendingUp}
        iconColor="text-blue-600"
      />
      <MetricCard
        label="Avg CPM"
        value={`$${totals.avgCpm.toFixed(2)}`}
        icon={Target}
        iconColor="text-purple-600"
      />
      <MetricCard
        label="Win Rate"
        value={`${totals.winRate.toFixed(1)}%`}
        icon={Activity}
        iconColor="text-orange-600"
      />
    </div>
  );
}
