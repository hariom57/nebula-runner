import { initAuth } from './auth.js';
import GameEngine from './game/GameEngine.js';
import MenuManager from './ui/MenuManager.js';
import levels from './levels/levelConfig.js';
import UISystem from './systems/UISystem.js';

const menu = new MenuManager();
const uiSystem = new UISystem();
let currentGame = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  menu.showHome();
});

document.addEventListener('userAuthenticated', () => {
//   if (currentGame) currentGame.cleanup();
//   currentGame = new GameEngine(levels[0]);
//   currentGame.init();
uiSystem.loadPersonalScores();
menu.showHome(); // Show main menu, do NOT start game!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 
});


// Main menu navigation
document.getElementById('playBtn').addEventListener('click', () => startGame(0));
document.getElementById('levelSelectBtn').addEventListener('click', () => {
  menu.showLevelSelect();
//   menu.populateLevels(levels, startGame);
});
document.getElementById('backHomeBtn').addEventListener('click', () => menu.showHome());

// Level selection
document.getElementById('selectLevelBtn').addEventListener('click', () => {
  const selectedLevel = menu.getSelectedLevel();
  startGame(selectedLevel);
});


// Retry current level
document.getElementById('retryBtn').addEventListener('click', () => {
  document.getElementById('gameOver').style.display = 'none';
  startGame(currentLevelIndex);
});

// Return to main menu
document.getElementById('backToMenuBtn').addEventListener('click', () => {
  document.getElementById('gameOver').style.display = 'none';
  if(currentGame) currentGame.cleanup();
  menu.showHome();
});

// Leaderboard logic
document.getElementById('leaderboardBtn').addEventListener('click', () => {
  // Refresh data before showing
  uiSystem.loadPersonalScores();
  uiSystem.renderLeaderboards();
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('leaderboardOverlay').style.display = 'flex';
});



document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
  document.getElementById('leaderboardOverlay').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'flex';
});


let currentLevelIndex = 0;

// Update startGame call:
function startGame(levelIndex) {
  currentLevelIndex = levelIndex;
  menu.startGame();
  if(currentGame) currentGame.cleanup();
  currentGame = new GameEngine({
    ...levels[levelIndex],
    index: levelIndex // Add index to level config
  });
  currentGame.init();
}

// Simulate/fetch global scores
async function fetchGlobalScores() {
  return JSON.parse(localStorage.getItem('globalLeaderboard')) || [];
}

// Initialize to home screen
menu.showHome();
initAuth();
