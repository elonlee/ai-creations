import test from 'node:test';
import assert from 'node:assert/strict';
import { nearbyInteraction, CHARACTERS } from '../game.mjs';
import { debugScenarioFromUrl } from '../debug.mjs';

const localUrl = (name) => `http://127.0.0.1:8765/huanjian-du/?debug=${name}`;

test('调试参数只在本地地址和已知节点生效', () => {
  assert.equal(debugScenarioFromUrl('http://127.0.0.1:8765/huanjian-du/'), null);
  assert.equal(debugScenarioFromUrl(localUrl('unknown')), null);
  assert.equal(debugScenarioFromUrl(localUrl('__proto__')), null);
  assert.equal(debugScenarioFromUrl('https://example.com/huanjian-du/?debug=ending'), null);
});

test('可直接进入序幕和四个有交互目标的探索场景', () => {
  assert.equal(debugScenarioFromUrl(localUrl('intro')).screen, 'intro');
  for (const [name, scene, site] of [
    ['road', 'road', 'cart'], ['ferry', 'ferry', 'ferryman'],
    ['tavern', 'tavern', 'shen'], ['dock', 'dock', 'cheng'],
  ]) {
    const { screen, state } = debugScenarioFromUrl(localUrl(name));
    assert.equal(screen, 'game');
    assert.equal(state.mode, 'explore');
    assert.equal(state.scene, scene);
    assert.equal(nearbyInteraction(state).id, site);
  }
  assert.equal(debugScenarioFromUrl(localUrl('dock')).state.flags.swordConfession, true);
});

test('可直接检查人物对话和流民的最终选择', () => {
  const shen = debugScenarioFromUrl(localUrl('shen-dialogue')).state;
  assert.equal(shen.mode, 'dialogue');
  assert.equal(shen.dialogue.partner, CHARACTERS.shen);
  const ferryman = debugScenarioFromUrl(localUrl('ferryman-dialogue')).state;
  assert.equal(ferryman.dialogue.partner, CHARACTERS.ferryman);
  const refugees = debugScenarioFromUrl(localUrl('refugees-choice')).state;
  assert.equal(refugees.dialogue.kind, 'refugees');
  assert.equal(refugees.dialogue.index, refugees.dialogue.lines.length - 1);
  const boss = debugScenarioFromUrl(localUrl('boss-dialogue')).state;
  assert.equal(boss.dialogue.kind, 'boss');
  assert.equal(boss.dialogue.partner, CHARACTERS.cheng);
});

test('可直接检查两场战斗及胜负结局', () => {
  const bandit = debugScenarioFromUrl(localUrl('bandit-battle')).state;
  assert.equal(bandit.mode, 'battle');
  assert.equal(bandit.battle.kind, 'bandit');
  const boss = debugScenarioFromUrl(localUrl('boss-battle')).state;
  assert.equal(boss.mode, 'battle');
  assert.equal(boss.battle.kind, 'boss');
  assert.equal(boss.hero.level, 2);
  const ending = debugScenarioFromUrl(localUrl('ending')).state;
  assert.equal(ending.mode, 'ending');
  assert.equal(ending.battle, null);
  assert.ok(ending.hero.xp > boss.hero.xp);
  const defeat = debugScenarioFromUrl(localUrl('defeat')).state;
  assert.equal(defeat.mode, 'defeat');
  assert.equal(defeat.scene, 'road');
});
