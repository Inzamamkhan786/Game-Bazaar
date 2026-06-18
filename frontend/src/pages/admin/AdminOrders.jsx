import { useEffect, useState } from 'react';
import { ordersAPI } from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [statusModal, setStatusModal] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: '', deliveryNotes: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchOrders = async (p = 1, f = filters) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 10, ...f };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await ordersAPI.getAllOrders(params);
      setOrders(res.data.data.orders);
      setPagination(res.data.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    fetchOrders(1, newFilters);
  };

  const handleOpenStatus = (order) => {
    setStatusModal(order);
    setStatusForm({ status: order.status, deliveryNotes: order.delivery_notes || '' });
  };

  const handleUpdateStatus = async () => {
    if (!statusModal) return;
    setUpdatingStatus(true);
    try {
      await ordersAPI.updateOrderStatus(statusModal.id, statusForm);
      toast.success('Order status updated');
      setStatusModal(null);
      fetchOrders(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setUpdatingStatus(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await ordersAPI.exportCSV(filters.status ? { status: filters.status } : {});
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  return (
    <AdminLayout title="Orders Management">
      {/* Filters + Export */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="admin-order-search"
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search by customer, game, order ID..."
            className="input-field pl-10"
          />
        </div>
        <select
          id="admin-order-status-filter"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          id="export-csv-btn"
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary whitespace-nowrap text-sm py-2"
        >
          {exporting ? 'Exporting...' : '⬇️ Export CSV'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Game</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{[1,2,3,4,5,6,7].map((j) => <td key={j}><div className="skeleton h-4 w-full rounded" /></td>)}</tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No orders found</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <p className="text-xs font-mono text-slate-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{order.user_name}</p>
                        <p className="text-xs text-slate-400">{order.user_email}</p>
                        <p className="text-xs text-green-600">+{order.user_whatsapp}</p>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-slate-700 max-w-[150px] truncate">{order.game_name}</p>
                    </td>
                    <td>
                      <p className="font-bold text-slate-900">₹{parseFloat(order.order_amount).toFixed(0)}</p>
                    </td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>
                      <p className="text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        {order.user_whatsapp && (
                          <a
                            href={`https://wa.me/${order.user_whatsapp}?text=${encodeURIComponent(`Hi! Your order #${order.id.slice(0,8).toUpperCase()} for *${order.game_name}* is ready. Here is your game file 🎮`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors whitespace-nowrap"
                            title="Send game via WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Send Game
                          </a>
                        )}
                        <button
                          id={`update-status-${order.id}`}
                          onClick={() => handleOpenStatus(order)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium whitespace-nowrap"
                        >
                          Update Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">Total: {pagination.total} orders</p>
            <div className="flex gap-2">
              <button onClick={() => { setPage(page - 1); fetchOrders(page - 1); }} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">←</button>
              <span className="px-3 py-1.5 text-sm">Page {page} / {pagination.totalPages}</span>
              <button onClick={() => { setPage(page + 1); fetchOrders(page + 1); }} disabled={page === pagination.totalPages} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Update Order Status</h3>
            <p className="text-sm text-slate-500 mb-5">Order #{statusModal.id.slice(0, 8).toUpperCase()} · {statusModal.game_name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</label>
                <select
                  id="order-status-select"
                  value={statusForm.status}
                  onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value }))}
                  className="input-field"
                >
                  <option value="PENDING">Pending Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Delivery Notes (optional)</label>
                <textarea
                  id="delivery-notes-input"
                  rows={3}
                  value={statusForm.deliveryNotes}
                  onChange={(e) => setStatusForm((p) => ({ ...p, deliveryNotes: e.target.value }))}
                  className="input-field resize-none"
                  placeholder="Add notes about delivery, account credentials info, etc."
                />
              </div>

              {statusModal.user_whatsapp && (
                <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-green-600">📱</span>
                  <div>
                    <p className="text-xs font-medium text-green-700">Customer WhatsApp</p>
                    <a href={`https://wa.me/${statusModal.user_whatsapp}`} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:underline">+{statusModal.user_whatsapp}</a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStatusModal(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button
                id="save-status-btn"
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="flex-1 btn-primary py-2.5 text-sm justify-center"
              >
                {updatingStatus ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrders;
