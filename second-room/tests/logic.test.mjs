import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  AREA,
  DOOR_DEFS,
  PC_MODES,
  ROOMS,
  SCENARIOS,
  TV_MODES,
  WALL_ART_DEFS,
  WALL_HEIGHT,
  WINDOW_BOTTOM,
  WINDOW_DEFS,
  WINDOW_TOP,
  canOccupy,
  doorObstacle,
  frameDelta,
  layoutEntries,
  lightAt,
  nextScreenMode,
  resolveLampState,
  roomAt,
  staticObstaclesFromWalls,
  walkStep,
} from '../logic.mjs';

async function loadGlbBounds(name) {
  const data = await readFile(new URL(`../assets/furniture/${name}.glb`, import.meta.url));
  const jsonLength = data.readUInt32LE(12);
  const gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes) {
    for (const prim of mesh.primitives) {
      const pa = gltf.accessors[prim.attributes.POSITION];
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], pa.min[i]);
        max[i] = Math.max(max[i], pa.max[i]);
      }
    }
  }
  return { min, max };
}

function worldBox(bounds, x, z, rot, y = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const lx of [bounds.min[0], bounds.max[0]]) {
    for (const lz of [bounds.min[2], bounds.max[2]]) {
      const wx = x + lx * c + lz * s;
      const wz = z - lx * s + lz * c;
      minX = Math.min(minX, wx);
      maxX = Math.max(maxX, wx);
      minZ = Math.min(minZ, wz);
      maxZ = Math.max(maxZ, wz);
    }
  }
  return { minX, maxX, minY: y + bounds.min[1], maxY: y + bounds.max[1], minZ, maxZ };
}

test('73㎡ floor plan has three named answers for the second room', () => {
  assert.equal(AREA, 73);
  assert.deepEqual(Object.keys(SCENARIOS), ['work', 'guest', 'future']);
  assert.equal(ROOMS.flex.name, '第二间房');
});

test('room lookup resolves a point in the flexible room', () => {
  assert.equal(roomAt(3, 1.5)?.id, 'flex');
  assert.equal(roomAt(-3, -1)?.id, 'living');
});

test('walk collision blocks walls and furniture while allowing open passage', () => {
  const obstacles = [{ minX: 1, maxX: 2, minZ: 1, maxZ: 2 }];
  assert.equal(canOccupy(1.4, 1.4, obstacles, 0.2), false);
  assert.equal(canOccupy(0, 0, obstacles, 0.2), true);
  assert.equal(canOccupy(5.1, 0, obstacles, 0.2), false);
});

test('time slider returns night lamps only at night', () => {
  assert.equal(lightAt(9).lamps, false);
  assert.equal(lightAt(15).lamps, false);
  assert.equal(lightAt(21).lamps, true);
  assert.ok(lightAt(15).sun > lightAt(21).sun);
});

test('animation delta is in seconds and caps a long background pause', () => {
  assert.equal(typeof frameDelta, 'function');
  assert.equal(frameDelta(1000, 1016), 0.016);
  assert.equal(frameDelta(1000, 5000), 0.05);
});

test('walkStep strafes right for D (+1) and left for A (-1) relative to camera yaw', () => {
  for (const yaw of [0, 0.7, Math.PI / 2, Math.PI, -1.85]) {
    const fwd = walkStep(yaw, 1, 0, 1);
    const right = walkStep(yaw, 0, 1, 1);
    const left = walkStep(yaw, 0, -1, 1);
    // In Three.js Y-up right-handed coords, (fwd x Up).y = 0, (fwd x Up) = (-fwd.dz, 0, fwd.dx)
    const crossDot = (-fwd.dz) * right.dx + fwd.dx * right.dz;
    assert.ok(Math.abs(crossDot - 1) < 1e-9, `D should move right for yaw=${yaw}`);
    assert.ok(Math.abs(left.dx + right.dx) < 1e-9 && Math.abs(left.dz + right.dz) < 1e-9);
  }
});

test('wall art and family photos stay inside room bounds and clear of windows and doors', () => {
  assert.ok(WALL_ART_DEFS.length >= 10);
  for (const art of WALL_ART_DEFS) {
    assert.ok(art.y - art.h / 2 >= 0.8 && art.y + art.h / 2 <= WALL_HEIGHT - 0.1);
    assert.ok(roomAt(art.x, art.z)?.id === art.roomId, `Art outside ${art.roomId}: (${art.x},${art.z})`);
    for (const win of WINDOW_DEFS) {
      if (art.roomId === win.roomId && art.y + art.h / 2 > WINDOW_BOTTOM && art.y - art.h / 2 < WINDOW_TOP) {
        const dist = win.orientation === 'x' ? Math.abs(art.x - win.x) : Math.abs(art.z - win.z);
        const sameWall = win.orientation === 'x' ? Math.abs(art.z - win.z) < 0.2 : Math.abs(art.x - win.x) < 0.2;
        if (sameWall) assert.ok(dist >= win.width / 2 + art.w / 2, `Art overlaps window in ${art.roomId}`);
      }
    }
  }
});

