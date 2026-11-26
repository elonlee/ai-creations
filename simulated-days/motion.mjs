export const ACTION_TO_INTERACTION = {
  cook: 'stove',
  eat: 'meal',
  paint: 'desk',
  rest: 'bed',
  sleep: 'bed',
  shower: 'shower',
  read: 'bookshelf',
  tea: 'tea',
};

const ACTION_LABELS = {
  sleep: { label: '正在安睡到明天清晨', walkLabel: '准备回床上安睡' },
};

export const INTERACTION_STAGES = {
  stove: {
    actionId: 'cook',
    label: '正在做暖心早午餐',
    walkLabel: '前往橡木小厨房',
    approach: [-4.52, -2.46],
    actPos: [-4.52, 0, -2.46],
    faceTarget: [-4.85, -3.61],
    enterDur: 0.2,
    exitDur: 0.16,
    actDur: 2.9,
  },
  desk: {
    actionId: 'paint',
    label: '正在画街角速写',
    walkLabel: '前往窗边画桌',
    approach: [0.88, -2.28],
    actPos: [1.75, 0, -2.32],
    faceTarget: [1.85, -3.5],
    enterDur: 0.38,
    exitDur: 0.34,
    actDur: 3.1,
  },
  bed: {
    actionId: 'rest',
    label: '正在小睡一会儿',
    walkLabel: '前往柔软小床',
    approach: [1.52, 1.45],
    actPos: [2.93, 1.18, 2.3],
    faceYaw: 0,
    enterDur: 0.5,
    exitDur: 0.44,
    actDur: 3.2,
  },
  shower: {
    actionId: 'shower',
    label: '正在洗热水澡',
    walkLabel: '前往暖光浴室',
    approach: [-4.7, 0.88],
    actPos: [-5.1, 0.12, 1.9],
    faceYaw: 0.55,
    enterDur: 0.45,
    exitDur: 0.42,
    actDur: 2.9,
  },
  bookshelf: {
    actionId: 'read',
    label: '正在阅读旧书',
    walkLabel: '前往收集的旧书架',
    approach: [4.75, -2.52],
    actPos: [4.75, 0, -2.52],
    faceTarget: [4.9, -3.55],
    readYaw: 0.35,
    enterDur: 0.42,
    exitDur: 0.2,
    actDur: 3.0,
  },
  tea: {
    actionId: 'tea',
    label: '正在品花草茶',
    walkLabel: '前往客厅茶桌',
    approach: [-2.15, 2.48],
    actPos: [-1.95, 0.3, 1.48],
    faceTarget: [-0.78, 2.55],
    enterDur: 0.42,
    exitDur: 0.38,
    actDur: 2.9,
  },
  meal: {
    actionId: 'eat',
    label: '正在享用早午餐',
    walkLabel: '前往厨房餐盒旁',
    approach: [-3.62, -2.44],
    actPos: [-3.62, 0, -2.44],
    faceTarget: [-3.62, -3.27],
    enterDur: 0.2,
    exitDur: 0.16,
    actDur: 2.7,
  },
};

const GRID_STEP = 0.4;
const GRID_MIN_X = -5.6;
const GRID_MIN_Z = -4.4;
const GRID_COLS = 29; // -5.6 .. +5.6
const GRID_ROWS = 23; // -4.4 .. +4.4

const STATIC_BOXES = [
  // Kitchen counter & refrigerator
  { minX: -6.0, maxX: -2.4, minZ: -5.0, maxZ: -2.68 },
  // Desk
  { minX: 0.68, maxX: 3.72, minZ: -4.5, maxZ: -2.58 },
  // Desk chair
  { minX: 1.18, maxX: 2.48, minZ: -2.85, maxZ: -1.62 },
  // Bookshelf
  { minX: 4.05, maxX: 5.9, minZ: -4.5, maxZ: -2.92 },
  // Shower stall & glass partition
  { minX: -6.0, maxX: -3.66, minZ: 1.18, maxZ: 3.7 },
  // Bed
  { minX: 1.82, maxX: 5.6, minZ: -0.15, maxZ: 3.45 },
  // Sofa
  { minX: -3.62, maxX: -0.49, minZ: 0.54, maxZ: 2.27 },
];

const STATIC_CIRCLES = [
  // Tea table
  { x: -0.78, z: 2.55, r: 0.96 },
];

const MOVABLE_RADII = {
  plant: 0.64,
  lamp: 0.56,
  armchair: 0.82,
  shelf: 0.78,
  stool: 0.58,
};

