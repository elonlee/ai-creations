import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ACTIONS,
  CATALOG,
  loadState,
  saveState,
  performAction,
  purchaseFurniture,
  moveFurniture,
  getActionAvailability,
} from './game.mjs?v=5';
import {
  createCharacterController,
  INTERACTION_STAGES,
  computeAnchoredCardPosition,
  clampAndSnapBuildPoint,
} from './motion.mjs?v=5';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let stateStore;
try { stateStore = window.localStorage; }
catch { stateStore = { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } }; }
let state = loadState(stateStore);
let mode = 'life';
let selectedInteraction = null;
let selectedFurniture = null;
let movingFurniture = null;
let draggingFurniture = false;
let selectedNeighbor = 'nora';
let pendingChatWave = false;
let scene, camera, renderer, controls, roomGroup, movableGroup, miri, floor;
let wallBack, wallLeft;
let miriRig = null;
const movableNodes = new Map();
const buildFloorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.06);
const buildPlaneHit = new THREE.Vector3();
const buildTarget = { x: 0, z: 0, cellX: 0, cellZ: 0, snapX: 0, snapZ: 0 };
const sceneRefs = {
  potLid: null,
  sketchOverlay: null,
  walkRing: null,
  walkRingTimer: 0,
  buildGridGroup: null,
  buildTargetPad: null,
  buildCursorRing: null,
  ambientLight: null,
  sunLight: null,
  fillLight: null,
  pendantLights: [],
  pendantBulbs: [],
  pendantShades: [],
  deskLight: null,
  bathLight: null,
  staticLampMaterials: [],
  movableLampMaterials: [],
  movableLampLights: [],
  outsideWindows: [],
  skySun: null,
  skyMoon: null,
  skyStars: [],
  clockHourPivot: null,
  clockMinutePivot: null,
  clockFaceMat: null,
  showerWallGroup: null,
  showerSpray: null,
  showerStreams: [],
  bedBlanketPivot: null,
  bedClothState: null,
  bedEyeMask: null,
};
const sceneProps = {
  mealMain: null,
  teaSet: null,
  completedPainting: null,
  showerState: null,
  showerGlass: null,
  bedState: null,
  bookOnSofa: null,
  souvenirNora: null,
  souvenirJun: null,
  souvenirEllis: null,
};
const propReveal = { key: null, waitingAction: null, mode: 'appear', animating: false, progress: 1 };
let pendingAction = null;
let ambientFoodTimer = 0;
let showerAfterglowTimer = 0;
let clockDisplayTotal = state.day * 1440 + state.minute;
let clockTargetTotal = state.day * 1440 + state.minute;

const atmosphereTarget = {
  period: 'morning',
  weatherText: '晴日晨光',
  sunColor: new THREE.Color(0xffe6b4),
  sunIntensity: 3.15,
  sunPos: new THREE.Vector3(-4, 10, 7),
  ambSky: new THREE.Color(0xfff4df),
  ambGround: new THREE.Color(0xbaa8c6),
  ambIntensity: 2.45,
  fillIntensity: 1.1,
  indoorGlow: 0,
  exposure: 1.75,
  sunOpacity: 1,
  moonOpacity: 0,
};
const atmosphereCurrent = {
  sunColor: new THREE.Color(0xffe6b4),
  sunIntensity: 3.15,
  sunPos: new THREE.Vector3(-4, 10, 7),
  ambSky: new THREE.Color(0xfff4df),
  ambGround: new THREE.Color(0xbaa8c6),
  ambIntensity: 2.45,
  fillIntensity: 1.1,
  indoorGlow: 0,
  exposure: 1.75,
  sunOpacity: 1,
  moonOpacity: 0,
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const markers = [];
const interactiveModels = new Map();
const miriCtrl = createCharacterController(-0.2, 0.2);
const reducedMotionQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };
const isReducedMotion = () => Boolean(reducedMotionQuery.matches);

const colors = {
  cream: 0xf8f1e4, oak: 0xc99d70, oakLight: 0xdfba91, oakDark: 0x946f59,
  lavender: 0xcbb8d5, lavenderDeep: 0x9d83b1, sage: 0x9eb4a0,
  pink: 0xdfafa4, blue: 0xaac9cf, ink: 0x514a56, gold: 0xd7b874,
  white: 0xfffdf7, tile: 0xe8ddd5,
};
const materials = Object.fromEntries(Object.entries(colors).map(([key, color]) => [key, new THREE.MeshStandardMaterial({ color, roughness: .82 })]));
const glass = new THREE.MeshPhysicalMaterial({ color: 0xd3e6e8, transparent: true, opacity: .35, roughness: .15, metalness: .03, depthWrite: false, side: THREE.DoubleSide });

const needsMeta = [
  ['hunger', '饥饿', '#e3ab79'], ['energy', '精力', '#a991c5'], ['fun', '娱乐', '#d6a0ad'],
  ['social', '社交', '#8eaeb6'], ['hygiene', '卫生', '#a5b79a'],
];
const goalsMeta = [
  ['cook', '为自己做一餐', 6], ['paint', '画下今天的街角', 18], ['chat', '和邻居聊聊天', 12],
];
const people = {
  nora: { name: 'Nora', place: '街角花店', color: '#b893a9', initial: 'N', description: '热爱植物的花店主。', gift: '窗台多了一束鲜花' },
  jun: { name: 'Jun', place: '旧书屋', color: '#8a9db1', initial: 'J', description: '总会推荐合适的书。', gift: '画桌边添了一叠旧书' },
  ellis: { name: 'Ellis', place: '小咖啡馆', color: '#b9a17d', initial: 'E', description: '记得每位客人的喜好。', gift: '厨房台面放着咖啡与点心' },
};
const interactionMeta = {
  stove: { name: '橡木小厨房', hint: '冰箱里还有新鲜食材。', actions: ['cook'], point: [-3.38, 2.2, -3.7] },
  desk: { name: '窗边画桌', hint: '太阳刚好照在画纸上。', actions: ['paint'], point: [2.15, 2.15, -3.2] },
  bed: { name: '柔软的小床', hint: '累的时候，就安心睡一会儿，或一觉睡到明天清晨。', actions: ['rest', 'sleep'], point: [3.9, 1.6, 1.8] },
  shower: { name: '暖光浴室', hint: '让热水带走一天的疲惫。', actions: ['shower'], point: [-4.65, 2.35, 2.7] },
  bookshelf: { name: '收集的旧书', hint: '每一本都藏着另一种生活。', actions: ['read'], point: [4.8, 2.25, -3.2] },
  tea: { name: '客厅圆桌', hint: '给生活留一点空白时间，桌面上也会留下日常的痕迹。', actions: ['tea'], point: [-0.78, 1.45, 2.55] },
  meal: { name: '厨房桌上的早午餐', hint: '刚做好的热乎餐盒就放在厨房桌面上，点击即可享用。', actions: ['eat'], point: [-3.12, 1.45, -3.66], noHotspot: true },
};

