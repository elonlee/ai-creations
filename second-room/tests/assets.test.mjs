import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('the furniture collection contains 32 valid local GLB assets', async () => {
  const dir = new URL('../assets/furniture/', import.meta.url);
  const names = (await readdir(dir)).filter(name => name.endsWith('.glb'));
  assert.equal(names.length, 32);
  for (const name of names) {
    const data = await readFile(new URL(name, dir));
    assert.equal(data.toString('ascii', 0, 4), 'glTF');
    assert.equal(data.readUInt32LE(8), data.length);
    const jsonLength = data.readUInt32LE(12);
    const gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
    assert.match(gltf.asset.generator, /Blender/i);
    assert.ok(gltf.meshes.length > 0);
  }
});
