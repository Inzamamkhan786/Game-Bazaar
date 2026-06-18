import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import gameReducer from '../store/slices/gameSlice';
import ProtectedRoute from '../components/layout/ProtectedRoute';

const createStore = (isAuthenticated = false, role = 'USER') =>
  configureStore({
    reducer: { auth: authReducer, games: gameReducer },
    preloadedState: {
      auth: { user: isAuthenticated ? { role } : null, accessToken: isAuthenticated ? 'token' : null, isAuthenticated },
      games: { games: [], featuredGames: [], trendingGames: [], categories: [], currentGame: null, pagination: { total: 0, page: 1, limit: 12, totalPages: 1 }, filters: {}, loading: false, error: null },
    },
  });

const ProtectedChild = () => <div>Protected Content</div>;
const renderProtected = (auth = false, role = 'USER', adminOnly = false) =>
  render(
    <Provider store={createStore(auth, role)}>
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute adminOnly={adminOnly}>
          <ProtectedChild />
        </ProtectedRoute>
      </MemoryRouter>
    </Provider>
  );

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    const { container } = renderProtected(false);
    // Should redirect (no protected content)
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('shows content for authenticated users', () => {
    renderProtected(true);
    expect(screen.getByText('Protected Content')).toBeTruthy();
  });

  it('blocks regular users from admin routes', () => {
    renderProtected(true, 'USER', true);
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('allows admins to access admin routes', () => {
    renderProtected(true, 'ADMIN', true);
    expect(screen.getByText('Protected Content')).toBeTruthy();
  });
});
