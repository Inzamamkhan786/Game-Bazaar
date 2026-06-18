import { useEffect, useState } from 'react';
import { gamesAPI } from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
const CATEGORIES = ['Action','Adventure','RPG','Sports','Strategy','FPS','Racing','Simulation','Horror','Indie','Sandbox','Fighting'];

const emptyForm = {
  gameName: '', description: '', features: '',
  originalPrice: '', salePrice: '', category: '',
  availability: true, isFeatured: false, isTrending: false,
};

const AdminGames = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGames = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await gamesAPI.getAll({ page: p, limit: 10, search: q });
      setGames(res.data.data.games || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchGames(); }, []);

  const openAdd = () => {
    setEditGame(null);
    setForm(emptyForm);
    setImages([]);
    setPreviews([]);
    setPanelOpen(true);
  };

  const openEdit = (game) => {
    setEditGame(game);
    setForm({
      gameName: game.game_name,
      description: game.description,
      features: (game.features || []).join('\n'),
      originalPrice: game.original_price,
      salePrice: game.sale_price,
      category: game.category,
      availability: game.availability,
      isFeatured: game.is_featured,
      isTrending: game.is_trending,
    });
    setImages([]);
    setPreviews([]);
    setPanelOpen(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'features') {
          v.split('\n').filter(Boolean).forEach(f => fd.append('features', f));
        } else { fd.append(k, v); }
      });
      images.forEach(img => fd.append('images', img));
      if (editGame) {
        await gamesAPI.update(editGame.id, fd);
        toast.success('Game updated successfully!');
      } else {
        await gamesAPI.create(fd);
        toast.success('Game added successfully!');
      }
      setPanelOpen(false);
      fetchGames(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save game');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await gamesAPI.delete(deleteConfirm);
      toast.success('Game deleted');
      setDeleteConfirm(null);
      fetchGames(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete game');
    } finally { setDeleting(false); }
  };

  const toggleAvailability = async (game) => {
    try {
      const fd = new FormData();
      fd.append('availability', !game.availability);
      await gamesAPI.update(game.id, fd);
      toast.success(`Game ${!game.availability ? 'enabled' : 'disabled'}`);
      fetchGames(page);
    } catch { toast.error('Update failed'); }
  };

  const discount = form.originalPrice && form.salePrice
    ? Math.round(((form.originalPrice - form.salePrice) / form.originalPrice) * 100)
    : 0;

  return (
    <AdminLayout title="Games Management">
      <div className="flex flex-col xl:flex-row gap-6">

        {/* ── LEFT: Game List ── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="admin-game-search"
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); if (!e.target.value) fetchGames(1, ''); }}
                onKeyDown={e => e.key === 'Enter' && fetchGames(1)}
                placeholder="Search games..."
                className="input-field pl-10"
              />
            </div>
            <button
              id="add-game-btn"
              onClick={openAdd}
              className="btn-primary whitespace-nowrap gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add New Game
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total Games', value: pagination.total || 0, color: 'bg-blue-50 text-blue-700' },
              { label: 'Available', value: games.filter(g => g.availability).length, color: 'bg-green-50 text-green-700' },
              { label: 'Featured', value: games.filter(g => g.is_featured).length, color: 'bg-amber-50 text-amber-700' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-2xl p-4 text-center`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-medium mt-0.5 opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {[1,2,3,4,5].map(j => <td key={j}><div className="skeleton h-4 w-full rounded" /></td>)}
                      </tr>
                    ))
                  ) : games.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-slate-400">
                        <div className="text-4xl mb-3">🎮</div>
                        <p className="font-medium">No games found</p>
                        <p className="text-sm mt-1">Add your first game using the button above</p>
                      </td>
                    </tr>
                  ) : (
                    games.map(game => (
                      <tr key={game.id} className={editGame?.id === game.id ? 'bg-blue-50' : ''}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                              {game.images?.[0]
                                ? <img src={`${API_BASE}/${game.images[0]}`} alt={game.game_name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                                : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>
                              }
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 max-w-[180px] truncate">{game.game_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {game.is_featured && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">⭐ Featured</span>}
                                {game.is_trending && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">🔥 Trending</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-slate-100 text-slate-600 text-xs">{game.category}</span></td>
                        <td>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">₹{parseFloat(game.sale_price).toFixed(0)}</p>
                            <p className="text-xs text-slate-400 line-through">₹{parseFloat(game.original_price).toFixed(0)}</p>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => toggleAvailability(game)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${game.availability ? 'bg-green-500' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${game.availability ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              id={`edit-game-${game.id}`}
                              onClick={() => openEdit(game)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                            >Edit</button>
                            <button
                              id={`delete-game-${game.id}`}
                              onClick={() => setDeleteConfirm(game.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors"
                            >Delete</button>
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
                <p className="text-sm text-slate-500">{pagination.total} games total</p>
                <div className="flex gap-2">
                  <button onClick={() => { setPage(p => p-1); fetchGames(page-1); }} disabled={page===1} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">← Prev</button>
                  <span className="px-3 py-1.5 text-sm font-medium">{page} / {pagination.totalPages}</span>
                  <button onClick={() => { setPage(p => p+1); fetchGames(page+1); }} disabled={page===pagination.totalPages} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-slate-50">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Add/Edit Panel ── */}
        {panelOpen && (
          <div className="w-full xl:w-[420px] xl:flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">
                    {editGame ? 'Edit Game' : '➕ Add New Game'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editGame ? `Editing: ${editGame.game_name}` : 'Fill in game details below'}
                  </p>
                </div>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >✕</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Game Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Game Name *</label>
                  <input
                    id="game-name-input"
                    type="text"
                    required
                    value={form.gameName}
                    onChange={e => set('gameName', e.target.value)}
                    className="input-field"
                    placeholder="e.g. Cyberpunk 2077"
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Original Price (₹) *</label>
                    <input
                      id="game-original-price"
                      type="number" step="0.01" min="0" required
                      value={form.originalPrice}
                      onChange={e => set('originalPrice', e.target.value)}
                      className="input-field"
                      placeholder="3499"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Sale Price (₹) *</label>
                    <input
                      id="game-sale-price"
                      type="number" step="0.01" min="0" required
                      value={form.salePrice}
                      onChange={e => set('salePrice', e.target.value)}
                      className="input-field"
                      placeholder="699"
                    />
                  </div>
                </div>
                {discount > 0 && (
                  <div className="flex items-center gap-2 -mt-2">
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      🎉 {discount}% OFF — Customer saves ₹{(form.originalPrice - form.salePrice).toFixed(0)}
                    </span>
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Category *</label>
                  <select
                    id="game-category"
                    required
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Description *</label>
                  <textarea
                    id="game-description"
                    required
                    rows={3}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    className="input-field resize-none"
                    placeholder="Write a compelling game description..."
                  />
                </div>

                {/* Features */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Features <span className="normal-case font-normal text-slate-400">(one per line)</span>
                  </label>
                  <textarea
                    id="game-features"
                    rows={3}
                    value={form.features}
                    onChange={e => set('features', e.target.value)}
                    className="input-field resize-none"
                    placeholder={"Open world gameplay\n4K graphics\nMultiplayer support"}
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Game Images <span className="normal-case font-normal text-slate-400">(up to 5)</span>
                  </label>
                  <label
                    htmlFor="game-images-input"
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                  >
                    <svg className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-slate-400 group-hover:text-blue-500 font-medium">Click to upload images</p>
                    <p className="text-xs text-slate-300 mt-0.5">PNG, JPG, WEBP up to 5MB each</p>
                    <input
                      id="game-images-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {/* New image previews */}
                  {previews.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {previews.map((src, i) => (
                        <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border-2 border-blue-200 relative">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <span className="absolute inset-0 bg-blue-600/10" />
                        </div>
                      ))}
                      <p className="text-xs text-slate-400 self-center">{previews.length} new image(s)</p>
                    </div>
                  )}

                  {/* Existing images when editing */}
                  {editGame?.images?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-400 mb-2">Existing images:</p>
                      <div className="flex gap-2 flex-wrap">
                        {editGame.images.map((img, i) => (
                          <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200">
                            <img src={`${API_BASE}/${img}`} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggles */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settings</p>
                  {[
                    { key: 'availability', label: 'Available for Purchase', desc: 'Show this game to customers', color: 'text-green-600' },
                    { key: 'isFeatured', label: 'Featured Game', desc: 'Shown in the Featured section', color: 'text-amber-600' },
                    { key: 'isTrending', label: 'Trending', desc: 'Shown in Trending section', color: 'text-red-500' },
                  ].map(({ key, label, desc, color }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer gap-3">
                      <div>
                        <p className={`text-sm font-medium ${form[key] ? color : 'text-slate-700'}`}>{label}</p>
                        <p className="text-xs text-slate-400">{desc}</p>
                      </div>
                      <div
                        onClick={() => set(key, !form[key])}
                        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors cursor-pointer ${form[key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </label>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="flex-1 btn-secondary justify-center py-3 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    id="game-submit-btn"
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary justify-center py-3 text-sm"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2"><div className="spinner w-4 h-4" /> Saving...</span>
                    ) : editGame ? 'Update Game' : 'Add Game'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Delete this game?</h3>
            <p className="text-slate-500 text-sm mb-6">This action cannot be undone. Games with pending orders cannot be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button
                id="confirm-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminGames;
