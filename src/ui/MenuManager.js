export default class MenuManager {
  constructor() {
    this.homeScreen = document.getElementById('homeScreen');
    this.levelSelect = document.getElementById('levelSelectScreen');
    this.gameUI = document.getElementById('gameUI');
  }

  showHome() {
    this.homeScreen.style.display = 'flex';
    this.levelSelect.style.display = 'none';
    this.gameUI.style.display = 'none';
  }

  showLevelSelect() {
    this.homeScreen.style.display = 'none';
    this.levelSelect.style.display = 'flex';
    this.gameUI.style.display = 'none';
  }

  startGame() {
    this.homeScreen.style.display = 'none';
    this.levelSelect.style.display = 'none';
    this.gameUI.style.display = 'block';
  }

  populateLevels(levels, onLevelSelect) {
    const grid = document.getElementById('levelGrid');
    grid.innerHTML = '';
    levels.forEach((level, i) => {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.textContent = level.name;
      btn.onclick = () => onLevelSelect(i);
      if (!level.unlocked) btn.disabled = true;
      grid.appendChild(btn);
    });
  }
}
