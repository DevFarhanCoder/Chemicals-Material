import { DashboardStats } from '../types';

interface StatsPanelProps {
  stats: DashboardStats;
}

function StatsPanel({ stats }: StatsPanelProps) {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONTACTED: 'bg-blue-100 text-blue-800',
    NOT_INTERESTED: 'bg-red-100 text-red-800',
    CONVERTED: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    PENDING: 'Pending',
    CONTACTED: 'Contacted',
    NOT_INTERESTED: 'Not Interested',
    CONVERTED: 'Converted',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      {/* Total Materials */}
      <div className="card p-4">
        <div className="text-sm font-medium text-gray-500">Total Materials</div>
        <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
      </div>

      {/* Status Breakdown */}
      {Object.entries(stats.byStatus).map(([status, count]) => (
        <div key={status} className="card p-4">
          <div className="text-sm font-medium text-gray-500">
            {statusLabels[status as keyof typeof statusLabels]}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <div className="text-3xl font-bold text-gray-900">{count}</div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                statusColors[status as keyof typeof statusColors]
              }`}
            >
              {((count / stats.total) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      ))}

      {/* Recently Added */}
      <div className="card p-4">
        <div className="text-sm font-medium text-gray-500">Last 7 Days</div>
        <div className="text-3xl font-bold text-gray-900 mt-2">
          {stats.recentlyAdded}
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
