import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const links = [
  './solar-system/', './jiangnan-garden/', './second-room/', './ink-scroll-book/',
  './simulated-days/', './rain-window/', './little-harvest/', './tideline/',
  './minigames/Solitaire.html', './minigames/Galaxian.html', './minigames/Snake.html',
  './minigames/Breakout.html', './minigames/Tetris.html', './minigames/Castlevania.html',
];

test('首页的每个原有作品链接都有可点击的缩略图卡片', () => {
  const cards = [...html.matchAll(/<a\b[^>]*class="work-card[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(cards.length, links.length);
  assert.deepEqual(cards.map(match => match[1]), links);
  for (const [, href, content] of cards) {
    const target = path.resolve(root, href);
    assert.ok(existsSync(target), `${href} 对应的页面不存在`);
    assert.ok(statSync(target).isFile() || existsSync(path.join(target, 'index.html')), `${href} 没有入口页面`);
    assert.match(content, /<(?:img|svg)\b/, `${href} 缺少缩略图`);
    assert.match(content, /<h3\b/, `${href} 缺少可见标题`);
  }
});

test('SVG 缩略图引用的画面都在本地定义', () => {
  const art = readFileSync(path.join(root, 'gallery-art.svg'), 'utf8');
  for (const [, id] of html.matchAll(/href="\.\/gallery-art\.svg#([a-z-]+)"/g)) {
    assert.match(art, new RegExp(`<symbol id="${id}"(?:\\s|>)`));
  }
});
