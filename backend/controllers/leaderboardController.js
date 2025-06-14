const Score = require('../models/Score');

// Get top scores (leaderboard)
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 10, level, gameMode } = req.query;
        
        // Build query filter
        const filter = {};
        if (level) filter.level = parseInt(level);
        if (gameMode) filter.gameMode = gameMode;
        
        const scores = await Score.find(filter)
            .sort({ score: -1, timestamp: -1 })
            .limit(parseInt(limit))
            .select('playerName score level gameMode timestamp');
            
        res.json({
            success: true,
            data: scores,
            count: scores.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leaderboard',
            error: error.message
        });
    }
};

// Submit new score
exports.submitScore = async (req, res) => {
    try {
        const { playerName, score, level, gameMode, metadata } = req.body;
        
        // Validate required fields
        if (!playerName || score === undefined || !level) {
            return res.status(400).json({
                success: false,
                message: 'Player name, score, and level are required'
            });
        }
        
        // Create new score entry
        const newScore = new Score({
            playerName,
            score: parseInt(score),
            level: parseInt(level),
            gameMode: gameMode || 'normal',
            metadata
        });
        
        await newScore.save();
        
        // Get player's rank
        const rank = await Score.countDocuments({
            level: parseInt(level),
            gameMode: gameMode || 'normal',
            score: { $gt: parseInt(score) }
        }) + 1;
        
        res.status(201).json({
            success: true,
            message: 'Score submitted successfully',
            data: {
                ...newScore.toObject(),
                rank
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to submit score',
            error: error.message
        });
    }
};

// Get player's best scores
exports.getPlayerStats = async (req, res) => {
    try {
        const { playerName } = req.params;
        
        const stats = await Score.aggregate([
            { $match: { playerName } },
            {
                $group: {
                    _id: '$level',
                    bestScore: { $max: '$score' },
                    totalGames: { $sum: 1 },
                    averageScore: { $avg: '$score' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            success: true,
            data: {
                playerName,
                levelStats: stats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch player stats',
            error: error.message
        });
    }
};
