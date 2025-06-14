class GameAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
    }
    
    async submitScore(playerName, score, level, gameMode = 'normal', metadata = {}) {
        try {
            const response = await fetch(`${this.baseURL}/leaderboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName,
                    score,
                    level,
                    gameMode,
                    metadata
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to submit score:', error);
            throw error;
        }
    }
    
    async getLeaderboard(limit = 10, level = null, gameMode = null) {
        try {
            const params = new URLSearchParams();
            if (limit) params.append('limit', limit);
            if (level) params.append('level', level);
            if (gameMode) params.append('gameMode', gameMode);
            
            const response = await fetch(`${this.baseURL}/leaderboard?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            throw error;
        }
    }
}

export default new GameAPI();
