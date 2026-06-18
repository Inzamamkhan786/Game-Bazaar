import { useEffect, useState } from 'react';
import { ordersAPI } from '../api';
import { StatusBadge } from '../components/ui/Badge';
import Layout from '../components/layout/Layout';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);

  const fetchOrders = async (p = 1) => {
    setLoading(true);
    try {
      const res = await ordersAPI.getMyOrders({ page: p, limit: 10 });
      setOrders(res.data.data.orders);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchOrders(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">My Orders</h1>
            <p className="section-subtitle">{pagination.total} total orders</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No orders yet</h3>
            <p className="text-slate-500 mb-6">Start shopping to see your orders here</p>
            <a href="/games" className="btn-primary inline-flex">Browse Games</a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  {order.game_image ? (
                    <img src={order.game_image} alt={order.game_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gaming-gradient flex items-center justify-center text-2xl">🎮</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">{order.game_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  {order.delivery_notes && (
                    <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-lg px-2 py-1">
                      📝 {order.delivery_notes}
                    </p>
                  )}
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <span className="font-bold text-slate-900">₹{parseFloat(order.order_amount).toFixed(0)}</span>
                  <StatusBadge status={order.status} />
                  <p className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="px-4 py-2 rounded-xl border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50">← Prev</button>
                <span className="text-sm text-slate-600">Page {page} of {pagination.totalPages}</span>
                <button onClick={() => handlePageChange(page + 1)} disabled={page === pagination.totalPages} className="px-4 py-2 rounded-xl border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrdersPage;