function addBox(parent, material, w, h, d, x = 0, y = 0, z = 0, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function addCylinder(parent, material, top, bottom, height, x = 0, y = 0, z = 0, segments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function addSphere(parent, material, r, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function group(parent, x = 0, y = 0, z = 0) {
  const result = new THREE.Group(); result.position.set(x, y, z); parent.add(result); return result;
}
function registerModel(id, model) { model.userData.interaction = id; interactiveModels.set(id, model); return model; }
function addLegs(parent, xHalf, zHalf, topY, height, material = materials.oakDark) {
  for (const x of [-xHalf, xHalf]) for (const z of [-zHalf, zHalf]) addBox(parent, material, .13, height, .13, x, topY - height / 2, z);
}

function makeGlyphTexture(text, color, bg = null) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.font = 'bold 38px Georgia, "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const particles = [];
let particleAssets = null;
function ensureParticleAssets() {
  if (particleAssets) return particleAssets;
  particleAssets = {
    steamGeo: new THREE.SphereGeometry(0.14, 10, 8),
    mistGeo: new THREE.SphereGeometry(0.24, 12, 10),
    dropGeo: new THREE.CylinderGeometry(0.032, 0.044, 0.28, 8),
    splashGeo: new THREE.RingGeometry(0.06, 0.12, 16),
    steamMat: new THREE.MeshBasicMaterial({ color: 0xfffaf1, transparent: true, opacity: 0.72, depthWrite: false }),
    mistMat: new THREE.MeshBasicMaterial({ color: 0xdbe9f6, transparent: true, opacity: 0.78, depthWrite: false }),
    dropMat: new THREE.MeshBasicMaterial({ color: 0x52addb, transparent: true, opacity: 0.94, depthWrite: false }),
    splashMat: new THREE.MeshBasicMaterial({ color: 0x8ad0ee, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
    zTex: makeGlyphTexture('Z', '#6a5187'),
    sparkTex: makeGlyphTexture('✦', '#d4952a'),
    heartTex: makeGlyphTexture('♥', '#d47486'),
  };
  return particleAssets;
}

let effectCooldown = 0;
function spawnEffectParticle(kind, origin, velocity, life, scale = 1) {
  const assets = ensureParticleAssets();
  let node;
  let mat;
  if (kind === 'steam') {
    mat = assets.steamMat.clone();
    node = new THREE.Mesh(assets.steamGeo, mat);
  } else if (kind === 'mist') {
    mat = assets.mistMat.clone();
    node = new THREE.Mesh(assets.mistGeo, mat);
  } else if (kind === 'drop') {
    mat = assets.dropMat.clone();
    node = new THREE.Mesh(assets.dropGeo, mat);
  } else if (kind === 'splash') {
    mat = assets.splashMat.clone();
    node = new THREE.Mesh(assets.splashGeo, mat);
    node.rotation.x = -Math.PI / 2;
  } else {
    const map = kind === 'zzz' ? assets.zTex : kind === 'heart' ? assets.heartTex : assets.sparkTex;
    mat = new THREE.SpriteMaterial({ map, transparent: true, opacity: 0.92, depthWrite: false });
    node = new THREE.Sprite(mat);
  }
  node.position.set(...origin);
  node.scale.setScalar(scale);
  roomGroup.add(node);
  particles.push({ node, mat, vx: velocity[0], vy: velocity[1], vz: velocity[2], age: 0, life, baseScale: scale, kind });
}

function updateParticles(dt, effect, pose) {
  if (effect === 'shower') showerAfterglowTimer = 2.6;
  else if (showerAfterglowTimer > 0) showerAfterglowTimer = Math.max(0, showerAfterglowTimer - dt);

  if (effect && !isReducedMotion()) {
    effectCooldown -= dt;
    if (effectCooldown <= 0) {
      if (effect === 'cook') {
        effectCooldown = 0.22;
        spawnEffectParticle('steam', [-4.04 + (Math.random() - 0.5) * 0.22, 1.42, -3.98 + (Math.random() - 0.5) * 0.22], [(Math.random() - 0.5) * 0.15, 0.65, (Math.random() - 0.5) * 0.15], 1.15, 0.75 + Math.random() * 0.45);
      } else if (effect === 'paint') {
        effectCooldown = 0.28;
        spawnEffectParticle('spark', [1.85 + (Math.random() - 0.5) * 0.65, 1.54, -3.5 + (Math.random() - 0.5) * 0.4], [(Math.random() - 0.5) * 0.2, 0.48, (Math.random() - 0.5) * 0.2], 0.95, 0.42);
      } else if (effect === 'rest') {
        effectCooldown = 0.58;
        spawnEffectParticle('zzz', [2.93 + (Math.random() - 0.5) * 0.25, 1.52, 0.65], [0.1, 0.46, -0.06], 1.5, 0.5);
      } else if (effect === 'shower') {
        effectCooldown = 0.055;
        for (let i = 0; i < 3; i++) {
          spawnEffectParticle('drop', [-5.1 + (Math.random() - 0.5) * 0.46, 2.15, 1.9 + (Math.random() - 0.5) * 0.46], [0, -3.1, 0], 0.65, 1);
        }
        if (Math.random() < 0.55) {
          spawnEffectParticle('splash', [-5.1 + (Math.random() - 0.5) * 0.55, 0.132, 1.9 + (Math.random() - 0.5) * 0.55], [0, 0, 0], 0.45, 0.8 + Math.random() * 0.5);
        }
        if (Math.random() < 0.65) {
          spawnEffectParticle('mist', [-5.05 + (Math.random() - 0.5) * 0.65, 0.85 + Math.random() * 0.85, 1.95 + (Math.random() - 0.5) * 0.65], [(Math.random() - 0.5) * 0.14, 0.62, (Math.random() - 0.5) * 0.14], 1.4, 0.95 + Math.random() * 0.45);
        }
      } else if (effect === 'read') {
        effectCooldown = 0.42;
        spawnEffectParticle('spark', [pose.x + (Math.random() - 0.5) * 0.45, 1.38, pose.z + (Math.random() - 0.5) * 0.45], [0, 0.42, 0], 1.0, 0.28);
      } else if (effect === 'tea') {
        effectCooldown = 0.26;
        spawnEffectParticle('steam', [-0.54 + (Math.random() - 0.5) * 0.16, 1.04, 2.41 + (Math.random() - 0.5) * 0.16], [0, 0.52, 0], 1.05, 0.6);
        spawnEffectParticle('steam', [pose.x + 0.15, 1.38, pose.z + 0.25], [0, 0.42, 0], 0.85, 0.42);
      } else if (effect === 'eat') {
        effectCooldown = 0.36;
        spawnEffectParticle('steam', [-3.12 + (Math.random() - 0.5) * 0.14, 1.12, -3.66 + (Math.random() - 0.5) * 0.14], [0, 0.42, 0], 0.9, 0.46);
        spawnEffectParticle('heart', [pose.x + (Math.random() - 0.5) * 0.25, 1.98, pose.z], [0, 0.52, 0], 0.95, 0.3);
      } else if (effect === 'wave') {
        effectCooldown = 0.45;
        spawnEffectParticle('heart', [pose.x + (Math.random() - 0.5) * 0.3, 2.12, pose.z], [0, 0.55, 0], 1.0, 0.35);
      }
    }
  } else {
    effectCooldown = 0;
  }

  // Gentle ongoing warmth wisps from freshly served lunch, tea, or freshly used warm shower.
  if (!isReducedMotion() && mode === 'life' && !effect) {
    ambientFoodTimer -= dt;
    if (ambientFoodTimer <= 0) {
      ambientFoodTimer = showerAfterglowTimer > 0 ? 0.35 : 0.85;
      if (sceneProps.mealMain?.visible) {
        spawnEffectParticle('steam', [-3.12 + (Math.random() - 0.5) * 0.14, 1.12, -3.66 + (Math.random() - 0.5) * 0.14], [0, 0.34, 0], 1.0, 0.42);
      }
      if (sceneProps.teaSet?.visible) {
        spawnEffectParticle('steam', [-0.8 + (Math.random() - 0.5) * 0.1, 0.94, 2.3 + (Math.random() - 0.5) * 0.1], [0, 0.36, 0], 0.95, 0.38);
      }
      if (showerAfterglowTimer > 0) {
        spawnEffectParticle('mist', [-5.05 + (Math.random() - 0.5) * 0.55, 1.15 + Math.random() * 0.65, 1.95 + (Math.random() - 0.5) * 0.55], [0, 0.5, 0], 1.25, 0.85);
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) {
      roomGroup.remove(p.node);
      p.mat.dispose();
      particles.splice(i, 1);
      continue;
    }
    const t = p.age / p.life;
    p.node.position.x += p.vx * dt;
    p.node.position.y += p.vy * dt;
    p.node.position.z += p.vz * dt;
    if (p.kind === 'steam' || p.kind === 'mist') {
      p.node.scale.setScalar(p.baseScale * (0.75 + t * 1.25));
      p.mat.opacity = (p.kind === 'mist' ? 0.72 : 0.58) * (1 - t);
    } else if (p.kind === 'drop') {
      p.mat.opacity = 0.92 * (1 - t * 0.5);
      if (p.node.position.y < 0.16) p.age = p.life;
    } else if (p.kind === 'splash') {
      p.node.scale.setScalar(p.baseScale * (0.7 + t * 1.6));
      p.mat.opacity = 0.7 * (1 - t);
    } else {
      p.node.scale.setScalar(p.baseScale * (0.85 + Math.sin(t * Math.PI) * 0.35));
      p.mat.opacity = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
    }
  }
}

function clearEffects() {
  for (const p of particles) {
    roomGroup.remove(p.node);
    p.mat.dispose();
  }
  particles.length = 0;
}

function buildSceneStateProps({ kitchen, desk, shower, bed, sofa, table, windowGroup }) {
  const plateWhite = materials.white;
  const eggYellow = new THREE.MeshStandardMaterial({ color: 0xf0be54, roughness: 0.45 });
  const teaAmber = new THREE.MeshStandardMaterial({ color: 0xd99b43, roughness: 0.3 });
  const waterPoolMat = new THREE.MeshStandardMaterial({ color: 0x8cc8e0, transparent: true, opacity: 0.48, roughness: 0.08, depthWrite: false });
  const berryMat = new THREE.MeshStandardMaterial({ color: 0xd77f89, roughness: 0.6 });
  const kraftMat = new THREE.MeshStandardMaterial({ color: 0xc89a6f, roughness: 0.88 });

  // 1. Clickable plated brunch / lunch box on the kitchen counter.
  const mealMain = group(kitchen, 0.26, 0.98, 0.24);
  mealMain.userData.interaction = 'meal';
  mealMain.rotation.y = 0.08;
  addBox(mealMain, materials.oakLight, 0.5, 0.036, 0.36, 0, 0.018, 0);
  addBox(mealMain, materials.cream, 0.44, 0.014, 0.3, 0, 0.038, 0, false);
  addCylinder(mealMain, plateWhite, 0.17, 0.135, 0.028, -0.02, 0.052, 0, 24);
  addBox(mealMain, materials.oak, 0.13, 0.044, 0.1, -0.065, 0.08, -0.02).rotation.y = 0.2;
  addCylinder(mealMain, plateWhite, 0.068, 0.068, 0.014, 0.04, 0.072, 0.02, 16);
  addSphere(mealMain, eggYellow, 0.034, 0.04, 0.082, 0.02);
  addSphere(mealMain, materials.sage, 0.042, -0.05, 0.078, 0.065);
  addSphere(mealMain, berryMat, 0.024, 0.01, 0.078, 0.08);
  addBox(mealMain, materials.gold, 0.014, 0.01, 0.18, 0.17, 0.052, 0);
  mealMain.visible = false;
  sceneProps.mealMain = mealMain;

  // 3. Brewed herbal teacup, biscuits and honey jar on the tea table.
  const teaSet = group(table, 0, 0.805, 0);
  addCylinder(teaSet, plateWhite, 0.095, 0.075, 0.015, -0.02, 0.012, -0.25, 18);
  addCylinder(teaSet, plateWhite, 0.062, 0.048, 0.075, -0.02, 0.052, -0.25, 18);
  addCylinder(teaSet, teaAmber, 0.052, 0.052, 0.012, -0.02, 0.082, -0.25, 16);
  addCylinder(teaSet, plateWhite, 0.11, 0.09, 0.018, 0.34, 0.014, 0.14, 18);
  addCylinder(teaSet, materials.oakLight, 0.036, 0.036, 0.02, 0.31, 0.03, 0.12, 14);
  addCylinder(teaSet, materials.oakLight, 0.036, 0.036, 0.02, 0.37, 0.03, 0.16, 14);
  addCylinder(teaSet, teaAmber, 0.042, 0.042, 0.08, 0.14, 0.042, 0.18, 14);
  addCylinder(teaSet, materials.oakDark, 0.044, 0.044, 0.02, 0.14, 0.09, 0.18, 14);
  teaSet.visible = false;
  sceneProps.teaSet = teaSet;

  // 4. Completed watercolor street sketch + palette on the window desk.
  const completedPainting = group(desk, -0.35, 1.366, -0.1);
  addBox(completedPainting, new THREE.MeshStandardMaterial({ color: 0xe6dff0, roughness: 0.9 }), 0.78, 0.008, 0.5, 0, 0, 0, false);
  addBox(completedPainting, materials.oakLight, 0.68, 0.009, 0.12, 0, 0.002, 0.15, false);
  addBox(completedPainting, materials.cream, 0.22, 0.01, 0.18, -0.08, 0.003, 0.01, false);
  addBox(completedPainting, materials.lavenderDeep, 0.26, 0.01, 0.09, -0.08, 0.004, -0.1, false);
  addSphere(completedPainting, materials.sage, 0.075, 0.16, 0.01, 0.03);
  addCylinder(completedPainting, materials.gold, 0.045, 0.045, 0.01, 0.2, 0.004, -0.13, 14);
  // Small wooden palette beside the paper
  addCylinder(completedPainting, materials.oak, 0.12, 0.12, 0.014, 0.56, 0.006, 0.18, 18);
  addSphere(completedPainting, materials.lavenderDeep, 0.02, 0.52, 0.016, 0.15);
  addSphere(completedPainting, materials.pink, 0.02, 0.59, 0.016, 0.15);
  addSphere(completedPainting, materials.sage, 0.02, 0.53, 0.016, 0.22);
  addSphere(completedPainting, materials.gold, 0.02, 0.6, 0.016, 0.22);
  completedPainting.visible = false;
  sceneProps.completedPainting = completedPainting;

  // 5. Showered bathroom state: tile water shimmer, fresh towel & bath soap on bench.
  const showerState = group(shower, 0, 0, 0);
  addCylinder(showerState, waterPoolMat, 0.36, 0.36, 0.01, -0.25, 0.125, -0.35, 22);
  addCylinder(showerState, waterPoolMat, 0.24, 0.24, 0.01, 0.18, 0.125, 0.05, 18);
  addBox(showerState, materials.lavender, 0.44, 0.07, 0.34, -0.34, 0.62, 0.75);
  addBox(showerState, materials.cream, 0.36, 0.05, 0.26, -0.34, 0.67, 0.73);
  addCylinder(showerState, materials.gold, 0.055, 0.055, 0.15, -0.52, 0.67, 0.62, 12);
  showerState.visible = false;
  sceneProps.showerState = showerState;

  // 6. Rested bed state: lavender sleep eye mask on left pillow + cozy folded throw at foot-right.
  const bedState = group(bed, 0, 0, 0);
  const eyeMask = addBox(bedState, materials.lavenderDeep, 0.3, 0.035, 0.11, -0.72, 1.01, -0.98);
  sceneRefs.bedEyeMask = eyeMask;
  addBox(bedState, materials.pink, 0.92, 0.07, 0.65, 0.64, 0.955, 0.92).rotation.y = 0.08;
  bedState.visible = false;
  sceneProps.bedState = bedState;

  // 7. Open reading book left on the left side of the sofa.
  const bookOnSofa = group(sofa, -0.68, 0.99, 0.24);
  bookOnSofa.rotation.y = 0.35;
  addBox(bookOnSofa, materials.lavenderDeep, 0.24, 0.025, 0.3, -0.12, 0, 0).rotation.z = 0.14;
  addBox(bookOnSofa, materials.lavenderDeep, 0.24, 0.025, 0.3, 0.12, 0, 0).rotation.z = -0.14;
  addBox(bookOnSofa, materials.cream, 0.21, 0.028, 0.27, -0.11, 0.014, 0).rotation.z = 0.14;
  addBox(bookOnSofa, materials.cream, 0.21, 0.028, 0.27, 0.11, 0.014, 0).rotation.z = -0.14;
  addBox(bookOnSofa, materials.gold, 0.02, 0.01, 0.22, 0.03, 0.03, 0.08);
  bookOnSofa.visible = false;
  sceneProps.bookOnSofa = bookOnSofa;

  // 8. Neighbor souvenirs in Miri's room!
  const souvenirNora = group(windowGroup, 0.65, 1.09, 0.22);
  addCylinder(souvenirNora, glass, 0.09, 0.11, 0.24, 0, 0.12, 0, 14);
  addCylinder(souvenirNora, materials.sage, 0.015, 0.015, 0.24, -0.02, 0.22, 0, 8);
  addCylinder(souvenirNora, materials.sage, 0.015, 0.015, 0.26, 0.02, 0.23, 0.02, 8);
  addSphere(souvenirNora, materials.pink, 0.065, -0.04, 0.33, 0);
  addSphere(souvenirNora, materials.lavenderDeep, 0.07, 0.03, 0.36, -0.02);
  addSphere(souvenirNora, materials.gold, 0.055, 0.01, 0.31, 0.05);
  souvenirNora.visible = false;
  sceneProps.souvenirNora = souvenirNora;

  const souvenirJun = group(desk, 0.72, 1.325, -0.18);
  addBox(souvenirJun, materials.sage, 0.32, 0.075, 0.24, 0, 0.038, 0);
  addBox(souvenirJun, materials.lavenderDeep, 0.3, 0.07, 0.22, 0.01, 0.11, 0.01).rotation.y = 0.14;
  addBox(souvenirJun, materials.pink, 0.28, 0.065, 0.2, -0.01, 0.175, -0.01).rotation.y = -0.09;
  addBox(souvenirJun, materials.gold, 0.035, 0.22, 0.25, 0, 0.11, 0);
  souvenirJun.visible = false;
  sceneProps.souvenirJun = souvenirJun;

  const souvenirEllis = group(kitchen, 0.98, 0.98, 0.28);
  addBox(souvenirEllis, kraftMat, 0.16, 0.24, 0.11, -0.1, 0.12, 0);
  addBox(souvenirEllis, materials.cream, 0.22, 0.11, 0.18, 0.12, 0.055, 0.02);
  addBox(souvenirEllis, materials.pink, 0.23, 0.015, 0.035, 0.12, 0.112, 0.02);
  souvenirEllis.visible = false;
  sceneProps.souvenirEllis = souvenirEllis;
}

function syncSceneProps(immediate = false) {
  const sc = state.scene || {};
  const waitingAppearKey = (!immediate && propReveal.waitingAction && propReveal.mode === 'appear') ? propReveal.key : null;
  const waitingConsumeKey = (!immediate && propReveal.waitingAction && propReveal.mode === 'consume') ? propReveal.key : null;

  if (sceneProps.mealMain) {
    sceneProps.mealMain.visible = (sc.meal === 'ready' && waitingAppearKey !== 'mealMain') || waitingConsumeKey === 'mealMain';
  }
  if (sceneProps.teaSet) sceneProps.teaSet.visible = Boolean(sc.tea) && waitingAppearKey !== 'teaSet';
  if (sceneProps.completedPainting) sceneProps.completedPainting.visible = Boolean(sc.painting) && waitingAppearKey !== 'completedPainting';
  if (sceneProps.showerState) sceneProps.showerState.visible = Boolean(sc.showered) && waitingAppearKey !== 'showerState';
  if (sceneProps.bedState) sceneProps.bedState.visible = Boolean(sc.rested) && waitingAppearKey !== 'bedState';
  if (sceneProps.bookOnSofa) sceneProps.bookOnSofa.visible = Boolean(sc.bookOut) && waitingAppearKey !== 'bookOnSofa';
  if (sceneProps.souvenirNora) sceneProps.souvenirNora.visible = Boolean(sc.souvenirs?.nora);
  if (sceneProps.souvenirJun) sceneProps.souvenirJun.visible = Boolean(sc.souvenirs?.jun);
  if (sceneProps.souvenirEllis) sceneProps.souvenirEllis.visible = Boolean(sc.souvenirs?.ellis);

  if (sceneProps.showerGlass) {
    sceneProps.showerGlass.material.opacity = sc.showered ? 0.54 : 0.35;
  }
  if (immediate) {
    for (const node of Object.values(sceneProps)) {
      if (node && node.isObject3D && node !== sceneProps.showerGlass) node.scale.setScalar(1);
    }
  }
}

function updateAtmosphere(minute, immediate = false) {
  const hour = minute / 60;
  let period = 'morning';
  let weatherText = '晴日晨光';
  let sunColorHex = 0xffe6b4;
  let sunIntensity = 3.15;
  let sunPos = [-4, 10, 7];
  let ambSkyHex = 0xfff4df;
  let ambGroundHex = 0xbaa8c6;
  let ambIntensity = 2.45;
  let fillIntensity = 1.1;
  let indoorGlow = 0;
  let exposure = 1.75;
  let sunOpacity = 1;
  let moonOpacity = 0;

  if (hour >= 11.5 && hour < 16.5) {
    period = 'afternoon';
    weatherText = '晴日午后';
    sunColorHex = 0xfff1cf;
    sunIntensity = 3.3;
    sunPos = [-1.5, 11.5, 6.5];
    ambSkyHex = 0xfff8eb;
    ambGroundHex = 0xc3b3cc;
    ambIntensity = 2.55;
  } else if (hour >= 16.5 && hour < 19) {
    period = 'dusk';
    weatherText = '温柔暮色';
    const duskT = Math.min(1, Math.max(0, (hour - 16.5) / 2.5));
    sunColorHex = 0xff9f68;
    sunIntensity = 2.25 - duskT * 0.75;
    sunPos = [5.5, 6.2 - duskT * 1.5, 7.5];
    ambSkyHex = 0xf5c8b8;
    ambGroundHex = 0x7e6d96;
    ambIntensity = 1.7 - duskT * 0.45;
    fillIntensity = 0.95;
    indoorGlow = 0.45 + duskT * 0.45;
    exposure = 1.62 - duskT * 0.14;
    sunOpacity = 1 - duskT * 0.7;
    moonOpacity = duskT * 0.55;
  } else if (hour >= 19 || hour < 6) {
    period = 'night';
    weatherText = '暖灯夜色';
    sunColorHex = 0x7690cc;
    sunIntensity = 0.52;
    sunPos = [3.5, 9.5, 6];
    ambSkyHex = 0x4f5a8a;
    ambGroundHex = 0x2b2842;
    ambIntensity = 0.78;
    fillIntensity = 0.42;
    indoorGlow = 1.0;
    exposure = 1.38;
    sunOpacity = 0;
    moonOpacity = 1;
  }

  atmosphereTarget.period = period;
  atmosphereTarget.weatherText = weatherText;
  atmosphereTarget.sunColor.setHex(sunColorHex);
  atmosphereTarget.sunIntensity = sunIntensity;
  atmosphereTarget.sunPos.set(...sunPos);
  atmosphereTarget.ambSky.setHex(ambSkyHex);
  atmosphereTarget.ambGround.setHex(ambGroundHex);
  atmosphereTarget.ambIntensity = ambIntensity;
  atmosphereTarget.fillIntensity = fillIntensity;
  atmosphereTarget.indoorGlow = indoorGlow;
  atmosphereTarget.exposure = exposure;
  atmosphereTarget.sunOpacity = sunOpacity;
  atmosphereTarget.moonOpacity = moonOpacity;

  const roomView = $('#room-view');
  if (roomView) roomView.dataset.period = period;
  const weatherPill = $('#weather-text');
  if (weatherPill) weatherPill.textContent = weatherText;

  if (immediate || isReducedMotion()) {
    applyAtmosphereStep(1);
  }
}

function applyAtmosphereStep(factor) {
  const c = atmosphereCurrent;
  const t = atmosphereTarget;
  c.sunColor.lerp(t.sunColor, factor);
  c.ambSky.lerp(t.ambSky, factor);
  c.ambGround.lerp(t.ambGround, factor);
  c.sunPos.lerp(t.sunPos, factor);
  c.sunIntensity += (t.sunIntensity - c.sunIntensity) * factor;
  c.ambIntensity += (t.ambIntensity - c.ambIntensity) * factor;
  c.fillIntensity += (t.fillIntensity - c.fillIntensity) * factor;
  c.indoorGlow += (t.indoorGlow - c.indoorGlow) * factor;
  c.exposure += (t.exposure - c.exposure) * factor;
  c.sunOpacity += (t.sunOpacity - c.sunOpacity) * factor;
  c.moonOpacity += (t.moonOpacity - c.moonOpacity) * factor;

  if (renderer) renderer.toneMappingExposure = c.exposure;
  if (sceneRefs.sunLight) {
    sceneRefs.sunLight.color.copy(c.sunColor);
    sceneRefs.sunLight.intensity = c.sunIntensity;
    sceneRefs.sunLight.position.copy(c.sunPos);
  }
  if (sceneRefs.ambientLight) {
    sceneRefs.ambientLight.color.copy(c.ambSky);
    sceneRefs.ambientLight.groundColor.copy(c.ambGround);
    sceneRefs.ambientLight.intensity = c.ambIntensity;
  }
  if (sceneRefs.fillLight) sceneRefs.fillLight.intensity = c.fillIntensity;

  for (const pl of sceneRefs.pendantLights) pl.intensity = c.indoorGlow * 5.8;
  if (sceneRefs.deskLight) sceneRefs.deskLight.intensity = c.indoorGlow * 3.5;
  if (sceneRefs.bathLight) sceneRefs.bathLight.intensity = c.indoorGlow * 2.4;

  for (const bulb of sceneRefs.pendantBulbs) {
    bulb.material.emissiveIntensity = 0.35 + c.indoorGlow * 1.85;
  }
  for (const shade of sceneRefs.pendantShades) {
    shade.material.emissive.setHex(0xffd592);
    shade.material.emissiveIntensity = c.indoorGlow * 0.45;
  }
  for (const mat of sceneRefs.staticLampMaterials) {
    mat.emissive.setHex(0xffd78e);
    mat.emissiveIntensity = c.indoorGlow > 0.15 ? 0.25 + c.indoorGlow * 1.15 : 0.05;
  }
  for (const mat of sceneRefs.movableLampMaterials) {
    mat.emissive.setHex(0xffd896);
    mat.emissiveIntensity = c.indoorGlow > 0.15 ? 0.25 + c.indoorGlow * 1.1 : 0.06;
  }
  for (const pl of sceneRefs.movableLampLights) {
    pl.intensity = c.indoorGlow * 4.2;
  }
  for (const mat of sceneRefs.outsideWindows) {
    mat.emissive.setHex(0xffd888);
    mat.emissiveIntensity = c.indoorGlow > 0.35 ? c.indoorGlow * 1.25 : 0;
  }
  if (sceneRefs.clockFaceMat) {
    sceneRefs.clockFaceMat.emissive.setHex(0xfff1d6);
    sceneRefs.clockFaceMat.emissiveIntensity = c.indoorGlow * 0.26;
  }
  if (sceneRefs.skySun) {
    sceneRefs.skySun.visible = c.sunOpacity > 0.04;
    sceneRefs.skySun.material.opacity = c.sunOpacity;
  }
  if (sceneRefs.skyMoon) {
    sceneRefs.skyMoon.visible = c.moonOpacity > 0.04;
    sceneRefs.skyMoon.material.opacity = c.moonOpacity;
  }
  for (const star of sceneRefs.skyStars) {
    star.visible = c.moonOpacity > 0.25;
    star.material.opacity = Math.max(0, (c.moonOpacity - 0.25) / 0.75) * 0.85;
  }
}

function buildRoom() {
  roomGroup = group(scene);
  addBox(roomGroup, materials.oakDark, 12.5, .25, 10.5, 0, -.23, 0);
  addBox(roomGroup, materials.cream, 12.2, .11, 10.2, 0, -.045, 0);
  const boardColors = [materials.oakLight, new THREE.MeshStandardMaterial({ color: 0xdcb58c, roughness: .88 }), new THREE.MeshStandardMaterial({ color: 0xe3bd97, roughness: .88 })];
  for (let i = 0; i < 19; i++) addBox(roomGroup, boardColors[i % 3], 12.02, .025, .52, 0, .021, -4.75 + i * .52, false);
  floor = addBox(roomGroup, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), 12, .02, 10, 0, .06, 0, false);
  floor.userData.ground = true;
  const walkRingMat = new THREE.MeshBasicMaterial({ color: 0x9d83b1, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  sceneRefs.walkRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 28), walkRingMat);
  sceneRefs.walkRing.rotation.x = -Math.PI / 2;
  sceneRefs.walkRing.position.set(0, 0.075, 0);
  roomGroup.add(sceneRefs.walkRing);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeee6ee, roughness: .95, side: THREE.DoubleSide });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xe9dded, roughness: .95, side: THREE.DoubleSide });
  wallBack = group(roomGroup);
  addBox(wallBack, wallMat, 4.2, 3.5, .17, -3.9, 1.75, -5.02);
  addBox(wallBack, wallMat, 4.3, 3.5, .17, 3.85, 1.75, -5.02);
  addBox(wallBack, wallMat, 3.5, 1.06, .17, -.05, .53, -5.02);
  addBox(wallBack, wallMat, 3.5, .48, .17, -.05, 3.26, -5.02);
  wallLeft = group(roomGroup);
  addBox(wallLeft, sideMat, .17, 3.5, 10.25, -6.06, 1.75, 0);
  addBox(roomGroup, materials.white, 12.14, .13, .21, 0, .12, -4.89);
  addBox(roomGroup, materials.white, .2, .13, 10, -5.93, .12, 0);

  const windowGroup = group(roomGroup, -.05, 0, -4.96);
  addBox(windowGroup, materials.white, 3.7, .13, .28, 0, 1.06, 0);
  addBox(windowGroup, materials.white, 3.7, .13, .28, 0, 3.04, 0);
  addBox(windowGroup, materials.white, .13, 2.0, .28, -1.82, 2.06, 0);
  addBox(windowGroup, materials.white, .13, 2.0, .28, 1.82, 2.06, 0);
  addBox(windowGroup, materials.white, .1, 2.0, .2, 0, 2.06, .08);
  addBox(windowGroup, materials.white, 3.65, .09, .2, 0, 2.1, .08);
  addBox(windowGroup, glass, 3.54, 1.9, .025, 0, 2.05, -.04, false);
  addBox(windowGroup, materials.oakLight, 3.85, .13, .46, 0, 1.02, .2);

  const outside = group(roomGroup, 0, 0, -6.6);
  addBox(outside, new THREE.MeshStandardMaterial({ color: 0xbab5ce }), 1.2, 4, 1, -1.25, 1.5, -.4);
  addBox(outside, new THREE.MeshStandardMaterial({ color: 0xd8bdd0 }), 1.35, 4.6, .8, .9, 1.8, -.8);
  sceneRefs.outsideWindows = [];
  for (const x of [-1.5, -.95, .65, 1.2]) {
    for (const y of [1.6, 2.2, 2.8]) {
      const winMat = new THREE.MeshStandardMaterial({ color: 0xf8f1e4, roughness: 0.7 });
      sceneRefs.outsideWindows.push(winMat);
      addBox(outside, winMat, .18, .28, .02, x, y, -.27, false);
    }
  }
  addCylinder(outside, materials.oakDark, .11, .14, 2.5, -2.7, 1.1, -.1);
  addSphere(outside, materials.sage, .7, -2.7, 2.5, -.1);
  addSphere(outside, materials.sage, .6, -3.2, 2.2, -.1);

  // Sun, moon and twinkling stars visible outside the sunny window.
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 1 }),
  );
  sunDisc.position.set(-0.25, 3.05, -1.35);
  outside.add(sunDisc);
  sceneRefs.skySun = sunDisc;

  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff3c8, transparent: true, opacity: 0 }),
  );
  moonDisc.position.set(-0.15, 2.95, -1.3);
  moonDisc.visible = false;
  outside.add(moonDisc);
  sceneRefs.skyMoon = moonDisc;

  sceneRefs.skyStars = [];
  for (const [sx, sy, sr] of [[-1.95, 3.65, 0.055], [-0.85, 3.45, 0.045], [0.45, 3.7, 0.06], [1.65, 3.3, 0.05], [-2.55, 2.9, 0.045]]) {
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(sr, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff8dc, transparent: true, opacity: 0 }),
    );
    star.position.set(sx, sy, -1.45);
    star.visible = false;
    outside.add(star);
    sceneRefs.skyStars.push(star);
  }

  // Wall clock & kitchen wall shelf mounted on wallBack.
  createWallClock(wallBack);
  const kitchenShelf = group(wallBack, -3.25, 2.28, -4.82);
  addBox(kitchenShelf, materials.oak, 1.35, .07, .3, 0, 0, 0);
  addCylinder(kitchenShelf, materials.cream, .09, .09, .18, -.35, .12, 0, 14);
  addCylinder(kitchenShelf, materials.sage, .08, .07, .14, 0, .1, 0, 14);
  addCylinder(kitchenShelf, materials.pink, .08, .08, .12, .35, .09, 0, 14);

  // Kitchen workbench shifted right to leave a clean gap beside the corner refrigerator.
  const kitchen = registerModel('stove', group(roomGroup, -3.38, 0, -3.9));
  addBox(kitchen, materials.oakLight, 2.56, .85, 1.14, 0, .45, 0);
  addBox(kitchen, materials.white, 2.64, .1, 1.2, 0, .93, 0);
  addBox(kitchen, materials.oakDark, .03, .62, .04, -.52, .43, .59);
  addBox(kitchen, materials.oakDark, .03, .62, .04, .48, .43, .59);
  addBox(kitchen, materials.oak, .14, .03, .03, -.32, .68, .59);
  addBox(kitchen, materials.oak, .14, .03, .03, .28, .68, .59);
  addCylinder(kitchen, materials.ink, .3, .3, .025, -.66, 1.0, -.08);
  addCylinder(kitchen, materials.ink, .24, .24, .025, .02, 1.0, -.08);
  addCylinder(kitchen, materials.gold, .36, .32, .22, -.66, 1.16, -.08);
  sceneRefs.potLid = addCylinder(kitchen, materials.oakDark, .15, .15, .08, -.66, 1.29, -.08);
  addBox(kitchen, materials.cream, .24, .46, .22, .98, 1.23, -.28);
  addSphere(kitchen, materials.sage, .24, .98, 1.56, -.28);

  // Retro two-door cream refrigerator tucked cleanly into the left-back kitchen corner.
  const fridge = group(roomGroup, -5.32, 0, -4.08);
  for (const fx of [-.38, .38]) for (const fz of [-.36, .36]) addBox(fridge, materials.oakDark, .1, .08, .1, fx, .04, fz);
  addBox(fridge, materials.cream, .96, 2.26, .88, 0, 1.21, 0);
  addBox(fridge, materials.white, .98, .08, .9, 0, 2.38, 0);
  addBox(fridge, materials.white, .92, .62, .06, 0, 1.97, .46);
  addBox(fridge, materials.ink, .9, .02, .02, 0, 1.63, .455, false);
  addBox(fridge, materials.white, .92, 1.48, .06, 0, .86, .46);
  addBox(fridge, materials.oakDark, .045, .28, .045, .34, 1.95, .51);
  addBox(fridge, materials.oakDark, .045, .44, .045, .34, 1.18, .51);
  addBox(fridge, materials.pink, .16, .14, .016, -.14, 2.02, .498);
  addSphere(fridge, materials.sage, .032, .08, 1.94, .498);
  addCylinder(fridge, materials.cream, .13, .11, .2, -.16, 2.52, .06, 16);
  addCylinder(fridge, materials.oak, .14, .14, .04, -.16, 2.63, .06, 16);

  // Painting corner.
  const desk = registerModel('desk', group(roomGroup, 2.2, 0, -3.4));
  addBox(desk, materials.oak, 2.55, .15, 1.14, 0, 1.25, 0);
  addLegs(desk, 1.12, .42, 1.2, 1.15);
  addBox(desk, materials.cream, .92, .025, .64, -.35, 1.35, -.1);
  sceneRefs.sketchOverlay = addBox(desk, new THREE.MeshStandardMaterial({ color: 0xb28ec5, roughness: 0.9, transparent: true, opacity: 0.14 }), .58, .012, .36, -.35, 1.365, -.12, false);
  addBox(desk, materials.lavenderDeep, .7, .025, .05, -.35, 1.37, .22);
  addCylinder(desk, materials.pink, .12, .15, .2, .8, 1.42, .12);
  addBox(desk, materials.cream, .06, .6, .06, .8, 1.79, .12);
  const deskLampMat = new THREE.MeshStandardMaterial({ color: 0xd7b874, roughness: 0.45 });
  sceneRefs.staticLampMaterials.push(deskLampMat);
  addSphere(desk, deskLampMat, .16, .8, 2.11, .12);
  sceneRefs.deskLight = new THREE.PointLight(0xffca7a, 0, 6.5, 1.6);
  sceneRefs.deskLight.position.set(0.8, 2.02, 0.12);
  desk.add(sceneRefs.deskLight);
  addBox(desk, materials.oakDark, .93, .1, .84, -.45, .47, 1.08);
  addLegs(desk, .34, .31, .45, .43);
  addBox(desk, materials.sage, .98, .14, .83, -.45, .58, 1.08);
  addBox(desk, materials.oakDark, .95, .92, .13, -.45, 1.0, 1.46);

  // Bookshelf.
  const books = registerModel('bookshelf', group(roomGroup, 4.9, 0, -3.55));
  addBox(books, materials.oak, 1.18, 2.48, .67, 0, 1.24, 0);
  addBox(books, materials.cream, .95, 2.13, .05, 0, 1.25, .36);
  for (const y of [.46, 1.04, 1.62, 2.19]) addBox(books, materials.oakDark, 1.04, .09, .75, 0, y, .05);
  for (let i = 0; i < 11; i++) addBox(books, [materials.lavenderDeep, materials.sage, materials.pink, materials.cream][i % 4], .12 + i % 3 * .03, .34 + i % 4 * .04, .44, -.42 + i * .078, .73 + (i % 2) * .59, .13);

  // Complete Bathroom: tiled floor & curb, left ceramic tile wall, rain showerhead, caddy, bench & wooden bath mat.
  const shower = registerModel('shower', group(roomGroup, -4.83, 0, 2.38));
  addBox(shower, materials.tile, 1.88, .14, 2.15, 0, .05, 0);
  addBox(shower, materials.white, 1.88, .06, .08, 0, .14, 1.04);
  addBox(shower, materials.white, .08, .06, 2.15, -.9, .14, 0);
  addCylinder(shower, materials.ink, .09, .09, .012, -.27, .122, -.48, 16);

  // Tiled wall backing (toggled alongside wallLeft when camera orbits behind left wall).
  const showerWall = group(shower, 0, 0, 0);
  addBox(showerWall, new THREE.MeshStandardMaterial({ color: 0xf4efea, roughness: .85 }), .09, 2.44, 2.15, -.92, 1.24, 0);
  addBox(showerWall, new THREE.MeshStandardMaterial({ color: 0xd6e6e8, roughness: .75 }), .105, .2, 2.15, -.92, 1.56, 0, false);
  addBox(showerWall, materials.white, .12, .07, 2.18, -.92, 2.47, 0);
  // Brass shower riser, curved arm & wide rain showerhead centered above Miri.
  addCylinder(showerWall, materials.gold, .03, .03, 1.38, -.82, 1.58, -.48, 14);
  addBox(showerWall, materials.gold, .58, .045, .045, -.54, 2.26, -.48);
  addCylinder(showerWall, materials.gold, .075, .075, .035, -.82, 1.18, -.48, 14).rotation.z = Math.PI / 2;
  addCylinder(showerWall, materials.gold, .17, .21, .045, -.27, 2.21, -.48, 22);
  addCylinder(showerWall, new THREE.MeshStandardMaterial({ color: 0xb7dbe8, roughness: .4 }), .17, .17, .01, -.27, 2.185, -.48, 20);
  // Wall caddy shelf with shampoo & body wash bottles.
  addBox(showerWall, materials.white, .22, .035, .44, -.77, 1.15, .1);
  addCylinder(showerWall, materials.sage, .045, .045, .16, -.77, 1.25, 0, 12);
  addCylinder(showerWall, materials.pink, .042, .042, .14, -.77, 1.24, .18, 12);
  // Warm bathroom sconce light.
  const bathLampMat = new THREE.MeshStandardMaterial({ color: 0xffe8bb, roughness: .4 });
  sceneRefs.staticLampMaterials.push(bathLampMat);
  addBox(showerWall, materials.gold, .06, .08, .08, -.86, 2.08, .48);
  addSphere(showerWall, bathLampMat, .1, -.78, 2.14, .48);
  sceneRefs.bathLight = new THREE.PointLight(0xffcf88, 0, 5.5, 1.6);
  sceneRefs.bathLight.position.set(-.68, 2.14, .48);
  showerWall.add(sceneRefs.bathLight);
  sceneRefs.showerWallGroup = showerWall;

  // Translucent glass screen with framed rails & handle.
  const showerGlassMat = glass.clone();
  sceneProps.showerGlass = addBox(shower, showerGlassMat, .055, 2.38, 2.02, .88, 1.28, .05, false);
  addBox(shower, materials.white, .07, 2.44, .08, .88, 1.27, -1);
  addBox(shower, materials.white, .07, 2.44, .08, .88, 1.27, 1);
  addBox(shower, materials.white, .08, .06, 2.08, .88, 2.46, .05);
  addBox(shower, materials.white, .08, .06, 2.08, .88, .12, .05);
  addCylinder(shower, materials.gold, .018, .018, .34, .88, 1.18, -.78, 10);

  // Slatted oak shower bench with rolled towel & flat wooden bath mat outside entrance.
  const showerBench = group(shower, -.34, 0, .75);
  addLegs(showerBench, .27, .19, .54, .42);
  addBox(showerBench, materials.oakLight, .68, .06, .48, 0, .56, 0);
  addBox(showerBench, materials.cream, .56, .035, .36, 0, .26, 0);
  addCylinder(showerBench, materials.white, .07, .07, .26, .06, .35, 0, 12).rotation.z = Math.PI / 2;
  addBox(shower, materials.oakLight, .88, .025, .44, 0, .032, -1.35, false);

  // Active 3D shower spray cone directly beneath the rain showerhead.
  const sprayGroup = group(shower, -.27, 0, -.48);
  const streamMat = new THREE.MeshBasicMaterial({ color: 0x5ab2df, transparent: true, opacity: .6, depthWrite: false });
  sceneRefs.showerStreams = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = i % 3 === 0 ? 0.05 : 0.14;
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.02, 1.92, 6), streamMat);
    stream.position.set(Math.cos(angle) * radius, 1.18, Math.sin(angle) * radius);
    stream.rotation.z = -Math.cos(angle) * 0.05;
    stream.rotation.x = Math.sin(angle) * 0.05;
    sprayGroup.add(stream);
    sceneRefs.showerStreams.push(stream);
  }
  sprayGroup.visible = false;
  sceneRefs.showerSpray = sprayGroup;

  // Bed with rounded finial headboard, plush pillows, and animated pastel plaid duvet.
  const bed = registerModel('bed', group(roomGroup, 3.65, 0, 1.65));
  buildCozyBedModel(bed);

  // Sofa and round living room table.
  const sofa = group(roomGroup, -2.05, 0, 1.4);
  addBox(sofa, materials.oakDark, 2.5, .18, 1.15, 0, .28, 0);
  addBox(sofa, materials.sage, 2.55, .55, 1.15, 0, .7, 0);
  addBox(sofa, materials.sage, 2.6, 1.08, .25, 0, 1.09, -.52);
  addBox(sofa, materials.sage, .27, .82, 1.2, -1.18, .86, 0);
  addBox(sofa, materials.sage, .27, .82, 1.2, 1.18, .86, 0);
  addBox(sofa, materials.pink, .63, .23, .45, -.69, 1.04, -.18);

  const table = registerModel('tea', group(roomGroup, -.78, 0, 2.55));
  addCylinder(table, materials.oak, .71, .71, .12, 0, .74, 0, 30);
  addCylinder(table, materials.oakDark, .09, .12, .62, 0, .39, 0);
  addCylinder(table, materials.oakDark, .48, .48, .07, 0, .07, 0);
  // Ceramic teapot resting on the back-right of the table.
  addCylinder(table, materials.white, .14, .16, .15, .24, .88, -.14, 18);
  addSphere(table, materials.cream, .04, .24, .97, -.14);
  addCylinder(table, materials.white, .02, .035, .1, .36, .91, -.14, 10).rotation.z = -.85;

  // Framed sketches and hanging lights.
  addBox(roomGroup, materials.oakDark, .95, 1.15, .08, 4.55, 2.48, -4.82);
  addBox(roomGroup, materials.cream, .81, 1.01, .09, 4.55, 2.48, -4.76);
  addBox(roomGroup, materials.pink, .3, .44, .04, 4.55, 2.45, -4.69);
  addSphere(roomGroup, materials.gold, .27, 4.55, 2.72, -4.66);
  sceneRefs.pendantBulbs = [];
  sceneRefs.pendantShades = [];
  sceneRefs.pendantLights = [];
  for (const x of [-2.15, .72]) {
    addBox(roomGroup, materials.ink, .025, .48, .025, x, 3.35, -1);
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf8f1e4, roughness: 0.78 });
    const shade = addCylinder(roomGroup, shadeMat, .37, .19, .4, x, 3.05, -1);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe2aa, emissive: 0xf1bd73, emissiveIntensity: .45 });
    const bulb = addSphere(roomGroup, bulbMat, .09, x, 2.79, -1);
    const pl = new THREE.PointLight(0xffcf82, 0, 11, 1.5);
    pl.position.set(x, 2.68, -1);
    roomGroup.add(pl);
    sceneRefs.pendantShades.push(shade);
    sceneRefs.pendantBulbs.push(bulb);
    sceneRefs.pendantLights.push(pl);
  }

  buildPlacementGuides();
  buildSceneStateProps({ kitchen, desk, shower, bed, sofa, table, windowGroup });
  createMiri();
}

function makePlaidBlanketTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fcf4ea';
  ctx.fillRect(0, 0, 256, 256);

  const bands = [
    [16, 44, 'rgba(241, 166, 178, 0.44)'],
    [88, 28, 'rgba(181, 200, 169, 0.30)'],
    [144, 44, 'rgba(238, 194, 154, 0.38)'],
    [216, 24, 'rgba(205, 184, 218, 0.32)'],
  ];
  for (const [start, size, color] of bands) {
    ctx.fillStyle = color;
    ctx.fillRect(0, start, 256, size);
    ctx.fillRect(start, 0, size, 256);
  }
  ctx.fillStyle = 'rgba(220, 128, 142, 0.38)';
  for (const pos of [16, 60, 144, 188]) {
    ctx.fillRect(0, pos, 256, 3);
    ctx.fillRect(pos, 0, 3, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 2.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPlushPillowGeo(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 12, 6, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const nx = x / (w / 2);
    const ny = y / (h / 2);
    const nz = z / (d / 2);
    const radial = Math.max(0, 1 - 0.52 * nx * nx - 0.58 * nz * nz);
    const pinch = 0.32 + 0.82 * Math.sqrt(radial);
    const roundXZ = 1 - 0.08 * ny * ny - 0.05 * nx * nx * nz * nz;
    x *= roundXZ;
    z *= roundXZ;
    y *= pinch;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createQuiltClothGeo(w, h, d, isLeft) {
  const geo = new THREE.BoxGeometry(w, h, d, 18, 2, 22);
  const pos = geo.attributes.position;
  const baseY = new Float32Array(pos.count);
  const weights = new Float32Array(pos.count);
  const smooth = v => v * v * (3 - 2 * v);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = x / (w / 2);
    const nz = z / (d / 2);

    let drape = 0.025 * (1 - 0.35 * nx * nx);
    if (isLeft && nx < -0.78) {
      const e = Math.min(1, (-0.78 - nx) / 0.22);
      drape -= 0.18 * e * e;
    } else if (!isLeft && nx > 0.78) {
      const e = Math.min(1, (nx - 0.78) / 0.22);
      drape -= 0.18 * e * e;
    }
    if (nz > 0.80) {
      const ez = Math.min(1, (nz - 0.80) / 0.20);
      drape -= 0.14 * ez * ez;
    } else if (nz < -0.82) {
      const ez = Math.min(1, (-0.82 - nz) / 0.18);
      drape -= 0.025 * ez * ez;
    }
    y += drape;
    pos.setY(i, y);
    baseY[i] = y;

    if (isLeft) {
      const ux = Math.max(-1, Math.min(1, nx / 0.92));
      const wx = Math.pow(Math.cos(ux * Math.PI * 0.5), 0.72);
      let wz = 0;
      if (nz < -0.2) {
        const seg = Math.max(0, Math.min(1, (nz + 1) / 0.8));
        wz = 0.42 + 0.58 * smooth(seg);
      } else if (nz <= 0.28) {
        wz = 1;
      } else {
        const seg = Math.max(0, Math.min(1, (nz - 0.28) / 0.6));
        wz = 1 - smooth(seg);
      }
      weights[i] = wx * wz;
    }
  }
  geo.computeVertexNormals();
  return { geo, baseY, weights };
}

function createCuffClothGeo(w, radius, isLeft) {
  const geo = new THREE.CylinderGeometry(radius, radius, w, 16, 18);
  geo.rotateZ(Math.PI / 2);
  const pos = geo.attributes.position;
  const baseY = new Float32Array(pos.count);
  const weights = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i) * 0.85;
    const z = pos.getZ(i) * 1.25;
    const nx = x / (w / 2);
    if (isLeft && nx < -0.78) {
      const e = Math.min(1, (-0.78 - nx) / 0.22);
      y -= 0.16 * e * e;
    } else if (!isLeft && nx > 0.78) {
      const e = Math.min(1, (nx - 0.78) / 0.22);
      y -= 0.16 * e * e;
    }
    pos.setXYZ(i, x, y, z);
    baseY[i] = y;
    if (isLeft) {
      const ux = Math.max(-1, Math.min(1, nx / 0.92));
      weights[i] = 0.42 * Math.pow(Math.cos(ux * Math.PI * 0.5), 0.72);
    }
  }
  geo.computeVertexNormals();
  return { geo, baseY, weights };
}

