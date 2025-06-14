import { getCurrentUser } from '../auth.js';
import gameAPI from '../api/gameAPI.js';

export default class UISystem {
    constructor() {
        this.highScores = [];
        this.isSubmittingScore = false;
        this.connectionStatus = 'checking';
        
        // Device detection for responsive behavior
        this.isMobile = this.detectMobile();
        
        // Check connection on startup
        this.checkBackendConnection();
        
        // Load any existing local scores
        this.loadPersonalScores();
    }
    
    detectMobile() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    async checkBackendConnection() {
        try {
            const health = await gameAPI.checkConnection();
            this.connectionStatus = health.status === 'Server is running!' ? 'online' : 'offline';
            console.log(`🌐 Backend status: ${this.connectionStatus}`);
            
            if (this.connectionStatus === 'online') {
                await gameAPI.syncOfflineScores();
            }
            
            this.updateConnectionUI();
        } catch (error) {
            this.connectionStatus = 'offline';
            console.log('🔴 Backend offline - using local storage');
            this.updateConnectionUI();
        }
    }
    
    updateConnectionUI() {
        let statusEl = document.getElementById('connection-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'connection-status';
            statusEl.className = 'connection-status';
            document.body.appendChild(statusEl);
        }
        
        statusEl.className = `connection-status ${this.connectionStatus}`;
        statusEl.textContent = this.connectionStatus === 'online' ? '🟢 Online' : '🔴 Offline';
    }
    
    loadPersonalScores() {
        const user = getCurrentUser();
        if (!user) {
            this.highScores = [];
            return;
        }
        
        try {
            const scores = localStorage.getItem(`highScores_${user}`);
            this.highScores = scores ? JSON.parse(scores) : [];
        } catch (e) {
            this.highScores = [];
        }
    }

    showGameOver(finalScore) {
        const gameOverEl = document.getElementById('gameOver');
        const finalScoreEl = document.getElementById('finalScore');
        if (!gameOverEl || !finalScoreEl) {
            console.error('Game over UI elements not found!');
            return;
        }
        finalScoreEl.textContent = finalScore.toLocaleString();
        gameOverEl.style.display = 'block';
    }

    async updatePersonalBest(score) {
        const user = getCurrentUser();
        if (!user || this.isSubmittingScore) return;
        
        this.isSubmittingScore = true;
        
        try {
            this.showScoreSubmissionStatus('Submitting score...');
            
            const result = await gameAPI.submitScore(
                user,
                score,
                1,
                'normal',
                {
                    playTime: this.getPlayTime(),
                    deviceType: gameAPI.getDeviceType()
                }
            );
            
            if (result.success) {
                console.log('✅ Score submitted successfully');
                
                if (result.data && result.data.rank) {
                    this.showScoreSubmissionStatus(
                        result.data.offline 
                            ? `Score saved offline (Rank: ${result.data.rank})` 
                            : `Score submitted! Your rank: #${result.data.rank}`
                    );
                } else {
                    this.showScoreSubmissionStatus('Score submitted successfully!');
                }
                
                this.updateLocalPersonalBest(score, user);
                await this.renderLeaderboards();
                
            } else {
                throw new Error(result.message || 'Failed to submit score');
            }
            
        } catch (error) {
            console.error('❌ Failed to submit score:', error);
            this.showScoreSubmissionStatus('Failed to submit score - saved locally');
            this.updateLocalPersonalBest(score, user);
        } finally {
            this.isSubmittingScore = false;
            
            setTimeout(() => {
                this.hideScoreSubmissionStatus();
            }, 3000);
        }
    }
    
    updateLocalPersonalBest(score, user) {
        const newEntry = { user, score, timestamp: Date.now() };
        
        this.highScores = [...this.highScores, newEntry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        localStorage.setItem(`highScores_${user}`, JSON.stringify(this.highScores));
        
        let globalScores = [];
        try {
            globalScores = JSON.parse(localStorage.getItem('globalLeaderboard')) || [];
        } catch (e) { 
            globalScores = []; 
        }
        globalScores.push(newEntry);
        globalScores = globalScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 100);
        localStorage.setItem('globalLeaderboard', JSON.stringify(globalScores));
    }
    
    showScoreSubmissionStatus(message) {
        let statusEl = document.getElementById('score-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'score-status';
            statusEl.className = 'score-status';
            document.body.appendChild(statusEl);
        }
        statusEl.textContent = message;
        statusEl.style.display = 'block';
    }
    
