/**
 * Slide Presentation System - MilerDev
 * Keyboard: ← → for navigation, F for fullscreen, Esc to exit
 */
(function () {
  let current = 0;
  const slides = document.querySelectorAll('.slide');
  const total = slides.length;
  const progress = document.querySelector('.progress-bar');
  const counter = document.querySelector('.slide-counter');
  const prevBtn = document.querySelector('.nav-prev');
  const nextBtn = document.querySelector('.nav-next');

  function showSlide(index) {
    slides.forEach((s, i) => {
      s.classList.remove('active', 'prev');
      if (i < index) s.classList.add('prev');
    });
    slides[index].classList.add('active');
    current = index;

    // Update progress
    if (progress) {
      progress.style.width = ((current + 1) / total * 100) + '%';
    }

    // Update counter
    if (counter) {
      counter.textContent = (current + 1) + ' / ' + total;
    }

    // Update buttons
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === total - 1;
  }

  function next() {
    if (current < total - 1) showSlide(current + 1);
  }

  function prev() {
    if (current > 0) showSlide(current - 1);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        prev();
        break;
      case 'Home':
        e.preventDefault();
        showSlide(0);
        break;
      case 'End':
        e.preventDefault();
        showSlide(total - 1);
        break;
      case 'f':
      case 'F':
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          toggleFullscreen();
        }
        break;
    }
  });

  // Touch support
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  // Button clicks
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);

  // Initialize
  showSlide(0);
})();
