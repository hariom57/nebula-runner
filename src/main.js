import { initAuth } from './auth.js';
import GameEngine from './game/GameEngine.js';
import MenuManager from './ui/MenuManager.js';
import levels from './levels/levelConfig.js';
import UISystem from './systems/UISystem.js';
import * as THREE from 'three';

// Create centralized loading manager
let loadingManager = new THREE.LoadingManager();

// SciFiLoader class definition
class SciFiLoader {
  constructor() {
    this.loadingScreen = document.getElementById('loadingScreen');
    this.progressCircle = document.getElementById('progressCircle');
    this.progressPercentage = document.getElementById('progressPercentage');
    this.loadingStatus = document.getElementById('loadingStatus');
    
    this.circumference = 2 * Math.PI * 90;
    this.progressCircle.style.strokeDasharray = this.circumference;
    this.progressCircle.style.strokeDashoffset = this.circumference;
    
    this.loadingStages = [
      { threshold: 0, status: 'INITIALIZING SYSTEMS...', system: 'engineStatus' },
      { threshold: 25, status: 'LOADING ENVIRONMENT DATA...', system: 'environmentStatus' },
      { threshold: 60, status: 'PROCESSING ASSETS...', system: 'assetsStatus' },
      { threshold: 90, status: 'FINALIZING LAUNCH SEQUENCE...', system: null },
      { threshold: 100, status: 'LAUNCH READY', system: null }
    ];

    this.debugMode = true;
  }

  updateProgress(progress) {
    if (this.debugMode) {
      console.log(`SciFiLoader: Updating progress to ${progress}%`);
    }
    progress = Math.max(0, Math.min(100, progress));
    const offset = this.circumference - (progress / 100) * this.circumference;
    this.progressCircle.style.strokeDashoffset = offset;
    this.progressPercentage.textContent = `${Math.round(progress)}%`;
    this.updateLoadingStage(progress);
  }

  updateLoadingStage(progress) {
    const currentStage = this.loadingStages
      .filter(stage => progress >= stage.threshold)
      .pop();
    if (currentStage) {
      this.loadingStatus.textContent = currentStage.status;
      if (currentStage.system) {
        this.activateSystem(currentStage.system);
      }
    }
  }

  activateSystem(systemId) {
    const systemElement = document.getElementById(systemId);
    if (systemElement && !systemElement.classList.contains('active')) {
      systemElement.classList.add('active');
      systemElement.querySelector('.status-indicator').textContent = 'ONLINE';
    }
  }

  reset() {
    // Reset all system indicators to STANDBY
    ['engineStatus', 'environmentStatus', 'assetsStatus'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.remove('active');
        element.querySelector('.status-indicator').textContent = 'STANDBY';
      }
    });
    
    // Reset progress visuals
    this.progressCircle.style.strokeDashoffset = this.circumference;
    this.progressPercentage.textContent = '0%';
    this.loadingStatus.textContent = 'INITIALIZING SYSTEMS...';
  }

  show() {
    this.loadingScreen.style.display = 'flex';
    this.loadingScreen.style.opacity = '1';
    this.reset();
  }

  hide() {
    this.loadingScreen.style.opacity = '0';
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 500);
  }
}



class EnhancedSciFiLoader extends SciFiLoader {
  constructor() {
    super();
    this.consoleMessages = [
      "Initializing quantum drives...",
      "Calibrating navigation systems...",
      "Loading stellar cartography...",
      "Synchronizing temporal matrix...",
      "Establishing neural link...",
      "Charging plasma conduits...",
      "Activating defensive arrays...",
      "Loading mission parameters..."
    ];
    this.currentMessage = 0;
    this.messageInterval = null;
  }

  show() {
    super.show();
    this.startActivityAnimations();
  }

  startActivityAnimations() {
    // Start typewriter console messages
    this.typewriterEffect();
    
    // Start floating particles
    this.createFloatingParticles();
    
    // Start data stream animation
    this.animateDataStream();
  }