function buildCozyBedModel(bed) {
  // Chunky oak frame, corner legs & headboard posts topped with rounded ball finials.
  addBox(bed, materials.oak, 3.1, 0.34, 3.1, 0, 0.34, 0);
  for (const x of [-1.42, 1.42]) {
    for (const z of [-1.42, 1.42]) addBox(bed, materials.oakDark, 0.18, 0.18, 0.18, x, 0.09, z);
  }
  addBox(bed, materials.oakDark, 2.94, 0.98, 0.14, 0, 0.88, -1.48);
  addBox(bed, materials.oak, 2.62, 0.72, 0.05, 0, 0.92, -1.40, false);
  for (const x of [-1.49, 1.49]) {
    addCylinder(bed, materials.oak, 0.11, 0.11, 1.24, x, 0.78, -1.48, 16);
    addSphere(bed, materials.oakLight, 0.145, x, 1.45, -1.48);
    addCylinder(bed, materials.oak, 0.095, 0.095, 0.44, x, 0.4, 1.48, 14);
    addSphere(bed, materials.oakLight, 0.115, x, 0.65, 1.48);
  }

  // Cream mattress sheet.
  addBox(bed, materials.cream, 2.86, 0.3, 2.84, 0, 0.66, 0.02);

  // Fluffy pillows (pastel pink pillow on left sleeper spot + warm cream right pillow).
  const pinkPillowMat = new THREE.MeshStandardMaterial({ color: 0xf1b6c1, roughness: 0.86 });
  const cuffPinkMat = new THREE.MeshStandardMaterial({ color: 0xf2aebc, roughness: 0.88 });
  const quiltMat = new THREE.MeshStandardMaterial({ map: makePlaidBlanketTexture(), roughness: 0.9 });

  const leftPillow = new THREE.Mesh(createPlushPillowGeo(1.06, 0.22, 0.58), pinkPillowMat);
  leftPillow.position.set(-0.72, 0.89, -1.03);
  leftPillow.rotation.x = 0.08;
  leftPillow.castShadow = true;
  leftPillow.receiveShadow = true;
  bed.add(leftPillow);

  const rightPillow = new THREE.Mesh(createPlushPillowGeo(1.06, 0.21, 0.58), materials.white);
  rightPillow.position.set(0.72, 0.89, -1.03);
  rightPillow.rotation.x = 0.08;
  rightPillow.castShadow = true;
  rightPillow.receiveShadow = true;
  bed.add(rightPillow);

  // Right-side quilt & cuff (stationary neatly-made side).
  const rightCloth = createQuiltClothGeo(1.45, 0.14, 2.1, false);
  const rightWing = new THREE.Mesh(rightCloth.geo, quiltMat);
  rightWing.position.set(0.715, 0.88, 0.39);
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  bed.add(rightWing);

  const rightCuff = createCuffClothGeo(1.44, 0.09, false);
  const rightCuffMesh = new THREE.Mesh(rightCuff.geo, cuffPinkMat);
  rightCuffMesh.position.set(0.71, 0.91, -0.59);
  rightCuffMesh.castShadow = true;
  rightCuffMesh.receiveShadow = true;
  bed.add(rightCuffMesh);

  // Left-side sleeper quilt & cuff pivoted at center seam so Miri can lift and tuck underneath.
  const duvetPivot = group(bed, 0.02, 0.9, 0.39);
  const leftCloth = createQuiltClothGeo(1.45, 0.14, 2.1, true);
  const leftWing = new THREE.Mesh(leftCloth.geo, quiltMat);
  leftWing.position.set(-0.735, -0.02, 0);
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;
  duvetPivot.add(leftWing);

  const leftCuff = createCuffClothGeo(1.44, 0.09, true);
  const leftCuffMesh = new THREE.Mesh(leftCuff.geo, cuffPinkMat);
  leftCuffMesh.position.set(-0.73, 0.01, -0.98);
  leftCuffMesh.castShadow = true;
  leftCuffMesh.receiveShadow = true;
  duvetPivot.add(leftCuffMesh);

  sceneRefs.bedBlanketPivot = duvetPivot;
  sceneRefs.bedClothState = {
    clothGeo: leftCloth.geo,
    clothBaseY: leftCloth.baseY,
    clothWeights: leftCloth.weights,
    cuffGeo: leftCuff.geo,
    cuffBaseY: leftCuff.baseY,
    cuffWeights: leftCuff.weights,
    lastLift: 0,
  };
}

