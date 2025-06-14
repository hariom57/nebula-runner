const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const leaderboardRoutes = require('./routes/leaderboard');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Nebula Runner Backend running on port ${PORT}`);
});

module.exports = app;
