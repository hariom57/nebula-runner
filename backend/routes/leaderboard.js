const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { validateScore } = require('../middleware/validation');

// GET /api/leaderboard - Get top scores
router.get('/', leaderboardController.getLeaderboard);

// POST /api/leaderboard - Submit new score
router.post('/', validateScore, leaderboardController.submitScore);

// GET /api/leaderboard/player/:playerName - Get player stats
router.get('/player/:playerName', leaderboardController.getPlayerStats);

module.exports = router;
