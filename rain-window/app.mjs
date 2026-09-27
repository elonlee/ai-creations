import { createNote, normalizeState, noteTitle, sceneImage, weatherPreset } from './state.mjs';
import { createRainLayers, lensSourceRect } from './rain.mjs';
import { createGlassRenderer } from './glass.mjs';

const STORAGE_KEY = 'rain-window-journal-v1';
const $ = id => document.getElementById(id);
const raw = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } })();
const state = normalizeState(raw);
if (!raw) {
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date());
  state.notes[0].text = `${date} · 雨\n\n傍晚的城市慢慢亮了起来。\n窗上的雨，把嘈杂的街道变得很远。\n\n今天想记住的一件小事是：`;
}

const editor = $('noteEditor');
const canvas = $('rainCanvas');
const ctx = canvas.getContext('2d', { alpha: true });
const staticCanvas = document.createElement('canvas');
const staticCtx = staticCanvas.getContext('2d', { alpha: true });
const rainAudio = new Audio('./assets/rain-ambience.mp3');
const thunderAudio = new Audio('./assets/thunder.mp3');
rainAudio.loop = true;
rainAudio.preload = 'auto';
thunderAudio.preload = 'auto';
let soundOn = false;
let thunderTimer = null;
let saveTimer = null;
let width = 0;
let height = 0;
let drops = [];
let microDrops = [];
let movingDrops = [];
let lastFrame = 0;
let sceneSource = '';
let scenePhoto = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const glass = createGlassRenderer($('glassCanvas'), reducedMotion);
if (glass) canvas.style.display = 'none';

const sliderSpecs = [
  ['density', '密度', 0, 1, 0.01], ['speed', '速度', 0, 1, 0.01],
  ['size', '雨滴大小', 0, 1, 0.01], ['trails', '雨线长度', 0, 1, 0.01],
  ['wind', '风向', 0, 1, 0.01], ['scale', '尺度', 0.5, 2, 0.01],
  ['fog', '雾气', 0, 1, 0.01], ['refraction', '折射', 0, 1, 0.01],
  ['dispersion', '色散', 0, 1, 0.01], ['fontSize', '文字大小', 16, 32, 1],
  ['soundVolume', '音量', 0, 1, 0.01]
];
const sliderMap = new Map();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('saveStatus').textContent = '已保存至此浏览器';
    $('panelSaveStatus').textContent = '已保存';
    return true;
  } catch {
    $('saveStatus').textContent = '保存失败：浏览器空间不足';
    $('panelSaveStatus').textContent = '保存失败';
    return false;
  }
}

function scheduleSave() {
  $('saveStatus').textContent = '正在保存…';
  $('panelSaveStatus').textContent = '保存中…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 320);
}

function currentNote() {
  return state.notes.find(note => note.id === state.activeId) || state.notes[0];
}

function renderNotes() {
  const list = $('noteList');
  list.replaceChildren();
  for (const note of [...state.notes].reverse()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `note-card${note.id === state.activeId ? ' active' : ''}`;
    button.setAttribute('aria-current', note.id === state.activeId ? 'true' : 'false');
    const title = document.createElement('strong');
    title.textContent = noteTitle(note);
    const time = document.createElement('small');
    time.textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(note.updatedAt));
    button.append(title, time);
    button.addEventListener('click', () => {
      state.activeId = note.id;
      renderEditor();
      renderNotes();
      scheduleSave();
      if (innerWidth <= 760) setPanelOpen(false);
      editor.focus();
    });
    list.append(button);
  }
  $('noteCount').textContent = `${state.notes.length} NOTE${state.notes.length > 1 ? 'S' : ''}`;
}

function renderEditor() {
  editor.value = currentNote().text;
  $('wordCount').textContent = `${editor.value.replace(/\s/g, '').length} 字`;
  editor.style.setProperty('--writing-size', `${state.settings.fontSize}px`);
  editor.style.setProperty('--writing-color', state.settings.textColor);
}

