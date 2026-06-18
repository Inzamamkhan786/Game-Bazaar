import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authAPI } from '../api';
import { ordersAPI } from '../api';
import { updateUser } from '../store/slices/authSlice';
import { StatusBadge } from '../components/ui/Badge';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', whatsappNumber: '' });
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    authAPI.getProfile().then((res) => {
      setProfile(res.data.data);
      setForm({ name: res.data.data.name, whatsappNumber: res.data.data.whatsapp_number });
    }).catch(console.error);

    ordersAPI.getMyOrders({ limit: 5 }).then((res) => {
      setOrders(res.data.data.orders || []);
    }).catch(console.error).finally(() => setLoadingOrders(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      dispatch(updateUser(res.data.data));
      setProfile((p) => ({ ...p, ...res.data.data }));
      setEditMode(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="section-title mb-8">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <h2 className="font-bold text-slate-900 text-lg">{profile?.name || user?.name}</h2>
              <p className="text-slate-500 text-sm mt-1">{profile?.email || user?.email}</p>
              <div className="mt-3">
                <span className={`badge ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user?.role === 'ADMIN' ? '👑 Admin' : '🎮 Gamer'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{profile?.total_orders || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{profile?.delivered_orders || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Delivered</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-900">Account Details</h3>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} id="edit-profile-btn" className="btn-secondary text-sm py-1.5 px-4">Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditMode(false)} className="text-sm px-4 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving} id="save-profile-btn" className="btn-primary text-sm py-1.5 px-4">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Full Name', key: 'name', editable: true },
                  { label: 'Email Address', key: 'email', editable: false },
                  { label: 'WhatsApp Number', key: 'whatsapp_number', formKey: 'whatsappNumber', editable: true },
                ].map(({ label, key, formKey, editable }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
                    {editMode && editable ? (
                      <input
                        id={`profile-${key}`}
                        type="text"
                        value={form[formKey || key] || ''}
                        onChange={(e) => setForm((p) => ({ ...p, [formKey || key]: e.target.value }))}
                        className="input-field mt-1.5"
                      />
                    ) : (
                      <p className="text-slate-800 font-medium mt-1">{profile?.[key] || user?.[key] || '-'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-5">Recent Orders</h3>
              {loadingOrders ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-sm">No orders yet. Start shopping!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                        {order.game_image && <img src={order.game_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{order.game_name}</p>
                        <p className="text-xs text-slate-500">₹{order.order_amount}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  ))}
                  <a href="/orders" className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-2">
                    View all orders →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