export function worldFromCell(x, z) {
  return [-4.75 + x * 2.28, -3.65 + z * 1.83];
}

export function cellFromWorld(x, z) {
  return [
    Math.max(0, Math.min(4, Math.round((x + 4.75) / 2.28))),
    Math.max(0, Math.min(4, Math.round((z + 3.65) / 1.83))),
  ];
}

export function clampAndSnapBuildPoint(x, z) {
  const clampedX = Math.max(-5.1, Math.min(4.8, x));
  const clampedZ = Math.max(-4.1, Math.min(4.1, z));
  const [cellX, cellZ] = cellFromWorld(clampedX, clampedZ);
  const [snapX, snapZ] = worldFromCell(cellX, cellZ);
  return { x: clampedX, z: clampedZ, cellX, cellZ, snapX, snapZ };
}

export function computeAnchoredCardPosition({
  anchorX,
  anchorY,
  cardWidth,
  cardHeight,
  stageWidth,
  stageHeight,
  topSafe = 110,
  bottomSafe = 72,
  padX = 12,
  gap = 20,
}) {
  const maxLeft = Math.max(padX, stageWidth - cardWidth - padX);
  const left = Math.max(padX, Math.min(maxLeft, anchorX - cardWidth / 2));

  const effectiveBottomSafe = stageHeight < 460 ? 16 : bottomSafe;
  const aboveTop = anchorY - cardHeight - gap;
  const belowTop = anchorY + gap + 6;
  const maxTop = Math.max(topSafe, stageHeight - cardHeight - effectiveBottomSafe);

  let top;
  let placement = 'above';
  if (aboveTop >= topSafe) {
    top = Math.min(aboveTop, maxTop);
  } else if (belowTop <= maxTop) {
    top = belowTop;
    placement = 'below';
  } else {
    top = Math.max(topSafe, Math.min(maxTop, aboveTop));
  }

  return { left: Math.round(left), top: Math.round(top), placement };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function lerpAngle(current, target, factor) {
  const diff = normalizeAngle(target - current);
  return normalizeAngle(current + diff * clamp(factor, 0, 1));
}

export function yawTowards(fromX, fromZ, toX, toZ) {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  if (Math.hypot(dx, dz) < 1e-5) return 0;
  return Math.atan2(dx, dz);
}

function isStaticBlocked(x, z) {
  if (x < -5.45 || x > 5.45 || z < -4.35 || z > 4.35) return true;
  for (const b of STATIC_BOXES) {
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return true;
  }
  for (const c of STATIC_CIRCLES) {
    if (Math.hypot(x - c.x, z - c.z) <= c.r) return true;
  }
  return false;
}

function buildMovableObstacles(furniture = {}) {
  const circles = [];
  for (const [id, cell] of Object.entries(furniture)) {
    const r = MOVABLE_RADII[id];
    if (!r || !cell) continue;
    const [wx, wz] = worldFromCell(cell.x, cell.z);
    circles.push({ x: wx, z: wz, r });
  }
  return circles;
}

function isBlocked(x, z, movableCircles, ignoreMovable = false) {
  if (isStaticBlocked(x, z)) return true;
  if (!ignoreMovable) {
    for (const c of movableCircles) {
      if (Math.hypot(x - c.x, z - c.z) <= c.r) return true;
    }
  }
  return false;
}

function toGrid(x, z) {
  return [
    clamp(Math.round((x - GRID_MIN_X) / GRID_STEP), 0, GRID_COLS - 1),
    clamp(Math.round((z - GRID_MIN_Z) / GRID_STEP), 0, GRID_ROWS - 1),
  ];
}

function fromGrid(col, row) {
  return [GRID_MIN_X + col * GRID_STEP, GRID_MIN_Z + row * GRID_STEP];
}

function findNearestFreeCell(col, row, blocked) {
  if (!blocked[row * GRID_COLS + col]) return [col, row];
  const visited = new Uint8Array(GRID_COLS * GRID_ROWS);
  const queue = [[col, row]];
  visited[row * GRID_COLS + col] = 1;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let head = 0;
  while (head < queue.length) {
    const [c, r] = queue[head++];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
      const idx = nr * GRID_COLS + nc;
      if (visited[idx]) continue;
      if (!blocked[idx]) return [nc, nr];
      visited[idx] = 1;
      queue.push([nc, nr]);
    }
  }
  return [col, row];
}

function hasLineOfSight(ax, az, bx, bz, movableCircles, ignoreMovable) {
  const dist = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(2, Math.ceil(dist / 0.18));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = lerp(ax, bx, t);
    const z = lerp(az, bz, t);
    if (isBlocked(x, z, movableCircles, ignoreMovable)) return false;
  }
  return true;
}