function makeSlider(spec, container) {
  const [key, label, min, max, step] = spec;
  const wrap = document.createElement('label');
  wrap.className = 'slider-row';
  const line = document.createElement('span');
  line.className = 'slider-label';
  const name = document.createElement('span');
  name.textContent = label;
  const output = document.createElement('output');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = state.settings[key];
  input.setAttribute('aria-label', label);
  line.append(name, output);
  wrap.append(line, input);
  container.append(wrap);
  sliderMap.set(key, { input, output });
  input.addEventListener('input', () => {
    state.settings[key] = Number(input.value);
    updateSliderValue(key);
    applySettings(key);
    scheduleSave();
  });
  updateSliderValue(key);
}

function updateSliderValue(key) {
  const slider = sliderMap.get(key);
  if (!slider) return;
  slider.input.value = state.settings[key];
  slider.output.value = key === 'fontSize' ? `${state.settings[key]} px` : Number(state.settings[key]).toFixed(2);
}

function renderControls() {
  for (const key of sliderMap.keys()) updateSliderValue(key);
  document.querySelectorAll('[data-weather]').forEach(button => {
    button.classList.toggle('active', button.dataset.weather === state.settings.weather);
    button.setAttribute('aria-pressed', String(button.dataset.weather === state.settings.weather));
  });
  document.querySelectorAll('[data-scene]').forEach(button => {
    button.classList.toggle('active', button.dataset.scene === state.settings.scene);
    button.setAttribute('aria-pressed', String(button.dataset.scene === state.settings.scene));
  });
  $('uploadTrigger').classList.toggle('active', state.settings.scene === 'custom');
  $('uploadTrigger').setAttribute('aria-pressed', String(state.settings.scene === 'custom'));
  document.querySelectorAll('[data-color]').forEach(button => {
    button.classList.toggle('active', button.dataset.color === state.settings.textColor);
    button.setAttribute('aria-pressed', String(button.dataset.color === state.settings.textColor));
  });
}

function applySettings(changed = 'all') {
  const s = state.settings;
  const source = s.scene === 'custom' && s.customImage ? s.customImage : sceneImage(s.scene);
  $('backdrop').style.backgroundImage = `url('${source}')`;
  $('backdrop').style.filter = `blur(${1.5 + s.fog * 3.5}px) saturate(${1.04 - s.fog * 0.08}) brightness(1.02)`;
  loadScene(source);
  glass?.setSettings(s, changed);
  $('mist').style.opacity = String(0.08 + s.fog * 0.62);
  editor.style.setProperty('--writing-size', `${s.fontSize}px`);
  editor.style.setProperty('--writing-color', s.textColor);
  rainAudio.volume = s.soundVolume * 0.72;
  thunderAudio.volume = s.soundVolume * 0.75;
  if (!glass && (changed === 'all' || ['density', 'size', 'trails', 'scale', 'fog', 'refraction', 'dispersion'].includes(changed))) buildRain();
  renderControls();
}

function loadScene(source) {
  if (source === sceneSource) return;
  sceneSource = source;
  scenePhoto = null;
  const image = new Image();
  image.onload = () => {
    if (sceneSource !== source) return;
    scenePhoto = image;
    if (glass) glass.setScene(image);
    else buildRain();
  };
  image.onerror = () => { if (sceneSource === source) scenePhoto = null; };
  image.src = source;
}

function buildRain() {
  if (!width || !height) return;
  const layers = createRainLayers(width, height, state.settings);
  microDrops = layers.micro;
  drops = layers.beads;
  movingDrops = reducedMotion.matches ? [] : layers.runners;
  staticCtx.clearRect(0, 0, width, height);
  microDrops.forEach(drop => drawMicro(staticCtx, drop));
  drops.forEach(drop => drawBead(staticCtx, drop));
  if (reducedMotion.matches) drawFrame(0);
}

function drawMicro(target, drop) {
  const { x, y, r } = drop;
  target.beginPath();
  target.arc(x, y, r, 0, Math.PI * 2);
  target.fillStyle = 'rgba(4,42,63,.53)';
  target.fill();
  if (r > .55) {
    target.beginPath();
    target.arc(x - r * .32, y - r * .32, Math.max(.24, r * .33), 0, Math.PI * 2);
    target.fillStyle = 'rgba(228,249,255,.62)';
    target.fill();
  }
}

