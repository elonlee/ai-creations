import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');

test('录音仅在读者主动点击后播放，提供切换与状态提示', () => {
  assert.match(html, /<audio[^>]+data-music-audio[^>]+preload="none"/);
  assert.match(html, /<button[^>]+data-music-toggle[^>]+aria-pressed="false"/);
  assert.match(html, /<button[^>]+data-music-next/);
  assert.match(html, /data-music-status[^>]+role="status"/);
  assert.doesNotMatch(html, /autoplay/i);
});

test('两段古琴录音均有本地文件、原始来源和授权说明', async () => {
  const { TRACKS } = await import('../music.mjs');
  assert.equal(TRACKS.length, 2);
  for (const track of TRACKS) {
    assert.ok(track.title);
    assert.match(track.src, /^\.\/assets\/audio\/.+\.mp3$/);
    assert.ok(statSync(fileURLToPath(new URL(`../${track.src.slice(2)}`, import.meta.url))).size > 1_000_000);
    assert.ok(html.includes(track.source));
  }
  assert.match(html, /creativecommons\.org\/licenses\/by-sa\/3\.0/);
});
