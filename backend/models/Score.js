const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    playerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20
    },
    score: {
        type: Number,
        required: true,
        min: 0
    },
    level: {
        type: Number,
        required: true,
        min: 1
    },
    gameMode: {
        type: String,
        enum: ['normal', 'hard', 'expert'],
        default: 'normal'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        gameVersion: String,
        deviceType: String,
        playTime: Number // in seconds
    }
}, {
    timestamps: true
});

// Index for efficient leaderboard queries
scoreSchema.index({ score: -1, timestamp: -1 });
scoreSchema.index({ level: 1, score: -1 });

module.exports = mongoose.model('Score', scoreSchema);