function beadPath(target, drop) {
  const { x, y, r } = drop;
  const h = r * drop.aspect;
  const tilt = drop.tilt * r;
  target.beginPath();
  target.moveTo(x + tilt, y - h);
  target.bezierCurveTo(x + r * .55, y - h * .95, x + r * .95, y - h * .2, x + r * .91, y + h * .36);
  target.bezierCurveTo(x + r * .87, y + h * .85, x + r * .34, y + h, x, y + h);
  target.bezierCurveTo(x - r * .66, y + h, x - r * .91, y + h * .48, x - r * .84, y - h * .05);
  target.bezierCurveTo(x - r * .78, y - h * .55, x - r * .34, y - h * .9, x + tilt, y - h);
  target.closePath();
}

function drawTrail(target, drop) {
  if (drop.trailLength < 4) return;
  const { x, y, r, wobble, trailLength: length } = drop;
  const top = y - r * drop.aspect;
  const bend = wobble * r * 1.1;
  target.beginPath();
  target.moveTo(x, top);
  target.bezierCurveTo(x + bend, top - length * .25, x - bend * .9, top - length * .72, x + bend * .45, top - length);
  const trail = target.createLinearGradient(x, top, x, top - length);
  trail.addColorStop(0, 'rgba(1,24,40,.56)');
  trail.addColorStop(.7, 'rgba(5,39,60,.23)');
  trail.addColorStop(1, 'rgba(3,43,65,0)');
  target.strokeStyle = trail;
  target.lineWidth = Math.max(.7, r * .2);
  target.stroke();
  target.beginPath();
  target.moveTo(x - Math.max(.4, r * .18), top);
  target.quadraticCurveTo(x + bend * .4, top - length * .45, x + bend * .45 - .5, top - length);
  target.strokeStyle = 'rgba(191,235,244,.16)';
  target.lineWidth = .55;
  target.stroke();
}

function drawBead(target, drop) {
  const s = state.settings;
  const { x, y, r } = drop;
  const h = r * drop.aspect;
  if (drop.trailLength && s.trails > .05) drawTrail(target, drop);
  target.save();
  target.shadowColor = 'rgba(0,10,21,.4)';
  target.shadowBlur = Math.max(.7, r * .34);
  target.shadowOffsetX = r * .28;
  target.shadowOffsetY = r * .34;
  beadPath(target, drop);
  target.fillStyle = 'rgba(5,50,75,.38)';
  target.fill();
  target.restore();

  target.save();
  beadPath(target, drop);
  target.clip();
  if (scenePhoto?.naturalWidth) {
    const sample = lensSourceRect({ width: scenePhoto.naturalWidth, height: scenePhoto.naturalHeight }, { width, height }, drop, s.refraction);
    target.globalAlpha = .58 + s.refraction * .35;
    target.drawImage(scenePhoto, sample.sx, sample.sy, sample.sw, sample.sh, x - r, y - h, 2 * r, 2 * h);
    target.globalAlpha = 1;
  }
  const body = target.createLinearGradient(x - r, y - h, x + r, y + h);
  body.addColorStop(0, 'rgba(233,250,255,.46)');
  body.addColorStop(.25, 'rgba(104,193,226,.17)');
  body.addColorStop(.7, 'rgba(33,108,150,.12)');
  body.addColorStop(1, 'rgba(0,22,39,.26)');
  target.fillStyle = body;
  target.fillRect(x - r, y - h, 2 * r, 2 * h);
  target.restore();

  beadPath(target, drop);
  target.strokeStyle = `rgba(1,29,48,${.35 + s.refraction * .23})`;
  target.lineWidth = r > 8 ? 1.15 : .7;
  target.stroke();
  target.beginPath();
  target.moveTo(x - r * .57, y - h * .46);
  target.quadraticCurveTo(x - r * .63, y - h * .82, x - r * .1, y - h * .83);
  target.strokeStyle = `rgba(239,252,255,${.48 + s.refraction * .36})`;
  target.lineWidth = r > 7 ? 1.15 : .65;
  target.stroke();
  target.beginPath();
  target.ellipse(x - r * .34, y - h * .47, Math.max(.32, r * .15), Math.max(.38, h * .2), -.35, 0, Math.PI * 2);
  target.fillStyle = 'rgba(244,253,255,.58)';
  target.fill();
  if (r > 5) {
    target.beginPath();
    target.arc(x + r * .47, y + h * .43, r * .24, -.2, 1.55);
    target.strokeStyle = `rgba(144,209,240,${s.dispersion * .3})`;
    target.lineWidth = .7;
    target.stroke();
  }
}

