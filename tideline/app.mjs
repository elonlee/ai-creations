import { getSceneState, getStoryPosition, getTideOffset, getWaveDisplacement } from './scene.mjs';

const canvas = document.querySelector('#seascape');
const context = canvas.getContext('2d', { alpha: false });
const chapters = [...document.querySelectorAll('[data-chapter]')];
const navLinks = [...document.querySelectorAll('[data-nav]')];
const progressLine = document.querySelector('#nav-progress');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let width = 0;
let height = 0;
let pixelRatio = 1;
let targetPosition = 0;
let renderedPosition = 0;
let pointerX = 0;
let pointerY = 0;
let animationId = 0;

const random = (() => {
  let seed = 41519;
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
})();
const stars = Array.from({ length: 90 }, () => ({ x: random(), y: random() * .68, r: .3 + random() * 1.3, phase: random() * 6.28 }));
const flecks = Array.from({ length: 44 }, () => ({ x: random(), y: random(), r: .4 + random() * 1.5, phase: random() * 6.28 }));

const rgb = (color, alpha = 1) => `rgba(${color.map(Math.round).join(',')},${alpha})`;
const waveLayers = [
  { depth: .15, amplitude: 7, phase: .2, opacity: .26, crest: .2, lineWidth: 1 },
  { depth: .43, amplitude: 14, phase: 1.1, opacity: .45, crest: .34, lineWidth: 1.6 },
  { depth: .73, amplitude: 23, phase: 2.2, opacity: .67, crest: .55, lineWidth: 2.2 },
];

function resize() {
  if (!context) return;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (motionQuery.matches) render(0);
}