function updateBedBlanket(pose) {
  const pivot = sceneRefs.bedBlanketPivot;
  const cloth = sceneRefs.bedClothState;
  if (!pivot || !cloth) return;
  const open = pose?.blanketOpen || 0;
  const tuck = pose?.blanketTuck || 0;
  const breath = pose?.blanketBreath || 0;

  pivot.rotation.z = -open * 1.45;
  pivot.rotation.x = open * 0.14;
  pivot.position.y = 0.9 + open * 0.08;

  const lift = tuck * 0.62 + breath * 0.03;
  if (Math.abs(lift - cloth.lastLift) > 0.001) {
    cloth.lastLift = lift;
    const clothPos = cloth.clothGeo.attributes.position;
    for (let i = 0; i < clothPos.count; i++) {
      clothPos.setY(i, cloth.clothBaseY[i] + cloth.clothWeights[i] * lift);
    }
    clothPos.needsUpdate = true;
    cloth.clothGeo.computeVertexNormals();

    const cuffPos = cloth.cuffGeo.attributes.position;
    for (let i = 0; i < cuffPos.count; i++) {
      cuffPos.setY(i, cloth.cuffBaseY[i] + cloth.cuffWeights[i] * lift);
    }
    cuffPos.needsUpdate = true;
    cloth.cuffGeo.computeVertexNormals();
  }
}

function createWallClock(parent) {
  const clock = group(parent, 2.85, 2.62, -4.90);
  clock.userData.clock = true;
  const bezel = addCylinder(clock, materials.oakDark, .44, .44, .065, 0, 0, 0, 32);
  bezel.rotation.x = Math.PI / 2;
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xfffaf1, roughness: 0.65 });
  sceneRefs.clockFaceMat = faceMat;
  const face = addCylinder(clock, faceMat, .37, .37, .072, 0, 0, .004, 32);
  face.rotation.x = Math.PI / 2;

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    const tick = addBox(
      clock,
      major ? materials.ink : materials.oak,
      major ? 0.028 : 0.016,
      major ? 0.068 : 0.036,
      0.012,
      Math.sin(angle) * 0.295,
      Math.cos(angle) * 0.295,
      0.042,
      false,
    );
    tick.rotation.z = -angle;
  }

  const hourPivot = group(clock, 0, 0, 0.052);
  addBox(hourPivot, materials.ink, 0.034, 0.18, 0.012, 0, 0.075, 0, false);
  const minutePivot = group(clock, 0, 0, 0.062);
  addBox(minutePivot, materials.lavenderDeep, 0.022, 0.26, 0.01, 0, 0.11, 0, false);
  addSphere(clock, materials.gold, 0.03, 0, 0, 0.07);

  sceneRefs.clockHourPivot = hourPivot;
  sceneRefs.clockMinutePivot = minutePivot;
  updateClockHands(clockDisplayTotal);
}

function updateClockHands(totalMinutes) {
  if (!sceneRefs.clockHourPivot || !sceneRefs.clockMinutePivot) return;
  const m = ((totalMinutes % 60) + 60) % 60;
  const h = ((totalMinutes % 720) + 720) % 720;
  sceneRefs.clockMinutePivot.rotation.z = -(m / 60) * Math.PI * 2;
  sceneRefs.clockHourPivot.rotation.z = -(h / 720) * Math.PI * 2;
}

function buildPlacementGuides() {
  const gridGroup = group(roomGroup, 0, 0, 0);
  const slotGeo = new THREE.RingGeometry(0.22, 0.28, 24);
  const slotMat = new THREE.MeshBasicMaterial({ color: 0x9d83b1, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  for (let gx = 0; gx < 5; gx++) {
    for (let gz = 0; gz < 5; gz++) {
      const [wx, wz] = worldFromCell(gx, gz);
      const ring = new THREE.Mesh(slotGeo, slotMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wx, 0.072, wz);
      gridGroup.add(ring);
    }
  }
  gridGroup.visible = false;
  sceneRefs.buildGridGroup = gridGroup;

  const targetPad = group(roomGroup, 0, 0, 0);
  const padFill = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 28),
    new THREE.MeshBasicMaterial({ color: 0xcbb8d5, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  padFill.rotation.x = -Math.PI / 2;
  padFill.position.y = 0.073;
  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.56, 32),
    new THREE.MeshBasicMaterial({ color: 0x81699a, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }),
  );
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.075;
  targetPad.add(padFill, padRing);
  targetPad.visible = false;
  sceneRefs.buildTargetPad = targetPad;

  const cursorRing = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 26),
    new THREE.MeshBasicMaterial({ color: 0x51465b, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  cursorRing.rotation.x = -Math.PI / 2;
  cursorRing.position.y = 0.071;
  cursorRing.visible = false;
  roomGroup.add(cursorRing);
  sceneRefs.buildCursorRing = cursorRing;
}

function createMiri() {
  miri = group(roomGroup, -.2, 0, .2);
  miri.userData.miri = true;
  const poseGroup = group(miri, 0, 0, 0);

  const skin = new THREE.MeshStandardMaterial({ color: 0xf3cab4, roughness: .78 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x423548, roughness: .72 });
  const hairSheen = new THREE.MeshStandardMaterial({ color: 0x57475e, roughness: .62 });
  const sweater = new THREE.MeshStandardMaterial({ color: 0xdfafa4, roughness: .84 });
  const pinafore = new THREE.MeshStandardMaterial({ color: 0x9d83b1, roughness: .85 });
  const tights = new THREE.MeshStandardMaterial({ color: 0x7a5e50, roughness: .88 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0xf7eee0, roughness: .78 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x8d6956, roughness: .9 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xe69c99, roughness: .85 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xc27778, roughness: .75 });
  const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xfffdf9 });

  const addCapsule = (parent, mat, radius, length, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 8, 16), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Sculpted legs, sock cuffs & rounded boots.
  const buildLeg = xPos => {
    const legPivot = group(poseGroup, xPos, .67, 0);
    addCapsule(legPivot, tights, .105, .36, 0, -.26, 0);
    addCylinder(legPivot, materials.cream, .108, .102, .08, 0, -.49, 0, 18);
    const boot = addCapsule(legPivot, bootMat, .092, .085, 0, -.58, .035);
    boot.rotation.x = Math.PI / 2;
    const sole = addCapsule(legPivot, soleMat, .094, .09, 0, -.625, .035);
    sole.rotation.x = Math.PI / 2;
    sole.scale.set(1.02, 1, .45);
    return legPivot;
  };
  const leftLegPivot = buildLeg(-.135);
  const rightLegPivot = buildLeg(.135);

  // Sculpted tunic dress & Peter-Pan collar.
  const torsoPivot = group(poseGroup, 0, .67, 0);
  const dressProfile = [
    new THREE.Vector2(0, .01),
    new THREE.Vector2(.34, .02),
    new THREE.Vector2(.31, .14),
    new THREE.Vector2(.25, .34),
    new THREE.Vector2(.27, .55),
    new THREE.Vector2(.21, .65),
    new THREE.Vector2(.11, .70),
    new THREE.Vector2(0, .70),
  ];
  const dressMesh = new THREE.Mesh(new THREE.LatheGeometry(dressProfile, 26), sweater);
  dressMesh.castShadow = true;
  dressMesh.receiveShadow = true;
  torsoPivot.add(dressMesh);

  // Lavender hem trim, pocket detail & collar bow.
  const hemRing = new THREE.Mesh(new THREE.TorusGeometry(.325, .024, 10, 28), pinafore);
  hemRing.rotation.x = Math.PI / 2;
  hemRing.position.y = .04;
  hemRing.castShadow = true;
  torsoPivot.add(hemRing);

  addBox(torsoPivot, materials.cream, .13, .13, .03, .11, .27, .265).rotation.y = .32;
  addSphere(torsoPivot, materials.gold, .022, .11, .31, .285);

  // Delicate neck + Peter-Pan collar + ribbon tie.
  addCylinder(torsoPivot, skin, .082, .105, .14, 0, .71, 0, 16);
  for (const side of [-1, 1]) {
    const collar = addSphere(torsoPivot, materials.white, .105, side * .085, .645, .115);
    collar.scale.set(1.05, .35, .85);
    collar.rotation.z = side * -.28;
    collar.rotation.y = side * .35;
  }
  addSphere(torsoPivot, pinafore, .042, 0, .615, .21);
  addBox(torsoPivot, pinafore, .12, .05, .035, 0, .615, .205);

  // Head, expressive face & layered hair with side buns and hairclip.
  const headPivot = group(torsoPivot, 0, .73, 0);
  const headSphere = addSphere(headPivot, skin, .305, 0, .27, 0);
  headSphere.scale.set(1, 1.03, .96);

  for (const side of [-1, 1]) {
    const ear = addSphere(headPivot, skin, .058, side * .295, .24, -.02);
    ear.scale.set(.55, 1, .75);
  }

  // Eyes (grouped so blinking closes iris and white catchlight together).
  const eyes = [];
  for (const side of [-1, 1]) {
    const eyeGroup = group(headPivot, side * .105, .255, .268);
    const iris = addSphere(eyeGroup, materials.ink, .034, 0, 0, 0);
    iris.scale.set(.9, 1.18, .55);
    iris.castShadow = false;
    const catchlight = addSphere(eyeGroup, eyeWhite, .011, -.01, .014, .016);
    catchlight.castShadow = false;
    eyes.push(eyeGroup);

    const brow = addCapsule(headPivot, hair, .01, .045, side * .105, .325, .272);
    brow.rotation.z = Math.PI / 2 + side * -.12;
    brow.castShadow = false;

    const cheek = addSphere(headPivot, blush, .048, side * .175, .195, .235);
    cheek.scale.set(1.15, .7, .45);
    cheek.castShadow = false;
  }

  // Tiny nose and soft smile.
  const nose = addSphere(headPivot, skin, .022, 0, .205, .295);
  nose.castShadow = false;
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.038, .01, 8, 14, Math.PI * .72), lipMat);
  smile.position.set(0, .17, .276);
  smile.rotation.z = Math.PI + Math.PI * .14;
  headPivot.add(smile);

  // Layered hair crown, bob back volume, twin buns & wispy bangs.
  const hairCrown = addSphere(headPivot, hair, .322, 0, .335, -.035);
  hairCrown.scale.set(1.02, .98, 1.04);
  const hairBob = addCapsule(headPivot, hair, .25, .16, 0, .28, -.14);
  hairBob.scale.set(1.06, .9, .72);
  const crownSheen = new THREE.Mesh(new THREE.TorusGeometry(.21, .022, 8, 22, Math.PI * .75), hairSheen);
  crownSheen.position.set(0, .51, .05);
  crownSheen.rotation.x = .95;
  crownSheen.rotation.z = .38;
  headPivot.add(crownSheen);

  // Swept bangs & temple side locks.
  const bangLeft = addCapsule(headPivot, hair, .095, .17, -.11, .41, .19);
  bangLeft.rotation.set(.42, -.2, -.72);
  const bangRight = addCapsule(headPivot, hair, .085, .15, .12, .415, .19);
  bangRight.rotation.set(.42, .2, .68);
  const bangCenter = addSphere(headPivot, hair, .095, -.02, .455, .22);
  bangCenter.scale.set(1.3, .75, .65);

  // Gold star hairclip on left bang.
  const hairClip = addBox(headPivot, materials.gold, .07, .022, .024, -.16, .43, .23);
  hairClip.rotation.z = -.45;

  for (const side of [-1, 1]) {
    const sideLock = addCapsule(headPivot, hair, .072, .2, side * .27, .22, .05);
    sideLock.rotation.z = side * .12;
    const scrunchie = new THREE.Mesh(new THREE.TorusGeometry(.088, .024, 10, 18), materials.lavender);
    scrunchie.position.set(side * .28, .38, -.13);
    scrunchie.rotation.y = side * .95;
    headPivot.add(scrunchie);
    addSphere(headPivot, hair, .115, side * .305, .39, -.15);
  }

  // Sculpted arms with knit sleeves, cream cuffs & hands.
  const buildArm = side => {
    const armPivot = group(torsoPivot, side * .30, .59, 0);
    armPivot.rotation.z = side * .2;
    addCapsule(armPivot, sweater, .08, .22, 0, -.15, 0);
    addCylinder(armPivot, materials.cream, .076, .072, .055, 0, -.29, 0, 16);
    addCapsule(armPivot, skin, .062, .16, 0, -.37, 0);
    addSphere(armPivot, skin, .07, 0, -.48, 0);
    return armPivot;
  };
  const leftArmPivot = buildArm(-1);
  const rightArmPivot = buildArm(1);
  const rightHandSlot = group(rightArmPivot, 0, -.48, .04);

  const ladle = group(rightHandSlot, 0, 0, 0);
  addCylinder(ladle, materials.oak, .025, .022, .44, 0, 0, .2).rotation.x = Math.PI / 2;
  addCylinder(ladle, materials.cream, .095, .07, .05, 0, -.01, .43);
  ladle.visible = false;

  const brush = group(rightHandSlot, 0, 0, 0);
  addCylinder(brush, materials.oakDark, .02, .016, .36, 0, 0, .16).rotation.x = Math.PI / 2;
  addCylinder(brush, materials.lavenderDeep, .026, .012, .08, 0, 0, .36).rotation.x = Math.PI / 2;
  brush.visible = false;

  const cup = group(rightHandSlot, 0, 0, .05);
  addCylinder(cup, materials.white, .1, .08, .12, 0, .03, 0);
  addCylinder(cup, materials.gold, .075, .075, .02, 0, .075, 0);
  cup.visible = false;

  const fork = group(rightHandSlot, 0, 0, 0);
  addCylinder(fork, materials.gold, .016, .014, .34, 0, 0, .14).rotation.x = Math.PI / 2;
  addBox(fork, materials.gold, .045, .012, .08, 0, 0, .32);
  fork.visible = false;

  const book = group(torsoPivot, 0, .44, .41);
  book.rotation.x = 0.45;
  addBox(book, materials.lavenderDeep, .26, .03, .34, -.13, 0, 0).rotation.z = 0.24;
  addBox(book, materials.lavenderDeep, .26, .03, .34, .13, 0, 0).rotation.z = -0.24;
  addBox(book, materials.cream, .23, .032, .31, -.12, .015, 0).rotation.z = 0.24;
  addBox(book, materials.cream, .23, .032, .31, .12, .015, 0).rotation.z = -0.24;
  book.visible = false;

  miriRig = {
    poseGroup,
    leftLegPivot,
    rightLegPivot,
    torsoPivot,
    headPivot,
    leftArmPivot,
    rightArmPivot,
    eyes,
    props: { ladle, brush, cup, fork, book },
  };
}

