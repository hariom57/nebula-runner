const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const leaderboardRoutes = require('./routes/leaderboard');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  'https://nebula-runner.vercel.app', // your Vercel frontend URL
  'http://localhost:3000',            // local dev
  'http://localhost:5501',            // local dev (if you use Live Server)
  'http://127.0.0.1:5501'             // local dev (alternate)
];

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // if you use cookies/auth
}));
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