    hideScoreSubmissionStatus() {
        const statusEl = document.getElementById('score-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }
    
    getPlayTime() {
        return Math.floor(Date.now() / 1000) % 3600;
    }

    async renderLeaderboards() {
        // Update mobile detection on each render
        this.isMobile = this.detectMobile();
        
        try {
            // Request appropriate number of scores based on device
            const requestLimit = this.isMobile ? 5 : 10;
            const leaderboardResponse = await gameAPI.getLeaderboard(requestLimit);
            
            if (leaderboardResponse.success) {
                this.renderGlobalLeaderboard(leaderboardResponse.data, leaderboardResponse.offline);
            } else {
                this.renderLocalLeaderboards();
            }
            
            this.renderPersonalLeaderboard();
            
        } catch (error) {
            console.error('Failed to render leaderboards:', error);
            this.renderLocalLeaderboards();
        }
    }
    
    renderGlobalLeaderboard(scores, isOffline = false) {
        const globalList = document.getElementById('globalLeaderboard');
        if (!globalList) return;
        
        // Apply device-specific limits
        const displayLimit = this.isMobile ? 5 : 10;
        const limitedScores = scores.slice(0, displayLimit);
        
        const offlineIndicator = isOffline ? ' (Offline)' : '';
        
        if (limitedScores.length === 0) {
            globalList.innerHTML = '<li class="no-scores">No scores available</li>';
            return;
        }
        
        globalList.innerHTML = limitedScores.map((entry, i) => (
            `<li class="leaderboard-entry ${['gold','silver','bronze'][i] || ''}">
                <span class="rank">#${i + 1}</span>
                <span class="player-name">${entry.playerName || entry.user}</span>
                <span class="score">${entry.score.toLocaleString()}</span>
                ${i === 0 && isOffline ? '<span class="offline-badge">📱</span>' : ''}
            </li>`
        )).join('');
        
        // Update header
        const globalHeader = document.querySelector('#globalLeaderboard').parentElement.querySelector('.leaderboard-header');
        if (globalHeader) {
            globalHeader.textContent = `GLOBAL LEADERS${offlineIndicator}`;
        }
        
        // Update container class for responsive styling
        const leaderboardOverlay = document.getElementById('leaderboardOverlay');
        if (leaderboardOverlay) {
            leaderboardOverlay.className = this.isMobile ? 'leaderboard-overlay mobile' : 'leaderboard-overlay desktop';
        }
    }
    
    renderPersonalLeaderboard() {
        const personalLimit = 3; // Always show top 3 personal scores
        const personalUnique = Array.from(new Set(this.highScores.map(s => s.score)))
            .sort((a, b) => b - a)
            .slice(0, personalLimit)
            .map(score => this.highScores.find(s => s.score === score));

        const personalList = document.getElementById('personalLeaderboard');
        if (!personalList) return;
        
        personalList.innerHTML = personalUnique.length
            ? personalUnique.map((entry, i) => (
                `<li class="leaderboard-entry ${['gold','silver','bronze'][i] || ''}">
                    <span class="rank">#${i + 1}</span>
                    <span class="player-name">YOU</span>
                    <span class="score">${entry.score.toLocaleString()}</span>
                </li>`
            )).join('')
            : '<li class="no-scores">No personal scores</li>';
    }
    
    renderLocalLeaderboards() {
        this.renderPersonalLeaderboard();
        
        let globalEntries = [];
        try {
            globalEntries = JSON.parse(localStorage.getItem('globalLeaderboard')) || [];
        } catch (e) { 
            globalEntries = []; 
        }

        const displayLimit = this.isMobile ? 5 : 10;
        const globalUnique = Array.from(new Set(globalEntries.map(s => s.score)))
            .sort((a, b) => b - a)
            .slice(0, displayLimit)
            .map(score => globalEntries.find(s => s.score === score));

        const globalList = document.getElementById('globalLeaderboard');
        if (globalList) {
            globalList.innerHTML = globalUnique.length
                ? globalUnique.map((entry, i) => (
                    `<li class="leaderboard-entry ${['gold','silver','bronze'][i] || ''}">
                        <span class="rank">#${i + 1}</span>
                        <span class="player-name">${entry.user}</span>
                        <span class="score">${entry.score.toLocaleString()}</span>
                    </li>`
                )).join('')
                : '<li class="no-scores">No global scores</li>';
        }
    }

    updateGlobalLeaderboard(score) {
        console.log('updateGlobalLeaderboard called - handled by updatePersonalBest');
    }
}
