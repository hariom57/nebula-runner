export default class UISystem {
  constructor() {
    this.scoreElement = document.getElementById('score').querySelector('span');
    this.coinElement = document.getElementById('coins').querySelector('span');
    this.gameOverScreen = document.getElementById('gameOver');
  }

  update(score, coins = 0) {
    this.scoreElement.textContent = score.toLocaleString();
    this.coinElement.textContent = coins.toLocaleString();
  }

  showGameOver(finalScore) {
    this.gameOverScreen.style.display = 'block';
    document.getElementById('finalScore').textContent = finalScore.toLocaleString();
  }
}
