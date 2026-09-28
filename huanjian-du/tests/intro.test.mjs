import test from 'node:test';
import assert from 'node:assert/strict';
import * as intro from '../intro.mjs';
import { CHARACTERS } from '../identity.mjs';

test('开场字幕先交代乌篷渡旧案，再把主角带到山路', () => {
  assert.ok(Array.isArray(intro.INTRO_LINES));
  assert.ok(intro.INTRO_LINES.length >= 4);
  assert.match(intro.INTRO_LINES[0], /乌篷渡/);
  assert.ok(intro.INTRO_LINES.some((line) => line.includes(CHARACTERS.hero)));
  assert.match(intro.INTRO_LINES.at(-1), /山路|驿道/);
  assert.ok(intro.INTRO_LINES.every((line) => line.length <= 45));
});

test('字幕逐条推进，最后一条结束后进入游戏', () => {
  assert.equal(intro.nextIntroIndex(0), 1);
  assert.equal(intro.nextIntroIndex(intro.INTRO_LINES.length - 1), null);
});
