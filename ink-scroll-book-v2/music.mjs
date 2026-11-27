import { getSoundscapeMix } from './scene.mjs';

export const TRACKS = Object.freeze([
  {
    title: '阳关三叠',
    src: '../ink-scroll-book/assets/audio/yangguan-sandie.mp3',
    source: 'https://commons.wikimedia.org/wiki/File:Guqin-Yangguan_Sandie.ogg',
  },
  {
    title: '醉渔唱晚',
    src: '../ink-scroll-book/assets/audio/zuiyu-changwan.mp3',
    source: 'https://commons.wikimedia.org/wiki/File:Guqin-Zuiyu_Changwan.ogg',
  },
]);

export const GUQIN_STRINGS = Object.freeze([
  { name: '一弦 · 宫', freq: 146.83 },
  { name: '二弦 · 商', freq: 164.81 },
  { name: '三弦 · 角', freq: 196.0 },
  { name: '四弦 · 徵', freq: 220.0 },
  { name: '五弦 · 羽', freq: 246.94 },
  { name: '六弦 · 少宫', freq: 293.66 },
  { name: '七弦 · 少商', freq: 329.63 },
]);

let sharedCtx = null;

function ensureAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

/**
 * Synthesizes a warm silk-string guqin pluck with subtle Yin/Nao pitch shimmer.
 */
export function pluckGuqinString(index) {
  const stringDef = GUQIN_STRINGS[index];
  if (!stringDef) return false;
  const ctx = ensureAudioContext();
  if (!ctx) return false;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.22, now + 0.018);
  master.gain.exponentialRampToValueAtTime(0.06, now + 0.85);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'lowpass';
  bodyFilter.frequency.setValueAtTime(stringDef.freq * 7.5, now);
  bodyFilter.frequency.exponentialRampToValueAtTime(stringDef.freq * 2.1, now + 1.4);
  bodyFilter.Q.value = 1.6;

  // Fundamental + octave + fifth silk overtone
  const partials = [
    { mult: 1, type: 'triangle', weight: 0.72 },
    { mult: 2, type: 'sine', weight: 0.34 },
    { mult: 3, type: 'sine', weight: 0.14 },
  ];

  partials.forEach((p) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = p.type;
    // Slight downward pitch slide at attack mimicking finger settling onto hui
    osc.frequency.setValueAtTime(stringDef.freq * p.mult * 1.012, now);
    osc.frequency.exponentialRampToValueAtTime(stringDef.freq * p.mult, now + 0.14);
    g.gain.value = p.weight;
    osc.connect(g);
    g.connect(bodyFilter);
    osc.start(now);
    osc.stop(now + 2.9);
  });

  bodyFilter.connect(master);
  master.connect(ctx.destination);
  return true;
}

/**
 * Subtle tactile cinnabar-seal stamp sound on explicit user click.
 */
export function playSealStampCue() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(132, now);
  osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

/**
 * Procedural nature soundscape (rain on bamboo, pine wind, river water) modulated by chapter position.
 */
function createNatureSoundscape() {
  let running = false;
  let nodes = null;
  let dropletTimer = 0;
  let currentMix = { rain: 0.2, wind: 0.2, water: 0.2 };

  function createNoiseBuffer(ctx, seconds = 3) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.8;
    }
    return buffer;
  }

  function scheduleDroplet() {
    if (!running || !sharedCtx || !nodes) return;
    const delay = 420 + Math.random() * 1450;
    dropletTimer = window.setTimeout(() => {
      if (running && currentMix.rain > 0.22 && sharedCtx) {
        const now = sharedCtx.currentTime;
        const osc = sharedCtx.createOscillator();
        const g = sharedCtx.createGain();
        const baseFreq = 680 + Math.random() * 640;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.38, now + 0.055);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.018 * currentMix.rain, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        osc.connect(g);
        g.connect(nodes.master);
        osc.start(now);
        osc.stop(now + 0.1);
      }
      scheduleDroplet();
    }, delay);
  }

  function start() {
    const ctx = ensureAudioContext();
    if (!ctx) return false;
    if (running) return true;

    const buffer = createNoiseBuffer(ctx, 4);
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.8);
    master.connect(ctx.destination);

    // Rain layer: crisp airy bandpass
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buffer;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1850;
    rainFilter.Q.value = 0.65;
    const rainGain = ctx.createGain();
    rainGain.gain.value = currentMix.rain * 0.24;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);

    // Wind layer: gentle pine resonance
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buffer;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 1.9;
    const windGain = ctx.createGain();
    windGain.gain.value = currentMix.wind * 0.26;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);

    // Water layer: warm low river murmur
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = buffer;
    waterSrc.loop = true;
    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'lowpass';
    waterFilter.frequency.value = 340;
    const waterGain = ctx.createGain();
    waterGain.gain.value = currentMix.water * 0.28;
    waterSrc.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(master);

    rainSrc.start();
    windSrc.start();
    waterSrc.start();

    nodes = { master, rainSrc, windSrc, waterSrc, rainGain, windGain, waterGain };
    running = true;
    scheduleDroplet();
    return true;
  }

  function stop() {
    if (!running || !nodes || !sharedCtx) return;
    running = false;
    if (dropletTimer) window.clearTimeout(dropletTimer);
    const { master, rainSrc, windSrc, waterSrc } = nodes;
    const now = sharedCtx.currentTime;
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => {
      try {
        rainSrc.stop();
        windSrc.stop();
        waterSrc.stop();
        master.disconnect();
      } catch {
        // Ignore already stopped audio nodes
      }
    }, 380);
    nodes = null;
  }

  function setPosition(pos) {
    currentMix = getSoundscapeMix(pos);
    if (!running || !nodes || !sharedCtx) return;
    const now = sharedCtx.currentTime;
    nodes.rainGain.gain.setTargetAtTime(currentMix.rain * 0.24, now, 0.25);
    nodes.windGain.gain.setTargetAtTime(currentMix.wind * 0.26, now, 0.25);
    nodes.waterGain.gain.setTargetAtTime(currentMix.water * 0.28, now, 0.25);
  }

  return {
    toggle() {
      if (running) {
        stop();
        return false;
      }
      return start();
    },
    isRunning: () => running,
    setPosition,
  };
}

