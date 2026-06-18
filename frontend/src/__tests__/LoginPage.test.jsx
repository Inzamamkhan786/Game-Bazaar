import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import gameReducer from '../store/slices/gameSlice';
import LoginPage from '../pages/LoginPage';
import { authAPI } from '../api';

vi.mock('../api', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
  },
  gamesAPI: { getFeatured: vi.fn(), getTrending: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const createTestStore = (authState = {}) =>
  configureStore({
    reducer: { auth: authReducer, games: gameReducer },
    preloadedState: {
      auth: { user: null, accessToken: null, isAuthenticated: false, ...authState },
      games: { games: [], featuredGames: [], trendingGames: [], categories: [], currentGame: null, pagination: { total: 0, page: 1, limit: 12, totalPages: 1 }, filters: {}, loading: false, error: null },
    },
  });

const renderWithStore = (component, store = createTestStore()) =>
  render(
    <Provider store={store}>
      <MemoryRouter>{component}</MemoryRouter>
    </Provider>
  );

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderWithStore(<LoginPage />);
    expect(screen.getByLabelText(/email/i) || screen.getByPlaceholderText(/email/i)).toBeTruthy();
  });

  it('shows validation errors for empty form', async () => {
    renderWithStore(<LoginPage />);
    const submitBtn = screen.getByText(/sign in/i);
    fireEvent.click(submitBtn);
    await waitFor(() => {
      // Validation should prevent API call
      expect(authAPI.login).not.toHaveBeenCalled();
    });
  });

  it('calls login API with correct credentials', async () => {
    authAPI.login.mockResolvedValue({
      data: { data: { user: { id: '1', name: 'Test', email: 'test@test.com', role: 'USER' }, accessToken: 'token123' } },
    });

    renderWithStore(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/);

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password1!' } });

    const btn = screen.getByText(/sign in/i);
    fireEvent.click(btn);

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'Password1!',
      });
    });
  });

  it('shows error toast on login failure', async () => {
    authAPI.login.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    renderWithStore(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/);

    fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPass1!' } });

    fireEvent.click(screen.getByText(/sign in/i));

    await waitFor(() => {
      const toast = require('react-hot-toast').default;
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