function applyMiriPose(pose) {
  if (!miri || !miriRig) return;
  miri.position.set(pose.x, pose.y, pose.z);
  miri.rotation.y = pose.yaw;

  miriRig.poseGroup.position.set(0, pose.posePosY, pose.posePosZ);
  miriRig.poseGroup.rotation.set(pose.poseRotX, 0, pose.poseRotZ);

  miriRig.leftLegPivot.rotation.set(pose.leftLegRotX, 0, pose.leftLegRotZ);
  miriRig.rightLegPivot.rotation.set(pose.rightLegRotX, 0, pose.rightLegRotZ);

  miriRig.torsoPivot.rotation.set(pose.torsoRotX, pose.torsoRotY, pose.torsoRotZ);
  miriRig.headPivot.rotation.set(pose.headRotX, pose.headRotY, pose.headRotZ);

  miriRig.leftArmPivot.rotation.set(pose.leftArmRotX, pose.leftArmRotY, pose.leftArmRotZ);
  miriRig.rightArmPivot.rotation.set(pose.rightArmRotX, pose.rightArmRotY, pose.rightArmRotZ);

  for (const eye of miriRig.eyes) {
    eye.scale.y = pose.eyeScaleY;
    if (eye.children[1]) eye.children[1].visible = pose.eyeScaleY >= 0.4;
  }
  for (const [key, node] of Object.entries(miriRig.props)) {
    node.visible = pose.prop === key;
  }
  updateBedBlanket(pose);
  if (sceneRefs.bedEyeMask) {
    const busyOnPillow = (pose.blanketOpen || 0) > 0.05 || (pose.blanketTuck || 0) > 0.05;
    sceneRefs.bedEyeMask.visible = !busyOnPillow;
  }

  if (sceneRefs.potLid) {
    sceneRefs.potLid.position.y = 1.29 + pose.potShake * 0.035;
    sceneRefs.potLid.rotation.z = pose.potShake ? Math.sin(performance.now() * 0.03) * 0.09 * pose.potShake : 0;
  }
  if (sceneRefs.sketchOverlay) {
    sceneRefs.sketchOverlay.material.opacity = pose.effect === 'paint'
      ? 0.45 + Math.sin(performance.now() * 0.008) * 0.16
      : (state.scene?.painting ? 0 : 0.14);
  }
}

function worldFromCell(x, z) { return [-4.75 + x * 2.28, -3.65 + z * 1.83]; }
function cellFromWorld(x, z) { return [Math.max(0, Math.min(4, Math.round((x + 4.75) / 2.28))), Math.max(0, Math.min(4, Math.round((z + 3.65) / 1.83)))]; }

function createFurniture(id, parent) {
  const piece = group(parent);
  piece.userData.furniture = id;
  if (id === 'rug') {
    addCylinder(piece, materials.lavender, 1.04, 1.04, .045, 0, .085, 0, 40);
    addCylinder(piece, materials.cream, .76, .76, .05, 0, .09, 0, 40);
  } else if (id === 'plant') {
    addCylinder(piece, materials.pink, .31, .23, .47, 0, .27, 0);
    addCylinder(piece, materials.oakDark, .08, .08, .9, 0, .84, 0);
    for (const [x, y, z, radius] of [[-.25,1.1,0,.27],[.28,1.25,.08,.3],[-.12,1.5,-.09,.26],[.12,1.67,.02,.2]]) addSphere(piece, materials.sage, radius, x, y, z);
  } else if (id === 'lamp') {
    addCylinder(piece, materials.oakDark, .37, .37, .09, 0, .08, 0);
    addCylinder(piece, materials.gold, .045, .045, 1.62, 0, .9, 0);
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf8f1e4, roughness: 0.78 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe4a8, roughness: 0.4 });
    sceneRefs.movableLampMaterials.push(shadeMat, bulbMat);
    addCylinder(piece, shadeMat, .37, .22, .51, 0, 1.95, 0);
    addSphere(piece, bulbMat, .13, 0, 1.63, 0);
    const lampLight = new THREE.PointLight(0xffca7a, 0, 7.5, 1.5);
    lampLight.position.set(0, 1.85, 0);
    piece.add(lampLight);
    sceneRefs.movableLampLights.push(lampLight);
  } else if (id === 'armchair') {
    addBox(piece, materials.oakDark, 1.1, .15, 1.1, 0, .27, 0);
    addBox(piece, materials.cream, 1.18, .53, 1.13, 0, .64, 0);
    addBox(piece, materials.cream, 1.16, .9, .21, 0, 1.08, -.48);
    for (const x of [-.5, .5]) addBox(piece, materials.cream, .17, .7, 1.11, x, .85, 0);
    addBox(piece, materials.pink, .54, .2, .45, 0, .95, -.13);
  } else if (id === 'shelf') {
    addBox(piece, materials.oak, 1.55, 1.12, .58, 0, .59, 0);
    for (const y of [.13, .56, 1.03]) addBox(piece, materials.oakDark, 1.55, .07, .66, 0, y, 0);
    for (let i = 0; i < 8; i++) addBox(piece, [materials.cream, materials.sage, materials.pink][i % 3], .13, .24 + (i % 2) * .1, .37, -.57 + i * .16, .35, .06);
  } else if (id === 'stool') {
    addCylinder(piece, materials.oak, .42, .42, .12, 0, .58, 0);
    for (const x of [-.24,.24]) for (const z of [-.24,.24]) addBox(piece, materials.oakDark, .1, .52, .1, x, .27, z);
  }
  return piece;
}
function updateMovableFurniture() {
  if (movableGroup) roomGroup.remove(movableGroup);
  movableNodes.clear();
  sceneRefs.movableLampMaterials = [];
  sceneRefs.movableLampLights = [];
  movableGroup = group(roomGroup);
  for (const [id, cell] of Object.entries(state.furniture)) {
    const piece = createFurniture(id, movableGroup);
    const [x, z] = worldFromCell(cell.x, cell.z); piece.position.set(x, 0, z);
    movableNodes.set(id, piece);
  }
  updateAtmosphere(state.minute, true);
}

function showWalkRing(x, z) {
  if (!sceneRefs.walkRing) return;
  sceneRefs.walkRing.position.set(x, 0.075, z);
  sceneRefs.walkRing.scale.setScalar(0.6);
  sceneRefs.walkRingTimer = 0.55;
}

