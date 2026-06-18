const gameService = require('../services/game.service');
const ApiResponse = require('../utils/apiResponse');
const path = require('path');

const createGame = async (req, res, next) => {
  try {
    const images = req.files ? req.files.map((f) => `uploads/games/${f.filename}`) : [];
    const { features, ...rest } = req.body;
    const parsedFeatures = features ? (Array.isArray(features) ? features : JSON.parse(features)) : [];
    const game = await gameService.createGame({ ...rest, features: parsedFeatures, images });
    res.status(201).json(new ApiResponse(201, game, 'Game created successfully'));
  } catch (error) { next(error); }
};

const getGames = async (req, res, next) => {
  try {
    const result = await gameService.getGames(req.query);
    res.json(new ApiResponse(200, result));
  } catch (error) { next(error); }
};

const getFeaturedGames = async (req, res, next) => {
  try {
    const games = await gameService.getFeaturedGames();
    res.json(new ApiResponse(200, games));
  } catch (error) { next(error); }
};

const getTrendingGames = async (req, res, next) => {
  try {
    const games = await gameService.getTrendingGames();
    res.json(new ApiResponse(200, games));
  } catch (error) { next(error); }
};

const getGameById = async (req, res, next) => {
  try {
    const game = await gameService.getGameById(req.params.id);
    res.json(new ApiResponse(200, game));
  } catch (error) { next(error); }
};

const updateGame = async (req, res, next) => {
  try {
    const newImages = req.files ? req.files.map((f) => `uploads/games/${f.filename}`) : [];
    const { features, ...rest } = req.body;
    if (features) {
      rest.features = Array.isArray(features) ? features : JSON.parse(features);
    }
    const game = await gameService.updateGame(req.params.id, rest, newImages);
    res.json(new ApiResponse(200, game, 'Game updated successfully'));
  } catch (error) { next(error); }
};

const deleteGame = async (req, res, next) => {
  try {
    await gameService.deleteGame(req.params.id);
    res.json(new ApiResponse(200, null, 'Game deleted successfully'));
  } catch (error) { next(error); }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await gameService.getCategories();
    res.json(new ApiResponse(200, categories));
  } catch (error) { next(error); }
};

module.exports = { createGame, getGames, getFeaturedGames, getTrendingGames, getGameById, updateGame, deleteGame, getCategories };