function runAStar(startXZ, goalXZ, movableCircles, ignoreMovable) {
  const blocked = new Uint8Array(GRID_COLS * GRID_ROWS);
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const [wx, wz] = fromGrid(c, r);
      if (isBlocked(wx, wz, movableCircles, ignoreMovable)) {
        blocked[r * GRID_COLS + c] = 1;
      }
    }
  }
  const [sc0, sr0] = toGrid(startXZ[0], startXZ[1]);
  const [gc0, gr0] = toGrid(goalXZ[0], goalXZ[1]);
  const [sc, sr] = findNearestFreeCell(sc0, sr0, blocked);
  const [gc, gr] = findNearestFreeCell(gc0, gr0, blocked);

  const total = GRID_COLS * GRID_ROWS;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const open = [sr * GRID_COLS + sc];
  const startIdx = sr * GRID_COLS + sc;
  const goalIdx = gr * GRID_COLS + gc;
  gScore[startIdx] = 0;
  fScore[startIdx] = Math.hypot(gc - sc, gr - sr);

  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  while (open.length > 0) {
    let bestPos = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
    }
    const current = open[bestPos];
    open[bestPos] = open[open.length - 1];
    open.pop();

    if (current === goalIdx) {
      const raw = [];
      let cur = current;
      while (cur !== -1) {
        const c = cur % GRID_COLS;
        const r = Math.floor(cur / GRID_COLS);
        raw.push(fromGrid(c, r));
        cur = cameFrom[cur];
      }
      raw.reverse();
      return { raw, goalWorld: isStaticBlocked(goalXZ[0], goalXZ[1]) ? fromGrid(gc, gr) : goalXZ };
    }

    closed[current] = 1;
    const cc = current % GRID_COLS;
    const cr = Math.floor(current / GRID_COLS);

    for (const [dc, dr, cost] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
      const nIdx = nr * GRID_COLS + nc;
      if (closed[nIdx] || blocked[nIdx]) continue;
      if (dc !== 0 && dr !== 0) {
        if (blocked[cr * GRID_COLS + nc] || blocked[nr * GRID_COLS + cc]) continue;
      }
      const tentativeG = gScore[current] + cost;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.hypot(gc - nc, gr - nr);
        if (!open.includes(nIdx)) open.push(nIdx);
      }
    }
  }
  return null;
}

export function findRoomPath(startXZ, goalXZ, furniture = {}) {
  const movableCircles = buildMovableObstacles(furniture);
  if (
    !isBlocked(goalXZ[0], goalXZ[1], movableCircles, false) &&
    hasLineOfSight(startXZ[0], startXZ[1], goalXZ[0], goalXZ[1], movableCircles, false)
  ) {
    return [goalXZ];
  }

  let result = runAStar(startXZ, goalXZ, movableCircles, false);
  let ignoreMovable = false;
  if (!result) {
    ignoreMovable = true;
    result = runAStar(startXZ, goalXZ, movableCircles, true);
  }
  if (!result) {
    return [goalXZ];
  }

  const pts = [startXZ, ...result.raw, result.goalWorld];
  const smoothed = [];
  let anchor = 0;
  while (anchor < pts.length - 1) {
    let furthest = anchor + 1;
    for (let test = pts.length - 1; test > anchor + 1; test--) {
      if (hasLineOfSight(pts[anchor][0], pts[anchor][1], pts[test][0], pts[test][1], movableCircles, ignoreMovable)) {
        furthest = test;
        break;
      }
    }
    smoothed.push(pts[furthest]);
    anchor = furthest;
  }

  // Filter out near-zero hops
  const clean = [];
  let prev = startXZ;
  for (const wp of smoothed) {
    if (Math.hypot(wp[0] - prev[0], wp[1] - prev[1]) > 0.08) {
      clean.push([Number(wp[0].toFixed(3)), Number(wp[1].toFixed(3))]);
      prev = wp;
    }
  }
  return clean.length ? clean : [result.goalWorld];
}

function defaultPose(x, y, z, yaw, eyeScaleY = 1) {
  return {
    x, y, z, yaw,
    posePosY: 0, posePosZ: 0, poseRotX: 0, poseRotZ: 0,
    torsoRotX: 0, torsoRotY: 0, torsoRotZ: 0,
    headRotX: 0, headRotY: 0, headRotZ: 0,
    leftLegRotX: 0, leftLegRotZ: 0,
    rightLegRotX: 0, rightLegRotZ: 0,
    leftArmRotX: 0, leftArmRotY: 0, leftArmRotZ: -0.2,
    rightArmRotX: 0, rightArmRotY: 0, rightArmRotZ: 0.2,
    eyeScaleY,
    prop: null,
    effect: null,
    potShake: 0,
    activityLabel: null,
  };
}

