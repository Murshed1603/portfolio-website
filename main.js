(() => {
  'use strict';

  const TOTAL_FRAMES = 300;
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');

  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let targetFrame = 0;
  let currentFrame = 0;
  let renderedFrame = -1;
  let isResizing = false;
  let needsRedraw = false;

  // LERP speed tuned for immediate responsiveness with organic smoothness
  const LERP_SPEED = 0.16;

  const getFrameUrl = (index) => {
    const pad = String(index + 1).padStart(3, '0');
    return `frames/ezgif-frame-${pad}.jpg`;
  };

  // High-DPI canvas sizing
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    isResizing = true;
  }

  // Draw image centered with aspect-ratio cover fit
  function drawImageCover(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const renderW = iw * scale;
    const renderH = ih * scale;
    const offsetX = (cw - renderW) * 0.5;
    const offsetY = (ch - renderH) * 0.5;

    ctx.fillStyle = '#070709';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  // Find the exact frame or the nearest loaded one
  function getBestAvailableImage(targetIdx) {
    if (images[targetIdx] && images[targetIdx].complete && images[targetIdx].naturalWidth > 0) {
      return images[targetIdx];
    }
    // Search outward for closest ready frame
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 0 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return images[prev];
      }
      const next = targetIdx + offset;
      if (next < TOTAL_FRAMES && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return images[next];
      }
    }
    return null;
  }

  function render(frameIndex) {
    const img = getBestAvailableImage(frameIndex);
    if (img) {
      drawImageCover(img);
    }
  }

  // Robust parallel image preloader
  function preloadImages() {
    // 1. Immediately request Frame 0 so there is zero initial blank screen
    const firstImg = new Image();
    firstImg.onload = () => {
      images[0] = firstImg;
      loadedCount++;
      render(0);
      renderedFrame = 0;
      updateLoader();
      loadRemainingFrames();
    };
    firstImg.onerror = () => {
      console.warn('Frame 0 failed to load:', firstImg.src);
      loadRemainingFrames();
    };
    firstImg.src = getFrameUrl(0);
  }

  function loadRemainingFrames() {
    const CONCURRENCY = 12;
    let nextIdx = 1;

    function loadNext() {
      if (nextIdx >= TOTAL_FRAMES) return;
      const idx = nextIdx++;

      const img = new Image();
      img.onload = () => {
        images[idx] = img;
        loadedCount++;
        needsRedraw = true;
        updateLoader();
        loadNext();
      };
      img.onerror = () => {
        loadedCount++;
        loadNext();
      };
      img.src = getFrameUrl(idx);
    }

    for (let i = 0; i < CONCURRENCY; i++) {
      loadNext();
    }
  }

  function updateLoader() {
    const pct = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (loader) {
      loader.style.width = `${pct}%`;
      if (loadedCount >= TOTAL_FRAMES) {
        setTimeout(() => {
          loader.classList.add('loaded');
        }, 250);
      }
    }
  }

  // Animation render loop
  function loop() {
    // Real-time dynamic scroll calculation directly on each animation frame
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scrollFraction = Math.max(0, Math.min(1, scrollY / maxScroll));
    targetFrame = scrollFraction * (TOTAL_FRAMES - 1);

    const diff = targetFrame - currentFrame;
    currentFrame += diff * LERP_SPEED;

    if (Math.abs(diff) < 0.001) {
      currentFrame = targetFrame;
    }

    const frameToDraw = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentFrame)));

    if (frameToDraw !== renderedFrame || isResizing || needsRedraw) {
      render(frameToDraw);
      renderedFrame = frameToDraw;
      isResizing = false;
      needsRedraw = false;
    }

    requestAnimationFrame(loop);
  }

  // Smooth scroll handler for in-page anchor links
  function initSmoothAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          const navOffset = 80;
          const targetTop = targetEl.getBoundingClientRect().top + window.pageYOffset - navOffset;
          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // Event Listeners
  window.addEventListener('resize', () => {
    resizeCanvas();
  }, { passive: true });

  // Init
  resizeCanvas();
  preloadImages();
  initSmoothAnchorScroll();
  requestAnimationFrame(loop);

})();
