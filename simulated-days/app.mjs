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
} from './game.mjs';
import { createCharacterController, INTERACTION_STAGES, computeAnchoredCardPosition } from './motion.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let stateStore;
try { stateStore = window.localStorage; }
catch { stateStore = { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } }; }
let state = loadState(stateStore);
let mode = 'life';
let selectedInteraction = null;
let selectedFurniture = null;
let selectedNeighbor = 'nora';
let pendingChatWave = false;
let scene, camera, renderer, controls, roomGroup, movableGroup, miri, floor;
let wallBack, wallLeft;
let miriRig = null;
const sceneRefs = {
  potLid: null,
  sketchOverlay: null,
  walkRing: null,
  walkRingTimer: 0,
  ambientLight: null,
  sunLight: null,
  fillLight: null,
  roomPointLight: null,
  pendantBulbs: [],
  outsideWindows: [],
  lampMaterials: [],
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
let ambientFoodTimer = 0;

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
  stove: { name: '橡木小厨房', hint: '冰箱里还有新鲜食材。', actions: ['cook'], point: [-4.1, 2.2, -3.3] },
  desk: { name: '窗边画桌', hint: '太阳刚好照在画纸上。', actions: ['paint'], point: [2.15, 2.15, -3.2] },
  bed: { name: '柔软的小床', hint: '累的时候，就安心睡一会儿，或一觉睡到明天清晨。', actions: ['rest', 'sleep'], point: [3.9, 1.6, 1.8] },
  shower: { name: '暖光浴室', hint: '让热水带走一天的疲惫。', actions: ['shower'], point: [-4.65, 2.35, 2.7] },
  bookshelf: { name: '收集的旧书', hint: '每一本都藏着另一种生活。', actions: ['read'], point: [4.8, 2.25, -3.2] },
  tea: { name: '客厅圆桌', hint: '给生活留一点空白时间，桌面上也会留下日常的痕迹。', actions: ['tea'], point: [-0.78, 1.45, 2.55] },
  meal: { name: '厨房桌上的早午餐', hint: '刚做好的热乎餐盒就放在厨房桌面上，点击即可享用。', actions: ['eat'], point: [-3.62, 1.45, -3.27], noHotspot: true },
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
    steamGeo: new THREE.SphereGeometry(0.12, 10, 8),
    dropGeo: new THREE.CylinderGeometry(0.024, 0.034, 0.22, 6),
    steamMat: new THREE.MeshBasicMaterial({ color: 0xfffaf1, transparent: true, opacity: 0.72, depthWrite: false }),
    dropMat: new THREE.MeshBasicMaterial({ color: 0x72b6db, transparent: true, opacity: 0.9, depthWrite: false }),
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
  } else if (kind === 'drop') {
    mat = assets.dropMat.clone();
    node = new THREE.Mesh(assets.dropGeo, mat);
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
  if (effect && !isReducedMotion()) {
    effectCooldown -= dt;
    if (effectCooldown <= 0) {
      if (effect === 'cook') {
        effectCooldown = 0.22;
        spawnEffectParticle('steam', [-4.85 + (Math.random() - 0.5) * 0.25, 1.42, -3.61 + (Math.random() - 0.5) * 0.25], [(Math.random() - 0.5) * 0.15, 0.65, (Math.random() - 0.5) * 0.15], 1.15, 0.75 + Math.random() * 0.45);
      } else if (effect === 'paint') {
        effectCooldown = 0.28;
        spawnEffectParticle('spark', [1.85 + (Math.random() - 0.5) * 0.65, 1.54, -3.5 + (Math.random() - 0.5) * 0.4], [(Math.random() - 0.5) * 0.2, 0.48, (Math.random() - 0.5) * 0.2], 0.95, 0.42);
      } else if (effect === 'rest') {
        effectCooldown = 0.58;
        spawnEffectParticle('zzz', [2.93 + (Math.random() - 0.5) * 0.25, 1.52, 0.65], [0.1, 0.46, -0.06], 1.5, 0.5);
      } else if (effect === 'shower') {
        effectCooldown = 0.07;
        for (let i = 0; i < 2; i++) {
          spawnEffectParticle('drop', [-5.2 + (Math.random() - 0.5) * 0.45, 2.02, 1.7 + (Math.random() - 0.5) * 0.45], [0.05, -2.55, 0.05], 0.68, 1);
        }
        if (Math.random() < 0.38) {
          spawnEffectParticle('steam', [-4.95 + (Math.random() - 0.5) * 0.5, 0.9, 1.85 + (Math.random() - 0.5) * 0.5], [0, 0.55, 0], 1.1, 1.15);
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
        spawnEffectParticle('steam', [-3.62 + (Math.random() - 0.5) * 0.14, 1.12, -3.27 + (Math.random() - 0.5) * 0.14], [0, 0.42, 0], 0.9, 0.46);
        spawnEffectParticle('heart', [pose.x + (Math.random() - 0.5) * 0.25, 1.98, pose.z], [0, 0.52, 0], 0.95, 0.3);
      } else if (effect === 'wave') {
        effectCooldown = 0.45;
        spawnEffectParticle('heart', [pose.x + (Math.random() - 0.5) * 0.3, 2.12, pose.z], [0, 0.55, 0], 1.0, 0.35);
      }
    }
  } else {
    effectCooldown = 0;
  }

  // Gentle ongoing warmth wisps from freshly served lunch or tea on the round table.
  if (!isReducedMotion() && mode === 'life' && !effect) {
    ambientFoodTimer -= dt;
    if (ambientFoodTimer <= 0) {
      ambientFoodTimer = 0.85;
      if (sceneProps.mealMain?.visible) {
        spawnEffectParticle('steam', [-3.62 + (Math.random() - 0.5) * 0.14, 1.12, -3.27 + (Math.random() - 0.5) * 0.14], [0, 0.34, 0], 1.0, 0.42);
      }
      if (sceneProps.teaSet?.visible) {
        spawnEffectParticle('steam', [-0.8 + (Math.random() - 0.5) * 0.1, 0.94, 2.3 + (Math.random() - 0.5) * 0.1], [0, 0.36, 0], 0.95, 0.38);
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
    if (p.kind === 'steam') {
      p.node.scale.setScalar(p.baseScale * (0.75 + t * 1.15));
      p.mat.opacity = 0.58 * (1 - t);
    } else if (p.kind === 'drop') {
      p.mat.opacity = 0.85 * (1 - t * 0.7);
      if (p.node.position.y < 0.18) p.age = p.life;
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
  const mealMain = group(kitchen, 0.58, 0.98, 0.26);
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

  // 5. Showered bathroom state: tile water shimmer, bath towel & soap bottle.
  const showerState = group(shower, 0, 0, 0);
  addCylinder(showerState, waterPoolMat, 0.34, 0.34, 0.01, -0.25, 0.125, -0.35, 22);
  addCylinder(showerState, waterPoolMat, 0.22, 0.22, 0.01, 0.18, 0.125, 0.05, 18);
  addBox(showerState, materials.lavender, 0.44, 0.07, 0.34, -0.34, 0.8, 0.75);
  addBox(showerState, materials.cream, 0.36, 0.05, 0.26, -0.34, 0.85, 0.73);
  addCylinder(showerState, materials.gold, 0.06, 0.06, 0.16, -0.52, 0.85, 0.62, 12);
  showerState.visible = false;
  sceneProps.showerState = showerState;

  // 6. Rested bed state: lavender sleep eye mask on pillow + cozy folded throw.
  const bedState = group(bed, 0, 0, 0);
  addBox(bedState, materials.lavenderDeep, 0.3, 0.035, 0.11, -0.72, 1.03, -0.96);
  addBox(bedState, materials.pink, 0.92, 0.07, 0.65, -0.58, 0.955, 0.15).rotation.y = 0.08;
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

  const souvenirEllis = group(kitchen, 1.18, 0.98, 0.28);
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
    sceneProps.showerGlass.material.opacity = sc.showered ? 0.5 : 0.35;
  }
  if (immediate) {
    for (const node of Object.values(sceneProps)) {
      if (node && node.isObject3D && node !== sceneProps.showerGlass) node.scale.setScalar(1);
    }
  }
}

function updateAtmosphere(minute) {
  const hour = minute / 60;
  let period = 'morning';
  let weatherText = '晴日晨光';
  let sunColor = 0xffe6b4;
  let sunIntensity = 3.2;
  let sunPos = [-4, 10, 7];
  let ambSky = 0xfff4df;
  let ambGround = 0xbaa8c6;
  let ambIntensity = 2.5;
  let fillIntensity = 1.1;
  let indoorGlow = 0;

  if (hour >= 12 && hour < 17) {
    period = 'afternoon';
    weatherText = '晴日午后';
    sunColor = 0xfff0cc;
    sunIntensity = 3.35;
    sunPos = [-1.5, 11.5, 6.5];
    ambSky = 0xfff8eb;
    ambGround = 0xc3b3cc;
    ambIntensity = 2.6;
  } else if (hour >= 17 && hour < 19.5) {
    period = 'dusk';
    weatherText = '温柔暮色';
    sunColor = 0xffba82;
    sunIntensity = 2.45;
    sunPos = [4.5, 6.5, 7.5];
    ambSky = 0xffdfc8;
    ambGround = 0x9b86ab;
    ambIntensity = 2.15;
    fillIntensity = 1.25;
    indoorGlow = 0.65;
  } else if (hour >= 19.5 || hour < 6) {
    period = 'night';
    weatherText = '暖灯夜色';
    sunColor = 0xa7b9e6;
    sunIntensity = 1.05;
    sunPos = [3, 9, 6];
    ambSky = 0x898fb8;
    ambGround = 0x5c5373;
    ambIntensity = 1.55;
    fillIntensity = 0.85;
    indoorGlow = 1.0;
  }

  const roomView = $('#room-view');
  if (roomView) roomView.dataset.period = period;
  const weatherPill = $('#weather-text');
  if (weatherPill) weatherPill.textContent = weatherText;

  if (sceneRefs.sunLight) {
    sceneRefs.sunLight.color.setHex(sunColor);
    sceneRefs.sunLight.intensity = sunIntensity;
    sceneRefs.sunLight.position.set(...sunPos);
  }
  if (sceneRefs.ambientLight) {
    sceneRefs.ambientLight.color.setHex(ambSky);
    sceneRefs.ambientLight.groundColor.setHex(ambGround);
    sceneRefs.ambientLight.intensity = ambIntensity;
  }
  if (sceneRefs.fillLight) {
    sceneRefs.fillLight.intensity = fillIntensity;
  }
  if (sceneRefs.roomPointLight) {
    sceneRefs.roomPointLight.intensity = indoorGlow * 2.4;
  }
  for (const bulb of sceneRefs.pendantBulbs) {
    bulb.material.emissiveIntensity = 0.45 + indoorGlow * 1.4;
  }
  for (const mat of sceneRefs.outsideWindows) {
    mat.emissive.setHex(0xffd891);
    mat.emissiveIntensity = indoorGlow > 0.5 ? indoorGlow * 0.95 : 0;
  }
  for (const mat of sceneRefs.lampMaterials) {
    mat.emissive.setHex(0xffd896);
    mat.emissiveIntensity = indoorGlow > 0.3 ? indoorGlow * 0.85 : 0.08;
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
  addBox(wallBack, wallMat, 3.7, 3.5, .17, -4.15, 1.75, -5.02);
  addBox(wallBack, wallMat, 4.8, 3.5, .17, 3.6, 1.75, -5.02);
  addBox(wallBack, wallMat, 3.5, .98, .17, -.05, .49, -5.02);
  addBox(wallBack, wallMat, 3.5, .46, .17, -.05, 3.27, -5.02);
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
  addBox(windowGroup, glass, 3.48, 1.82, .025, 0, 2.07, -.06, false);
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

  // Kitchen.
  const kitchen = registerModel('stove', group(roomGroup, -4.2, 0, -3.53));
  addBox(kitchen, materials.oakLight, 3.05, .85, 1.18, 0, .45, 0);
  addBox(kitchen, materials.white, 3.12, .1, 1.24, 0, .93, 0);
  addBox(kitchen, materials.oakDark, .03, .62, .04, -.45, .43, .61);
  addBox(kitchen, materials.oakDark, .03, .62, .04, .52, .43, .61);
  addCylinder(kitchen, materials.ink, .31, .31, .025, -.65, 1.00, -.08);
  addCylinder(kitchen, materials.ink, .25, .25, .025, .16, 1.00, -.08);
  addCylinder(kitchen, materials.gold, .38, .34, .22, -.65, 1.16, -.08);
  sceneRefs.potLid = addCylinder(kitchen, materials.oakDark, .15, .15, .08, -.65, 1.29, -.08);
  addBox(kitchen, materials.cream, .25, .5, .23, 1.05, 1.25, -.28);
  addSphere(kitchen, materials.sage, .25, 1.05, 1.6, -.28);
  addBox(roomGroup, materials.cream, 1.15, 2.52, 1.03, -5.22, 1.27, -3.72);
  addBox(roomGroup, materials.white, 1.2, .05, 1.09, -5.22, 2.54, -3.72);
  addBox(roomGroup, materials.oakDark, .14, .04, .04, -4.72, 1.93, -3.18);

  // Painting corner.
  const desk = registerModel('desk', group(roomGroup, 2.2, 0, -3.4));
  addBox(desk, materials.oak, 2.55, .15, 1.14, 0, 1.25, 0);
  addLegs(desk, 1.12, .42, 1.2, 1.15);
  addBox(desk, materials.cream, .92, .025, .64, -.35, 1.35, -.1);
  sceneRefs.sketchOverlay = addBox(desk, new THREE.MeshStandardMaterial({ color: 0xb28ec5, roughness: 0.9, transparent: true, opacity: 0.14 }), .58, .012, .36, -.35, 1.365, -.12, false);
  addBox(desk, materials.lavenderDeep, .7, .025, .05, -.35, 1.37, .22);
  addCylinder(desk, materials.pink, .12, .15, .2, .8, 1.42, .12);
  addBox(desk, materials.cream, .06, .6, .06, .8, 1.79, .12);
  addSphere(desk, materials.gold, .16, .8, 2.11, .12);
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

  // Bathroom with translucent screen.
  const shower = registerModel('shower', group(roomGroup, -4.83, 0, 2.38));
  addBox(shower, materials.tile, 1.88, .14, 2.15, 0, .05, 0);
  const showerGlassMat = glass.clone();
  sceneProps.showerGlass = addBox(shower, showerGlassMat, .055, 2.38, 2.02, .88, 1.28, .05, false);
  addBox(shower, materials.white, .07, 2.44, .08, .88, 1.27, -1);
  addBox(shower, materials.white, .07, 2.44, .08, .88, 1.27, 1);
  addCylinder(shower, materials.gold, .13, .13, 1.55, -.42, 1.3, -.71);
  addSphere(shower, materials.gold, .29, -.42, 2.1, -.71);
  addBox(shower, materials.cream, .7, .68, .52, -.34, .43, .75);

  // Bed and cushions.
  const bed = registerModel('bed', group(roomGroup, 3.65, 0, 1.65));
  addBox(bed, materials.oak, 3.1, .36, 3.1, 0, .33, 0);
  addBox(bed, materials.oakDark, 3.18, 1.15, .18, 0, .81, -1.47);
  addBox(bed, materials.cream, 2.84, .3, 2.82, 0, .65, .01);
  addBox(bed, materials.lavender, 2.72, .16, 1.95, 0, .85, .42);
  for (const x of [-.72, .72]) addBox(bed, materials.white, 1.12, .21, .6, x, .91, -1.02);
  addBox(bed, materials.pink, 1.48, .08, .65, 0, .97, .98);

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
  for (const x of [-2.15, .72]) {
    addBox(roomGroup, materials.ink, .025, .48, .025, x, 3.35, -1);
    addCylinder(roomGroup, materials.cream, .37, .19, .4, x, 3.05, -1);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe2aa, emissive: 0xf1bd73, emissiveIntensity: .5 });
    const bulb = addSphere(roomGroup, bulbMat, .09, x, 2.79, -1);
    sceneRefs.pendantBulbs.push(bulb);
  }

  buildSceneStateProps({ kitchen, desk, shower, bed, sofa, table, windowGroup });
  createMiri();
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

  for (const eye of miriRig.eyes) eye.scale.y = pose.eyeScaleY;
  for (const [key, node] of Object.entries(miriRig.props)) {
    node.visible = pose.prop === key;
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
    sceneRefs.lampMaterials.push(shadeMat, bulbMat);
    addCylinder(piece, shadeMat, .37, .22, .51, 0, 1.95, 0);
    addSphere(piece, bulbMat, .13, 0, 1.63, 0);
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
  sceneRefs.lampMaterials = [];
  movableGroup = group(roomGroup);
  for (const [id, cell] of Object.entries(state.furniture)) {
    const piece = createFurniture(id, movableGroup);
    const [x, z] = worldFromCell(cell.x, cell.z); piece.position.set(x, 0, z);
  }
  updateAtmosphere(state.minute);
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
  sceneRefs.roomPointLight = new THREE.PointLight(0xffd796, 0, 14, 1.5);
  sceneRefs.roomPointLight.position.set(-0.5, 2.6, 0.2);
  scene.add(sceneRefs.roomPointLight);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.1, 0); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minPolarAngle = .54; controls.maxPolarAngle = 1.25; controls.minZoom = .64; controls.maxZoom = 1.75;
  controls.update();
  buildRoom(); updateMovableFurniture(); createHotspots();
  syncSceneProps(true);
  updateAtmosphere(state.minute);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(1, rect.height);
    const halfHeight = Math.max(7.6, 8.4 / Math.max(0.45, aspect));
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false);
  };
  new ResizeObserver(resize).observe(canvas); resize();
  let down = null;
  canvas.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointermove', event => {
    if (down) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(roomGroup.children, true);
    let hoverInteractive = false;
    for (const hit of hits) {
      let object = hit.object;
      while (object && object !== roomGroup) {
        if (mode === 'build' && object.userData.furniture) { hoverInteractive = true; break; }
        if (mode === 'life' && object.userData.interaction) {
          if (object.userData.interaction === 'meal' && state.scene?.meal !== 'ready') {
            object = object.parent;
            continue;
          }
          hoverInteractive = true;
          break;
        }
        if (mode === 'life' && object.userData.miri && miriCtrl.state.phase === 'idle') { hoverInteractive = true; break; }
        object = object.parent;
      }
      if (hoverInteractive) break;
    }
    canvas.style.cursor = hoverInteractive ? 'pointer' : '';
  });
  canvas.addEventListener('pointerup', event => {
    const start = down;
    down = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(roomGroup.children, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && object !== roomGroup) {
        if (mode === 'build' && object.userData.furniture) { selectFurniture(object.userData.furniture); return; }
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
        if (object.userData.ground) {
          if (mode === 'build' && selectedFurniture) {
            const [x, z] = cellFromWorld(hit.point.x, hit.point.z);
            applyMove(selectedFurniture, x, z); return;
          }
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

    // When Miri finishes the active animation phase, reveal or consume the 3D prop on the scene!
    if (
      propReveal.waitingAction &&
      prevAction === propReveal.waitingAction &&
      prevPhase === 'act' &&
      miriCtrl.state.phase !== 'act'
    ) {
      const targetNode = sceneProps[propReveal.key];
      const revealMode = propReveal.mode;
      propReveal.waitingAction = null;
      if (revealMode === 'consume') {
        if (targetNode && !isReducedMotion()) {
          propReveal.animating = true;
          propReveal.progress = 0;
        } else {
          syncSceneProps(true);
          propReveal.key = null;
        }
      } else {
        syncSceneProps(false);
        if (targetNode && !isReducedMotion()) {
          targetNode.scale.setScalar(0.2);
          propReveal.animating = true;
          propReveal.progress = 0;
        }
      }
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
  const yOffset = miriCtrl.state.activeInteraction === 'bed' && miriCtrl.state.phase === 'act' ? 0.95 : 2.32;
  const anchor = new THREE.Vector3(pose.x, pose.y + yOffset, pose.z);
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
  } else if (mode === 'build' && selectedFurniture) {
    const card = $('#placement-card');
    const cell = state.furniture?.[selectedFurniture];
    if (card && !card.hidden && cell) {
      const [wx, wz] = worldFromCell(cell.x, cell.z);
      positionFloatingCard(card, new THREE.Vector3(wx, 1.35, wz));
    }
  }
}

function render() {
  const hour = Math.floor(state.minute / 60), minute = state.minute % 60;
  $('#day-label').textContent = `第 ${state.day} 天 · 晴`;
  $('#time-label').textContent = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${hour < 12 ? '上午' : hour < 18 ? '下午' : '夜晚'}`;
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
  updateAtmosphere(state.minute);
}
function renderShop() {
  const icons = { lamp: '♧', armchair: '▤', shelf: '▥', stool: '◯' };
  $('#shop-list').innerHTML = Object.entries(CATALOG).map(([id, item]) => `<div class="shop-item"><span class="shop-icon" aria-hidden="true">${icons[id]}</span><span class="shop-details"><strong>${item.name}</strong><small>${item.price} 暖光币</small></span><button type="button" data-buy="${id}" ${state.furniture[id] ? 'disabled' : ''}>${state.furniture[id] ? '已拥有' : '购买'}</button></div>`).join('');
  $$('[data-buy]').forEach(button => button.addEventListener('click', () => {
    const result = purchaseFurniture(state, button.dataset.buy); applyResult(result);
    if (result.ok) { updateMovableFurniture(); selectFurniture(button.dataset.buy); }
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
function takeAction(id, neighbor) {
  const result = performAction(state, id, neighbor);
  applyResult(result);
  if (!result.ok) {
    if (mode === 'life') miriCtrl.triggerReaction('oops');
    return;
  }
  if (id === 'chat') {
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
  // If a previous prop was waiting to pop in/out, flush it immediately before starting the next action.
  propReveal.waitingAction = null;
  propReveal.animating = false;
  syncSceneProps(true);

  const spec = revealSpecForAction(id);
  if (spec && !isReducedMotion()) {
    propReveal.key = spec.key;
    propReveal.mode = spec.mode;
    propReveal.waitingAction = id;
    syncSceneProps(false);
  } else {
    propReveal.key = null;
    syncSceneProps(true);
  }

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
    const tag = avail.doneToday
      ? '今日已完成'
      : action === 'eat'
        ? '点击享用'
        : ACTIONS[action].dailyLimit
          ? '每日 1 次'
          : ACTIONS[action].overnight
            ? '开启明天'
            : '可重复';
    return `<button type="button" data-action="${action}" class="${avail.doneToday ? 'done-today' : ''}" ${avail.doneToday ? 'disabled' : ''}><span>${ACTIONS[action].name}</span><small class="action-tag">${tag}</small></button>`;
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
function selectFurniture(id) {
  if (mode !== 'build') return;
  selectedFurniture = id;
  const name = CATALOG[id]?.name || (id === 'plant' ? '窗边绿植' : '圆形地毯');
  const card = $('#placement-card');
  card.innerHTML = `<button class="close-card" type="button" aria-label="关闭摆放菜单">×</button><span class="card-kicker">BUILD / 摆放家具</span><h3>${name}</h3><p>已选中。点击房间地板上的新位置，家具就会移过去。</p><button class="place-action" type="button">换个位置试试</button>`;
  card.hidden = false;
  positionActiveCards();
  card.querySelector('.close-card').addEventListener('click', () => { card.hidden = true; selectedFurniture = null; });
  card.querySelector('.place-action').addEventListener('click', () => toast('现在点击地板，就能摆放这件家具。'));
}
function applyMove(id, x, z) { const result = moveFurniture(state, id, x, z); applyResult(result); if (result.ok) updateMovableFurniture(); }
function setMode(next) {
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
  $('#room-message').textContent = next === 'build' ? '点击已拥有的家具，再点击地板重新摆放。拖动旋转，滚轮缩放。' : '拖动旋转房间，滚轮缩放。点击家具，与 Miri 一起生活。';
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
