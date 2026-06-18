import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchUsers = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 10 };
      if (q) params.search = q;
      const res = await adminAPI.getAllUsers(params);
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <AdminLayout title="Users Management">
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="admin-user-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!e.target.value) fetchUsers(1, ''); }}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
            placeholder="Search by name, email or WhatsApp..."
            className="input-field pl-10"
          />
        </div>
        <button onClick={() => fetchUsers(1)} className="btn-primary text-sm py-2 px-4">Search</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>WhatsApp</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{[1,2,3,4,5].map((j) => <td key={j}><div className="skeleton h-4 w-full rounded" /></td>)}</tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={`https://wa.me/${user.whatsapp_number}`} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:underline">
                        +{user.whatsapp_number}
                      </a>
                    </td>
                    <td>
                      <span className={`badge text-xs ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge text-xs ${user.is_active ? 'status-delivered' : 'status-cancelled'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <p className="text-xs text-slate-500">
                        {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">Total: {pagination.total} users</p>
            <div className="flex gap-2">
              <button onClick={() => { setPage(page - 1); fetchUsers(page - 1); }} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">←</button>
              <span className="px-3 py-1.5 text-sm">Page {page} / {pagination.totalPages}</span>
              <button onClick={() => { setPage(page + 1); fetchUsers(page + 1); }} disabled={page === pagination.totalPages} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">→</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
