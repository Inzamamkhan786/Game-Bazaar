const { query, withTransaction } = require('../db/pool');
const { getPaginationOffset } = require('../utils/helpers');
const ApiError = require('../utils/apiError');
const path = require('path');
const fs = require('fs');

/**
 * Create a new game
 */
const createGame = async ({ gameName, description, features, originalPrice, salePrice, category, availability, isFeatured, isTrending, images }) => {
  const { rows } = await query(
    `INSERT INTO games (game_name, description, features, original_price, sale_price, category, availability, is_featured, is_trending, images)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      gameName,
      description,
      features || [],
      parseFloat(originalPrice),
      parseFloat(salePrice),
      category,
      availability !== undefined ? availability : true,
      isFeatured || false,
      isTrending || false,
      images || [],
    ]
  );
  return rows[0];
};

/**
 * Get all games with pagination and filters
 */
const getGames = async ({ page, limit, search, category, minPrice, maxPrice, availability }) => {
  const { page: pageNum, limit: lim, offset } = getPaginationOffset(page, limit);

  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`game_name ILIKE $${idx++}`);
    values.push(`%${search}%`);
  }
  if (category) {
    conditions.push(`category = $${idx++}`);
    values.push(category);
  }
  if (minPrice !== undefined) {
    conditions.push(`sale_price >= $${idx++}`);
    values.push(parseFloat(minPrice));
  }
  if (maxPrice !== undefined) {
    conditions.push(`sale_price <= $${idx++}`);
    values.push(parseFloat(maxPrice));
  }
  if (availability !== undefined) {
    conditions.push(`availability = $${idx++}`);
    values.push(availability === 'true' || availability === true);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const countResult = await query(`SELECT COUNT(*) FROM games ${where}`, values);
  const total = parseInt(countResult.rows[0].count);

  values.push(lim, offset);
  const { rows } = await query(
    `SELECT * FROM games ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return {
    games: rows,
    pagination: { total, page: pageNum, limit: lim, totalPages: Math.ceil(total / lim) },
  };
};

/**
 * Get featured games
 */
const getFeaturedGames = async () => {
  const { rows } = await query(
    'SELECT * FROM games WHERE is_featured = TRUE AND availability = TRUE ORDER BY created_at DESC LIMIT 8'
  );
  return rows;
};

/**
 * Get trending games
 */
const getTrendingGames = async () => {
  const { rows } = await query(
    `SELECT g.*, COUNT(o.id) as order_count
     FROM games g
     LEFT JOIN orders o ON g.id = o.game_id
     WHERE g.availability = TRUE
     GROUP BY g.id
     ORDER BY order_count DESC, g.created_at DESC
     LIMIT 8`
  );
  return rows;
};

/**
 * Get game by ID
 */
const getGameById = async (id) => {
  const { rows } = await query('SELECT * FROM games WHERE id = $1', [id]);
  if (!rows.length) throw new ApiError(404, 'Game not found');
  return rows[0];
};

/**
 * Update game
 */
const updateGame = async (id, updates, newImages) => {
  const game = await getGameById(id);

  const fields = {};
  const allowed = ['gameName', 'description', 'features', 'originalPrice', 'salePrice', 'category', 'availability', 'isFeatured', 'isTrending'];
  
  allowed.forEach((field) => {
    if (updates[field] !== undefined) fields[field] = updates[field];
  });

  // Handle images
  let images = game.images || [];
  if (updates.removeImages) {
    const toRemove = Array.isArray(updates.removeImages) ? updates.removeImages : [updates.removeImages];
    images = images.filter((img) => !toRemove.includes(img));
    // Delete physical files
    toRemove.forEach((imgPath) => {
      const fullPath = path.join(process.cwd(), imgPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });
  }
  if (newImages && newImages.length) {
    images = [...images, ...newImages];
  }

  const setClauses = [];
  const values = [];
  let idx = 1;

  const dbMap = {
    gameName: 'game_name',
    description: 'description',
    features: 'features',
    originalPrice: 'original_price',
    salePrice: 'sale_price',
    category: 'category',
    availability: 'availability',
    isFeatured: 'is_featured',
    isTrending: 'is_trending',
  };

  for (const [key, dbCol] of Object.entries(dbMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${dbCol} = $${idx++}`);
      values.push(fields[key]);
    }
  }

  setClauses.push(`images = $${idx++}`);
  values.push(images);
  values.push(id);

  const { rows } = await query(
    `UPDATE games SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
};

/**
 * Delete game
 */
const deleteGame = async (id) => {
  const game = await getGameById(id);
  
  // Check if game has active pending orders
  const { rows: activeOrders } = await query(
    "SELECT id FROM orders WHERE game_id = $1 AND status = 'PENDING' LIMIT 1",
    [id]
  );
  if (activeOrders.length) throw new ApiError(409, 'Cannot delete game with pending orders');

  // Delete physical images
  if (game.images && game.images.length) {
    game.images.forEach((imgPath) => {
      const fullPath = path.join(process.cwd(), imgPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });
  }

  await query('DELETE FROM games WHERE id = $1', [id]);
};

/**
 * Get game categories
 */
const getCategories = async () => {
  const { rows } = await query('SELECT DISTINCT category FROM games WHERE availability = TRUE ORDER BY category');
  return rows.map((r) => r.category);
};

module.exports = { createGame, getGames, getFeaturedGames, getTrendingGames, getGameById, updateGame, deleteGame, getCategories };
