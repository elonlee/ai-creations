import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../game.mjs';
import * as ui from '../ui-state.mjs';

const { createInitialState, awardExperience } = game;

test('角色状态数据可同时用于探索和战斗界面', () => {
  assert.equal(typeof ui.heroStatus, 'function');
  const hero = awardExperience({ ...createInitialState().hero, hp: 21, qi: 3, herbs: 1 }, 23);
  assert.deepEqual(ui.heroStatus(hero), {
    level: '贰级', hp: '27 / 48', qi: '4 / 7', xp: '23 / 55',
    hpPercent: 56.25, qiPercent: 4 / 7 * 100, xpPercent: 3 / 35 * 100,
    herbs: '金疮药 × 1', grain: '口粮 × 1',
  });
});

test('气血耗尽时状态条归零，不出现负宽度', () => {
  const hero = { ...createInitialState().hero, hp: 0, qi: 0 };
  const status = ui.heroStatus(hero);
  assert.equal(status.hpPercent, 0);
  assert.equal(status.qiPercent, 0);
});

test('对话立绘固定为左侧陆照、右侧朝向陆照的 NPC', () => {
  assert.equal(typeof ui.dialoguePortraits, 'function');
  assert.deepEqual(ui.dialoguePortraits('沈棠'), {
    hero: 'assets/portraits/lu-zhao-v1.png',
    npc: 'assets/portraits/shen-tang-v1-mirrored.png',
  });
  assert.equal(ui.dialoguePortraits('程砚').npc, 'assets/portraits/cheng-yan-v1-mirrored.png');
  assert.equal(ui.dialoguePortraits('老船工').npc, 'assets/portraits/old-ferryman-v1-mirrored.png');
  assert.equal(ui.dialoguePortraits('拦路流民').npc, 'assets/portraits/road-refugee-v1-mirrored.png');
  assert.equal(ui.dialoguePortraits(null).npc, null);
});

test('对话背景跟随当前探索场景', () => {
  assert.equal(typeof ui.dialogueBackdrop, 'function');
  assert.equal(ui.dialogueBackdrop('road'), 'assets/scenes/mountain-road-concept-v1.png');
  assert.equal(ui.dialogueBackdrop('dock'), 'assets/scenes/dock-concept-v1.png');
});

test('普通对话点击文字框继续，流民抉择时只能点击选项', () => {
  assert.deepEqual(ui.dialogueControls({ kind: 'story', index: 0, lines: [{}, {}] }), {
    canAdvance: true, choices: [],
  });
  assert.deepEqual(ui.dialogueControls({ kind: 'boss', index: 1, lines: [{}, {}] }), {
    canAdvance: true, choices: [],
  });
  assert.deepEqual(ui.dialogueControls({ kind: 'refugees', index: 0, lines: [{}, {}] }), {
    canAdvance: true, choices: [],
  });
  assert.deepEqual(ui.dialogueControls({ kind: 'refugees', index: 1, lines: [{}, {}] }), {
    canAdvance: false,
    choices: [['grain', '留下一份口粮'], ['persuade', '答应调查粮车'], ['fight', '拔剑动武']],
  });
});

test('战胜程砚后展示旧案阶段结局，并留下名册疑问', () => {
  const boss = game.startBattle(game.createInitialState(), 'boss');
  const won = game.resolveBattle({ ...boss, battle: { ...boss.battle, enemyHp: 1 } }, 'strike').state;
  const ending = ui.endingPresentation(won);
  assert.equal(ending.scene, game.SCENES.dock.image);
  assert.match(ending.title, /粮船|渡口/);
  assert.ok(ending.paragraphs.length >= 3);
  assert.match(ending.paragraphs.join(' '), /程砚/);
  assert.match(ending.paragraphs.join(' '), /沈渡|供词/);
  assert.match(ending.paragraphs.join(' '), /名册/);
  assert.match(ending.progress, new RegExp(`${won.hero.level}.*${won.hero.xp}`));
});

test('驿道战败时结局画面不误称已到码头', () => {
  const battle = game.startBattle(game.createInitialState(), 'bandit');
  const lost = game.resolveBattle({ ...battle, hero: { ...battle.hero, hp: 1 } }, 'guard').state;
  const ending = ui.endingPresentation(lost);
  assert.equal(ending.scene, game.SCENES.road.image);
  assert.doesNotMatch(ending.paragraphs.join(' '), /程砚收剑|粮船停/);
  assert.match(ending.action, /重试|再来/);
});
