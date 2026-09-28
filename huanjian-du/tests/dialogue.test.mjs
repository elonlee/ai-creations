import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../game.mjs';

function atSite(state, scene, id) {
  const { x, y } = game.SITES[scene].find((site) => site.id === id);
  return { ...state, scene, position: { x, y } };
}

function readConversation(state) {
  assert.equal(typeof game.currentDialogueLine, 'function');
  const speakers = [];
  const texts = [];
  while (state.mode === 'dialogue') {
    const line = game.currentDialogueLine(state.dialogue);
    speakers.push(line.speaker);
    texts.push(line.text);
    state = game.chooseDialogue(state, 'continue');
  }
  return { state, speakers, texts };
}

test('沈棠与陆照轮流交谈，逐句继续后才结束', () => {
  const opened = game.interact(atSite(game.createInitialState(), 'tavern', 'shen'));
  assert.equal(opened.mode, 'dialogue');
  assert.equal(opened.dialogue.partner, '沈棠');
  const result = readConversation(opened);
  assert.equal(result.state.mode, 'explore');
  assert.ok(result.speakers.length >= 6);
  assert.deepEqual(result.speakers.slice(0, 4), ['陆照', '沈棠', '陆照', '沈棠']);
  assert.match(result.texts.join(' '), /沈渡|赈粮/);
  assert.match(result.texts.join(' '), /名册/);
});

test('老船工对话交代师父与剑柄的线索', () => {
  const ready = { ...game.createInitialState(), flags: { ...game.createInitialState().flags, shenStory: true } };
  const opened = game.interact(atSite(ready, 'ferry', 'ferryman'));
  const result = readConversation(opened);
  assert.equal(result.state.mode, 'explore');
  assert.ok(result.speakers.length >= 5);
  assert.match(result.texts.join(' '), /师父/);
  assert.match(result.texts.join(' '), /剑柄/);
});

test('证据齐全时程砚先对质，最后一句继续才进入决战', () => {
  const ready = { ...game.createInitialState(), flags: { ...game.createInitialState().flags, swordConfession: true } };
  let state = game.interact(atSite(ready, 'dock', 'cheng'));
  assert.equal(state.mode, 'dialogue');
  assert.equal(state.battle, null);
  assert.equal(state.dialogue.partner, '程砚');
  const result = readConversation(state);
  assert.ok(result.speakers.length >= 6);
  assert.match(result.texts.join(' '), /供词/);
  assert.match(result.texts.join(' '), /粮船/);
  assert.equal(result.state.mode, 'battle');
  assert.equal(result.state.battle.kind, 'boss');
  assert.match(result.state.message, /对质已尽/);
});

test('流民先交谈，最后一轮才允许交粮、劝说或动武', () => {
  const start = { ...game.createInitialState(), encounterCooldown: 0 };
  const event = game.move(start, 'right', (i => () => [0, 0.95][i++])());
  assert.equal(event.dialogue.kind, 'refugees');
  assert.equal(game.chooseDialogue(event, 'grain'), event);
  let state = event;
  while (state.dialogue.index < state.dialogue.lines.length - 1) state = game.chooseDialogue(state, 'continue');
  assert.equal(state.mode, 'dialogue');
  assert.equal(game.currentDialogueLine(state.dialogue).speaker, '拦路流民');
  assert.equal(game.chooseDialogue(state, 'continue'), state);
  assert.equal(game.chooseDialogue(state, 'grain').hero.grain, 0);
  assert.equal(game.chooseDialogue(state, 'persuade').mode, 'explore');
  assert.equal(game.chooseDialogue(state, 'fight').battle.kind, 'bandit');
});
