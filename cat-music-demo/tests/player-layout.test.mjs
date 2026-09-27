import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as visualizer from '../visualizer.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('顶部播放器依次显示品牌、播放控制、曲目信息与工具按钮', () => {
  const topbar = html.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1];
  assert.ok(topbar);
  const order = ['class="brand"', 'class="player-controls"', 'class="now-playing"', 'class="topbar-right"'];
  const positions = order.map(marker => topbar.indexOf(marker));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  const nowPlaying = topbar.slice(positions[2], positions[3]);
  for (const marker of ['id="now-art"', 'id="now-title"', 'id="mini-spectrum"', 'id="now-artist"', 'id="now-album"', 'id="seek"']) {
    assert.ok(nowPlaying.includes(marker), `${marker} 应位于曲目信息组内`);
  }
});

test('窄版小频谱保持至少两像素的柱宽', () => {
  assert.equal(typeof visualizer.spectrumBarLayout, 'function');
  const layout = visualizer.spectrumBarLayout(100);
  assert.ok(layout.barCount > 8 && layout.barCount < 44);
  assert.ok(layout.barWidth >= 2);
});
