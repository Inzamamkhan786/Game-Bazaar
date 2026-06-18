import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/image';

const GameCard = ({ game, onBuy }) => {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const discount = game.original_price > 0
    ? Math.round(((game.original_price - game.sale_price) / game.original_price) * 100)
    : 0;

  const imageUrl = getImageUrl(game.images?.[0]);

  const handleBuy = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }
    if (onBuy) {
      onBuy(game);
    } else {
      navigate(`/games/${game.id}`);
    }
  };

  return (
    <div className="game-card bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
      <Link to={`/games/${game.id}`} className="block relative overflow-hidden" style={{ height: '210px' }}>
        {!imgError && imageUrl ? (
          <img
            src={imageUrl}
            alt={game.game_name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full gaming-gradient flex items-center justify-center">
            <svg className="w-16 h-16 text-slate-600 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="game-card-overlay absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-4">
          <span className="text-white text-sm font-medium">View Details →</span>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {discount > 0 && (
            <span className="discount-badge">-{discount}%</span>
          )}
          {game.is_featured && (
            <span className="badge bg-blue-600 text-white text-xs">Featured</span>
          )}
          {game.is_trending && (
            <span className="badge bg-orange-500 text-white text-xs">🔥 Hot</span>
          )}
        </div>

        {!game.availability && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded-full">Unavailable</span>
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{game.category}</span>
          <Link to={`/games/${game.id}`}>
            <h3 className="font-semibold text-slate-900 mt-1 text-sm leading-tight hover:text-blue-600 transition-colors line-clamp-2">
              {game.game_name}
            </h3>
          </Link>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">₹{parseFloat(game.sale_price).toFixed(0)}</span>
              {discount > 0 && (
                <span className="text-sm text-slate-400 line-through">₹{parseFloat(game.original_price).toFixed(0)}</span>
              )}
            </div>
          </div>

          <button
            id={`buy-btn-${game.id}`}
            onClick={handleBuy}
            disabled={!game.availability}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 ${
              game.availability
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {game.availability ? 'Buy Now' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
