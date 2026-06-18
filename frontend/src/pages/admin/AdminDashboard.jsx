import { useEffect, useState } from 'react';
import { adminAPI, ordersAPI } from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import { StatCardSkeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';

const StatCard = ({ icon, label, value, color, change }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-2xl`}>{icon}</div>
      {change && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${change > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      )}
    </div>
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-black text-slate-900">{value}</p>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboardStats()
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { icon: '👥', label: 'Total Users', value: stats.totalUsers?.toLocaleString(), color: 'bg-blue-50' },
    { icon: '📦', label: 'Total Orders', value: stats.totalOrders?.toLocaleString(), color: 'bg-purple-50' },
    { icon: '💰', label: 'Total Revenue', value: `₹${parseFloat(stats.totalRevenue || 0).toLocaleString('en-IN')}`, color: 'bg-green-50' },
    { icon: '⏳', label: 'Pending Deliveries', value: stats.pendingDeliveries?.toLocaleString(), color: 'bg-amber-50' },
    { icon: '✅', label: 'Completed', value: stats.completedDeliveries?.toLocaleString(), color: 'bg-emerald-50' },
  ] : [];

  return (
    <AdminLayout title="Dashboard">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => <StatCard key={card.label} {...card} />)
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Orders</h3>
            <a href="/admin/orders" className="text-xs text-blue-600 hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
            ) : stats?.recentOrders?.length > 0 ? (
              stats.recentOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{order.game_name}</p>
                    <p className="text-xs text-slate-500 truncate">{order.user_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">₹{parseFloat(order.order_amount).toFixed(0)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">No orders yet</div>
            )}
          </div>
        </div>

        {/* Top Games */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Top Selling Games</h3>
            <a href="/admin/games" className="text-xs text-blue-600 hover:underline">Manage →</a>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
            ) : stats?.topGames?.length > 0 ? (
              stats.topGames.map((game, i) => (
                <div key={game.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-black text-slate-300 w-5">#{i + 1}</span>
                  <div className="w-8 h-8 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {game.image && <img src={game.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{game.game_name}</p>
                    <p className="text-xs text-slate-500">{game.order_count} orders</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">₹{parseFloat(game.revenue || 0).toFixed(0)}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">No sales yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      {stats?.monthlyRevenue?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Monthly Revenue (Last 6 Months)</h3>
          <div className="flex items-end gap-3 h-40">
            {stats.monthlyRevenue.map((m) => {
              const maxRev = Math.max(...stats.monthlyRevenue.map((x) => parseFloat(x.revenue)));
              const height = maxRev > 0 ? (parseFloat(m.revenue) / maxRev) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-slate-700">₹{(parseFloat(m.revenue) / 1000).toFixed(1)}k</p>
                  <div className="w-full bg-blue-100 rounded-t-lg transition-all" style={{ height: `${Math.max(height, 4)}%` }}>
                    <div className="w-full h-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg" />
                  </div>
                  <p className="text-xs text-slate-400 text-center whitespace-nowrap">{m.month}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