export function createCharacterController(initialX = -0.2, initialZ = 0.2) {
  const state = {
    x: initialX,
    y: 0,
    z: initialZ,
    yaw: 0,
    phase: 'idle', // idle | exit | walk | enter | act | react
    activeInteraction: null,
    activeAction: null,
    occupiedInteraction: null,
    waypoints: [],
    timer: 0,
    duration: 0,
    walkCycle: 0,
    elapsed: 0,
    blinkClock: 2.2,
    enterFrom: null,
    enterFromYaw: 0,
    exitTo: null,
    pendingAction: null,
    pendingWalk: null,
    reactionKind: null,
    lastFurniture: {},
  };

  function targetYawForInteraction(id) {
    const meta = INTERACTION_STAGES[id];
    if (!meta) return state.yaw;
    if (typeof meta.faceYaw === 'number') return meta.faceYaw;
    return yawTowards(meta.actPos[0], meta.actPos[2], meta.faceTarget[0], meta.faceTarget[1]);
  }

  function finalActYawForInteraction(id) {
    const meta = INTERACTION_STAGES[id];
    if (id === 'bookshelf' && typeof meta?.readYaw === 'number') return meta.readYaw;
    return targetYawForInteraction(id);
  }

  function beginWalkTo(goalXZ, furniture, reducedMotion) {
    if (reducedMotion) {
      state.x = goalXZ[0];
      state.y = 0;
      state.z = goalXZ[1];
      state.waypoints = [];
      onWalkArrived(reducedMotion);
      return;
    }
    state.waypoints = findRoomPath([state.x, state.z], goalXZ, furniture);
    state.phase = 'walk';
    state.timer = 0;
  }

  function onWalkArrived(reducedMotion) {
    if (state.pendingAction) {
      const id = state.pendingAction.interactionId;
      const actionId = state.pendingAction.actionId;
      const meta = INTERACTION_STAGES[id];
      state.activeInteraction = id;
      state.activeAction = actionId;
      state.occupiedInteraction = id;
      state.pendingAction = null;
      state.enterFrom = [state.x, state.y, state.z];
      state.enterFromYaw = state.yaw;
      if (reducedMotion) {
        state.x = meta.actPos[0];
        state.y = meta.actPos[1];
        state.z = meta.actPos[2];
        state.yaw = finalActYawForInteraction(id);
        state.phase = 'act';
        state.timer = 0;
        state.duration = Math.min(1.2, meta.actDur);
      } else {
        state.phase = 'enter';
        state.timer = 0;
        state.duration = meta.enterDur;
      }
      return;
    }
    state.phase = 'idle';
    state.activeInteraction = null;
    state.activeAction = null;
    state.timer = 0;
  }

  function beginExitThen(furniture, reducedMotion) {
    const occId = state.occupiedInteraction;
    const meta = INTERACTION_STAGES[occId];
    if (!meta || reducedMotion) {
      if (meta) {
        state.x = meta.approach[0];
        state.y = 0;
        state.z = meta.approach[1];
      }
      state.occupiedInteraction = null;
      if (state.pendingAction) {
        const nextMeta = INTERACTION_STAGES[state.pendingAction.interactionId];
        beginWalkTo(nextMeta.approach, furniture, reducedMotion);
      } else if (state.pendingWalk) {
        const target = state.pendingWalk;
        state.pendingWalk = null;
        beginWalkTo(target, furniture, reducedMotion);
      } else {
        state.phase = 'idle';
        state.activeInteraction = null;
        state.activeAction = null;
      }
      return;
    }
    state.phase = 'exit';
    state.timer = 0;
    state.duration = meta.exitDur;
    state.enterFrom = [state.x, state.y, state.z];
    state.enterFromYaw = state.yaw;
    state.exitTo = [meta.approach[0], 0, meta.approach[1]];
  }

  function startAction(actionId, furniture = {}, reducedMotion = false) {
    const interactionId = ACTION_TO_INTERACTION[actionId];
    if (!interactionId) return false;
    state.lastFurniture = furniture;
    const meta = INTERACTION_STAGES[interactionId];

    // If Miri is already sitting/standing inside the same interaction, replay the action smoothly in place.
    if (
      state.occupiedInteraction === interactionId &&
      (state.phase === 'enter' || state.phase === 'act' || state.phase === 'exit')
    ) {
      state.pendingAction = null;
      state.pendingWalk = null;
      state.activeInteraction = interactionId;
      state.activeAction = actionId;
      state.x = meta.actPos[0];
      state.y = meta.actPos[1];
      state.z = meta.actPos[2];
      state.phase = 'act';
      state.timer = 0;
      state.duration = reducedMotion ? Math.min(1.2, meta.actDur) : meta.actDur;
      return true;
    }

    state.pendingWalk = null;
    state.pendingAction = { actionId, interactionId };

    if (state.occupiedInteraction) {
      beginExitThen(furniture, reducedMotion);
    } else {
      beginWalkTo(meta.approach, furniture, reducedMotion);
    }
    return true;
  }

  function walkToPoint(goalXZ, furniture = {}, reducedMotion = false) {
    state.lastFurniture = furniture;
    state.pendingAction = null;
    state.activeInteraction = null;
    state.activeAction = null;
    state.pendingWalk = goalXZ;
    if (state.occupiedInteraction) {
      beginExitThen(furniture, reducedMotion);
    } else {
      state.pendingWalk = null;
      beginWalkTo(goalXZ, furniture, reducedMotion);
    }
  }

  function triggerReaction(kind = 'wave') {
    if (state.phase === 'act' || state.phase === 'enter' || state.phase === 'exit' || state.phase === 'walk') return;
    state.phase = 'react';
    state.reactionKind = kind;
    state.timer = 0;
    state.duration = kind === 'oops' ? 0.9 : 1.35;
  }

  function settleToIdle(furniture = {}) {
    if (state.phase === 'idle') return;
    if (state.occupiedInteraction) {
      const meta = INTERACTION_STAGES[state.occupiedInteraction];
      state.x = meta.approach[0];
      state.y = 0;
      state.z = meta.approach[1];
      state.occupiedInteraction = null;
    }
    state.pendingAction = null;
    state.pendingWalk = null;
    state.activeInteraction = null;
    state.activeAction = null;
    state.waypoints = [];
    state.phase = 'idle';
    state.timer = 0;
    // Keep within walkable spot if needed
    const [safe] = findRoomPath([state.x, state.z], [state.x, state.z], furniture);
    if (safe) {
      state.x = safe[0];
      state.z = safe[1];
    }
  }

  function update(dt, reducedMotion = false) {
    const safeDt = clamp(dt, 0, 0.05);
    state.elapsed += safeDt;
    state.blinkClock -= safeDt;
    if (state.blinkClock < -0.14) state.blinkClock = 2.6 + (state.elapsed * 1.37 % 2.1);
    const blinkScale = state.blinkClock < 0 ? 0.12 : 1;

    if (state.phase === 'walk') {
      const speed = 3.45;
      let remaining = speed * safeDt;
      while (remaining > 0 && state.waypoints.length > 0) {
        const [tx, tz] = state.waypoints[0];
        const dx = tx - state.x;
        const dz = tz - state.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= remaining) {
          state.x = tx;
          state.z = tz;
          remaining -= dist;
          state.waypoints.shift();
        } else {
          state.x += (dx / dist) * remaining;
          state.z += (dz / dist) * remaining;
          const targetYaw = Math.atan2(dx, dz);
          state.yaw = lerpAngle(state.yaw, targetYaw, Math.min(1, safeDt * 13));
          remaining = 0;
        }
      }
      state.walkCycle += safeDt * 9.5;
      if (state.waypoints.length === 0) {
        onWalkArrived(reducedMotion);
      }
    } else if (state.phase === 'enter') {
      state.timer += safeDt;
      const meta = INTERACTION_STAGES[state.activeInteraction];
      const rawT = clamp(state.timer / Math.max(0.05, state.duration), 0, 1);
      const t = smoothstep(rawT);
      const hopArc = (state.activeInteraction === 'bed' || state.activeInteraction === 'tea')
        ? Math.sin(rawT * Math.PI) * 0.38
        : 0;
      state.x = lerp(state.enterFrom[0], meta.actPos[0], t);
      state.y = lerp(state.enterFrom[1], meta.actPos[1], t) + hopArc;
      state.z = lerp(state.enterFrom[2], meta.actPos[2], t);
      const shelfYaw = targetYawForInteraction(state.activeInteraction);
      if (state.activeInteraction === 'bookshelf') {
        if (rawT < 0.55) {
          state.yaw = lerpAngle(state.enterFromYaw, shelfYaw, smoothstep(rawT / 0.55));
        } else {
          state.yaw = lerpAngle(shelfYaw, meta.readYaw, smoothstep((rawT - 0.55) / 0.45));
        }
      } else {
        state.yaw = lerpAngle(state.enterFromYaw, shelfYaw, t);
      }
      if (state.timer >= state.duration) {
        state.x = meta.actPos[0];
        state.y = meta.actPos[1];
        state.z = meta.actPos[2];
        state.yaw = finalActYawForInteraction(state.activeInteraction);
        state.phase = 'act';
        state.timer = 0;
        state.duration = meta.actDur;
      }
    } else if (state.phase === 'act') {
      state.timer += safeDt;
      if (state.timer >= state.duration) {
        if (state.occupiedInteraction) {
          beginExitThen(state.lastFurniture, reducedMotion);
        } else {
          state.phase = 'idle';
          state.activeInteraction = null;
          state.activeAction = null;
          state.timer = 0;
        }
      }
    } else if (state.phase === 'exit') {
      state.timer += safeDt;
      const rawT = clamp(state.timer / Math.max(0.05, state.duration), 0, 1);
      const t = smoothstep(rawT);
      const hopArc = (state.occupiedInteraction === 'bed' || state.occupiedInteraction === 'tea')
        ? Math.sin(rawT * Math.PI) * 0.34
        : 0;
      state.x = lerp(state.enterFrom[0], state.exitTo[0], t);
      state.y = lerp(state.enterFrom[1], state.exitTo[1], t) + hopArc;
      state.z = lerp(state.enterFrom[2], state.exitTo[2], t);
      const exitYaw = yawTowards(state.enterFrom[0], state.enterFrom[2], state.exitTo[0], state.exitTo[2]);
      if (Math.hypot(state.exitTo[0] - state.enterFrom[0], state.exitTo[2] - state.enterFrom[2]) > 0.05) {
        state.yaw = lerpAngle(state.enterFromYaw, exitYaw, t);
      }
      if (state.timer >= state.duration) {
        state.x = state.exitTo[0];
        state.y = state.exitTo[1];
        state.z = state.exitTo[2];
        const prevFurniture = state.lastFurniture;
        state.occupiedInteraction = null;
        if (state.pendingAction) {
          const nextMeta = INTERACTION_STAGES[state.pendingAction.interactionId];
          beginWalkTo(nextMeta.approach, prevFurniture, reducedMotion);
        } else if (state.pendingWalk) {
          const target = state.pendingWalk;
          state.pendingWalk = null;
          beginWalkTo(target, prevFurniture, reducedMotion);
        } else {
          state.phase = 'idle';
          state.activeInteraction = null;
          state.activeAction = null;
          state.timer = 0;
        }
      }
    } else if (state.phase === 'react') {
      state.timer += safeDt;
      if (state.timer >= state.duration) {
        state.phase = 'idle';
        state.reactionKind = null;
        state.timer = 0;
      }
    }

    return computePose(blinkScale, reducedMotion);
  }

  function computePose(blinkScale, reducedMotion) {
    const pose = defaultPose(state.x, state.y, state.z, state.yaw, blinkScale);
    const t = state.elapsed;

    if (state.phase === 'idle') {
      if (!reducedMotion) {
        pose.posePosY = Math.sin(t * 2.1) * 0.015;
        pose.headRotY = Math.sin(t * 0.75) * 0.08;
        pose.headRotX = Math.sin(t * 1.1) * 0.025;
        pose.leftArmRotZ = -0.2 - Math.sin(t * 2.1) * 0.025;
        pose.rightArmRotZ = 0.2 + Math.sin(t * 2.1) * 0.025;
      }
      return pose;
    }

    if (state.phase === 'react') {
      const p = state.timer / Math.max(0.1, state.duration);
      if (state.reactionKind === 'oops') {
        pose.headRotY = Math.sin(p * Math.PI * 4) * 0.24 * (1 - p);
        pose.headRotX = 0.16 * Math.sin(p * Math.PI);
        pose.torsoRotX = 0.1 * Math.sin(p * Math.PI);
        pose.leftArmRotZ = -0.28;
        pose.rightArmRotZ = 0.28;
      } else {
        pose.posePosY = Math.abs(Math.sin(p * Math.PI * 2)) * 0.09;
        pose.rightArmRotZ = 2.45 + Math.sin(p * Math.PI * 6) * 0.24;
        pose.rightArmRotX = -0.25;
        pose.headRotZ = -0.1 * Math.sin(p * Math.PI);
        pose.effect = 'wave';
      }
      return pose;
    }

    if (state.phase === 'walk') {
      const pendingId = state.pendingAction?.interactionId;
      const pendingActionId = state.pendingAction?.actionId;
      const pendingMeta = pendingId ? INTERACTION_STAGES[pendingId] : null;
      pose.activityLabel = ACTION_LABELS[pendingActionId]?.walkLabel || pendingMeta?.walkLabel || null;
      if (!reducedMotion) {
        const s = Math.sin(state.walkCycle);
        pose.posePosY = Math.abs(s) * 0.065;
        pose.leftLegRotX = s * 0.58;
        pose.rightLegRotX = -s * 0.58;
        pose.leftArmRotX = -s * 0.46;
        pose.rightArmRotX = s * 0.46;
        pose.torsoRotX = 0.07;
        pose.torsoRotY = s * 0.06;
        pose.headRotX = -0.03;
      }
      return pose;
    }

    // Enter / Act / Exit poses per interaction
    const id = state.activeInteraction || state.occupiedInteraction;
    const meta = INTERACTION_STAGES[id];
    const progress = state.phase === 'act' ? clamp(state.timer / Math.max(0.1, state.duration), 0, 1) : 0;
    const blend = state.phase === 'enter'
      ? smoothstep(state.timer / Math.max(0.05, state.duration))
      : state.phase === 'exit'
        ? 1 - smoothstep(state.timer / Math.max(0.05, state.duration))
        : 1;

    pose.activityLabel = state.phase === 'exit'
      ? null
      : (ACTION_LABELS[state.activeAction]?.label || meta?.label || null);

    if (id === 'stove') {
      const stir = reducedMotion ? 0 : state.timer * 5.2;
      pose.torsoRotX = 0.14 * blend;
      pose.headRotX = 0.22 * blend;
      pose.leftArmRotX = (-0.75 + (reducedMotion ? 0 : Math.sin(stir * 0.5) * 0.06)) * blend;
      pose.leftArmRotZ = lerp(-0.2, -0.05, blend);
      pose.rightArmRotX = (-1.18 + (reducedMotion ? 0 : Math.sin(stir) * 0.18)) * blend;
      pose.rightArmRotY = (reducedMotion ? 0 : Math.cos(stir) * 0.22) * blend;
      pose.rightArmRotZ = lerp(0.2, -0.18 + (reducedMotion ? 0 : Math.cos(stir) * 0.14), blend);
      if (state.phase === 'act') {
        pose.prop = 'ladle';
        pose.effect = 'cook';
        pose.potShake = reducedMotion ? 0 : Math.abs(Math.sin(stir * 1.4));
        if (progress > 0.85 && !reducedMotion) {
          const hop = (progress - 0.85) / 0.15;
          pose.posePosY = Math.sin(hop * Math.PI) * 0.12;
        }
      }
      return pose;
    }

    if (id === 'desk') {
      const stroke = reducedMotion ? 0 : state.timer * 5.6;
      pose.posePosY = -0.03 * blend;
      pose.leftLegRotX = -1.36 * blend;
      pose.rightLegRotX = -1.36 * blend;
      pose.torsoRotX = 0.18 * blend;
      pose.headRotX = 0.28 * blend;
      pose.headRotY = (reducedMotion ? 0 : Math.sin(stroke * 0.35) * 0.08) * blend;
      pose.leftArmRotX = -0.92 * blend;
      pose.leftArmRotZ = lerp(-0.2, -0.35, blend);
      pose.rightArmRotX = (-1.28 + (reducedMotion ? 0 : Math.sin(stroke * 1.1) * 0.12)) * blend;
      pose.rightArmRotY = (reducedMotion ? 0 : Math.cos(stroke) * 0.24) * blend;
      pose.rightArmRotZ = lerp(0.2, -0.22 + (reducedMotion ? 0 : Math.sin(stroke) * 0.16), blend);
      if (state.phase === 'act') {
        pose.prop = 'brush';
        pose.effect = 'paint';
      }
      return pose;
    }

    if (id === 'bed') {
      pose.poseRotX = (-Math.PI / 2) * blend;
      pose.leftLegRotX = -0.08 * blend;
      pose.rightLegRotX = 0.06 * blend;
      pose.leftArmRotZ = lerp(-0.2, -0.12, blend);
      pose.rightArmRotZ = lerp(0.2, 0.12, blend);
      pose.leftArmRotX = -0.12 * blend;
      pose.rightArmRotX = -0.15 * blend;
      if (state.phase === 'act') {
        pose.eyeScaleY = 0.14;
        if (!reducedMotion) {
          pose.posePosY = Math.sin(state.timer * 2.0) * 0.018;
          pose.headRotZ = Math.sin(state.timer * 1.0) * 0.05;
        }
        pose.effect = 'rest';
      }
      return pose;
    }

    if (id === 'shower') {
      const scrub = reducedMotion ? 0 : state.timer * 6.8;
      if (!reducedMotion && state.phase === 'act') {
        pose.posePosY = Math.abs(Math.sin(scrub * 0.6)) * 0.04;
      }
      pose.headRotX = (-0.12 + (reducedMotion ? 0 : Math.sin(scrub * 0.5) * 0.07)) * blend;
      pose.headRotZ = (reducedMotion ? 0 : Math.cos(scrub * 0.5) * 0.08) * blend;
      pose.leftArmRotX = (-1.75 + (reducedMotion ? 0 : Math.sin(scrub) * 0.28)) * blend;
      pose.leftArmRotZ = lerp(-0.2, -0.52, blend);
      pose.rightArmRotX = (-1.75 - (reducedMotion ? 0 : Math.sin(scrub) * 0.28)) * blend;
      pose.rightArmRotZ = lerp(0.2, 0.52, blend);
      if (state.phase === 'act') {
        pose.effect = 'shower';
      }
      return pose;
    }

    if (id === 'bookshelf') {
      if (state.phase === 'enter') {
        const reach = Math.sin(blend * Math.PI);
        pose.rightArmRotX = -2.0 * reach;
        pose.headRotX = -0.22 * reach;
      } else if (state.phase === 'act') {
        const page = reducedMotion ? 0 : Math.max(0, Math.sin(state.timer * 2.4 - 0.8));
        pose.torsoRotX = 0.08;
        pose.headRotX = 0.26 + (reducedMotion ? 0 : Math.sin(state.timer * 1.5) * 0.04);
        pose.headRotY = reducedMotion ? 0 : Math.sin(state.timer * 0.9) * 0.08;
        pose.leftArmRotX = -0.95;
        pose.leftArmRotZ = -0.38;
        pose.rightArmRotX = -0.95 - page * 0.18;
        pose.rightArmRotZ = 0.38 - page * 0.22;
        pose.prop = 'book';
        pose.effect = 'read';
      } else if (state.phase === 'exit') {
        pose.torsoRotX = 0.08 * blend;
        pose.headRotX = 0.2 * blend;
        pose.leftArmRotX = -0.95 * blend;
        pose.leftArmRotZ = lerp(-0.2, -0.38, blend);
        pose.rightArmRotX = -0.95 * blend;
        pose.rightArmRotZ = lerp(0.2, 0.38, blend);
      }
      return pose;
    }

    if (id === 'tea') {
      const sipWave = reducedMotion ? 0.5 : Math.max(0, Math.sin(state.timer * 2.1));
      pose.posePosY = -0.02 * blend;
      pose.leftLegRotX = -1.42 * blend;
      pose.rightLegRotX = -1.42 * blend;
      pose.torsoRotX = (0.08 - sipWave * 0.04) * blend;
      pose.headRotX = (0.14 - sipWave * 0.12) * blend;
      pose.leftArmRotX = -0.78 * blend;
      pose.leftArmRotZ = lerp(-0.2, -0.3, blend);
      pose.rightArmRotX = lerp(-0.98, -1.55, sipWave) * blend;
      pose.rightArmRotZ = lerp(0.2, -0.26, blend);
      if (state.phase === 'act') {
        pose.prop = 'cup';
        pose.effect = 'tea';
      }
      return pose;
    }

    if (id === 'meal') {
      const biteWave = reducedMotion ? 0.5 : Math.max(0, Math.sin(state.timer * 3.4));
      pose.torsoRotX = (0.14 - biteWave * 0.05) * blend;
      pose.headRotX = (0.24 - biteWave * 0.12) * blend;
      pose.leftArmRotX = -0.68 * blend;
      pose.leftArmRotZ = lerp(-0.2, -0.1, blend);
      pose.rightArmRotX = lerp(-1.05, -1.65, biteWave) * blend;
      pose.rightArmRotZ = lerp(0.2, -0.22, blend);
      if (state.phase === 'act') {
        pose.prop = 'fork';
        pose.effect = 'eat';
      }
      return pose;
    }

    return pose;
  }

  return {
    get state() { return state; },
    startAction,
    walkToPoint,
    triggerReaction,
    settleToIdle,
    update,
  };
}
