import {
  getContinuousChapterPosition,
  getGanZhiLabel,
  layoutSealCharacters,
  normalizeSealText,
} from './scene.mjs';
import { createInkStage, renderKeepsakeCard } from './ink-stage.mjs';
import { playSealStampCue, setSoundscapePosition } from './music.mjs';

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

const PREFS_KEY = 'ink-scroll-v2-prefs';
const COLOPHON_KEY = 'ink-scroll-v2-colophon';

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in private browsing
  }
}

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.chapter-nav a')];
  const progressBar = document.querySelector('.reading-progress__fill');
  const pageCount = document.querySelector('[data-page-count]');
  const chapterNameDisplay = document.querySelector('[data-chapter-label]');
  const stageCanvas = document.querySelector('#ink-stage');
  const minimapCanvas = document.querySelector('#panorama-minimap');
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  const nightToggle = document.querySelector('[data-toggle-night]');
  const layoutToggle = document.querySelector('[data-toggle-layout]');
  const panoramaToggle = document.querySelector('[data-toggle-panorama]');
  const panoramaExit = document.querySelector('[data-panorama-exit]');
  const panoramaZoomIn = document.querySelector('[data-panorama-zoom-in]');
  const panoramaZoomOut = document.querySelector('[data-panorama-zoom-out]');
  const panoramaZoomLabel = document.querySelector('[data-panorama-zoom-label]');
  const panoramaPrev = document.querySelector('[data-panorama-prev]');
  const panoramaNext = document.querySelector('[data-panorama-next]');
  const uiStatus = document.querySelector('[data-ui-status]');

  const chapterTitles = ['入卷', '听雨', '过桥', '寻山', '归舟', '跋'];

  const stage = stageCanvas ? createInkStage(stageCanvas, minimapCanvas) : null;
  if (stage) stage.start();

  let starts = [];
  let scheduled = false;

  const prefs = readStorage(PREFS_KEY, { night: false, vertical: false });

  function announce(msg) {
    if (uiStatus) uiStatus.textContent = msg;
  }

  function applyNightMode(enabled) {
    prefs.night = Boolean(enabled);
    root.setAttribute('data-theme', prefs.night ? 'night' : 'light');
    if (metaTheme) metaTheme.setAttribute('content', prefs.night ? '#161b19' : '#ede8dc');
    if (nightToggle) {
      nightToggle.setAttribute('aria-pressed', String(prefs.night));
      const label = nightToggle.querySelector('span');
      if (label) label.textContent = prefs.night ? '晴昼' : '夜读';
    }
    stage?.setNightMode(prefs.night);
    writeStorage(PREFS_KEY, prefs);
  }

  function applyVerticalMode(enabled) {
    prefs.vertical = Boolean(enabled);
    root.setAttribute('data-layout', prefs.vertical ? 'vertical' : 'horizontal');
    if (layoutToggle) {
      layoutToggle.setAttribute('aria-pressed', String(prefs.vertical));
      const label = layoutToggle.querySelector('span');
      if (label) label.textContent = prefs.vertical ? '横排' : '竖排';
    }
    writeStorage(PREFS_KEY, prefs);
    window.setTimeout(measure, 60);
  }

  let isPanorama = false;
  function applyPanoramaMode(enabled) {
    isPanorama = Boolean(enabled);
    root.setAttribute('data-mode', isPanorama ? 'panorama' : 'read');
    if (panoramaToggle) panoramaToggle.setAttribute('aria-pressed', String(isPanorama));
    stage?.setPanoramaMode(isPanorama);
    if (isPanorama) {
      announce('已进入净卷赏画模式，可左右拖拽或滚轮浏览三景长卷');
    } else {
      announce('已返回阅读长卷');
    }
  }

  applyNightMode(prefs.night);
  applyVerticalMode(prefs.vertical);

  function measure() {
    starts = chapters.map((chapter) => chapter.getBoundingClientRect().top + window.scrollY);
    update();
  }

  function update() {
    const index = chapterAtScroll(starts, window.scrollY, window.innerHeight);
    const progress = scrollProgress(window.scrollY, window.innerHeight, document.documentElement.scrollHeight);
    const continuous = getContinuousChapterPosition(starts, window.scrollY, window.innerHeight);

    if (progressBar) {
      progressBar.style.transform = window.matchMedia('(max-width: 760px)').matches
        ? `scaleX(${progress})`
        : `scaleY(${progress})`;
      progressBar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    }
    root.style.setProperty('--scroll-progress', progress.toFixed(4));

    if (pageCount) pageCount.textContent = String(index + 1).padStart(2, '0');
    if (chapterNameDisplay) chapterNameDisplay.textContent = chapterTitles[index] ?? '入卷';

    links.forEach((link, linkIndex) => {
      if (linkIndex === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    stage?.setPosition(continuous);
    setSoundscapePosition(continuous);
    scheduled = false;
  }

  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    stage?.resize();
    measure();
  });
  window.addEventListener('load', measure);

  // Subtle ink-reveal observation
  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionReduced || typeof IntersectionObserver === 'undefined') {
    chapters.forEach((ch) => ch.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.14 },
    );
    chapters.forEach((ch) => observer.observe(ch));
  }

  // Pointer parallax & interactive water/paper ripples
  window.addEventListener('pointermove', (e) => {
    if (!stage) return;
    const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    stage.setPointer(nx, ny);
  }, { passive: true });

  document.addEventListener('click', (e) => {
    if (!stage) return;
    const interactive = e.target.closest('a, button, input, textarea, label, [role="button"], .colophon-studio, .bridge-folio');
    if (interactive) return;
    const nx = e.clientX / Math.max(1, window.innerWidth);
    const ny = e.clientY / Math.max(1, window.innerHeight);
    stage.spawnRipple(nx, ny, 44, false);
  });

  // Toolbar triggers
  nightToggle?.addEventListener('click', () => {
    applyNightMode(!prefs.night);
    announce(prefs.night ? '已切换至夜读松烟模式' : '已切换至晴昼宣纸模式');
  });

  layoutToggle?.addEventListener('click', () => {
    applyVerticalMode(!prefs.vertical);
    announce(prefs.vertical ? '已切换为古卷竖排乌丝栏' : '已切换为现代横排舒读');
  });

  panoramaToggle?.addEventListener('click', () => applyPanoramaMode(!isPanorama));
  panoramaExit?.addEventListener('click', () => applyPanoramaMode(false));

  // Panorama drag, wheel pan & zoom controls
  if (stage) {
    let dragging = false;
    let dragStartX = 0;

    function syncZoomLabel() {
      if (panoramaZoomLabel) {
        panoramaZoomLabel.textContent = `${stage.getZoom().toFixed(2).replace(/\.00$/, '')}×`;
      }
    }
    syncZoomLabel();

    window.addEventListener('pointerdown', (e) => {
      if (!isPanorama) return;
      if (e.target.closest('.panorama-hud, .music-player, .site-header')) return;
      dragging = true;
      dragStartX = e.clientX;
      document.body.classList.add('is-panning');
    });

    window.addEventListener('pointermove', (e) => {
      if (!isPanorama || !dragging) return;
      const dx = e.clientX - dragStartX;
      dragStartX = e.clientX;
      stage.panBy(-dx / Math.max(600, window.innerWidth * 1.45));
    });

    window.addEventListener('pointerup', () => {
      dragging = false;
      document.body.classList.remove('is-panning');
    });

    window.addEventListener('wheel', (e) => {
      if (!isPanorama) return;
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      stage.panBy(delta * 0.00055);
    }, { passive: false });

    minimapCanvas?.addEventListener('click', (e) => {
      const rect = minimapCanvas.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
      stage.setPan(ratio);
    });

    panoramaZoomIn?.addEventListener('click', () => {
      stage.setZoom(stage.getZoom() + 0.18);
      syncZoomLabel();
    });
    panoramaZoomOut?.addEventListener('click', () => {
      stage.setZoom(stage.getZoom() - 0.18);
      syncZoomLabel();
    });
    panoramaPrev?.addEventListener('click', () => stage.panBy(-0.16));
    panoramaNext?.addEventListener('click', () => stage.panBy(0.16));
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }
    if (e.key === 'Escape' && isPanorama) {
      applyPanoramaMode(false);
    } else if (e.key.toLowerCase() === 'n') {
      applyNightMode(!prefs.night);
    } else if (e.key.toLowerCase() === 'v') {
      applyVerticalMode(!prefs.vertical);
    } else if (e.key.toLowerCase() === 'p') {
      applyPanoramaMode(!isPanorama);
    } else if (isPanorama && e.key === 'ArrowLeft') {
      stage?.panBy(-0.08);
    } else if (isPanorama && e.key === 'ArrowRight') {
      stage?.panBy(0.08);
    }
  });

  // Margin annotation (眉批) expanders
  document.querySelectorAll('[data-margin-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.margin-note');
      const body = card?.querySelector('.margin-note__body');
      if (!card || !body) return;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      body.hidden = expanded;
      card.classList.toggle('is-open', !expanded);
    });
  });

  // Bridge detail lens hotspots in 过桥
  const bridgeSpots = [...document.querySelectorAll('[data-bridge-spot]')];
  const bridgeImage = document.querySelector('.bridge-image');
  const bridgeCaption = document.querySelector('[data-bridge-caption]');
  const bridgeSpotMap = {
    willow: { pos: '28% 72%', text: '柳岸细雨 · 千万条雨丝替青枝与岸石梳过一遍新绿。' },
    arch: { pos: '66% 78%', text: '石桥拱影 · 半圆桥洞衔着水光，乌篷自倒影深处无声渡过。' },
    village: { pos: '88% 58%', text: '雾中白墙 · 远村马头墙半隐春霭，只余几笔极淡的飞檐墨线。' },
  };
  bridgeSpots.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-bridge-spot');
      const spec = bridgeSpotMap[key];
      if (!spec || !bridgeImage) return;
      bridgeSpots.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      bridgeImage.style.backgroundPosition = spec.pos;
      bridgeImage.classList.add('is-focused');
      if (bridgeCaption) bridgeCaption.textContent = spec.text;
    });
  });

  // Colophon Seal & Keepsake Studio in 跋
  const sealInput = document.querySelector('[data-seal-input]');
  const noteInput = document.querySelector('[data-colophon-note]');
  const sealStyleInputs = [...document.querySelectorAll('input[name="seal-style"]')];
  const sealPresetBtns = [...document.querySelectorAll('[data-seal-preset]')];
  const stampBtn = document.querySelector('[data-stamp-seal]');
  const exportBtn = document.querySelector('[data-export-keepsake]');
  const stampedSealEl = document.querySelector('[data-stamped-seal]');
  const stampedNoteEl = document.querySelector('[data-stamped-note]');
  const stampedDateEl = document.querySelector('[data-stamped-date]');
  const keepsakeWrap = document.querySelector('[data-keepsake-wrap]');
  const keepsakeImg = document.querySelector('[data-keepsake-img]');
  const keepsakeDownload = document.querySelector('[data-keepsake-download]');
  const sealStatus = document.querySelector('[data-seal-status]');

  const colophonState = readStorage(COLOPHON_KEY, {
    sealText: '山水有归',
    sealStyle: 'zhuwen',
    noteText: '',
    stamped: false,
  });

  function renderSealMarkup(sealText, style) {
    if (!stampedSealEl) return;
    const text = normalizeSealText(sealText);
    const layout = layoutSealCharacters(text);
    stampedSealEl.classList.toggle('is-baiwen', style === 'baiwen');
    stampedSealEl.classList.toggle('is-zhuwen', style !== 'baiwen');
    stampedSealEl.innerHTML = '';
    for (let c = 0; c < layout.cols; c += 1) {
      const colSpan = document.createElement('span');
      colSpan.className = 'seal-col';
      for (let r = 0; r < layout.grid[c].length; r += 1) {
        const ch = document.createElement('i');
        ch.textContent = layout.grid[c][r];
        colSpan.appendChild(ch);
      }
      stampedSealEl.appendChild(colSpan);
    }
  }

  function syncColophonUI(animateStamp = false) {
    const cleanSeal = normalizeSealText(colophonState.sealText);
    if (sealInput && sealInput.value !== cleanSeal) sealInput.value = cleanSeal;
    if (noteInput && noteInput.value !== colophonState.noteText) noteInput.value = colophonState.noteText;
    sealStyleInputs.forEach((radio) => {
      radio.checked = radio.value === colophonState.sealStyle;
    });
    sealPresetBtns.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-seal-preset') === cleanSeal));
    });

    renderSealMarkup(cleanSeal, colophonState.sealStyle);
    if (stampedDateEl) stampedDateEl.textContent = getGanZhiLabel();

    if (stampedNoteEl) {
      const trimmed = String(colophonState.noteText ?? '').trim();
      stampedNoteEl.textContent = trimmed ? `「${trimmed}」` : '';
      stampedNoteEl.hidden = !trimmed;
    }

    if (stampedSealEl) {
      stampedSealEl.classList.toggle('is-stamped', Boolean(colophonState.stamped));
      if (animateStamp) {
        stampedSealEl.classList.remove('is-stamping');
        void stampedSealEl.offsetWidth;
        stampedSealEl.classList.add('is-stamping');
      }
    }
  }

  sealInput?.addEventListener('input', () => {
    colophonState.sealText = normalizeSealText(sealInput.value, '山水有归');
    renderSealMarkup(colophonState.sealText, colophonState.sealStyle);
    writeStorage(COLOPHON_KEY, colophonState);
  });

  noteInput?.addEventListener('input', () => {
    colophonState.noteText = noteInput.value.slice(0, 60);
    if (stampedNoteEl) {
      const trimmed = colophonState.noteText.trim();
      stampedNoteEl.textContent = trimmed ? `「${trimmed}」` : '';
      stampedNoteEl.hidden = !trimmed;
    }
    writeStorage(COLOPHON_KEY, colophonState);
  });

  sealStyleInputs.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        colophonState.sealStyle = radio.value;
        syncColophonUI(false);
        writeStorage(COLOPHON_KEY, colophonState);
      }
    });
  });

  sealPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-seal-preset');
      if (!preset) return;
      colophonState.sealText = preset;
      if (sealInput) sealInput.value = preset;
      syncColophonUI(false);
      writeStorage(COLOPHON_KEY, colophonState);
    });
  });

  stampBtn?.addEventListener('click', () => {
    colophonState.sealText = normalizeSealText(sealInput?.value || colophonState.sealText);
    colophonState.noteText = (noteInput?.value || '').slice(0, 60);
    colophonState.stamped = true;
    writeStorage(COLOPHON_KEY, colophonState);
    syncColophonUI(true);
    playSealStampCue();
    if (stage) stage.spawnRipple(0.5, 0.56, 62, true);
    if (sealStatus) sealStatus.textContent = `已落印「${colophonState.sealText}」于卷末`;
  });

  exportBtn?.addEventListener('click', async () => {
    exportBtn.disabled = true;
    if (sealStatus) sealStatus.textContent = '正在裁卷制笺…';
    try {
      const dataUrl = await renderKeepsakeCard({
        sealText: normalizeSealText(colophonState.sealText),
        sealStyle: colophonState.sealStyle,
        noteText: colophonState.noteText,
        dateLabel: getGanZhiLabel(),
      });
      if (keepsakeImg) keepsakeImg.src = dataUrl;
      if (keepsakeDownload) {
        keepsakeDownload.href = dataUrl;
        keepsakeDownload.download = `山水有归处-${normalizeSealText(colophonState.sealText)}.png`;
      }
      if (keepsakeWrap) {
        keepsakeWrap.hidden = false;
        keepsakeWrap.classList.add('is-ready');
      }
      if (sealStatus) sealStatus.textContent = '留笺已成，可点击保存高清长卷书签';
    } catch {
      if (sealStatus) sealStatus.textContent = '留笺绘制失败，请稍后重试';
    } finally {
      exportBtn.disabled = false;
    }
  });

  syncColophonUI(false);
  measure();
}
