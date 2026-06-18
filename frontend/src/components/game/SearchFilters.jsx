import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilters, resetFilters } from '../../store/slices/gameSlice';

const SearchFilters = ({ categories = [], onSearch }) => {
  const dispatch = useDispatch();
  const filters = useSelector((s) => s.games.filters);
  const [local, setLocal] = useState(filters);

  const handleChange = (e) => {
    setLocal((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(setFilters(local));
    if (onSearch) onSearch(local);
  };

  const handleReset = () => {
    const empty = { search: '', category: '', minPrice: '', maxPrice: '', availability: 'true' };
    setLocal(empty);
    dispatch(resetFilters());
    if (onSearch) onSearch(empty);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="search-input"
            name="search"
            type="text"
            value={local.search}
            onChange={handleChange}
            placeholder="Search games..."
            className="input-field pl-10"
          />
        </div>

        {/* Category */}
        <select
          id="category-filter"
          name="category"
          value={local.category}
          onChange={handleChange}
          className="input-field"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Min Price */}
        <input
          id="min-price-filter"
          name="minPrice"
          type="number"
          min="0"
          value={local.minPrice}
          onChange={handleChange}
          placeholder="Min ₹"
          className="input-field"
        />

        {/* Max Price */}
        <input
          id="max-price-filter"
          name="maxPrice"
          type="number"
          min="0"
          value={local.maxPrice}
          onChange={handleChange}
          placeholder="Max ₹"
          className="input-field"
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button type="submit" id="apply-filters-btn" className="btn-primary text-sm py-2">
          Apply Filters
        </button>
        <button
          type="button"
          id="reset-filters-btn"
          onClick={handleReset}
          className="btn-secondary text-sm py-2"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default SearchFilters;
