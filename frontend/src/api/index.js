import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const gamesAPI = {
  getAll: (params) => api.get('/games', { params }),
  getFeatured: () => api.get('/games/featured'),
  getTrending: () => api.get('/games/trending'),
  getCategories: () => api.get('/games/categories'),
  getById: (id) => api.get(`/games/${id}`),
  create: (formData) => api.post('/games', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.patch(`/games/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/games/${id}`),
};

export const paymentsAPI = {
  createOrder: (gameId) => api.post('/payments/create-order', { gameId }),
  verifyPayment: (data) => api.post('/payments/verify', data),
  submitUpiOrder: (gameId) => api.post('/payments/upi-order', { gameId }),
  createQrOrder: (gameId) => api.post('/payments/create-qr', { gameId }),
  pollQrStatus: (qrId) => api.get(`/payments/qr-status/${qrId}`),
};

export const ordersAPI = {
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  getAllOrders: (params) => api.get('/orders', { params }),
  updateOrderStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  exportCSV: (params) => api.get('/orders/admin/export-csv', { params, responseType: 'blob' }),
};

export const adminAPI = {
  getDashboardStats: () => api.get('/admin/stats'),
  getAllUsers: (params) => api.get('/admin/users', { params }),
};
