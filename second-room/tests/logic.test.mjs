import test from 'node:test';
import assert from 'node:assert/strict';
import { AREA, ROOMS, SCENARIOS, canOccupy, lightAt, roomAt } from '../logic.mjs';
import * as logic from '../logic.mjs';

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
  assert.equal(typeof logic.frameDelta, 'function');
  assert.equal(logic.frameDelta(1000, 1016), .016);
  assert.equal(logic.frameDelta(1000, 5000), .05);
});
