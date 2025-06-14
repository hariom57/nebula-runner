class GameAPI {
    constructor() {
        // Use environment-specific URLs
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
            // Local development - connect to your Node.js backend
            this.baseURL = 'http://localhost:3000/api';
        } else {
            // Production - will be updated when you deploy your backend
            this.baseURL = 'https://your-future-backend-url.com/api';
        }
        
        console.log(`🔧 API Base URL: ${this.baseURL}`);
    }
    
    async submitScore(playerName, score, level, gameMode = 'normal', metadata = {}) {
        try {
            const response = await fetch(`${this.baseURL}/leaderboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName: playerName.trim(),
                    score: parseInt(score),
                    level: parseInt(level),
                    gameMode,
                    metadata: {
                        gameVersion: '1.0.0',
                        deviceType: this.getDeviceType(),
                        timestamp: Date.now(),
                        playTime: metadata.playTime || 0,
                        ...metadata
                    }
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to submit score');
            }
            
            this.isOnline = true;
            console.log('✅ Score submitted successfully:', result);
            return result;
            
        } catch (error) {
            console.error('❌ API Error - Submit Score:', error);
            this.isOnline = false;
            
            // Save to offline queue
            this.saveToOfflineQueue(playerName, score, level, gameMode, metadata);
            
            // Return mock success response for offline mode
            return {
                success: true,
                message: 'Score saved offline - will sync when online',
                data: {
                    playerName,
                    score,
                    level,
                    gameMode,
                    rank: '?',
                    offline: true
                }
            };
        }
    }
    
    async getLeaderboard(limit = 10, level = null, gameMode = null) {
        try {
            const params = new URLSearchParams();
            params.append('limit', limit);
            if (level) params.append('level', level);
            if (gameMode) params.append('gameMode', gameMode);
            
            const response = await fetch(`${this.baseURL}/leaderboard?${params}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch leaderboard');
            }
            
            this.isOnline = true;
            console.log('✅ Leaderboard fetched successfully');
            return result;
            
        } catch (error) {
            console.error('❌ API Error - Get Leaderboard:', error);
            this.isOnline = false;
            
            // Return cached/local leaderboard as fallback
            return this.getOfflineLeaderboard(limit);
        }
    }
    
    async getPlayerStats(playerName) {
        try {
            const response = await fetch(`${this.baseURL}/leaderboard/player/${encodeURIComponent(playerName)}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch player stats');
            }
            
            return result;
        } catch (error) {
            console.error('❌ API Error - Get Player Stats:', error);
            return { success: false, message: 'Offline mode' };
        }
    }
    
    // Offline support methods
    saveToOfflineQueue(playerName, score, level, gameMode, metadata) {
        const offlineScore = {
            playerName,
            score,
            level,
            gameMode,
            metadata,
            timestamp: Date.now()
        };
        
        this.offlineQueue.push(offlineScore);
        localStorage.setItem('nebula-offline-scores', JSON.stringify(this.offlineQueue));
        
        // Also save to local leaderboard for immediate display
        this.saveToLocalLeaderboard(offlineScore);
    }
    
    saveToLocalLeaderboard(scoreEntry) {
        let localScores = [];
        try {
            localScores = JSON.parse(localStorage.getItem('nebula-local-leaderboard')) || [];
        } catch (e) {
            localScores = [];
        }
        
        localScores.push(scoreEntry);
        localScores.sort((a, b) => b.score - a.score);
        localScores = localScores.slice(0, 50); // Keep top 50
        
        localStorage.setItem('nebula-local-leaderboard', JSON.stringify(localScores));
    }
    
    getOfflineLeaderboard(limit = 10) {
        try {
            const localScores = JSON.parse(localStorage.getItem('nebula-local-leaderboard')) || [];
            return {
                success: true,
                data: localScores.slice(0, limit),
                count: Math.min(localScores.length, limit),
                offline: true
            };
        } catch (error) {
            return {
                success: true,
                data: [],
                count: 0,
                offline: true
            };
        }
    }
    
    async syncOfflineScores() {
        if (!this.isOnline || this.offlineQueue.length === 0) return;
        
        console.log(`🔄 Syncing ${this.offlineQueue.length} offline scores...`);
        
        const scores = [...this.offlineQueue];
        this.offlineQueue = [];
        
        for (const score of scores) {
            try {
                await this.submitScore(
                    score.playerName,
                    score.score,
                    score.level,
                    score.gameMode,
                    score.metadata
                );
            } catch (error) {
                console.error('Failed to sync score:', error);
                // Put it back in queue
                this.offlineQueue.push(score);
            }
        }
        
        localStorage.setItem('nebula-offline-scores', JSON.stringify(this.offlineQueue));
    }
    
    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad|phone|tablet/.test(userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }
    
    // Health check for connection testing
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/api/health`);
            const result = await response.json();
            this.isOnline = true;
            return result;
        } catch (error) {
            console.error('Backend connection failed:', error);
            this.isOnline = false;
            return { status: 'offline', error: error.message };
        }
    }
    
    getConnectionStatus() {
        return this.isOnline ? 'online' : 'offline';
    }
}

// Export as singleton
const gameAPI = new GameAPI();
export default gameAPI;
