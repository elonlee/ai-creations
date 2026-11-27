import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { layoutEntries } from '../logic.mjs';

test('the furniture collection contains 34 valid grounded local GLB assets', async () => {
  const dir = new URL('../assets/furniture/', import.meta.url);
  const names = (await readdir(dir)).filter(name => name.endsWith('.glb'));
  assert.equal(names.length, 34);

  const referenced = new Set(
    ['work', 'guest', 'future'].flatMap(kind => layoutEntries(kind).map(entry => `${entry[0]}.glb`)),
  );
  for (const req of referenced) {
    assert.ok(names.includes(req), `Missing referenced GLB: ${req}`);
  }

  for (const name of names) {
    const data = await readFile(new URL(name, dir));
    assert.equal(data.toString('ascii', 0, 4), 'glTF');
    assert.equal(data.readUInt32LE(8), data.length);
    const jsonLength = data.readUInt32LE(12);
    const gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
    assert.equal(gltf.asset.version, '2.0');
    assert.ok(gltf.meshes.length > 0);
    assert.ok(gltf.materials.length > 0);

    let minY = Infinity;
    for (const mesh of gltf.meshes) {
      for (const prim of mesh.primitives) {
        const posAcc = gltf.accessors[prim.attributes.POSITION];
        minY = Math.min(minY, posAcc.min[1]);
      }
    }
    assert.ok(Math.abs(minY) < 0.002, `${name} should rest at y=0 (got minY=${minY})`);
  }
});