const soundscape = typeof window !== 'undefined' ? createNatureSoundscape() : null;

export function setSoundscapePosition(pos) {
  soundscape?.setPosition(pos);
}

if (typeof document !== 'undefined') {
  const audio = document.querySelector('[data-music-audio]');
  const toggle = document.querySelector('[data-music-toggle]');
  const next = document.querySelector('[data-music-next]');
  const label = document.querySelector('[data-music-label]');
  const title = document.querySelector('[data-music-title]');
  const status = document.querySelector('[data-music-status]');
  const ambientToggle = document.querySelector('[data-ambient-toggle]');
  const stringButtons = [...document.querySelectorAll('[data-guqin-string]')];
  let trackIndex = 0;

  if (audio && toggle && next && label && title && status) {
    audio.volume = 0.45;
    audio.src = TRACKS[trackIndex].src;

    function syncState() {
      const playing = !audio.paused;
      toggle.setAttribute('aria-pressed', String(playing));
      label.textContent = playing ? '暂停琴音' : '开启音乐';
      title.textContent = `古琴 · ${TRACKS[trackIndex].title}`;
      const player = toggle.closest('.music-player');
      if (player) player.classList.toggle('is-playing', playing);
    }

    async function play() {
      try {
        await audio.play();
        status.textContent = `正在播放古琴曲《${TRACKS[trackIndex].title}》`;
      } catch {
        status.textContent = '录音加载失败，请稍后重试';
        syncState();
      }
    }

    toggle.addEventListener('click', async () => {
      if (audio.paused) await play();
      else {
        audio.pause();
        syncState();
        status.textContent = '古琴音乐已暂停';
      }
    });

    async function selectNextTrack(continuePlaying) {
      audio.pause();
      trackIndex = (trackIndex + 1) % TRACKS.length;
      audio.src = TRACKS[trackIndex].src;
      audio.load();
      syncState();
      status.textContent = `已切换至《${TRACKS[trackIndex].title}》`;
      if (continuePlaying) await play();
    }

    next.addEventListener('click', () => selectNextTrack(!audio.paused));
    audio.addEventListener('ended', () => selectNextTrack(true));
    audio.addEventListener('play', syncState);
    audio.addEventListener('pause', syncState);
    audio.addEventListener('error', () => {
      status.textContent = '录音加载失败，请切换曲目或稍后重试';
      syncState();
    });
    syncState();
  }

  if (ambientToggle && soundscape) {
    ambientToggle.addEventListener('click', () => {
      const active = soundscape.toggle();
      ambientToggle.setAttribute('aria-pressed', String(active));
      ambientToggle.classList.toggle('is-active', active);
      if (status) {
        status.textContent = active ? '已开启山川雨风声景' : '已关闭山川声景';
      }
    });
  }

  stringButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-guqin-string'));
      pluckGuqinString(idx);
      btn.classList.remove('is-plucked');
      void btn.offsetWidth;
      btn.classList.add('is-plucked');
      if (status && GUQIN_STRINGS[idx]) {
        status.textContent = `轻拨${GUQIN_STRINGS[idx].name}`;
      }
      window.setTimeout(() => btn.classList.remove('is-plucked'), 900);
    });
  });
}
