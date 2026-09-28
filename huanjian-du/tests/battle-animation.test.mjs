import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import * as battleAnimation from '../battle-animation.mjs';

const { createAnimationPlayer, frameSource } = battleAnimation;

test('未防御的对手受击，破招时对手格挡', () => {
  assert.deepEqual(battleAnimation.previewMoves?.('strike', 'road-bandit'), [
    { slot: 'hero', actor: 'lu-zhao', action: 'attack' },
    { slot: 'enemy', actor: 'road-bandit', action: 'hit', delayFrames: 2 },
  ]);
  assert.deepEqual(battleAnimation.previewMoves?.('break', 'road-bandit'), [
    { slot: 'hero', actor: 'lu-zhao', action: 'attack' },
    { slot: 'enemy', actor: 'road-bandit', action: 'guard' },
  ]);
});

test('敌方出招预览让未防御的主角受击', () => {
  assert.deepEqual(battleAnimation.previewMoves?.('enemy-strike', 'cheng-yan'), [
    { slot: 'enemy', actor: 'cheng-yan', action: 'attack' },
    { slot: 'hero', actor: 'lu-zhao', action: 'hit', delayFrames: 2 },
  ]);
});

test('守势时主角格挡敌方攻击', () => {
  assert.deepEqual(battleAnimation.previewMoves?.('guard', 'cheng-yan'), [
    { slot: 'hero', actor: 'lu-zhao', action: 'guard' },
    { slot: 'enemy', actor: 'cheng-yan', action: 'attack' },
  ]);
});

test('受击动作使用独立帧路径', () => {
  assert.equal(frameSource('lu-zhao', 'hit', 0), 'assets/battle/animations/lu-zhao-hit-0.png');
  assert.equal(frameSource('cheng-yan', 'hit', 3), 'assets/battle/animations/cheng-yan-hit-3.png');
});

test('三名角色的攻击、防御和受击各有四张独立帧', () => {
  for (const actor of ['lu-zhao', 'road-bandit', 'cheng-yan']) {
    for (const action of ['attack', 'guard', 'hit']) {
      const paths = Array.from({ length: 4 }, (_, index) => frameSource(actor, action, index));
      assert.equal(new Set(paths).size, 4);
      const hashes = [];
      for (const path of paths) {
        const file = fileURLToPath(new URL(`../${path}`, import.meta.url));
        assert.ok(existsSync(file), path);
        hashes.push(createHash('sha256').update(readFileSync(file)).digest('hex'));
      }
      assert.equal(new Set(hashes).size, 4, `${actor} ${action} 有重复画面`);
    }
  }
});

test('交手按帧播放，结束后双方恢复站姿', async () => {
  const rendered = [];
  const pending = [];
  const player = createAnimationPlayer({
    render: (actor, source) => rendered.push([actor, source]),
    wait: () => new Promise((resolve) => pending.push(resolve)),
    idle: { hero: 'hero-idle.png', enemy: 'enemy-idle.png' },
  });

  const playback = player.play([
    { slot: 'hero', actor: 'lu-zhao', action: 'attack' },
    { slot: 'enemy', actor: 'road-bandit', action: 'guard' },
  ]);
  assert.deepEqual(rendered.slice(0, 2), [
    ['hero', frameSource('lu-zhao', 'attack', 0)],
    ['enemy', frameSource('road-bandit', 'guard', 0)],
  ]);

  for (let index = 1; index <= 4; index++) {
    pending.shift()();
    await Promise.resolve();
    if (index < 4) {
      assert.deepEqual(rendered.slice(-2), [
        ['hero', frameSource('lu-zhao', 'attack', index)],
        ['enemy', frameSource('road-bandit', 'guard', index)],
      ]);
    }
  }
  await playback;
  assert.deepEqual(rendered.slice(-2), [['hero', 'hero-idle.png'], ['enemy', 'enemy-idle.png']]);
});

test('受击从攻击命中帧开始，并完整播放四帧后恢复', async () => {
  const rendered = [];
  const pending = [];
  const player = createAnimationPlayer({
    render: (slot, source) => rendered.push([slot, source]),
    wait: () => new Promise((resolve) => pending.push(resolve)),
    idle: { hero: 'hero-idle.png', enemy: 'enemy-idle.png' },
  });
  const latest = (slot) => rendered.findLast(([current]) => current === slot)?.[1];
  const playback = player.play(battleAnimation.previewMoves('strike', 'road-bandit'));

  assert.equal(latest('hero'), frameSource('lu-zhao', 'attack', 0));
  assert.equal(latest('enemy'), 'enemy-idle.png');
  for (let tick = 1; tick <= 5; tick++) {
    pending.shift()();
    await Promise.resolve();
    if (tick === 1) assert.equal(latest('enemy'), 'enemy-idle.png');
    if (tick >= 2) assert.equal(latest('enemy'), frameSource('road-bandit', 'hit', tick - 2));
  }
  assert.equal(latest('hero'), 'hero-idle.png');
  pending.shift()();
  await playback;
  assert.equal(latest('enemy'), 'enemy-idle.png');
});

test('新动作开始时清除上一轮的受击姿势', async () => {
  const rendered = [];
  const player = createAnimationPlayer({
    render: (slot, source) => rendered.push([slot, source]),
    wait: async () => {},
    idle: { hero: 'hero-idle.png', enemy: 'enemy-idle.png' },
  });
  const previous = player.play([{ slot: 'enemy', actor: 'road-bandit', action: 'hit' }]);
  const current = player.play(battleAnimation.previewMoves('strike', 'road-bandit'));
  assert.deepEqual(rendered.slice(-2), [
    ['enemy', 'enemy-idle.png'],
    ['hero', frameSource('lu-zhao', 'attack', 0)],
  ]);
  await Promise.all([previous, current]);
});

test('切换场景时取消旧动画，不再覆盖新对手', async () => {
  const rendered = [];
  let release;
  const player = createAnimationPlayer({
    render: (actor, source) => rendered.push([actor, source]),
    wait: () => new Promise((resolve) => { release = resolve; }),
    idle: { hero: 'hero-idle.png', enemy: 'bandit-idle.png' },
  });
  const playback = player.play([{ slot: 'enemy', actor: 'road-bandit', action: 'attack' }]);
  player.reset({ hero: 'hero-idle.png', enemy: 'boss-idle.png' });
  const count = rendered.length;
  release();
  await playback;
  assert.equal(rendered.length, count);
  assert.deepEqual(rendered.slice(-2), [['hero', 'hero-idle.png'], ['enemy', 'boss-idle.png']]);
});
