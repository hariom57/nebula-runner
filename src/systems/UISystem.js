import { getCurrentUser } from '../auth.js';

export default class UISystem {
  constructor() {
    this.highScores = [];
    this.loadPersonalScores();
    // this.gameOverElement = document.getElementById('gameOver');
    // this.leaderboardElement = document.getElementById('leaderboard');
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
  // Always query the DOM when needed
  const gameOverEl = document.getElementById('gameOver');
  const finalScoreEl = document.getElementById('finalScore');
  if (!gameOverEl || !finalScoreEl) {
    console.error('Game over UI elements not found!');
    return;
  }
  finalScoreEl.textContent = finalScore;
  gameOverEl.style.display = 'block';
}


  updatePersonalBest(score) {
    const user = getCurrentUser();
    if (!user) return;

    const newEntry = { user, score, timestamp: Date.now() };

    //personal
    this.highScores = [...this.highScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
   localStorage.setItem(`highScores_${user}`, JSON.stringify(this.highScores));


    // Update global leaderboard simulation
    let globalScores = [];
    try {
      globalScores = JSON.parse(localStorage.getItem('globalLeaderboard')) || [];
    } catch (e) { globalScores = []; }
    globalScores.push(newEntry);
    globalScores = globalScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
    localStorage.setItem('globalLeaderboard', JSON.stringify(globalScores));

    this.renderLeaderboards();
  }

  updateGlobalLeaderboard(score) {
//   Baad me karunga bc 
}

  renderLeaderboards() {
  // Personal Top 3 (deduplicated by score)
  const personalUnique = Array.from(new Set(this.highScores.map(s => s.score)))
    .sort((a, b) => b - a)
    .slice(0, 3)
    .map(score => this.highScores.find(s => s.score === score));

  const personalList = document.getElementById('personalLeaderboard');
  personalList.innerHTML = personalUnique.length
    ? personalUnique.map((entry, i) => (
        `<li class="${['gold','silver','bronze'][i] || ''}">
          <span>YOU</span>
          <span style="margin-left:auto;">${entry.score.toLocaleString()}</span>
        </li>`
      )).join('')
    : '<li>No personal scores</li>';

  // Global Top 3 (deduplicated by score)
  let globalEntries = [];
  try {
    globalEntries = JSON.parse(localStorage.getItem('globalLeaderboard')) || [];
  } catch (e) { globalEntries = []; }

  const globalUnique = Array.from(new Set(globalEntries.map(s => s.score)))
    .sort((a, b) => b - a)
    .slice(0, 3)
    .map(score => globalEntries.find(s => s.score === score));

  const globalList = document.getElementById('globalLeaderboard');
  globalList.innerHTML = globalUnique.length
    ? globalUnique.map((entry, i) => (
        `<li class="${['gold','silver','bronze'][i] || ''}">
          <span>${entry.user}</span>
          <span style="margin-left:auto;">${entry.score.toLocaleString()}</span>
        </li>`
      )).join('')
    : '<li>No global scores</li>';
}




}