import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  games: [],
  featuredGames: [],
  trendingGames: [],
  categories: [],
  currentGame: null,
  pagination: { total: 0, page: 1, limit: 12, totalPages: 1 },
  filters: { search: '', category: '', minPrice: '', maxPrice: '', availability: 'true' },
  loading: false,
  error: null,
};

const gameSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    setGames: (state, action) => {
      state.games = action.payload.games;
      state.pagination = action.payload.pagination;
    },
    setFeaturedGames: (state, action) => { state.featuredGames = action.payload; },
    setTrendingGames: (state, action) => { state.trendingGames = action.payload; },
    setCategories: (state, action) => { state.categories = action.payload; },
    setCurrentGame: (state, action) => { state.currentGame = action.payload; },
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
    resetFilters: (state) => { state.filters = initialState.filters; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    updateGameInList: (state, action) => {
      const idx = state.games.findIndex((g) => g.id === action.payload.id);
      if (idx !== -1) state.games[idx] = action.payload;
    },
    removeGameFromList: (state, action) => {
      state.games = state.games.filter((g) => g.id !== action.payload);
    },
  },
});

export const { setGames, setFeaturedGames, setTrendingGames, setCategories, setCurrentGame, setFilters, resetFilters, setLoading, setError, updateGameInList, removeGameFromList } = gameSlice.actions;
export default gameSlice.reducer;
