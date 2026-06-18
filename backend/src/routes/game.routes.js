const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { gameValidators, paginationValidators } = require('../middleware/validate');
const upload = require('../config/multer');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');

// Public routes
router.get('/', paginationValidators, gameController.getGames);
router.get('/featured', gameController.getFeaturedGames);
router.get('/trending', gameController.getTrendingGames);
router.get('/categories', gameController.getCategories);
router.get('/:id', [param('id').isUUID(), validate], gameController.getGameById);

// Admin only routes
router.post('/', authenticate, requireAdmin, upload.array('images', 5), gameValidators.create, gameController.createGame);
router.patch('/:id', authenticate, requireAdmin, upload.array('images', 5), gameValidators.update, gameController.updateGame);
router.delete('/:id', authenticate, requireAdmin, [param('id').isUUID(), validate], gameController.deleteGame);

module.exports = router;
