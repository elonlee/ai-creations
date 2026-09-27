import test from 'node:test';
import assert from 'node:assert/strict';
import { createNote, normalizeState, noteTitle, weatherPreset, sceneImage } from '../state.mjs';

test('首次打开时生成可编辑的手记和默认设置', () => {
  const state = normalizeState(null, new Date('2026-09-26T10:00:00+08:00'));
  assert.equal(state.notes.length, 1);
  assert.equal(state.activeId, state.notes[0].id);
  assert.equal(state.settings.scene, 'tokyo');
  assert.equal(state.settings.density, 0.42);
});

test('损坏或越界的本地数据会回到有效范围', () => {
  const state = normalizeState({ notes: [{ id: 'a', text: '旧手记' }], activeId: 'missing', settings: { density: 9, speed: -2, scene: 'wrong', fontSize: 80, soundVolume: 9 } });
  assert.equal(state.activeId, 'a');
  assert.equal(state.settings.density, 1);
  assert.equal(state.settings.speed, 0);
  assert.equal(state.settings.scene, 'tokyo');
  assert.equal(state.settings.fontSize, 32);
  assert.equal(state.settings.soundVolume, 1);
});

test('新手记有唯一标识并能从第一行提取标题', () => {
  const a = createNote(new Date('2026-09-26T10:00:00+08:00'));
  const b = createNote(new Date('2026-09-26T10:00:00+08:00'));
  assert.notEqual(a.id, b.id);
  assert.equal(noteTitle({ text: '\n  今夜的雨\n第二行' }), '今夜的雨');
  assert.equal(noteTitle({ text: '  ' }), '未命名手记');
});

test('天气预设给出对应的雨滴参数', () => {
  assert.equal(weatherPreset('storm').density, 0.84);
  assert.equal(weatherPreset('fog').fog, 0.9);
  assert.equal(weatherPreset('unknown'), null);
});

test('两处乡村背景可以保存和恢复', () => {
  assert.equal(normalizeState({ settings: { scene: 'terraces' } }).settings.scene, 'terraces');
  assert.equal(normalizeState({ settings: { scene: 'village' } }).settings.scene, 'village');
  assert.equal(sceneImage('terraces'), './assets/terraces.jpg');
  assert.equal(sceneImage('village'), './assets/village.jpg');
});