test('interactive screen modes cycle cleanly and lamp overrides respect defaults', () => {
  assert.equal(TV_MODES.length, 4);
  assert.equal(PC_MODES.length, 4);
  assert.equal(nextScreenMode(1, TV_MODES.length), 2);
  assert.equal(nextScreenMode(3, TV_MODES.length), 0);
  assert.equal(resolveLampState(false, undefined), false);
  assert.equal(resolveLampState(false, true), true);
  assert.equal(resolveLampState(true, false), false);
});

test('all scenarios have zero wall or furniture collisions and walkable doorways', async () => {
  const walls = staticObstaclesFromWalls();
  const boundsCache = new Map();
  const skipCollision = new Set(['rug', 'round_rug', 'table_lamp', 'desk_lamp', 'upper_cabinet', 'tv', 'computer']);

  for (const kind of ['work', 'guest', 'future']) {
    const entries = layoutEntries(kind);
    const boxes = [];
    for (const [name, x, z, rot, roomId, y = 0] of entries) {
      if (!boundsCache.has(name)) boundsCache.set(name, await loadGlbBounds(name));
      const box = worldBox(boundsCache.get(name), x, z, rot, y);
      // Must stay strictly inside apartment bounds
      assert.ok(box.minX >= -4.92 && box.maxX <= 4.92 && box.minZ >= -3.57 && box.maxZ <= 3.57,
        `${kind}:${name} exceeds interior bounds: ${JSON.stringify(box)}`);
      // Must sit within its assigned room bounds (with small 0.02m tolerance)
      const [rMinX, rMaxX, rMinZ, rMaxZ] = ROOMS[roomId].bounds;
      assert.ok(box.minX >= rMinX - 0.02 && box.maxX <= rMaxX + 0.02 && box.minZ >= rMinZ - 0.02 && box.maxZ <= rMaxZ + 0.02,
        `${kind}:${name} outside ${roomId} bounds: ${JSON.stringify(box)}`);
      // Must not penetrate walls
      for (const w of walls) {
        const overlap = box.maxX > w.minX + 0.005 && box.minX < w.maxX - 0.005 && box.maxZ > w.minZ + 0.005 && box.minZ < w.maxZ - 0.005;
        assert.equal(overlap, false, `${kind}:${name} overlaps wall ${JSON.stringify(w)}`);
      }
      if (!skipCollision.has(name)) boxes.push({ name, box });
    }

    // Check pairwise furniture non-overlap (with 1cm tolerance)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const overlap = a.box.maxX > b.box.minX + 0.01 && a.box.minX < b.box.maxX - 0.01 &&
          a.box.maxZ > b.box.minZ + 0.01 && a.box.minZ < b.box.maxZ - 0.01;
        assert.equal(overlap, false, `${kind}: ${a.name} overlaps ${b.name}`);
      }
    }

    // Verify tabletop items sit cleanly within their host furniture footprint and height
    const byName = Object.fromEntries(entries.map((e, idx) => [e[0], { entry: e, bounds: boundsCache.get(e[0]) }]));
    const tvBox = worldBox(byName.tv.bounds, byName.tv.entry[1], byName.tv.entry[2], byName.tv.entry[3], byName.tv.entry[5]);
    const consoleBox = worldBox(byName.media_console.bounds, byName.media_console.entry[1], byName.media_console.entry[2], byName.media_console.entry[3], 0);
    assert.ok(tvBox.minX >= consoleBox.minX && tvBox.maxX <= consoleBox.maxX && tvBox.minZ >= consoleBox.minZ && tvBox.maxZ <= consoleBox.maxZ);
    assert.ok(Math.abs(tvBox.minY - consoleBox.maxY) < 0.002);

    if (kind === 'work') {
      const pcBox = worldBox(byName.computer.bounds, byName.computer.entry[1], byName.computer.entry[2], byName.computer.entry[3], byName.computer.entry[5]);
      const deskBox = worldBox(byName.desk.bounds, byName.desk.entry[1], byName.desk.entry[2], byName.desk.entry[3], 0);
      assert.ok(pcBox.minX >= deskBox.minX && pcBox.maxX <= deskBox.maxX && pcBox.minZ >= deskBox.minZ && pcBox.maxZ <= deskBox.maxZ);
      assert.ok(Math.abs(pcBox.minY - deskBox.maxY) < 0.002);
    }

    // Check walk spawn and doorway centers are passable when doors are open
    const furnObs = boxes.map(b => b.box);
    const openDoors = DOOR_DEFS.map(d => doorObstacle({ ...d, open: true }));
    const allObs = [...walls, ...furnObs, ...openDoors];
    assert.equal(canOccupy(-1.35, -1.65, allObs, 0.21), true, `${kind}: walk spawn blocked`);
    for (const d of DOOR_DEFS.filter(d => !d.entrance)) {
      const cx = d.orientation === 'x' ? d.hingeX + 0.42 : d.hingeX;
      const cz = d.orientation === 'z' ? d.hingeZ + 0.42 : d.hingeZ;
      assert.equal(canOccupy(cx, cz, allObs, 0.2), true, `${kind}: doorway (${cx},${cz}) blocked`);
    }
  }
});
