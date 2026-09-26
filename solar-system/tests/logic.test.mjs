import test from 'node:test';
import assert from 'node:assert/strict';
import {nextIndex, focusDistance, clampSpeed, textureTier} from '../logic.mjs';
import * as logic from '../logic.mjs';
test('ten bodies wrap in both directions',()=>{assert.equal(nextIndex(9,1,10),0);assert.equal(nextIndex(0,-1,10),9)});
test('focus keeps target within chosen view fill',()=>{assert.ok(focusDistance(1,50,0.7)>1);assert.ok(focusDistance(1,50,0.45)>focusDistance(1,50,0.7))});
test('speed stays in the 0 to 4 range',()=>{assert.equal(clampSpeed(-1),0);assert.equal(clampSpeed(6),4)});
test('texture quality can step down to standard',()=>{assert.deepEqual(textureTier('ultra'),['ultra','hd','standard']);assert.deepEqual(textureTier('standard'),['standard'])});
test('earth clouds remain aligned with the surface and stop with it',()=>{const surface={rotation:{y:1}},cloud={rotation:{y:.2}};logic.advanceSynchronizedRotation(surface,cloud,.3);assert.equal(surface.rotation.y,1.3);assert.equal(cloud.rotation.y,1.3);logic.advanceSynchronizedRotation(surface,cloud,0);assert.equal(surface.rotation.y,1.3);assert.equal(cloud.rotation.y,1.3)});