function initScene() {
  const canvas = $('#room-canvas');
  scene = new THREE.Scene();
  scene.background = null;
  camera = new THREE.OrthographicCamera(-8, 8, 7, -7, .1, 100);
  camera.position.set(13, 11, 15);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.75;
  sceneRefs.ambientLight = new THREE.HemisphereLight(0xfff4df, 0xbaa8c6, 2.5);
  scene.add(sceneRefs.ambientLight);
  sceneRefs.sunLight = new THREE.DirectionalLight(0xffe6b4, 3.2);
  sceneRefs.sunLight.position.set(-4, 10, 7);
  sceneRefs.sunLight.castShadow = true;
  sceneRefs.sunLight.shadow.mapSize.set(2048, 2048);
  sceneRefs.sunLight.shadow.camera.left = -12;
  sceneRefs.sunLight.shadow.camera.right = 12;
  sceneRefs.sunLight.shadow.camera.top = 12;
  sceneRefs.sunLight.shadow.camera.bottom = -12;
  sceneRefs.sunLight.shadow.bias = -.0003;
  scene.add(sceneRefs.sunLight);
  sceneRefs.fillLight = new THREE.DirectionalLight(0xd8d5f3, 1.1);
  sceneRefs.fillLight.position.set(7, 5, -6);
  scene.add(sceneRefs.fillLight);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.1, 0); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minPolarAngle = .54; controls.maxPolarAngle = 1.25; controls.minZoom = .64; controls.maxZoom = 1.75;
  controls.update();
  buildRoom(); updateMovableFurniture(); createHotspots();
  syncSceneProps(true);
  updateAtmosphere(state.minute, true);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(1, rect.height);
    const halfHeight = Math.max(7.6, 8.4 / Math.max(0.45, aspect));
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false);
  };
  new ResizeObserver(resize).observe(canvas); resize();
  let down = null;
  const updateBuildPointer = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(buildFloorPlane, buildPlaneHit)) {
      const snapped = clampAndSnapBuildPoint(buildPlaneHit.x, buildPlaneHit.z);
      Object.assign(buildTarget, snapped);
      return true;
    }
    return false;
  };
  canvas.addEventListener('pointerdown', event => {
    if (mode === 'build' && event.button === 2 && movingFurniture) {
      event.preventDefault();
      cancelMovingFurniture();
      return;
    }
    if (mode === 'build' && event.button === 0) {
      if (movingFurniture) {
        controls.enabled = false;
        try { canvas.setPointerCapture(event.pointerId); } catch {}
        updateBuildPointer(event.clientX, event.clientY);
        down = { x: event.clientX, y: event.clientY, action: 'drop' };
        return;
      }
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(movableGroup ? movableGroup.children : [], true);
      for (const hit of hits) {
        let obj = hit.object;
        while (obj && obj !== movableGroup) {
          if (obj.userData.furniture) {
            controls.enabled = false;
            try { canvas.setPointerCapture(event.pointerId); } catch {}
            draggingFurniture = true;
            down = { x: event.clientX, y: event.clientY, action: 'pickup', furnitureId: obj.userData.furniture };
            startMovingFurniture(obj.userData.furniture, event.clientX, event.clientY);
            return;
          }
          obj = obj.parent;
        }
      }
    }
    down = { x: event.clientX, y: event.clientY };
  }, { capture: true });
  canvas.addEventListener('pointercancel', () => {
    down = null;
    draggingFurniture = false;
    controls.enabled = true;
  });
  canvas.addEventListener('contextmenu', event => {
    if (mode === 'build' && movingFurniture) {
      event.preventDefault();
      cancelMovingFurniture();
    }
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mode === 'build' && movingFurniture) {
      cancelMovingFurniture();
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (mode === 'build' && movingFurniture) {
      updateBuildPointer(event.clientX, event.clientY);
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (down) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(roomGroup.children, true);
    let hoverKind = '';
    for (const hit of hits) {
      let object = hit.object;
      while (object && object !== roomGroup) {
        if (mode === 'build' && object.userData.furniture) { hoverKind = 'grab'; break; }
        if (mode === 'life' && object.userData.interaction) {
          if (object.userData.interaction === 'meal' && state.scene?.meal !== 'ready') {
            object = object.parent;
            continue;
          }
          hoverKind = 'pointer';
          break;
        }
        if (mode === 'life' && object.userData.miri && miriCtrl.state.phase === 'idle') { hoverKind = 'pointer'; break; }
        if (mode === 'life' && object.userData.clock) { hoverKind = 'pointer'; break; }
        object = object.parent;
      }
      if (hoverKind) break;
    }
    canvas.style.cursor = hoverKind;
  });
  canvas.addEventListener('pointerup', event => {
    try { if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch {}
    if (!controls.enabled) controls.enabled = true;
    const start = down;
    down = null;
    if (mode === 'build' && movingFurniture) {
      if (start?.action === 'drop') {
        draggingFurniture = false;
        updateBuildPointer(event.clientX, event.clientY);
        commitMovingFurniture();
        return;
      }
      if (start?.action === 'pickup') {
        draggingFurniture = false;
        const dist = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (dist > 8) {
          updateBuildPointer(event.clientX, event.clientY);
          commitMovingFurniture();
        }
        return;
      }
    }
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(roomGroup.children, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && object !== roomGroup) {
        if (mode === 'build' && object.userData.furniture) { startMovingFurniture(object.userData.furniture, event.clientX, event.clientY); return; }
        if (mode === 'life' && object.userData.interaction) {
          if (object.userData.interaction === 'meal' && state.scene?.meal !== 'ready') {
            object = object.parent;
            continue;
          }
          selectInteraction(object.userData.interaction);
          return;
        }
        if (mode === 'life' && object.userData.miri && miriCtrl.state.phase === 'idle') {
          miriCtrl.triggerReaction('wave');
          toast('Miri 朝你挥了挥手。');
          return;
        }
        if (mode === 'life' && object.userData.clock) {
          const hour = Math.floor(state.minute / 60), minute = state.minute % 60;
          toast(`墙上挂钟：第 ${state.day} 天 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}（${atmosphereTarget.weatherText}）`);
          return;
        }
        if (object.userData.ground) {
          if (mode === 'life') {
            $('#interaction-card').hidden = true;
            selectedInteraction = null;
            $$('.hotspot').forEach(button => button.classList.remove('active'));
            miriCtrl.walkToPoint([hit.point.x, hit.point.z], state.furniture, isReducedMotion());
            showWalkRing(hit.point.x, hit.point.z);
            return;
          }
        }
        object = object.parent;
      }
    }
  });

  let lastTime = performance.now();
  const animate = now => {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    controls.update();

    const prevAction = miriCtrl.state.activeAction;
    const prevPhase = miriCtrl.state.phase;
    const pose = miriCtrl.update(dt, isReducedMotion());

    // Once Miri actually begins performing the action (not while walking there), advance time & lighting smoothly.
    if (
      pendingAction &&
      miriCtrl.state.phase === 'act' &&
      miriCtrl.state.activeAction === pendingAction.id
    ) {
      pendingAction.started = true;
      const p = Math.max(0, Math.min(1, miriCtrl.state.timer / Math.max(0.1, miriCtrl.state.duration)));
      const liveTotal = pendingAction.startTotal + (pendingAction.endTotal - pendingAction.startTotal) * p;
      clockDisplayTotal = liveTotal;
      clockTargetTotal = liveTotal;
      updateClockHands(liveTotal);
      renderClockHeader(Math.floor(liveTotal / 1440), Math.floor(liveTotal) % 1440);
      updateAtmosphere(Math.floor(liveTotal) % 1440);
    }

    // Commit the pending action when Miri finishes performing it, then animate prop appear/consume.
    if (
      prevPhase === 'act' &&
      miriCtrl.state.phase !== 'act' &&
      pendingAction &&
      prevAction === pendingAction.id
    ) {
      flushPendingAction(true);
    }

    if (propReveal.animating && propReveal.key && sceneProps[propReveal.key]) {
      propReveal.progress = Math.min(1, propReveal.progress + dt * 3.2);
      const t = propReveal.progress;
      if (propReveal.mode === 'consume') {
        sceneProps[propReveal.key].scale.setScalar(Math.max(0.01, 1 - t));
        if (t >= 1) {
          propReveal.animating = false;
          propReveal.key = null;
          syncSceneProps(true);
        }
      } else {
        const overshoot = 1 + Math.sin(t * Math.PI) * 0.14;
        sceneProps[propReveal.key].scale.setScalar(0.2 + 0.8 * t * overshoot);
        if (t >= 1) {
          sceneProps[propReveal.key].scale.setScalar(1);
          propReveal.animating = false;
          propReveal.key = null;
        }
      }
    }

    applyMiriPose(pose);
    updateParticles(dt, mode === 'life' ? pose.effect : null, pose);

    // Animate 3D shower water spray streams while bathing.
    if (sceneRefs.showerSpray) {
      const spraying = mode === 'life' && pose.effect === 'shower';
      sceneRefs.showerSpray.visible = spraying;
      if (sceneProps.showerGlass) {
        sceneProps.showerGlass.material.opacity = spraying || state.scene?.showered ? 0.54 : 0.35;
      }
      if (spraying && !isReducedMotion()) {
        for (let i = 0; i < sceneRefs.showerStreams.length; i++) {
          const s = sceneRefs.showerStreams[i];
          const pulse = 0.85 + Math.sin(now * 0.025 + i * 1.1) * 0.15;
          s.scale.set(pulse, 0.94 + Math.cos(now * 0.03 + i) * 0.06, pulse);
        }
      }
    }

    // Smoothly animate day-night lighting, twinkling night stars, and wall clock hands.
    applyAtmosphereStep(isReducedMotion() ? 1 : Math.min(1, dt * 4.2));
    if (!isReducedMotion()) {
      for (let i = 0; i < sceneRefs.skyStars.length; i++) {
        const star = sceneRefs.skyStars[i];
        if (star.visible) star.scale.setScalar(0.85 + Math.sin(now * 0.004 + i * 1.4) * 0.25);
      }
    }
    if (clockDisplayTotal < clockTargetTotal) {
      if (isReducedMotion()) {
        clockDisplayTotal = clockTargetTotal;
      } else {
        const diff = clockTargetTotal - clockDisplayTotal;
        const step = Math.max(85, diff * 2.8) * dt;
        clockDisplayTotal = Math.min(clockTargetTotal, clockDisplayTotal + step);
      }
      updateClockHands(clockDisplayTotal);
    }

    if (mode === 'build' && movingFurniture) {
      const node = movableNodes.get(movingFurniture);
      if (node) {
        const followT = isReducedMotion() ? 1 : Math.min(1, dt * 22);
        const targetY = isReducedMotion() ? 0.14 : 0.14 + Math.sin(now * 0.006) * 0.025;
        node.position.x += (buildTarget.x - node.position.x) * followT;
        node.position.y += (targetY - node.position.y) * followT;
        node.position.z += (buildTarget.z - node.position.z) * followT;
        if (sceneRefs.buildCursorRing) {
          sceneRefs.buildCursorRing.position.set(node.position.x, 0.071, node.position.z);
        }
      }
      if (sceneRefs.buildTargetPad) {
        sceneRefs.buildTargetPad.position.set(buildTarget.snapX, 0, buildTarget.snapZ);
        const pulse = isReducedMotion() ? 1 : 1 + Math.sin(now * 0.008) * 0.06;
        sceneRefs.buildTargetPad.scale.setScalar(pulse);
      }
    }

    if (sceneRefs.walkRing && sceneRefs.walkRingTimer > 0) {
      sceneRefs.walkRingTimer = Math.max(0, sceneRefs.walkRingTimer - dt);
      const t = 1 - sceneRefs.walkRingTimer / 0.55;
      sceneRefs.walkRing.scale.setScalar(0.75 + t * 1.15);
      sceneRefs.walkRing.material.opacity = (1 - t) * 0.65;
    } else if (sceneRefs.walkRing) {
      sceneRefs.walkRing.material.opacity = 0;
    }

    if (wallBack) wallBack.visible = camera.position.z > -1.5;
    if (wallLeft) wallLeft.visible = camera.position.x > -2.5;
    if (sceneRefs.showerWallGroup) sceneRefs.showerWallGroup.visible = wallLeft ? wallLeft.visible : true;
    if (mode !== 'community') renderer.render(scene, camera);
    positionHotspots(pose);
    positionMiriStatus(pose);
    positionActiveCards();
  };
  requestAnimationFrame(animate);
}

function createHotspots() {
  const container = $('#hotspots'); container.innerHTML = ''; markers.length = 0;
  for (const [id, meta] of Object.entries(interactionMeta)) {
    if (meta.noHotspot) continue;
    const button = document.createElement('button');
    button.className = 'hotspot'; button.type = 'button';
    button.innerHTML = `<span class="hotspot-dot">+</span>${meta.name}`;
    button.setAttribute('aria-label', `查看${meta.name}互动`);
    button.addEventListener('click', () => selectInteraction(id));
    container.append(button); markers.push({ id, button, point: new THREE.Vector3(...meta.point) });
  }
}
function positionHotspots(pose) {
  if (mode !== 'life' || !camera) return;
  const rect = $('#room-canvas').getBoundingClientRect();
  const busyId = pose?.activityLabel
    ? (miriCtrl.state.activeInteraction || miriCtrl.state.pendingAction?.interactionId || miriCtrl.state.occupiedInteraction)
    : null;
  for (const marker of markers) {
    const screen = marker.point.clone().project(camera);
    marker.button.style.left = `${(screen.x + 1) / 2 * rect.width}px`;
    marker.button.style.top = `${(-screen.y + 1) / 2 * rect.height}px`;
    const outOfView = screen.z > 1 || screen.x < -1 || screen.x > 1 || screen.y < -1 || screen.y > 1;
    marker.button.style.display = outOfView || marker.id === busyId ? 'none' : '';
  }
}
function positionMiriStatus(pose) {
  const badge = $('#miri-status');
  if (!badge || !camera) return;
  if (mode !== 'life' || !pose.activityLabel) {
    badge.hidden = true;
    return;
  }
  const rect = $('#room-canvas').getBoundingClientRect();
  const inBedReclined = (miriCtrl.state.activeInteraction === 'bed' || miriCtrl.state.occupiedInteraction === 'bed') && pose.poseRotX < -0.5;
  const anchor = inBedReclined
    ? new THREE.Vector3(pose.x, pose.y + 1.66, pose.z - 0.98)
    : new THREE.Vector3(pose.x, pose.y + 2.32, pose.z);
  const screen = anchor.project(camera);
  if (screen.z > 1 || screen.x < -1 || screen.x > 1 || screen.y < -1 || screen.y > 1) {
    badge.hidden = true;
    return;
  }
  $('#miri-status-text').textContent = pose.activityLabel;
  badge.style.left = `${(screen.x + 1) / 2 * rect.width}px`;
  badge.style.top = `${(-screen.y + 1) / 2 * rect.height}px`;
  badge.hidden = false;
}
function positionFloatingCard(card, worldPoint) {
  if (!card || card.hidden || !camera || !worldPoint) return;
  const rect = $('#room-canvas').getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const screen = worldPoint.clone().project(camera);
  const rawX = (screen.x + 1) / 2 * rect.width;
  const rawY = (-screen.y + 1) / 2 * rect.height;
  const anchorX = screen.z > 1 ? rect.width / 2 : rawX;
  const anchorY = screen.z > 1 ? rect.height / 2 : rawY;
  const pos = computeAnchoredCardPosition({
    anchorX,
    anchorY,
    cardWidth: card.offsetWidth || 260,
    cardHeight: card.offsetHeight || 135,
    stageWidth: rect.width,
    stageHeight: rect.height,
  });
  card.style.left = `${pos.left}px`;
  card.style.top = `${pos.top}px`;
  card.dataset.placement = pos.placement;
}
function positionActiveCards() {
  if (mode === 'life' && selectedInteraction) {
    const card = $('#interaction-card');
    const pt = interactionMeta[selectedInteraction]?.point;
    if (card && !card.hidden && pt) {
      positionFloatingCard(card, new THREE.Vector3(...pt));
    }
  } else if (mode === 'build' && selectedFurniture && !movingFurniture) {
    const card = $('#placement-card');
    const cell = state.furniture?.[selectedFurniture];
    if (card && !card.hidden && cell) {
      const [wx, wz] = worldFromCell(cell.x, cell.z);
      positionFloatingCard(card, new THREE.Vector3(wx, 1.35, wz));
    }
  }
}

function renderClockHeader(day, minute) {
  const hour = Math.floor(minute / 60), min = minute % 60;
  $('#day-label').textContent = `第 ${day} 天 · 晴`;
  $('#time-label').textContent = `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')} ${hour < 12 ? '上午' : hour < 18 ? '下午' : '夜晚'}`;
}

