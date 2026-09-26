export function scrollProgress(scrollY, viewportHeight, documentHeight) {
  const scrollable = Math.max(0, documentHeight - viewportHeight);
  if (scrollable === 0) return 0;
  return Math.min(1, Math.max(0, scrollY / scrollable));
}

export function chapterAtScroll(starts, scrollY, viewportHeight) {
  const midpoint = scrollY + viewportHeight / 2;
  let current = 0;
  for (let index = 0; index < starts.length; index += 1) {
    if (starts[index] <= midpoint) current = index;
    else break;
  }
  return current;
}

if (typeof document !== 'undefined') {
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.chapter-nav a')];
  const progressBar = document.querySelector('.reading-progress__fill');
  const pageCount = document.querySelector('[data-page-count]');
  let starts = [];
  let scheduled = false;

  function measure() {
    starts = chapters.map((chapter) => chapter.getBoundingClientRect().top + window.scrollY);
    update();
  }

  function update() {
    const index = chapterAtScroll(starts, window.scrollY, window.innerHeight);
    const progress = scrollProgress(window.scrollY, window.innerHeight, document.documentElement.scrollHeight);
    progressBar.style.transform = window.matchMedia('(max-width: 760px)').matches
      ? `scaleX(${progress})`
      : `scaleY(${progress})`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    pageCount.textContent = String(index + 1).padStart(2, '0');
    links.forEach((link, linkIndex) => {
      if (linkIndex === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scheduled = false;
  }

  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();
}
