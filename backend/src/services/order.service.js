const { query, withTransaction } = require('../db/pool');
const { notifyUserOrderUpdate } = require('./whatsapp.service');
const { getPaginationOffset } = require('../utils/helpers');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

/**
 * Get user's orders
 */
const getUserOrders = async (userId, { page, limit }) => {
  const { page: pageNum, limit: lim, offset } = getPaginationOffset(page, limit);

  const countResult = await query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [userId]);
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await query(
    `SELECT o.*, g.game_name, g.images[1] as game_image, g.category
     FROM orders o
     JOIN games g ON o.game_id = g.id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, lim, offset]
  );

  return {
    orders: rows,
    pagination: { total, page: pageNum, limit: lim, totalPages: Math.ceil(total / lim) },
  };
};

/**
 * Get single order by ID (user must own it)
 */
const getOrderById = async (orderId, userId) => {
  const { rows } = await query(
    `SELECT o.*, 
            g.game_name, g.images, g.category, g.description,
            u.name as user_name, u.email as user_email, u.whatsapp_number as user_whatsapp
     FROM orders o
     JOIN games g ON o.game_id = g.id
     JOIN users u ON o.user_id = u.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (!rows.length) throw new ApiError(404, 'Order not found');
  
  // Non-admins can only see their own orders
  if (userId && rows[0].user_id !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  return rows[0];
};

/**
 * Admin: Get all orders with filters
 */
const getAllOrders = async ({ page, limit, status, search, userId }) => {
  const { page: pageNum, limit: lim, offset } = getPaginationOffset(page, limit);

  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) {
    conditions.push(`o.status = $${idx++}`);
    values.push(status);
  }
  if (userId) {
    conditions.push(`o.user_id = $${idx++}`);
    values.push(userId);
  }
  if (search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR g.game_name ILIKE $${idx} OR CAST(o.id AS TEXT) ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const countResult = await query(
    `SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id JOIN games g ON o.game_id = g.id ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  values.push(lim, offset);
  const { rows } = await query(
    `SELECT o.*, 
            u.name as user_name, u.email as user_email, u.whatsapp_number as user_whatsapp,
            g.game_name, g.images[1] as game_image, g.category
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN games g ON o.game_id = g.id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return {
    orders: rows,
    pagination: { total, page: pageNum, limit: lim, totalPages: Math.ceil(total / lim) },
  };
};

/**
 * Admin: Update order status
 */
const updateOrderStatus = async (orderId, { status, deliveryNotes }) => {
  const { rows } = await query(
    `UPDATE orders SET status = $1, delivery_notes = $2
     WHERE id = $3
     RETURNING *`,
    [status, deliveryNotes || null, orderId]
  );

  if (!rows.length) throw new ApiError(404, 'Order not found');
  const order = rows[0];

  // Get user WhatsApp, name and game name
  const { rows: details } = await query(
    `SELECT u.whatsapp_number, u.name as user_name, g.game_name
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN games g ON o.game_id = g.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (details.length) {
    try {
      await notifyUserOrderUpdate({
        userWhatsApp: details[0].whatsapp_number,
        userName: details[0].user_name,
        orderId,
        gameName: details[0].game_name,
        status,
        deliveryNotes,
      });
    } catch (err) {
      logger.error('Failed to notify user:', err.message);
    }
  }

  return order;
};

/**
 * Admin: Get dashboard analytics
 */
const getDashboardStats = async () => {
  const [usersResult, ordersResult, revenueResult, pendingResult, deliveredResult, topGamesResult] = await Promise.all([
    query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['USER']),
    query('SELECT COUNT(*) as total FROM orders'),
    query("SELECT COALESCE(SUM(order_amount), 0) as total FROM orders WHERE status = 'DELIVERED'"),
    query("SELECT COUNT(*) as total FROM orders WHERE status = 'PENDING'"),
    query("SELECT COUNT(*) as total FROM orders WHERE status = 'DELIVERED'"),
    query(`
      SELECT g.game_name, g.id, g.images[1] as image, COUNT(o.id) as order_count, SUM(o.order_amount) as revenue
      FROM games g
      LEFT JOIN orders o ON g.id = o.game_id
      GROUP BY g.id, g.game_name, g.images
      ORDER BY order_count DESC
      LIMIT 5
    `),
  ]);

  // Recent orders
  const { rows: recentOrders } = await query(`
    SELECT o.id, o.order_amount, o.status, o.created_at,
           u.name as user_name, g.game_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN games g ON o.game_id = g.id
    ORDER BY o.created_at DESC
    LIMIT 10
  `);

  // Revenue by month (last 6 months)
  const { rows: monthlyRevenue } = await query(`
    SELECT 
      TO_CHAR(created_at, 'Mon YYYY') as month,
      SUM(order_amount) as revenue,
      COUNT(*) as orders
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `);

  return {
    totalUsers: parseInt(usersResult.rows[0].total),
    totalOrders: parseInt(ordersResult.rows[0].total),
    totalRevenue: parseFloat(revenueResult.rows[0].total),
    pendingDeliveries: parseInt(pendingResult.rows[0].total),
    completedDeliveries: parseInt(deliveredResult.rows[0].total),
    topGames: topGamesResult.rows,
    recentOrders,
    monthlyRevenue,
  };
};

/**
 * Admin: Get all users
 */
const getAllUsers = async ({ page, limit, search, role }) => {
  const { page: pageNum, limit: lim, offset } = getPaginationOffset(page, limit);

  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR whatsapp_number ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (role) {
    conditions.push(`role = $${idx++}`);
    values.push(role);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, values);
  const total = parseInt(countResult.rows[0].count);

  values.push(lim, offset);
  const { rows } = await query(
    `SELECT id, name, email, whatsapp_number, role, is_active, created_at FROM users ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return {
    users: rows,
    pagination: { total, page: pageNum, limit: lim, totalPages: Math.ceil(total / lim) },
  };
};

/**
 * Admin: Export orders as CSV data
 */
const exportOrdersCSV = async (filters) => {
  const { status, startDate, endDate } = filters;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) { conditions.push(`o.status = $${idx++}`); values.push(status); }
  if (startDate) { conditions.push(`o.created_at >= $${idx++}`); values.push(startDate); }
  if (endDate) { conditions.push(`o.created_at <= $${idx++}`); values.push(endDate); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT o.id, o.status, o.order_amount, o.created_at, o.delivery_notes,
            u.name as customer_name, u.email as customer_email, u.whatsapp_number as customer_whatsapp,
            g.game_name, o.payment_id
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN games g ON o.game_id = g.id
     ${where}
     ORDER BY o.created_at DESC`,
    values
  );

  const headers = ['Order ID', 'Status', 'Amount (INR)', 'Game', 'Customer Name', 'Email', 'WhatsApp', 'Payment ID', 'Date', 'Delivery Notes'];
  const csvRows = rows.map((r) => [
    r.id, r.status, r.order_amount, r.game_name, r.customer_name, r.customer_email,
    r.customer_whatsapp, r.payment_id || '', new Date(r.created_at).toLocaleString('en-IN'), r.delivery_notes || '',
  ]);

  return [headers, ...csvRows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
};

module.exports = { getUserOrders, getOrderById, getAllOrders, updateOrderStatus, getDashboardStats, getAllUsers, exportOrdersCSV };
