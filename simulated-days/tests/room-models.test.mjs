import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, DoubleSide, Group, MeshBasicMaterial, Raycaster, Vector3 } from '../../second-room/vendor/three.core.js';
import { buildBedFrame, buildBookcase, buildShowerEnclosure } from '../room-models.mjs';

const materials = Object.fromEntries(
  ['oak', 'oakDark', 'cream', 'sage', 'lavenderDeep', 'pink', 'white', 'gold'].map(name => [name, new MeshBasicMaterial()]),
);

for (const [name, width, height, depth, rows] of [
  ['高书架', 1.18, 2.48, .67, [[.32, .38], [.34], [.33], [.37]]],
  ['矮书架', 1.55, 1.15, .58, [[.26, .32], [.28, .31]]],
]) {
  test(`${name}的书柜前方可看到内凹的背板`, () => {
    const caseModel = new Group();
    buildBookcase(caseModel, materials, { width, height, depth, rows });
    caseModel.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(width / 2 - .16, .27, 2), new Vector3(0, 0, -1));
    const [hit] = ray.intersectObject(caseModel, true);
    assert.equal(hit.object.material, materials.oak, '视线应穿过空格直到背板');
    assert.ok(hit.point.z < 0, '背板应位于书架后侧');
  });

  test(`${name}的书各自立在搁板上且互不穿插`, () => {
    const caseModel = new Group();
    buildBookcase(caseModel, materials, { width, height, depth, rows });
    caseModel.updateMatrixWorld(true);
    const shelves = [];
    const books = [];
    caseModel.traverse(mesh => {
      if (!mesh.isMesh) return;
      const bounds = new Box3().setFromObject(mesh);
      if (mesh.material === materials.oakDark) shelves.push(bounds);
      else if (mesh.material !== materials.oak) books.push(bounds);
    });
    assert.equal(books.length, rows.flat().length);
    for (const book of books) {
      assert.ok(shelves.some(shelf => Math.abs(shelf.max.y - book.min.y) < .001
        && shelf.min.x <= book.min.x && shelf.max.x >= book.max.x
        && shelf.min.z <= book.min.z && shelf.max.z >= book.max.z));
      assert.ok(!books.some(other => other !== book && book.intersectsBox(other)));
    }
  });
}

test('从床背面看到的床框和床头板没有重叠表面', () => {
  const bed = new Group();
  buildBedFrame(bed, materials);
  bed.updateMatrixWorld(true);
  for (const y of [.24, .40, .45, .50, .53, 1.26]) {
    const ray = new Raycaster(new Vector3(.32, y, -3), new Vector3(0, 0, 1), 0, 1.47);
    const hits = ray.intersectObject(bed, true);
    assert.equal(hits.length, 1, `高度 ${y} 的床背面应恰有一层外表面`);
    assert.ok(Math.abs(hits[0].point.z + 1.55) < .001);
  }
});

const showerGlass = new MeshBasicMaterial({ side: DoubleSide, transparent: true, depthWrite: false });

test('滑门关闭时淋浴区四面都可从外侧命中玻璃', () => {
  const shower = new Group();
  buildShowerEnclosure(shower, materials, showerGlass);
  shower.updateMatrixWorld(true);
  for (const [x, z] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    const ray = new Raycaster(new Vector3(x, 1.06, z), new Vector3(-x, 0, -z).normalize(), 0, 1.25);
    assert.equal(ray.intersectObject(shower, true)[0]?.object.material, showerGlass);
  }
});

test('滑门开启时入口左半侧留出通道，右半侧保留固定玻璃', () => {
  const shower = new Group();
  const { door, travel } = buildShowerEnclosure(shower, materials, showerGlass);
  door.position.x = travel;
  shower.updateMatrixWorld(true);
  for (const y of [.3, 1.05, 1.92]) {
    for (const x of [-.72, -.40, -.02]) {
      const ray = new Raycaster(new Vector3(x, y, -1.3), new Vector3(0, 0, 1), 0, .60);
      assert.equal(ray.intersectObject(shower, true).length, 0);
    }
  }
  const fixed = new Raycaster(new Vector3(.5, 1.05, -1.3), new Vector3(0, 0, 1), 0, .60);
  assert.equal(fixed.intersectObject(shower, true).filter(hit => hit.object.material === showerGlass).length, 2);
});