function drawFrame(delta) {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(staticCanvas, 0, 0, width, height);
  for (const drop of movingDrops) {
    if (delta && !reducedMotion.matches) {
      drop.y += drop.velocity * (0.35 + state.settings.speed * 3.3) * delta / 1000;
      drop.x += (state.settings.wind - .5) * 22 * delta / 1000;
      if (drop.y > height + 25) { drop.y = -25; drop.x = Math.random() * width; }
      if (drop.x < -20) drop.x = width + 20;
      if (drop.x > width + 20) drop.x = -20;
    }
    drawBead(ctx, drop);
  }
}

function animate(time) {
  if (glass) {
    glass.frame(time);
    requestAnimationFrame(animate);
    return;
  }
  const delta = Math.min(50, time - (lastFrame || time));
  lastFrame = time;
  if (!reducedMotion.matches) drawFrame(delta);
  requestAnimationFrame(animate);
}

function resizeRain() {
  if (glass) {
    glass.resize(innerWidth, innerHeight);
    return;
  }
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  width = innerWidth;
  height = innerHeight;
  canvas.width = staticCanvas.width = Math.round(width * ratio);
  canvas.height = staticCanvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  staticCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  buildRain();
  drawFrame(0);
}

function playThunder() {
  thunderAudio.currentTime = 0;
  thunderAudio.play().catch(() => { $('panelSaveStatus').textContent = '请先开启声音'; });
  if (!reducedMotion.matches) {
    $('lightning').classList.remove('flash');
    void $('lightning').offsetWidth;
    $('lightning').classList.add('flash');
  }
}

function scheduleThunder() {
  clearTimeout(thunderTimer);
  if (!soundOn || !['thunder', 'storm'].includes(state.settings.weather)) return;
  const delay = (state.settings.weather === 'thunder' ? 11000 : 25000) + Math.random() * 16000;
  thunderTimer = setTimeout(() => { playThunder(); scheduleThunder(); }, delay);
}

async function setSound(on) {
  soundOn = on;
  if (soundOn) {
    try { await rainAudio.play(); }
    catch { soundOn = false; $('panelSaveStatus').textContent = '浏览器未能播放声音'; }
  } else {
    rainAudio.pause();
    thunderAudio.pause();
  }
  $('soundToggle').setAttribute('aria-pressed', String(soundOn));
  $('soundToggle').querySelector('span:nth-child(2)').textContent = soundOn ? '关闭雨声' : '开启雨声';
  scheduleThunder();
}

function setPanelOpen(open) {
  $('controlPanel').classList.toggle('is-hidden', !open);
  $('reopenPanel').classList.toggle('show', !open);
  $('panelToggle').setAttribute('aria-expanded', String(open));
}

function setFocusMode(on) {
  document.body.classList.toggle('focus-mode', on);
  $('focusToggle').setAttribute('aria-pressed', String(on));
  if (on) editor.focus();
}

function loadCustomImage(file) {
  if (!file || !file.type.startsWith('image/')) { $('uploadMessage').textContent = '请选择图片文件。'; return; }
  if (file.size > 20 * 1024 * 1024) { $('uploadMessage').textContent = '图片超过 20 MB，请选择较小的文件。'; return; }
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    const scale = Math.min(1, 1920 / image.width, 1080 / image.height);
    const output = document.createElement('canvas');
    output.width = Math.max(1, Math.round(image.width * scale));
    output.height = Math.max(1, Math.round(image.height * scale));
    output.getContext('2d').drawImage(image, 0, 0, output.width, output.height);
    state.settings.customImage = output.toDataURL('image/jpeg', .76);
    state.settings.scene = 'custom';
    URL.revokeObjectURL(objectUrl);
    $('uploadMessage').textContent = '已使用你的照片，内容只保存在此浏览器。';
    applySettings('scene');
    scheduleSave();
  };
  image.onerror = () => { URL.revokeObjectURL(objectUrl); $('uploadMessage').textContent = '图片无法读取，请更换文件。'; };
  image.src = objectUrl;
}