function render() {
  renderClockHeader(state.day, state.minute);
  $('#money-label').textContent = state.money.toLocaleString('zh-CN');
  $('#goals-list').innerHTML = goalsMeta.map(([id, name, reward]) => `<div class="goal-item ${state.goals[id] ? 'done' : ''}"><span class="goal-check">${state.goals[id] ? '<svg><use href="#i-check"/></svg>' : ''}</span><span class="goal-text">${name}</span><span class="goal-reward">+${reward}</span></div>`).join('');
  $('#goals-progress').textContent = `${Object.values(state.goals).filter(Boolean).length} / 3 已完成`;
  $('#journal-list').innerHTML = state.log.slice(0, 4).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  $('#needs-list').innerHTML = needsMeta.map(([id, name, color]) => `<div class="need-row ${state.needs[id] < 25 ? 'low' : ''}"><span class="need-name">${name}</span><div class="need-bar"><span style="width:${state.needs[id]}%;--bar:${color}"></span></div><span class="need-number">${state.needs[id]}</span></div>`).join('');
  const average = Object.values(state.needs).reduce((a,b) => a+b,0) / 5;
  $('#mood-label').textContent = average >= 70 ? '状态很好' : average >= 45 ? '心情不错' : '需要照顾';
  $('#skills-list').innerHTML = [['cooking','烹饪','◌',''],['creativity','创作','✳','purple']].map(([id,name,icon,style]) => `<div class="skill-row"><span class="skill-icon ${style}">${icon}</span><div class="skill-details"><div><span>${name}</span><small>Lv.${state.skills[id].level} · ${state.skills[id].xp}/100</small></div><div class="skill-bar"><span style="width:${state.skills[id].xp}%"></span></div></div></div>`).join('');
  renderShop(); renderNeighbors();
  if (selectedInteraction && !$('#interaction-card').hidden) renderInteractionCard(selectedInteraction);
  clockTargetTotal = state.day * 1440 + state.minute;
  updateAtmosphere(state.minute);
}
function renderShop() {
  const icons = { lamp: '♧', armchair: '▤', shelf: '▥', stool: '◯' };
  $('#shop-list').innerHTML = Object.entries(CATALOG).map(([id, item]) => `<div class="shop-item"><span class="shop-icon" aria-hidden="true">${icons[id]}</span><span class="shop-details"><strong>${item.name}</strong><small>${item.price} 暖光币</small></span><button type="button" data-buy="${id}" ${state.furniture[id] ? 'disabled' : ''}>${state.furniture[id] ? '已拥有' : '购买'}</button></div>`).join('');
  $$('[data-buy]').forEach(button => button.addEventListener('click', () => {
    const result = purchaseFurniture(state, button.dataset.buy); applyResult(result);
    if (result.ok) { updateMovableFurniture(); startMovingFurniture(button.dataset.buy); }
  }));
}
function renderNeighbors() {
  $('#neighbor-list').innerHTML = Object.entries(people).map(([id, person]) => {
    const avail = getActionAvailability(state, 'chat', id);
    const giftBadge = state.scene?.souvenirs?.[id] ? `<div class="neighbor-gift">✳ ${person.gift}</div>` : '';
    return `<div class="neighbor-item"><div class="neighbor-top"><span class="neighbor-avatar" style="--neighbor-color:${person.color}">${person.initial}</span><span class="neighbor-details"><strong>${person.name}</strong><small>${person.place}</small></span><button type="button" data-chat="${id}" ${avail.doneToday ? 'disabled' : ''}>${avail.doneToday ? '今日已聊' : '聊天'}</button></div><div class="relation-line"><svg><use href="#i-heart"/></svg><div class="relation-bar"><span style="width:${state.relationships[id]}%;--bar:${person.color}"></span></div><span>${state.relationships[id]}/100</span></div>${giftBadge}</div>`;
  }).join('');
  $$('[data-chat]').forEach(button => button.addEventListener('click', () => { selectedNeighbor = button.dataset.chat; takeAction('chat', selectedNeighbor); updateSelectedNeighbor(); }));
}
function updateSelectedNeighbor() {
  $$('.map-pin').forEach(button => button.classList.toggle('active', button.dataset.neighbor === selectedNeighbor));
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }
function persist() {
  const saved = saveState(stateStore, state);
  $('#save-indicator').classList.toggle('failed', !saved);
  $('#save-indicator span').textContent = saved ? '已自动保存到此设备' : '当前设备无法保存进度';
  $('#global-save').textContent = saved ? '已自动保存到此设备 · 原创紫蓝巷' : '当前设备无法保存进度 · 原创紫蓝巷';
}
let toastTimer;
function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 3300);
}
function applyResult(result) {
  if (result.ok) { state = result.state; render(); persist(); }
  toast(result.message);
}
function revealSpecForAction(actionId) {
  if (actionId === 'cook') return { key: 'mealMain', mode: 'appear' };
  if (actionId === 'eat') return { key: 'mealMain', mode: 'consume' };
  if (actionId === 'paint') return { key: 'completedPainting', mode: 'appear' };
  if (actionId === 'tea') return { key: 'teaSet', mode: 'appear' };
  if (actionId === 'shower') return { key: 'showerState', mode: 'appear' };
  if (actionId === 'read') return { key: 'bookOnSofa', mode: 'appear' };
  if (actionId === 'rest') return { key: 'bedState', mode: 'appear' };
  return null;
}
function flushPendingAction(animateProp = true) {
  if (!pendingAction) return;
  const finished = pendingAction;
  pendingAction = null;
  const committed = performAction(state, finished.id, finished.neighbor);
  applyResult(committed);
  if (committed.ok) {
    const spec = revealSpecForAction(finished.id);
    if (animateProp && spec && !isReducedMotion()) {
      propReveal.key = spec.key;
      propReveal.mode = spec.mode;
      propReveal.waitingAction = null;
      const targetNode = sceneProps[spec.key];
      if (spec.mode === 'consume') {
        if (targetNode) {
          targetNode.visible = true;
          propReveal.animating = true;
          propReveal.progress = 0;
        } else {
          syncSceneProps(true);
        }
      } else {
        syncSceneProps(true);
        if (targetNode) {
          targetNode.scale.setScalar(0.2);
          propReveal.animating = true;
          propReveal.progress = 0;
        }
      }
    } else {
      propReveal.key = null;
      propReveal.animating = false;
      syncSceneProps(true);
    }
  } else {
    syncSceneProps(true);
  }
}
function takeAction(id, neighbor) {
  if (pendingAction && pendingAction.id === id) {
    toast('Miri 正在进行这项动作，请稍候。');
    return;
  }
  if (pendingAction?.started) {
    flushPendingAction(false);
  }
  const preview = performAction(state, id, neighbor);
  if (!preview.ok) {
    toast(preview.message);
    if (mode === 'life') miriCtrl.triggerReaction('oops');
    return;
  }
  if (id === 'chat') {
    applyResult(preview);
    pendingChatWave = true;
    syncSceneProps(true);
    const pin = $(`.map-pin[data-neighbor="${neighbor}"]`);
    if (pin) {
      pin.classList.remove('pulse');
      void pin.offsetWidth;
      pin.classList.add('pulse');
    }
    return;
  }

  // Keep time frozen while walking/entering; start advancing time only once Miri begins the action itself.
  propReveal.waitingAction = null;
  propReveal.animating = false;
  syncSceneProps(true);

  pendingAction = {
    id,
    neighbor,
    started: false,
    startTotal: state.day * 1440 + state.minute,
    endTotal: preview.state.day * 1440 + preview.state.minute,
  };
  miriCtrl.startAction(id, state.furniture, isReducedMotion());
  const stage = Object.values(INTERACTION_STAGES).find(item => item.actionId === id);
  if (stage) showWalkRing(...stage.approach);
  if (mode === 'life') {
    $('#interaction-card').hidden = true;
    selectedInteraction = null;
    $$('.hotspot').forEach(button => button.classList.remove('active'));
  }
}
function renderInteractionCard(id) {
  const meta = interactionMeta[id];
  const card = $('#interaction-card');
  const actions = id === 'stove' && state.scene?.meal === 'ready' ? [...meta.actions, 'eat'] : meta.actions;
  const buttonsHtml = actions.map(action => {
    const avail = getActionAvailability(state, action);
    const isInProgress = pendingAction?.id === action;
    const tag = isInProgress
      ? '进行中…'
      : avail.doneToday
        ? '今日已完成'
        : action === 'eat'
          ? '点击享用'
          : ACTIONS[action].dailyLimit
            ? '每日 1 次'
            : ACTIONS[action].overnight
              ? '开启明天'
              : '可重复';
    const disabled = avail.doneToday || isInProgress;
    return `<button type="button" data-action="${action}" class="${avail.doneToday ? 'done-today' : ''}" ${disabled ? 'disabled' : ''}><span>${ACTIONS[action].name}</span><small class="action-tag">${tag}</small></button>`;
  }).join('');
  const allDone = actions.every(action => getActionAvailability(state, action).doneToday);
  const note = allDone ? '<p class="card-note">今天的这项日常已完成，去床上“睡到明天清晨”后可再次体验。</p>' : '';
  card.innerHTML = `<button class="close-card" type="button" aria-label="关闭互动菜单">×</button><span class="card-kicker">LITTLE MOMENT / 互动</span><h3>${meta.name}</h3><p>${meta.hint}</p><div class="action-buttons">${buttonsHtml}</div>${note}`;
  card.hidden = false;
  positionActiveCards();
  card.querySelector('.close-card').addEventListener('click', () => { card.hidden = true; selectedInteraction = null; $$('.hotspot').forEach(button => button.classList.remove('active')); });
  card.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => takeAction(button.dataset.action)));
}
function selectInteraction(id) {
  if (mode !== 'life') return;
  selectedInteraction = id;
  $$('.hotspot').forEach(button => button.classList.toggle('active', button.getAttribute('aria-label') === `查看${interactionMeta[id].name}互动`));
  renderInteractionCard(id);
}
function furnitureDisplayName(id) {
  return CATALOG[id]?.name || (id === 'plant' ? '窗边绿植' : '圆形地毯');
}
function hideBuildGuides() {
  if (sceneRefs.buildGridGroup) sceneRefs.buildGridGroup.visible = false;
  if (sceneRefs.buildTargetPad) sceneRefs.buildTargetPad.visible = false;
  if (sceneRefs.buildCursorRing) sceneRefs.buildCursorRing.visible = false;
}
function startMovingFurniture(id, clientX = null, clientY = null) {
  if (mode !== 'build' || !state.furniture[id]) return;
  selectedFurniture = id;
  movingFurniture = id;
  const cell = state.furniture[id];
  const [wx, wz] = worldFromCell(cell.x, cell.z);
  Object.assign(buildTarget, { x: wx, z: wz, cellX: cell.x, cellZ: cell.z, snapX: wx, snapZ: wz });

  if (clientX !== null && clientY !== null) {
    const canvas = $('#room-canvas');
    const rect = canvas.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(buildFloorPlane, buildPlaneHit)) {
      Object.assign(buildTarget, clampAndSnapBuildPoint(buildPlaneHit.x, buildPlaneHit.z));
    }
  }

  if (sceneRefs.buildGridGroup) sceneRefs.buildGridGroup.visible = true;
  if (sceneRefs.buildTargetPad) {
    sceneRefs.buildTargetPad.position.set(buildTarget.snapX, 0, buildTarget.snapZ);
    sceneRefs.buildTargetPad.visible = true;
  }
  if (sceneRefs.buildCursorRing) {
    sceneRefs.buildCursorRing.position.set(buildTarget.x, 0.071, buildTarget.z);
    sceneRefs.buildCursorRing.visible = true;
  }

  const card = $('#placement-card');
  card.classList.add('build-bar');
  card.style.left = '';
  card.style.top = '';
  card.innerHTML = `<span>正在移动「${furnitureDisplayName(id)}」· 点击地板放下</span><button type="button" class="cancel-build">取消</button>`;
  card.hidden = false;
  card.querySelector('.cancel-build').addEventListener('click', cancelMovingFurniture);
  $('#room-canvas').style.cursor = 'grabbing';
}
function commitMovingFurniture() {
  if (!movingFurniture) return;
  const id = movingFurniture;
  const { cellX, cellZ } = buildTarget;
  movingFurniture = null;
  selectedFurniture = null;
  draggingFurniture = false;
  hideBuildGuides();
  const card = $('#placement-card');
  card.hidden = true;
  card.classList.remove('build-bar');
  $('#room-canvas').style.cursor = '';
  applyMove(id, cellX, cellZ);
}
function cancelMovingFurniture() {
  const id = movingFurniture;
  movingFurniture = null;
  selectedFurniture = null;
  draggingFurniture = false;
  if (controls) controls.enabled = true;
  hideBuildGuides();
  const card = $('#placement-card');
  card.hidden = true;
  card.classList.remove('build-bar');
  $('#room-canvas').style.cursor = '';
  if (id && state.furniture[id]) {
    const node = movableNodes.get(id);
    const [wx, wz] = worldFromCell(state.furniture[id].x, state.furniture[id].z);
    if (node) node.position.set(wx, 0, wz);
  }
}
function applyMove(id, x, z) { const result = moveFurniture(state, id, x, z); applyResult(result); if (result.ok) updateMovableFurniture(); }
function setMode(next) {
  cancelMovingFurniture();
  mode = next;
  $$('.mode-tab').forEach(button => { const active = button.dataset.mode === next; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $('#room-view').hidden = next === 'community'; $('#community-view').hidden = next !== 'community';
  $('#hotspots').hidden = next !== 'life';
  for (const key of ['life','build','community']) $(`#${key}-panel`).hidden = key !== next;
  $('#interaction-card').hidden = true; $('#placement-card').hidden = true;
  $$('.hotspot').forEach(button => button.classList.remove('active'));
  selectedInteraction = null; selectedFurniture = null;
  if (next !== 'life') {
    clearEffects();
    if (pendingAction?.started) flushPendingAction(false);
    pendingAction = null;
    propReveal.waitingAction = null;
    propReveal.animating = false;
    syncSceneProps(true);
    miriCtrl.settleToIdle(state.furniture);
    $('#miri-status').hidden = true;
  } else {
    syncSceneProps(true);
    if (pendingChatWave) {
      pendingChatWave = false;
      miriCtrl.triggerReaction('wave');
    }
  }
  $('#room-message').textContent = next === 'build' ? '点击或拖动家具即可跟随鼠标移动，点击地板放下。' : '拖动旋转房间，滚轮缩放。点击家具，与 Miri 一起生活。';
  if (next !== 'community') setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
}

$$('.mode-tab').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$$('.map-pin').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.neighbor === 'home') { setMode('life'); return; }
  selectedNeighbor = button.dataset.neighbor; updateSelectedNeighbor();
  const person = people[selectedNeighbor]; toast(`${person.name} · ${person.description} 点击右侧“聊天”打招呼。`);
}));
$('#rotate-left').addEventListener('click', () => { controls.rotateLeft(Math.PI / 6); controls.update(); });
$('#rotate-right').addEventListener('click', () => { controls.rotateLeft(-Math.PI / 6); controls.update(); });
$('#reset-view').addEventListener('click', () => { camera.position.set(13, 11, 15); controls.target.set(0, 1.1, 0); camera.zoom = 1; camera.updateProjectionMatrix(); controls.update(); });
$('#zoom-in').addEventListener('click', () => { camera.zoom = Math.min(1.75, camera.zoom + .15); camera.updateProjectionMatrix(); });
$('#zoom-out').addEventListener('click', () => { camera.zoom = Math.max(.64, camera.zoom - .15); camera.updateProjectionMatrix(); });

try { initScene(); render(); persist(); updateSelectedNeighbor(); }
catch (error) { console.error(error); $('#error').hidden = false; }
