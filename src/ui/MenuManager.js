export default class MenuManager {
  constructor() {
    this.homeScreen = document.getElementById('homeScreen');
    this.levelSelect = document.getElementById('levelSelectScreen');
    this.gameUI = document.getElementById('gameUI');
    this.currentSlide = 0;
    this.maxSlides = 3;
    this.selectedLevel = 0;
    this.initLevelSlider();
  }

  initLevelSlider() {
    // Navigation buttons
    document.getElementById('prevLevelBtn')?.addEventListener('click', () => this.previousSlide());
    document.getElementById('nextLevelBtn')?.addEventListener('click', () => this.nextSlide());
    
    // Pagination dots
    document.querySelectorAll('.pagination-dot').forEach((dot, index) => {
      dot.addEventListener('click', () => this.goToSlide(index));
    });
    
    // Card selection
    document.querySelectorAll('.level-card').forEach((card, index) => {
      card.addEventListener('click', () => this.selectCard(index));
    });

    document.addEventListener('DOMContentLoaded', () => {
  const slider = document.querySelector('.level-slider');
  if (!slider) return;

  slider.addEventListener('wheel', function(e) {
    // Only scroll horizontally if shift is NOT held (so shift+scroll works as normal)
    if (e.deltaY !== 0 && !e.shiftKey) {
      e.preventDefault();
      slider.scrollLeft += e.deltaY;
    }
  }, { passive: false });
});

  }

  previousSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateSlider();
    }
  }

  nextSlide() {
    if (this.currentSlide < this.maxSlides - 1) {
      this.currentSlide++;
      this.updateSlider();
    }
  }

  goToSlide(slideIndex) {
    this.currentSlide = slideIndex;
    this.updateSlider();
  }

  selectCard(cardIndex) {
    this.selectedLevel = cardIndex;
    this.currentSlide = cardIndex;
    this.updateSlider();
  }

  getSelectedLevelIndex() {
  return this.currentSlide; // Assuming currentSlide tracks selected card
}

  updateSlider() {
    // Update cards
    document.querySelectorAll('.level-card').forEach((card, index) => {
      card.classList.toggle('active', index === this.currentSlide);
    });
    
    // Update pagination
    document.querySelectorAll('.pagination-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === this.currentSlide);
    });
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevLevelBtn');
    const nextBtn = document.getElementById('nextLevelBtn');
    
    if (prevBtn) prevBtn.disabled = this.currentSlide === 0;
    if (nextBtn) nextBtn.disabled = this.currentSlide === this.maxSlides - 1;
    
    // Center the active card (smooth scroll effect)
    const activeCard = document.querySelector('.level-card.active');
    if (activeCard) {
      activeCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
    }
    
    this.selectedLevel = this.currentSlide;
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
    this.updateSlider();
  }

  startGame() {
    this.homeScreen.style.display = 'none';
    this.levelSelect.style.display = 'none';
    this.gameUI.style.display = 'block';
  }

  // populateLevels(levels, onLevelSelect) {
  //   const grid = document.getElementById('levelGrid');
  //   grid.innerHTML = '';
  //   levels.forEach((level, i) => {
  //     const btn = document.createElement('button');
  //     btn.className = 'level-btn';
  //     btn.textContent = level.name;
  //     btn.onclick = () => onLevelSelect(i);
  //     if (!level.unlocked) btn.disabled = true;
  //     grid.appendChild(btn);
  //   });
  // }
  
  getSelectedLevel() {
    return this.selectedLevel;
  }
}
