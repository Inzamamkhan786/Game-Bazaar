import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { gamesAPI } from '../api';
import { setFeaturedGames, setTrendingGames } from '../store/slices/gameSlice';
import GameCard from '../components/game/GameCard';
import { GameCardSkeleton } from '../components/ui/Skeleton';
import Layout from '../components/layout/Layout';

const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { featuredGames, trendingGames } = useSelector((s) => s.games);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const [featured, trending] = await Promise.all([
          gamesAPI.getFeatured(),
          gamesAPI.getTrending(),
        ]);
        dispatch(setFeaturedGames(featured.data.data));
        dispatch(setTrendingGames(trending.data.data));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/games?search=${encodeURIComponent(search)}`);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient relative overflow-hidden" style={{ minHeight: '520px' }}>
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-300 text-xs sm:text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Premium Games at Discounted Prices
          </div>

          <h1 className="font-display font-black text-white text-3xl sm:text-5xl lg:text-6xl leading-tight mb-4 sm:mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Your Ultimate<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Gaming Bazaar
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mb-8 sm:mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Access top-tier PC games from Steam & Epic Games at unbeatable prices. Browse, pay, and receive your game instantly via WhatsApp.
          </p>

          {/* Search bar */}
          <div className="w-full max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <form
              onSubmit={handleSearch}
              className="flex gap-2 sm:gap-3 w-full"
            >
              <div className="flex-1 relative">
                <svg className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="hero-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for your favorite games..."
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all text-xs sm:text-sm"
                />
              </div>
              <button
                type="submit"
                id="hero-search-btn"
                className="btn-primary px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm whitespace-nowrap"
              >
                Search
              </button>
            </form>
          </div>

          {/* Stats */}
          <div className="flex justify-center items-center gap-4 sm:gap-8 mt-10 sm:mt-12 w-full animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {[
              { label: 'Games Available', value: '200+' },
              { label: 'Happy Customers', value: '1K+' },
              { label: 'Avg. Discount', value: '85%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center flex-1 sm:flex-initial min-w-[70px]">
                <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
            {['Action', 'Adventure', 'RPG', 'Sports', 'Strategy', 'FPS', 'Racing', 'Simulation', 'Horror', 'Indie'].map((cat) => (
              <Link
                key={cat}
                to={`/games?category=${cat}`}
                className="flex-shrink-0 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title">⭐ Featured Games</h2>
            <p className="section-subtitle">Hand-picked top titles for you</p>
          </div>
          <Link to="/games?featured=true" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={i} />)
            : featuredGames.slice(0, 8).map((game) => <GameCard key={game.id} game={game} />)
          }
        </div>

        {!loading && featuredGames.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">No featured games yet. Check back soon!</p>
            <Link to="/games" className="btn-primary mt-4 inline-flex">Browse All Games</Link>
          </div>
        )}
      </section>

      {/* Trending Games */}
      {(trendingGames.length > 0 || loading) && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="section-title">🔥 Trending Now</h2>
                <p className="section-subtitle">Most popular games this week</p>
              </div>
              <Link to="/games" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <GameCardSkeleton key={i} />)
                : trendingGames.slice(0, 8).map((game) => <GameCard key={game.id} game={game} />)
              }
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Get your game in 3 simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: '🎮', title: 'Browse & Select', desc: 'Explore our catalog of premium PC games at discounted prices. Find your favorite titles.' },
            { step: '02', icon: '💳', title: 'Secure Payment', desc: 'Pay securely via Razorpay with UPI, cards, netbanking & more. 100% safe checkout.' },
            { step: '03', icon: '📱', title: 'WhatsApp Delivery', desc: 'Receive your game access credentials directly via WhatsApp within minutes of payment.' },
          ].map((item) => (
            <div key={item.step} className="glass-card rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 group">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl group-hover:bg-blue-600 transition-colors duration-300">
                {item.icon}
              </div>
              <div className="text-xs font-bold text-blue-600 mb-2 tracking-widest">STEP {item.step}</div>
              <h3 className="font-bold text-slate-900 text-lg mb-3">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display font-black text-3xl sm:text-4xl mb-4">
            Ready to Start Gaming?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of gamers who save big on premium games. Create your account and start shopping.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/signup" id="cta-signup-btn" className="px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition-all hover:-translate-y-1 hover:shadow-xl shadow-lg">
              Create Free Account
            </Link>
            <Link to="/games" className="px-8 py-4 bg-white/20 text-white font-bold rounded-2xl border border-white/30 hover:bg-white/30 transition-all hover:-translate-y-1">
              Browse Games
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
