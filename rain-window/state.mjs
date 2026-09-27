export const DEFAULT_SETTINGS = Object.freeze({
  scene: 'tokyo', weather: 'shower', density: 0.42, speed: 0.65,
  size: 0.76, trails: 0.58, wind: 0.5, scale: 1,
  fog: 0.18, refraction: 0.74, dispersion: 0.36,
  fontSize: 21, textColor: '#edf4f7', soundVolume: 0.5, customImage: ''
});

const SCENE_IMAGES = Object.freeze({
  tokyo: './assets/tokyo.jpg', harbor: './assets/harbor.jpg',
  terraces: './assets/terraces.jpg', village: './assets/village.jpg'
});

export function sceneImage(scene) { return SCENE_IMAGES[scene] || SCENE_IMAGES.tokyo; }

const SCENES = new Set([...Object.keys(SCENE_IMAGES), 'custom']);
const COLORS = new Set(['#edf4f7', '#f2e4ce', '#ffc78c', '#ffa8b5', '#a1e6cf', '#a4ceff', '#cdb6fb', '#142331']);
const PRESETS = Object.freeze({
  drizzle: { density: 0.22, speed: 0.34, size: 0.43, trails: 0.35, fog: 0.12 },
  shower: { density: 0.42, speed: 0.65, size: 0.76, trails: 0.58, fog: 0.18 },
  storm: { density: 0.84, speed: 0.9, size: 0.86, trails: 0.83, fog: 0.28 },
  thunder: { density: 0.76, speed: 0.82, size: 0.9, trails: 0.76, fog: 0.25 },
  fog: { density: 0.16, speed: 0.28, size: 0.5, trails: 0.27, fog: 0.9 }
});

const clamp = (value, min, max, fallback) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(min, Number(value))) : fallback;

export function weatherPreset(name) {
  return PRESETS[name] ? { ...PRESETS[name] } : null;
}

export function createNote(now = new Date()) {
  return { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    text: '', createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

export function noteTitle(note) {
  return note?.text?.split('\n').map(line => line.trim()).find(Boolean)?.slice(0, 28) || '未命名手记';
}

export function normalizeState(raw, now = new Date()) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const validNotes = Array.isArray(source.notes) ? source.notes.filter(note =>
    note && typeof note.id === 'string' && typeof note.text === 'string'
  ).map(note => ({ id: note.id, text: note.text, createdAt: note.createdAt || now.toISOString(), updatedAt: note.updatedAt || now.toISOString() })) : [];
  const notes = validNotes.length ? validNotes : [createNote(now)];
  const saved = source.settings && typeof source.settings === 'object' ? source.settings : {};
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of ['density', 'speed', 'size', 'trails', 'wind', 'fog', 'refraction', 'dispersion']) {
    settings[key] = clamp(saved[key], 0, 1, DEFAULT_SETTINGS[key]);
  }
  settings.scale = clamp(saved.scale, 0.5, 2, DEFAULT_SETTINGS.scale);
  settings.fontSize = clamp(saved.fontSize, 16, 32, DEFAULT_SETTINGS.fontSize);
  settings.soundVolume = clamp(saved.soundVolume, 0, 1, DEFAULT_SETTINGS.soundVolume);
  settings.weather = PRESETS[saved.weather] ? saved.weather : DEFAULT_SETTINGS.weather;
  settings.scene = SCENES.has(saved.scene) ? saved.scene : DEFAULT_SETTINGS.scene;
  settings.textColor = COLORS.has(saved.textColor) ? saved.textColor : DEFAULT_SETTINGS.textColor;
  settings.customImage = typeof saved.customImage === 'string' && saved.customImage.startsWith('data:image/') ? saved.customImage : '';
  if (settings.scene === 'custom' && !settings.customImage) settings.scene = 'tokyo';
  return { notes, activeId: notes.some(note => note.id === source.activeId) ? source.activeId : notes[0].id, settings };
}
