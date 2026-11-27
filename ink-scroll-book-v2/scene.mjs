const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTER_IDS = Object.freeze([
  'opening',
  'rain',
  'bridge',
  'mountain',
  'return',
  'colophon',
]);

/**
 * Six choreographed camera & atmospheric keyframes mapped to the 3 original paintings:
 * 0 opening  -> mountains.jpg (panoramic opening with generous upper-left blank space)
 * 1 rain     -> rain-bridge.jpg (left shore: bamboo & weeping willow in spring rain)
 * 2 bridge   -> rain-bridge.jpg (panning right onto stone arch bridge & misty rooftops)
 * 3 mountain -> mountains.jpg (panning & zooming into waterfall cliffs & drifting clouds)
 * 4 return   -> return-boat.jpg (left/center focus: vermilion sun, reeds & lone boat)
 * 5 colophon -> return-boat.jpg (panning right into tranquil open river & blank xuan space)
 */
export const CHAPTER_SCENES = Object.freeze([
  {
    id: 'opening',
    art: 'mountains',
    focusX: 0.48,
    focusY: 0.58,
    zoom: 1.04,
    mist: 0.36,
    rain: 0.0,
    waterfall: 0.28,
    birds: 0.85,
    sunGlow: 0.0,
    waterShimmer: 0.22,
    reeds: 0.0,
    paperFade: 0.12,
  },
  {
    id: 'rain',
    art: 'rainBridge',
    focusX: 0.35,
    focusY: 0.56,
    zoom: 1.08,
    mist: 0.42,
    rain: 0.92,
    waterfall: 0.0,
    birds: 0.15,
    sunGlow: 0.0,
    waterShimmer: 0.35,
    reeds: 0.0,
    paperFade: 0.16,
  },
  {
    id: 'bridge',
    art: 'rainBridge',
    focusX: 0.72,
    focusY: 0.62,
    zoom: 1.18,
    mist: 0.48,
    rain: 0.35,
    waterfall: 0.0,
    birds: 0.2,
    sunGlow: 0.0,
    waterShimmer: 0.52,
    reeds: 0.0,
    paperFade: 0.14,
  },
  {
    id: 'mountain',
    art: 'mountains',
    focusX: 0.78,
    focusY: 0.46,
    zoom: 1.24,
    mist: 0.76,
    rain: 0.0,
    waterfall: 0.95,
    birds: 0.7,
    sunGlow: 0.08,
    waterShimmer: 0.18,
    reeds: 0.0,
    paperFade: 0.14,
  },
  {
    id: 'return',
    art: 'returnBoat',
    focusX: 0.33,
    focusY: 0.6,
    zoom: 1.14,
    mist: 0.32,
    rain: 0.0,
    waterfall: 0.0,
    birds: 0.3,
    sunGlow: 0.95,
    waterShimmer: 0.92,
    reeds: 0.85,
    paperFade: 0.1,
  },
  {
    id: 'colophon',
    art: 'returnBoat',
    focusX: 0.84,
    focusY: 0.56,
    zoom: 1.02,
    mist: 0.22,
    rain: 0.0,
    waterfall: 0.0,
    birds: 0.18,
    sunGlow: 0.3,
    waterShimmer: 0.36,
    reeds: 0.15,
    paperFade: 0.58,
  },
]);

export const SEAL_PRESETS = Object.freeze([
  '山水有归',
  '听雨客',
  '云壑行',
  '一苇渡',
  '心泊处',
]);

export const CHAPTER_SOUNDSCAPE = Object.freeze([
  { rain: 0.05, wind: 0.25, water: 0.15 },
  { rain: 0.85, wind: 0.2, water: 0.35 },
  { rain: 0.32, wind: 0.22, water: 0.65 },
  { rain: 0.08, wind: 0.78, water: 0.45 },
  { rain: 0.0, wind: 0.28, water: 0.75 },
  { rain: 0.0, wind: 0.18, water: 0.25 },
]);

/**
 * Computes continuous normalized chapter position (0 .. chapters-1) from scroll offsets.
 * Aligns 0..N-1 directly with chapter start positions so scrollY=0 shows pure opening art.
 */
export function getContinuousChapterPosition(starts, scrollY) {
  if (!Array.isArray(starts) || starts.length === 0) return 0;
  if (starts.length === 1) return 0;
  if (scrollY <= starts[0]) return 0;
  const last = starts.length - 1;
  if (scrollY >= starts[last]) return last;
  for (let i = 0; i < last; i += 1) {
    const start = starts[i];
    const end = starts[i + 1];
    if (scrollY >= start && scrollY <= end) {
      const span = Math.max(1, end - start);
      return i + clamp((scrollY - start) / span, 0, 1);
    }
  }
  return 0;
}

