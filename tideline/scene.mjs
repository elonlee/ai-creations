const scenes = [
  {
    skyTop: [6, 19, 39], skyBottom: [45, 65, 79], sea: [5, 39, 58],
    glow: [248, 162, 122], sun: [255, 220, 176],
    sunX: 0.68, sunY: 0.48, horizon: 0.65, stars: 0.48, shimmer: 0.8, underwater: 0, waveEnergy: 1,
  },
  {
    skyTop: [4, 31, 50], skyBottom: [18, 88, 103], sea: [5, 54, 73],
    glow: [112, 221, 200], sun: [225, 251, 219],
    sunX: 0.73, sunY: 0.36, horizon: 0.61, stars: 0.1, shimmer: 1, underwater: 0, waveEnergy: 1.15,
  },
  {
    skyTop: [3, 13, 35], skyBottom: [10, 45, 74], sea: [4, 24, 58],
    glow: [54, 146, 190], sun: [141, 218, 232],
    sunX: 0.73, sunY: 0.67, horizon: 0.39, stars: 0.3, shimmer: 0.55, underwater: 1, waveEnergy: .72,
  },
  {
    skyTop: [19, 13, 41], skyBottom: [84, 43, 68], sea: [17, 25, 57],
    glow: [255, 158, 116], sun: [255, 225, 177],
    sunX: 0.72, sunY: 0.43, horizon: 0.67, stars: 0.88, shimmer: 0.9, underwater: 0, waveEnergy: 1.05,
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, amount) => a + (b - a) * amount;

export function getStoryPosition(scrollY, viewportHeight) {
  if (!Number.isFinite(scrollY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  return clamp(scrollY / viewportHeight, 0, scenes.length - 1);
}

export function getSceneState(position) {
  const bounded = clamp(Number.isFinite(position) ? position : 0, 0, scenes.length - 1);
  const start = Math.floor(bounded);
  const end = Math.min(start + 1, scenes.length - 1);
  const amount = bounded - start;
  const current = scenes[start];
  const next = scenes[end];
  return Object.fromEntries(Object.keys(current).map((key) => [
    key,
    Array.isArray(current[key])
      ? current[key].map((value, index) => mix(value, next[key][index], amount))
      : mix(current[key], next[key], amount),
  ]));
}

export function getTideOffset(time, amplitude) {
  return Math.sin((time / 14000) * Math.PI * 2) * amplitude;
}

export function getWaveDisplacement(x, time, width, amplitude, phase) {
  if (width <= 0 || amplitude === 0) return 0;
  const position = x / width;
  const longSwell = Math.sin(position * Math.PI * (2 + phase * .4) - time * .0008 * (1 + phase * .15) + phase);
  const shortSwell = Math.sin(position * Math.PI * (5 + phase * .7) + time * .0011 + phase * .7);
  return amplitude * (longSwell + shortSwell * .25);
}
