import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { gamesAPI } from '../api';
import { setGames, setCategories, setFilters } from '../store/slices/gameSlice';
import GameCard from '../components/game/GameCard';
import SearchFilters from '../components/game/SearchFilters';
import { GameCardSkeleton } from '../components/ui/Skeleton';
import Layout from '../components/layout/Layout';

const GamesPage = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { games, pagination, categories, loading: storeLoading } = useSelector((s) => s.games);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: '',
    maxPrice: '',
    availability: 'true',
  });

  const fetchGames = useCallback(async (filters = activeFilters, pageNum = page) => {
    setLoading(true);
    try {
      const params = { ...filters, page: pageNum, limit: 12 };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await gamesAPI.getAll(params);
      dispatch(setGames(res.data.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    gamesAPI.getCategories().then((res) => dispatch(setCategories(res.data.data))).catch(console.error);
  }, [dispatch]);

  useEffect(() => {
    fetchGames(activeFilters, 1);
    setPage(1);
  }, []);

  const handleSearch = (filters) => {
    setActiveFilters(filters);
    setPage(1);
    fetchGames(filters, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchGames(activeFilters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title">🎮 Game Catalog</h1>
          <p className="section-subtitle">Discover {pagination.total} premium games at discounted prices</p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <SearchFilters categories={categories} onSearch={handleSearch} />
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No games found</h3>
            <p className="text-slate-500 mb-6">Try adjusting your search or filters</p>
            <button onClick={() => handleSearch({ search: '', category: '', minPrice: '', maxPrice: '', availability: 'true' })} className="btn-primary">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} games
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {games.map((game) => <GameCard key={game.id} game={game} />)}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  ← Prev
                </button>

                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                        p === page
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default GamesPage;