function bindEvents() {
  editor.addEventListener('input', () => {
    const note = currentNote();
    note.text = editor.value;
    note.updatedAt = new Date().toISOString();
    $('wordCount').textContent = `${editor.value.replace(/\s/g, '').length} 字`;
    renderNotes();
    scheduleSave();
  });
  document.querySelectorAll('[data-weather]').forEach(button => button.addEventListener('click', () => {
    state.settings.weather = button.dataset.weather;
    Object.assign(state.settings, weatherPreset(button.dataset.weather));
    applySettings('all');
    scheduleThunder();
    scheduleSave();
  }));
  document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => {
    state.settings.scene = button.dataset.scene;
    applySettings('scene');
    scheduleSave();
  }));
  $('uploadTrigger').addEventListener('click', () => $('imageInput').click());
  $('imageInput').addEventListener('change', event => { loadCustomImage(event.target.files[0]); event.target.value = ''; });
  $('newNote').addEventListener('click', () => {
    const note = createNote();
    state.notes.push(note);
    state.activeId = note.id;
    renderEditor();
    renderNotes();
    scheduleSave();
    if (innerWidth <= 760) setPanelOpen(false);
    editor.focus();
  });
  $('deleteNote').addEventListener('click', () => {
    if (!confirm('删除当前手记？删除后无法恢复。')) return;
    state.notes = state.notes.filter(note => note.id !== state.activeId);
    if (!state.notes.length) state.notes.push(createNote());
    state.activeId = state.notes.at(-1).id;
    renderEditor();
    renderNotes();
    scheduleSave();
  });
  $('notesShortcut').addEventListener('click', () => { setPanelOpen(true); $('notesSection').open = true; $('notesSection').scrollIntoView({ block: 'nearest' }); });
  $('panelToggle').addEventListener('click', () => setPanelOpen($('controlPanel').classList.contains('is-hidden')));
  $('closePanel').addEventListener('click', () => setPanelOpen(false));
  $('reopenPanel').addEventListener('click', () => setPanelOpen(true));
  $('focusToggle').addEventListener('click', () => setFocusMode(!document.body.classList.contains('focus-mode')));
  $('soundToggle').addEventListener('click', () => setSound(!soundOn));
  $('previewThunder').addEventListener('click', playThunder);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('focus-mode')) { setFocusMode(false); return; }
    if (event.target.closest('textarea,input,[contenteditable]') || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() === 'h') setFocusMode(!document.body.classList.contains('focus-mode'));
    if (event.key.toLowerCase() === 'p') setPanelOpen($('controlPanel').classList.contains('is-hidden'));
  });
  addEventListener('resize', resizeRain);
  reducedMotion.addEventListener('change', () => { if (!glass) buildRain(); });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); });
}

function start() {
  const groups = {
    rainSliders: sliderSpecs.slice(0, 6), glassSliders: sliderSpecs.slice(6, 9),
    textSliders: sliderSpecs.slice(9, 10), soundSliders: sliderSpecs.slice(10)
  };
  for (const [id, specs] of Object.entries(groups)) specs.forEach(spec => makeSlider(spec, $(id)));
  const colors = [
    ['#edf4f7', '月白'], ['#f2e4ce', '暖白'], ['#ffc78c', '杏黄'], ['#ffa8b5', '浅粉'],
    ['#a1e6cf', '薄荷'], ['#a4ceff', '雾蓝'], ['#cdb6fb', '丁香'], ['#142331', '深蓝']
  ];
  for (const [color, name] of colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-option';
    button.dataset.color = color;
    button.style.setProperty('--swatch', color);
    button.setAttribute('aria-label', name);
    button.title = name;
    button.addEventListener('click', () => { state.settings.textColor = color; applySettings('textColor'); scheduleSave(); });
    $('colorOptions').append(button);
  }
  $('todayLabel').textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()) + ' · 听雨，写今天';
  renderEditor();
  renderNotes();
  applySettings('all');
  bindEvents();
  resizeRain();
  if (innerWidth <= 760) setPanelOpen(false);
  requestAnimationFrame(animate);
  if (!raw) persist();
}

start();
