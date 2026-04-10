import { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart3, Download, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function StatisticsPage() {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<any[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const defaultFilters = {
    groupByX: 'day',
    groupByY: '',
    userId: '',
    category: '',
    difficulty: '',
    day: '',
    dateFrom: '',
    dateTo: '',
  };

  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    fetchStatistics();
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const allUsers: { id: string; username: string }[] = [];
      let page = 1;
      let pages = 1;

      while (page <= pages) {
        const data = await api.getUsers({ page, limit: 100 });
        allUsers.push(...data.users.map((u) => ({ id: u.id, username: u.username })));
        pages = data.pagination.pages || 1;
        page += 1;
      }

      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const loadStatistics = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const data = await api.getStatistics({
        groupByX: currentFilters.groupByX || undefined,
        groupByY: currentFilters.groupByY || undefined,
        userId: currentFilters.userId || undefined,
        category: currentFilters.category || undefined,
        difficulty: currentFilters.difficulty || undefined,
        day: currentFilters.day || undefined,
        dateFrom: currentFilters.dateFrom || undefined,
        dateTo: currentFilters.dateTo || undefined,
      });
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    await loadStatistics(filters);
  };

  const handleExport = async () => {
    try {
      await api.exportData();
    } catch (error) {
      alert('Failed to export data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (confirm('This will replace all existing data. Continue?')) {
        await api.importData(data);
        alert('Data imported successfully');
        window.location.reload();
      }
    } catch (error) {
      alert('Failed to import data');
    }
  };

  const chartData = statistics.map((stat, index) => ({
    id: index,
    label: stat.y !== undefined
      ? `${stat.x || 'N/A'} • ${stat.y || 'N/A'}`
      : (stat.x || 'Total'),
    value: Number(stat.count ?? stat.total ?? 0),
  }));
  const maxChartValue = Math.max(...chartData.map((item) => item.value), 0);
  const points = chartData
    .map((item, index) => {
      const x = chartData.length < 2 ? 50 : (index / (chartData.length - 1)) * 100;
      const y = maxChartValue === 0 ? 100 : 100 - ((item.value / maxChartValue) * 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
          Statistics & Analytics
        </h1>

        {user?.role === 'admin' && (
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="w-5 h-5" />
              <span>Export All Data</span>
            </button>

            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
              <Upload className="w-5 h-5" />
              <span>Import Data</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customize Statistics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis (Group By)</label>
            <select
              value={filters.groupByX}
              onChange={(e) => setFilters({ ...filters, groupByX: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None (Total)</option>
                <option value="category">Category</option>
                <option value="difficulty">Difficulty</option>
                <option value="exercise">Exercise</option>
                <option value="user">User</option>
                <option value="day">Day</option>
              </select>
            </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis (Group By)</label>
            <select
              value={filters.groupByY}
              onChange={(e) => setFilters({ ...filters, groupByY: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Count Only (Total)</option>
                <option value="category">Category</option>
                <option value="difficulty">Difficulty</option>
                <option value="exercise">Exercise</option>
                <option value="user">User</option>
                <option value="day">Day</option>
              </select>
            </div>
        </div>

        <div className="border-t pt-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Data</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Users</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="Relaxation">Relaxation</option>
                <option value="Sleep">Sleep</option>
                <option value="Energy">Energy</option>
                <option value="Focus">Focus</option>
                <option value="Therapeutic">Therapeutic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <input
                type="date"
                value={filters.day}
                onChange={(e) => setFilters({ ...filters, day: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={fetchStatistics}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate Statistics
          </button>
          <button
            onClick={() => {
              setFilters(defaultFilters);
              loadStatistics(defaultFilters);
            }}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {chartData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Chart</h3>
                <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1 text-sm ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-3 py-1 text-sm ${chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                  >
                    Line
                  </button>
                </div>
              </div>

              {chartType === 'bar' ? (
                <div className="space-y-3">
                  {chartData.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span className="truncate pr-2">{item.label}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded">
                        <div
                          className="h-3 bg-blue-500 rounded"
                          style={{ width: `${maxChartValue === 0 ? 0 : (item.value / maxChartValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : chartData.length < 2 ? (
                <div className="text-sm text-gray-500">
                  Need at least 2 points to draw a line chart. Try a broader filter or different grouping.
                </div>
              ) : (
                <div className="space-y-3">
                  <svg viewBox="0 0 100 100" className="w-full h-56 bg-gray-50 rounded">
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.5"
                      points={points}
                    />
                  </svg>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-600">
                    {chartData.map((item) => (
                      <div key={item.id} className="truncate">
                        {item.label}: <span className="font-semibold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Results Table</h3>
            </div>

            {statistics.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No data available. Adjust your filters and try again.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {filters.groupByX && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {filters.groupByX}
                        </th>
                      )}
                      {filters.groupByY && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {filters.groupByY}
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statistics.map((stat, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {stat.x !== undefined && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.x || 'N/A'}
                          </td>
                        )}
                        {stat.y !== undefined && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.y || 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                          {stat.count || stat.total || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {statistics.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Total records: <span className="font-semibold">{statistics.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
