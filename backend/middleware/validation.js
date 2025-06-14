exports.validateScore = (req, res, next) => {
    const { playerName, score, level } = req.body;
    
    // Validate player name
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid player name is required'
        });
    }
    
    if (playerName.length > 20) {
        return res.status(400).json({
            success: false,
            message: 'Player name must be 20 characters or less'
        });
    }
    
    // Validate score
    if (score === undefined || score === null || isNaN(score) || score < 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid score (non-negative number) is required'
        });
    }
    
    // Validate level
    if (!level || isNaN(level) || level < 1) {
        return res.status(400).json({
            success: false,
            message: 'Valid level (positive number) is required'
        });
    }
    
    // Basic score validation (prevent obvious cheating)
    if (score > 1000000) {
        return res.status(400).json({
            success: false,
            message: 'Score seems unrealistic'
        });
    }
    
    next();
};
