export const albums = [
  { id: 'open', title: '开放录音选集', artist: '不同创作者', year: '2024', mood: '钢琴 · 古典', art: 'art-amber', description: '两段可以真实试听的开放录音，与一首仅供界面展示的虚构曲目。' },
  { id: 'coast', title: '海风书签', artist: 'Mira K', year: '2026', mood: '氛围 · 海边', art: 'art-ocean', description: '关于海岸、傍晚和远处灯塔的三首虚构歌曲。' },
  { id: 'city', title: '城市慢行', artist: '北街电台', year: '2026', mood: '电子 · 夜色', art: 'art-neon', description: '把夜晚的车窗与霓虹写进一张虚构专辑。' },
  { id: 'forest', title: '写给山间的信', artist: '阿澈', year: '2025', mood: '轻音乐 · 自然', art: 'art-forest', description: '树影、晨雾与周末散步构成的虚构歌单。' },
];

export const songs = [
  { id: 'waltz', title: '降 E 大调圆舞曲 B.46', artist: 'Frédéric Chopin', albumId: 'open', duration: 144, audio: './assets/chopin-waltz.mp3', note: '真实录音 · CC0' },
  { id: 'shumi', title: 'Shumi Maritsa · 钢琴演奏', artist: 'Parchokhalq', albumId: 'open', duration: 48, audio: './assets/shumi-marista-piano.mp3', note: '真实录音 · CC0' },
  { id: 'paper-stars', title: '纸上的星图', artist: '开放录音选集', albumId: 'open', duration: 206, audio: null, note: '示例信息' },
  { id: 'shoreline', title: '潮线以北', artist: 'Mira K', albumId: 'coast', duration: 218, audio: null, note: '示例信息' },
  { id: 'blue-hour', title: '蓝色时刻', artist: 'Mira K', albumId: 'coast', duration: 191, audio: null, note: '示例信息' },
  { id: 'lighthouse', title: '灯塔来信', artist: 'Mira K', albumId: 'coast', duration: 234, audio: null, note: '示例信息' },
  { id: 'last-train', title: '末班车', artist: '北街电台', albumId: 'city', duration: 204, audio: null, note: '示例信息' },
  { id: 'neon-rain', title: '霓虹小雨', artist: '北街电台', albumId: 'city', duration: 176, audio: null, note: '示例信息' },
  { id: 'window-seat', title: '靠窗的位置', artist: '北街电台', albumId: 'city', duration: 226, audio: null, note: '示例信息' },
  { id: 'morning-fog', title: '晨雾来时', artist: '阿澈', albumId: 'forest', duration: 212, audio: null, note: '示例信息' },
  { id: 'pine', title: '松针与风', artist: '阿澈', albumId: 'forest', duration: 187, audio: null, note: '示例信息' },
  { id: 'home-path', title: '回家的小路', artist: '阿澈', albumId: 'forest', duration: 241, audio: null, note: '示例信息' },
];

const albumById = new Map(albums.map(album => [album.id, album]));

export function albumFor(song) {
  return albumById.get(song.albumId);
}

export function songsForAlbum(albumId) {
  return songs.filter(song => song.albumId === albumId);
}

export function filterSongs(query, { albumId = null, artist = null, favorites = null } = {}) {
  const term = query.trim().toLocaleLowerCase();
  return songs.filter(song => {
    if (albumId && song.albumId !== albumId) return false;
    if (artist && song.artist !== artist) return false;
    if (favorites && !favorites.has(song.id)) return false;
    return !term || [song.title, song.artist, albumFor(song)?.title].some(value => value?.toLocaleLowerCase().includes(term));
  });
}

export function filterAlbums(query) {
  const term = query.trim().toLocaleLowerCase();
  return albums.filter(album => !term || [album.title, album.artist, album.mood].some(value => value.toLocaleLowerCase().includes(term)));
}

export function artistSummaries() {
  return [...new Set(songs.map(song => song.artist))].map(name => ({
    name,
    count: songs.filter(song => song.artist === name).length,
    albumId: songs.find(song => song.artist === name).albumId,
  }));
}

export function nextPlayableId(currentId, direction = 1) {
  const playable = songs.filter(song => song.audio);
  if (!playable.length) return null;
  const index = playable.findIndex(song => song.id === currentId);
  if (index < 0) return playable[direction < 0 ? playable.length - 1 : 0].id;
  return playable[(index + direction + playable.length) % playable.length].id;
}

export function playbackState(songId, currentId, paused) {
  if (!currentId || songId !== currentId) return 'idle';
  return paused ? 'paused' : 'playing';
}

export const effectModes = ['流体粒子', '螺旋星系', '几何脉冲', '波动网格'];

export function nextEffectIndex(index) {
  return index >= -1 && index < effectModes.length - 1 ? index + 1 : -1;
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