function fillGradient(top, bottom) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, rgb(top));
  gradient.addColorStop(1, rgb(bottom));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function traceWave(baseY, amplitude, phase, time) {
  context.beginPath();
  for (let x = -24; x <= width + 24; x += 12) {
    const y = baseY + getWaveDisplacement(x, time, width, amplitude, phase);
    if (x === -24) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
}

function drawWaveBand(scene, horizon, time, layer) {
  const baseY = horizon + (height - horizon) * layer.depth;
  const amplitude = layer.amplitude * scene.waveEnergy;
  const highlight = scene.sea.map((value, index) => value * .7 + scene.sun[index] * .3);

  traceWave(baseY, amplitude, layer.phase, time);
  context.lineTo(width + 24, height);
  context.lineTo(-24, height);
  context.closePath();
  const body = context.createLinearGradient(0, baseY - amplitude, 0, height);
  body.addColorStop(0, rgb(highlight, layer.opacity));
  body.addColorStop(.24, rgb(scene.sea, layer.opacity * .82));
  body.addColorStop(1, rgb(scene.skyTop, .58));
  context.fillStyle = body;
  context.fill();

  traceWave(baseY, amplitude, layer.phase, time);
  context.strokeStyle = rgb(scene.sun, layer.crest);
  context.lineWidth = layer.lineWidth;
  context.shadowColor = rgb(scene.glow, layer.crest);
  context.shadowBlur = layer.lineWidth * 6;
  context.stroke();
  context.shadowBlur = 0;
}

function render(time) {
  if (!context || !width || !height) return;
  const scene = getSceneState(renderedPosition);
  const horizon = height * scene.horizon + getTideOffset(time, 8 * scene.waveEnergy);
  const parallaxX = pointerX * 10;
  const parallaxY = pointerY * 6;
  const sunX = width * scene.sunX + parallaxX;
  const sunY = height * scene.sunY + parallaxY;
  const radius = Math.min(width * .21, height * .23, 220);

  fillGradient(scene.skyTop, scene.skyBottom);

  const skyLight = context.createRadialGradient(sunX, sunY, radius * .12, sunX, sunY, Math.max(width * .62, height * .85));
  skyLight.addColorStop(0, rgb(scene.glow, .32));
  skyLight.addColorStop(.38, rgb(scene.glow, .11));
  skyLight.addColorStop(1, rgb(scene.glow, 0));
  context.fillStyle = skyLight;
  context.fillRect(0, 0, width, height);

  for (const star of stars) {
    const alpha = scene.stars * (.33 + .2 * Math.sin(time * .0007 + star.phase));
    context.beginPath();
    context.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
    context.fillStyle = `rgba(240,244,255,${alpha})`;
    context.fill();
  }

  const halo = context.createRadialGradient(sunX, sunY, radius * .45, sunX, sunY, radius * 1.9);
  halo.addColorStop(0, rgb(scene.sun, .1));
  halo.addColorStop(.55, rgb(scene.glow, .18));
  halo.addColorStop(1, rgb(scene.glow, 0));
  context.fillStyle = halo;
  context.fillRect(sunX - radius * 1.9, sunY - radius * 1.9, radius * 3.8, radius * 3.8);

  context.save();
  context.beginPath();
  context.arc(sunX, sunY, radius, 0, Math.PI * 2);
  context.clip();
  const solarGradient = context.createLinearGradient(0, sunY - radius, 0, sunY + radius);
  solarGradient.addColorStop(0, rgb(scene.sun, .96));
  solarGradient.addColorStop(.58, rgb(scene.glow, .91));
  solarGradient.addColorStop(1, rgb(scene.glow, .26));
  context.fillStyle = solarGradient;
  context.fillRect(sunX - radius, sunY - radius, radius * 2, radius * 2);
  for (let i = 0; i < 12; i++) {
    const lineY = sunY + radius * (.16 + i * .082);
    context.fillStyle = `rgba(4,24,42,${.025 + i * .012})`;
    context.fillRect(sunX - radius, lineY, radius * 2, 1 + i * .38);
  }
  context.restore();

  const seaGradient = context.createLinearGradient(0, horizon, 0, height);
  seaGradient.addColorStop(0, rgb(scene.sea, .82));
  seaGradient.addColorStop(.25, rgb(scene.sea, .96));
  seaGradient.addColorStop(1, rgb(scene.skyTop));
  context.fillStyle = seaGradient;
  context.fillRect(0, horizon, width, height - horizon);

  const reflection = context.createRadialGradient(sunX, horizon, 0, sunX, horizon, width * .58);
  reflection.addColorStop(0, rgb(scene.glow, .18 * scene.shimmer));
  reflection.addColorStop(1, rgb(scene.glow, 0));
  context.fillStyle = reflection;
  context.fillRect(0, horizon, width, height - horizon);

  if (scene.underwater > 0) {
    context.save();
    context.globalCompositeOperation = 'screen';
    const deepGlow = context.createRadialGradient(sunX, sunY, radius * .08, sunX, sunY, radius * 2.1);
    deepGlow.addColorStop(0, rgb(scene.sun, .65 * scene.underwater));
    deepGlow.addColorStop(.26, rgb(scene.glow, .34 * scene.underwater));
    deepGlow.addColorStop(1, rgb(scene.glow, 0));
    context.fillStyle = deepGlow;
    context.fillRect(sunX - radius * 2.1, sunY - radius * 2.1, radius * 4.2, radius * 4.2);
    context.beginPath();
    context.arc(sunX, sunY, radius * .8, 0, Math.PI * 2);
    context.strokeStyle = rgb(scene.sun, .35 * scene.underwater);
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  const depth = height - horizon;
  for (let row = 0; row < 42; row++) {
    const distance = (row + 1) / 42;
    const y = horizon + Math.pow(distance, 1.55) * depth;
    const amplitude = 1 + distance * 12;
    const drift = time * (.00015 + distance * .00012);
    context.beginPath();
    for (let x = -25; x <= width + 25; x += 24) {
      const wave = Math.sin(x * (.008 + distance * .005) + row * .8 + drift) * amplitude;
      const cross = Math.sin(x * .022 - row * .48 - drift * 1.3) * amplitude * .3;
      if (x === -25) context.moveTo(x, y + wave + cross);
      else context.lineTo(x, y + wave + cross);
    }
    const reflectionAmount = Math.max(0, 1 - Math.abs(y - sunY) / (height * .85));
    context.strokeStyle = rgb(scene.sun, (.025 + distance * .13) * scene.shimmer * reflectionAmount);
    context.lineWidth = .5 + distance * 1.2;
    context.stroke();
  }

  for (const layer of waveLayers) drawWaveBand(scene, horizon, time, layer);

  for (let i = 0; i < 28; i++) {
    const yRatio = (i + .6) / 29;
    const y = horizon + Math.pow(yRatio, 1.6) * depth;
    const spread = (44 + yRatio * width * .22) * (1 + .12 * Math.sin(time * .0004 + i));
    const center = sunX + Math.sin(i * 9.7 + time * .00025) * spread;
    const segmentWidth = 4 + yRatio * 62 * Math.abs(Math.sin(i * 3.7));
    context.fillStyle = rgb(scene.sun, (.045 + yRatio * .17) * scene.shimmer);
    context.fillRect(center - segmentWidth / 2, y, segmentWidth, .6 + yRatio * 1.5);
  }

  for (const fleck of flecks) {
    const y = (fleck.y * height + time * .008 * (fleck.r + .3)) % height;
    const x = fleck.x * width + Math.sin(time * .0005 + fleck.phase) * 8;
    context.beginPath();
    context.arc(x, y, fleck.r, 0, Math.PI * 2);
    context.fillStyle = rgb(scene.sun, .12 + scene.stars * .1);
    context.fill();
  }

  const vignette = context.createRadialGradient(width * .5, height * .45, height * .1, width * .5, height * .45, Math.max(width, height) * .76);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(1,7,20,.55)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function updateStory() {
  targetPosition = getStoryPosition(window.scrollY, window.innerHeight);
  if (motionQuery.matches) renderedPosition = targetPosition;
  const active = Math.round(targetPosition);
  chapters.forEach((chapter, index) => chapter.classList.toggle('is-active', index === active));
  navLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  progressLine.style.height = `${(targetPosition / 3) * 100}%`;
  if (motionQuery.matches) render(0);
}

function animate(time) {
  renderedPosition += (targetPosition - renderedPosition) * .055;
  if (Math.abs(targetPosition - renderedPosition) < .001) renderedPosition = targetPosition;
  render(time);
  animationId = requestAnimationFrame(animate);
}

function updateMotion() {
  cancelAnimationFrame(animationId);
  if (!context) return;
  if (motionQuery.matches) {
    renderedPosition = targetPosition;
    render(0);
  } else {
    animationId = requestAnimationFrame(animate);
  }
}

window.addEventListener('resize', () => { resize(); updateStory(); }, { passive: true });
window.addEventListener('scroll', updateStory, { passive: true });
window.addEventListener('pointermove', (event) => {
  if (motionQuery.matches || event.pointerType === 'touch') return;
  pointerX = event.clientX / width - .5;
  pointerY = event.clientY / height - .5;
}, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(animationId);
  else updateMotion();
});
motionQuery.addEventListener('change', updateMotion);

resize();
updateStory();
document.documentElement.dataset.animated = 'true';
updateMotion();
