import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(new URL('../index.html', import.meta.url));

test('六段叙事都有可直达的卷目', () => {
  const html = readFileSync(pagePath, 'utf8');
  const ids = ['opening', 'rain', 'bridge', 'mountain', 'return', 'colophon'];
  for (const id of ids) {
    assert.match(html, new RegExp(`<section[^>]+id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
  assert.equal((html.match(/<section class="chapter\b/g) ?? []).length, 6);
});

test('重装版包含夜读、竖排、赏画与自题钤印留笺交互控件', () => {
  const html = readFileSync(pagePath, 'utf8');
  assert.match(html, /id="ink-stage"/);
  assert.match(html, /data-toggle-night/);
  assert.match(html, /data-toggle-layout/);
  assert.match(html, /data-toggle-panorama/);
  assert.match(html, /id="panorama-minimap"/);
  assert.match(html, /data-stamp-seal/);
  assert.match(html, /data-export-keepsake/);
  assert.match(html, /data-seal-input/);
  assert.match(html, /href="\.\.\/ink-scroll-book\/"/);
});

test('阅读进度在卷首和卷尾之间归一化', async () => {
  const { scrollProgress } = await import('../reader.mjs');
  assert.equal(scrollProgress(0, 600, 3000), 0);
  assert.equal(scrollProgress(1200, 600, 3000), 0.5);
  assert.equal(scrollProgress(4000, 600, 3000), 1);
});

test('当前卷目由视口中线所在的章节确定', async () => {
  const { chapterAtScroll } = await import('../reader.mjs');
  const starts = [0, 900, 1800, 2700, 3600, 4500];
  assert.equal(chapterAtScroll(starts, 0, 900), 0);
  assert.equal(chapterAtScroll(starts, 1000, 900), 1);
  assert.equal(chapterAtScroll(starts, 4000, 900), 4);
  assert.equal(chapterAtScroll(starts, 9999, 900), 5);
});