  typewriterEffect() {
    const consoleElement = document.getElementById('consoleOutput');
    const message = this.consoleMessages[this.currentMessage];
    let i = 0;
    
    consoleElement.innerHTML = '';
    
    const typeInterval = setInterval(() => {
      if (i < message.length) {
        consoleElement.innerHTML += message.charAt(i);
        i++;
      } else {
        clearInterval(typeInterval);
        this.currentMessage = (this.currentMessage + 1) % this.consoleMessages.length;
        setTimeout(() => this.typewriterEffect(), 2000);
      }
    }, 50);
  }

  createFloatingParticles() {
    const container = document.querySelector('.loading-container');
    for (let i = 0; i < 5; i++) {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 2 + 's';
      container.appendChild(particle);
    }
  }
}






const menu = new MenuManager();
const uiSystem = new UISystem();
const sciFiLoader = new SciFiLoader();
window.sciFiLoader = sciFiLoader;

let currentGame = null;
let currentLevelIndex = 0;

// Setup loading manager callbacks function
function setupLoadingCallbacks() {
  loadingManager.onProgress = (url, loaded, total) => {
    const progress = (loaded / total) * 100;
    console.log(`Loading progress: ${progress.toFixed(1)}% (${loaded}/${total})`);
    sciFiLoader.updateProgress(progress);
  };

  loadingManager.onLoad = () => {
    console.log('All assets loaded - hiding loader');
    setTimeout(() => {
      sciFiLoader.hide();
    }, 500);
  };

  loadingManager.onError = (url) => {
    console.error('Failed to load asset:', url);
    sciFiLoader.hide();
  };
}

// Initial setup
setupLoadingCallbacks();

// Hide loading screen on page load
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  menu.showHome();
  sciFiLoader.loadingScreen.style.display = 'none';
});

document.addEventListener('userAuthenticated', () => {
  uiSystem.loadPersonalScores();
  menu.showHome();
});

// Main menu navigation
document.getElementById('playBtn').addEventListener('click', () => startGame(0));
document.getElementById('levelSelectBtn').addEventListener('click', () => {
  menu.showLevelSelect();
});
document.getElementById('backHomeBtn').addEventListener('click', () => menu.showHome());

document.getElementById('selectLevelBtn').addEventListener('click', () => {
  const selectedLevel = menu.getSelectedLevel();
  startGame(selectedLevel);
});

document.getElementById('retryBtn').addEventListener('click', () => {
  document.getElementById('gameOver').style.display = 'none';
  
  // Force show loader and reset states
  sciFiLoader.show();
  
  // Clear cache and create new loading manager for restart
  THREE.Cache.clear();
  loadingManager = new THREE.LoadingManager();
  setupLoadingCallbacks();
  
  startGame(currentLevelIndex);
});

document.getElementById('backToMenuBtn').addEventListener('click', () => {
  document.getElementById('gameOver').style.display = 'none';
  if(currentGame) currentGame.cleanup();
  menu.showHome();
});

document.getElementById('leaderboardBtn').addEventListener('click', () => {
  uiSystem.loadPersonalScores();
  uiSystem.renderLeaderboards();
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('leaderboardOverlay').style.display = 'flex';
});

document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
  document.getElementById('leaderboardOverlay').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'flex';
});

function startGame(levelIndex) {
  // Show loading screen
  sciFiLoader.show();

  currentLevelIndex = levelIndex;
  menu.startGame();

  if(currentGame) {
    currentGame.cleanup();
    THREE.Cache.clear();
    loadingManager = new THREE.LoadingManager();
    setupLoadingCallbacks();
  }
  
  currentGame = new GameEngine({
    ...levels[levelIndex],
    index: levelIndex,
    loadingManager: loadingManager
  });
  currentGame.init();
}

// Initialize to home screen
menu.showHome();
initAuth();
