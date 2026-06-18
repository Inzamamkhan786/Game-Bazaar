const orderService = require('../services/order.service');
const ApiResponse = require('../utils/apiResponse');

// User: get own orders
const getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getUserOrders(req.user.id, req.query);
    res.json(new ApiResponse(200, result));
  } catch (error) { next(error); }
};

// User/Admin: get single order
const getOrderById = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const order = await orderService.getOrderById(req.params.id, isAdmin ? null : req.user.id);
    res.json(new ApiResponse(200, order));
  } catch (error) { next(error); }
};

// Admin: get all orders
const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query);
    res.json(new ApiResponse(200, result));
  } catch (error) { next(error); }
};

// Admin: update order status
const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body);
    res.json(new ApiResponse(200, order, 'Order status updated'));
  } catch (error) { next(error); }
};

// Admin: dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await orderService.getDashboardStats();
    res.json(new ApiResponse(200, stats));
  } catch (error) { next(error); }
};

// Admin: get all users
const getAllUsers = async (req, res, next) => {
  try {
    const result = await orderService.getAllUsers(req.query);
    res.json(new ApiResponse(200, result));
  } catch (error) { next(error); }
};

// Admin: export orders CSV
const exportOrdersCSV = async (req, res, next) => {
  try {
    const csv = await orderService.exportOrdersCSV(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) { next(error); }
};

module.exports = { getMyOrders, getOrderById, getAllOrders, updateOrderStatus, getDashboardStats, getAllUsers, exportOrdersCSV };
