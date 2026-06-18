import { createSlice } from '@reduxjs/toolkit';

const getStoredUser = () => {
  try {
    const user = localStorage.getItem('gb_user');
    return user ? JSON.parse(user) : null;
  } catch { return null; }
};

const initialState = {
  user: getStoredUser(),
  accessToken: localStorage.getItem('gb_token') || null,
  isAuthenticated: !!localStorage.getItem('gb_token'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('gb_user', JSON.stringify(user));
      localStorage.setItem('gb_token', accessToken);
    },
    setTokens: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('gb_token', action.payload.accessToken);
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('gb_user', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('gb_user');
      localStorage.removeItem('gb_token');
    },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
  },
});

export const { setCredentials, setTokens, updateUser, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
