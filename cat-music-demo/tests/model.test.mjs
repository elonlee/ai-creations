import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { albums, songs, filterAlbums, filterSongs, nextPlayableId, formatTime, effectModes, nextEffectIndex, playbackState } from '../model.mjs';

test('所有示例歌曲归属有效专辑，真实录音文件存在', () => {
  const albumIds = new Set(albums.map(album => album.id));
  assert.equal(albumIds.size, albums.length);
  assert.equal(new Set(songs.map(song => song.id)).size, songs.length);
  for (const song of songs) {
    assert.ok(albumIds.has(song.albumId), `${song.id} 找不到专辑`);
    if (song.audio) assert.ok(existsSync(fileURLToPath(new URL(`../${song.audio}`, import.meta.url))), `${song.id} 缺少音频`);
  }
  assert.ok(songs.filter(song => song.audio).length >= 1);
  assert.ok(songs.filter(song => !song.audio).length >= 1);
});

test('搜索同时匹配歌曲、艺人和专辑', () => {
  assert.ok(filterSongs('圆舞曲').some(song => song.id === 'waltz'));
  assert.ok(filterSongs('开放录音').some(song => song.id === 'waltz'));
  assert.ok(filterAlbums('海风').some(album => album.id === 'coast'));
});

test('上一首和下一首只在可试听曲目之间循环', () => {
  assert.equal(nextPlayableId('waltz', 1), 'shumi');
  assert.equal(nextPlayableId('shumi', 1), 'waltz');
  assert.equal(nextPlayableId('waltz', -1), 'shumi');
});

test('时长格式不会把无效值写进界面', () => {
  assert.equal(formatTime(143), '2:23');
  assert.equal(formatTime(NaN), '0:00');
});

test('播放特效按四种模式和关闭状态循环', () => {
  assert.deepEqual(effectModes, ['流体粒子', '螺旋星系', '几何脉冲', '波动网格']);
  assert.deepEqual([0, 1, 2, 3, -1].map(nextEffectIndex), [1, 2, 3, -1, 0]);
});

test('播放列表区分当前歌曲的播放、暂停和其他歌曲', () => {
  assert.equal(playbackState('waltz', 'waltz', false), 'playing');
  assert.equal(playbackState('waltz', 'waltz', true), 'paused');
  assert.equal(playbackState('shumi', 'waltz', false), 'idle');
});