/**
 * Interpolates rendering weights and atmospheric parameters for a continuous position.
 * When consecutive chapters share the same artwork, camera focusX/focusY/zoom glide smoothly.
 * When artworks differ, crossfades smoothly via smoothstep while maintaining camera momentum.
 */
export function getAtmosphereState(position) {
  const maxIndex = CHAPTER_SCENES.length - 1;
  const bounded = clamp(Number.isFinite(position) ? position : 0, 0, maxIndex);
  const startIdx = Math.floor(bounded);
  const endIdx = Math.min(startIdx + 1, maxIndex);
  const rawT = bounded - startIdx;
  const t = smoothstep(rawT);

  const a = CHAPTER_SCENES[startIdx];
  const b = CHAPTER_SCENES[endIdx];
  const sameArt = a.art === b.art;

  const layers = {
    mountains: 0,
    rainBridge: 0,
    returnBoat: 0,
  };

  if (sameArt) {
    layers[a.art] = 1;
  } else {
    layers[a.art] = 1 - t;
    layers[b.art] = t;
  }

  return {
    position: bounded,
    startIndex: startIdx,
    endIndex: endIdx,
    blend: t,
    sameArt,
    primaryArt: a.art,
    secondaryArt: b.art,
    primaryCamera: sameArt
      ? {
          focusX: mix(a.focusX, b.focusX, t),
          focusY: mix(a.focusY, b.focusY, t),
          zoom: mix(a.zoom, b.zoom, t),
        }
      : { focusX: a.focusX, focusY: a.focusY, zoom: a.zoom },
    secondaryCamera: { focusX: b.focusX, focusY: b.focusY, zoom: b.zoom },
    layers,
    mist: mix(a.mist, b.mist, t),
    rain: mix(a.rain, b.rain, t),
    waterfall: mix(a.waterfall, b.waterfall, t),
    birds: mix(a.birds, b.birds, t),
    sunGlow: mix(a.sunGlow, b.sunGlow, t),
    waterShimmer: mix(a.waterShimmer, b.waterShimmer, t),
    reeds: mix(a.reeds, b.reeds, t),
    paperFade: mix(a.paperFade, b.paperFade, t),
  };
}

export function getSoundscapeMix(position) {
  const maxIndex = CHAPTER_SOUNDSCAPE.length - 1;
  const bounded = clamp(Number.isFinite(position) ? position : 0, 0, maxIndex);
  const startIdx = Math.floor(bounded);
  const endIdx = Math.min(startIdx + 1, maxIndex);
  const t = smoothstep(bounded - startIdx);
  const a = CHAPTER_SOUNDSCAPE[startIdx];
  const b = CHAPTER_SOUNDSCAPE[endIdx];
  return {
    rain: mix(a.rain, b.rain, t),
    wind: mix(a.wind, b.wind, t),
    water: mix(a.water, b.water, t),
  };
}

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SEASON_NAMES = ['春', '夏', '秋', '冬'];

/**
 * Returns traditional Sexagenary year + seasonal label, e.g. "丙午年 · 初冬".
 */
export function getGanZhiLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const stem = HEAVENLY_STEMS[((year - 4) % 10 + 10) % 10];
  const branch = EARTHLY_BRANCHES[((year - 4) % 12 + 12) % 12];
  let season = SEASON_NAMES[3];
  if (month >= 3 && month <= 5) season = SEASON_NAMES[0];
  else if (month >= 6 && month <= 8) season = SEASON_NAMES[1];
  else if (month >= 9 && month <= 11) season = SEASON_NAMES[2];
  const prefix = month % 3 === 0 ? '孟' : month % 3 === 1 ? '仲' : '暮';
  return `${stem}${branch}年 · ${prefix}${season}`;
}

/**
 * Normalizes custom seal inscription to 1-4 characters without whitespace.
 */
export function normalizeSealText(input, fallback = '山水有归') {
  const cleaned = String(input ?? '').replace(/\s+/g, '').slice(0, 4);
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Formats 2-4 character seal text into a 2-column square seal layout (right-to-left top-to-bottom).
 */
export function layoutSealCharacters(text) {
  const chars = [...normalizeSealText(text)];
  if (chars.length === 1) return { cols: 1, rows: 1, grid: [[chars[0]]] };
  if (chars.length === 2) return { cols: 1, rows: 2, grid: [[chars[0], chars[1]]] };
  if (chars.length === 3) return { cols: 2, rows: 2, grid: [[chars[0], chars[1]], [chars[2], '印']] };
  return { cols: 2, rows: 2, grid: [[chars[0], chars[1]], [chars[2], chars[3]]] };
}
