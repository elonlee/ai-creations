import test from 'node:test';
import assert from 'node:assert/strict';
import { cards, visibleCards, nextIndex, swipeDirection } from '../cards.mjs';
import { illustrationFor } from '../illustrations.mjs';

test('36 张闪卡各有唯一英文名、中英文词条和原创插画', () => {
  assert.equal(cards.length, 36);
  assert.equal(new Set(cards.map(card => card.id)).size, 36);
  assert.equal(new Set(cards.map(card => card.word)).size, 36);
  assert.equal(cards.filter(card => card.category === 'fruit').length, 18);
  assert.equal(cards.filter(card => card.category === 'vegetable').length, 18);
  for (const card of cards) {
    assert.ok(card.word && card.zh && card.color);
    assert.match(illustrationFor(card.id), /<svg[\s\S]*<\/svg>/);
  }
});

test('类别筛选保留原始顺序，越界导航停在首尾', () => {
  assert.deepEqual(visibleCards('fruit'), cards.filter(card => card.category === 'fruit'));
  assert.deepEqual(visibleCards('vegetable'), cards.filter(card => card.category === 'vegetable'));
  assert.equal(visibleCards('all').length, 36);
  assert.equal(nextIndex(0, -1, 36), 0);
  assert.equal(nextIndex(35, 1, 36), 35);
  assert.equal(nextIndex(3, 1, 36), 4);
});

test('触控滑动需要足够的水平距离且大于垂直移动', () => {
  assert.equal(swipeDirection(120, 10), 1);
  assert.equal(swipeDirection(-120, 10), -1);
  assert.equal(swipeDirection(25, 5), 0);
  assert.equal(swipeDirection(90, 110), 0);
});
