import GameEngine from './game/GameEngine.js';
import MenuManager from './ui/MenuManager.js';
import levels from './levels/levelConfig.js';

const menu = new MenuManager();
let currentGame = null;

// Event listeners
document.getElementById('playBtn').addEventListener('click', () => startGame(0));
document.getElementById('levelSelectBtn').addEventListener('click', () => {
  menu.showLevelSelect();
  menu.populateLevels(levels, startGame);
});
document.getElementById('backHomeBtn').addEventListener('click', () => menu.showHome());

function startGame(levelIndex) {
  menu.startGame();
  
  if(currentGame) currentGame.cleanup();
  
  currentGame = new GameEngine(levels[levelIndex]);
  currentGame.init();
}

// Initialize to home screen
menu.showHome();
