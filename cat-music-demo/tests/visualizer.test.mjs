import assert from 'node:assert/strict';
import test from 'node:test';
import { spectrumLevels, waveformPoints } from '../visualizer.mjs';

test('频谱把不同频段强度映射为画布内的柱高', () => {
  const levels = spectrumLevels(Uint8Array.from([0, 0, 255, 255]), 2);
  assert.equal(levels.length, 2);
  assert.equal(levels[0], 0);
  assert.equal(levels[1], 1);
});

test('波形把静音和峰值样本映射为画布坐标', () => {
  assert.deepEqual(waveformPoints(Uint8Array.from([128, 0, 255]), 100, 60), [
    [0, 30],
    [50, 0],
    [100, 60],
  ]);
});
