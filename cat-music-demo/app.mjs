import { albums, songs, albumFor, songsForAlbum, filterAlbums, filterSongs, artistSummaries, nextPlayableId, effectModes, nextEffectIndex, formatTime } from './model.mjs';

const $ = selector => document.querySelector(selector);
const audio = $('#audio');
const content = $('#content');
const drawerRoot = $('#drawer-root');
const coverRoot = $('#cover-root');
const queueRoot = $('#queue-root');
const appShell = $('.app-shell');
const playableSongs = songs.filter(song => song.audio);

function readSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 私密浏览模式下仍可使用页面 */ }
}

const state = {
  view: 'albums',
  query: '',
  artist: null,
  drawerId: null,
  drawerOpener: null,
  coverAlbumId: null,
  coverOpener: null,
  coverFollowPlayer: false,
  effectIndex: 0,
  queueOpen: false,
  currentId: playableSongs[0].id,
  favorites: new Set(readSaved('cat-music-demo-favorites', [])),
  dark: Boolean(readSaved('cat-music-demo-dark', false)),
};

const icon = name => `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const albumArt = (album, className = 'album-art') => `<span class="art ${className} ${album.art}" aria-hidden="true"></span>`;
let toastTimer;

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3600);
}

function trackRow(song, index) {
  const album = albumFor(song);
  const liked = state.favorites.has(song.id);
  const button = song.audio
    ? `<button class="row-play" type="button" data-play-id="${song.id}" aria-label="播放 ${safe(song.title)}">${icon('play')}</button>`
    : `<span class="mock-tag" title="这首歌曲只有示例信息，没有音频文件">仅展示</span>`;
  return `<div class="track-row" data-song-id="${song.id}">
    <span class="track-index">${String(index + 1).padStart(2, '0')}</span>
    <div class="track-name">${albumArt(album, 'small-art')}<div><strong>${safe(song.title)}</strong><small class="${song.audio ? 'real-tag' : ''}">${safe(song.note)}</small></div></div>
    <span class="track-secondary track-album">${safe(album.title)}</span>
    <span class="track-secondary track-artist">${safe(song.artist)}</span>
    <span class="track-duration">${formatTime(song.duration)}</span>
    <div class="track-actions"><button type="button" data-favorite-id="${song.id}" data-liked="${liked}" aria-label="${liked ? '取消喜欢' : '喜欢'} ${safe(song.title)}">${icon('heart')}</button>${button}</div>
  </div>`;
}

function trackList(items) {
  if (!items.length) return '<div class="empty-state">这里暂时没有匹配的歌曲。试试其他关键词，或切换分类。</div>';
  return `<div class="track-list"><div class="track-header"><span>#</span><span>曲名</span><span class="track-album">专辑</span><span class="track-artist">艺人</span><span>时长</span><span>操作</span></div>${items.map(trackRow).join('')}</div>`;
}

function albumCard(album) {
  const count = songsForAlbum(album.id).length;
  return `<button class="album-card" type="button" data-open-album="${album.id}" aria-label="打开专辑 ${safe(album.title)}">
    ${albumArt(album)}<strong>${safe(album.title)}</strong><span class="album-artist">${safe(album.artist)}</span><span class="album-meta">${count} 首歌曲 · ${safe(album.year)}</span>
  </button>`;
}

function renderAlbums() {
  const visible = filterAlbums(state.query);
  const featured = albums[0];
  const feature = state.query ? '' : `<section class="feature" aria-label="推荐专辑"><div class="feature-copy"><span class="feature-label">FEATURED / OPEN AUDIO</span><h2>${safe(featured.title)}</h2><p>在示例音乐库里试听两段真实录音，看看熟悉的播放器界面如何在静态页面中运作。</p><div class="feature-actions"><button class="solid-action" type="button" data-play-id="waltz">${icon('play')}立即试听</button><button class="ghost-action" type="button" data-open-album="open">查看专辑 ${icon('arrow')}</button></div></div>${albumArt(featured, 'feature-art')}</section>`;
  return `${feature}<div class="section-title"><h2>${state.query ? '搜索结果' : '专辑一览'}</h2><span>${visible.length} 张专辑</span></div>${visible.length ? `<div class="album-grid">${visible.map(albumCard).join('')}</div>` : '<div class="empty-state">没有找到匹配的专辑。</div>'}`;
}

function renderSongs() {
  const visible = filterSongs(state.query, { artist: state.artist });
  const chip = state.artist ? `<button class="filter-chip" type="button" data-clear-artist>${safe(state.artist)} ${icon('x')}</button>` : '';
  return `${chip}<div class="section-title"><h2>${state.artist ? '艺人曲目' : '所有歌曲'}</h2><span>${visible.length} 首 · ${playableSongs.length} 首可试听</span></div>${trackList(visible)}`;
}

function renderFavorites() {
  const visible = filterSongs(state.query, { favorites: state.favorites });
  return `<div class="section-title"><h2>我喜欢的</h2><span>${visible.length} 首歌曲</span></div>${visible.length ? trackList(visible) : '<div class="empty-state">点歌曲旁边的心形按钮，就能把它收进这里。喜欢列表只保存在当前浏览器。</div>'}`;
}

function renderArtists() {
  const term = state.query.toLocaleLowerCase();
  const visible = artistSummaries().filter(artist => artist.name.toLocaleLowerCase().includes(term));
  return `<div class="section-title"><h2>艺人一览</h2><span>${visible.length} 位艺人</span></div>${visible.length ? `<div class="artist-grid">${visible.map(artist => {
    const album = albums.find(item => item.id === artist.albumId);
    return `<button class="artist-card" type="button" data-artist="${safe(artist.name)}"><span class="artist-avatar art ${album.art}" aria-hidden="true">${safe(artist.name.slice(0, 1))}</span><span><strong>${safe(artist.name)}</strong><small>${artist.count} 首歌曲 · 查看曲目</small></span></button>`;
  }).join('')}</div>` : '<div class="empty-state">没有找到匹配的艺人。</div>'}`;
}

const viewCopy = {
  albums: ['CURATED FOR LISTENING', '听见此刻', '从一张唱片开始，慢慢找到今天的声音。这里有示例资料，也有两段开放授权的真实录音。'],
  songs: ['YOUR MUSIC LIBRARY', '所有歌曲', '浏览示例曲目。标注“真实录音 · CC0”的歌曲可以直接试听。'],
  artists: ['MEET THE ARTISTS', '认识声音', '从艺人进入歌曲列表。部分艺人与曲目是为了展示界面而虚构的。'],
  favorites: ['YOUR LITTLE COLLECTION', '我喜欢的', '把想记住的曲目收在这里。收藏记录只留在当前浏览器。'],
};

function renderContent() {
  const [eyebrow, title, description] = viewCopy[state.view];
  const headingMeta = {
    albums: [albums.length, 'ALBUMS', 'IN YOUR LIBRARY'],
    songs: [songs.length, 'SONGS', 'IN YOUR LIBRARY'],
    artists: [artistSummaries().length, 'ARTISTS', 'TO EXPLORE'],
    favorites: [state.favorites.size, 'SAVED', 'FOR LATER'],
  }[state.view];
  $('#view-eyebrow').textContent = eyebrow;
  $('#view-title').innerHTML = `${safe(title)}<span>.</span>`;
  $('#view-description').textContent = description;
  $('#heading-count').textContent = String(headingMeta[0]).padStart(2, '0');
  $('#heading-label').innerHTML = `${headingMeta[1]}<br>${headingMeta[2]}`;
  $('#song-count').textContent = songs.length;
  $('#album-count').textContent = albums.length;
  $('#favorite-count').textContent = state.favorites.size;
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  content.innerHTML = ({ albums: renderAlbums, songs: renderSongs, artists: renderArtists, favorites: renderFavorites })[state.view]();
  updatePlaybackButtons();
}

function openDrawer(albumId, opener) {
  const album = albums.find(item => item.id === albumId);
  if (!album) return;
  closeQueue();
  state.drawerId = albumId;
  state.drawerOpener = opener;
  const items = songsForAlbum(albumId);
  drawerRoot.innerHTML = `<div class="overlay"><button class="overlay-backdrop" type="button" data-close-drawer aria-label="关闭专辑详情"></button><section class="drawer-panel" role="dialog" aria-modal="true" aria-label="专辑详情：${safe(album.title)}"><button class="drawer-close" type="button" data-close-drawer>${icon('x')}返回专辑列表</button><div class="drawer-hero"><button class="drawer-cover-button" type="button" data-open-cover="${album.id}" aria-label="查看 ${safe(album.title)} 专辑大图">${albumArt(album, 'drawer-art')}<span>查看专辑大图 ${icon('arrow')}</span></button><div><p>ALBUM / ${safe(album.year)}</p><h2>${safe(album.title)}</h2><span class="drawer-artist">${safe(album.artist)}</span><span class="drawer-description">${safe(album.description)}</span><span class="drawer-count">${items.length} 首歌曲 · ${safe(album.mood)}</span></div></div><div class="section-title"><h2>专辑曲目</h2><span>${items.filter(item => item.audio).length} 首可试听</span></div>${trackList(items)}</section></div>`;
  appShell.inert = true;
  drawerRoot.querySelector('.drawer-close').focus();
  updatePlaybackButtons();
}

function closeDrawer() {
  if (!state.drawerId) return;
  const opener = state.drawerOpener;
  const albumId = state.drawerId;
  state.drawerId = null;
  state.drawerOpener = null;
  drawerRoot.replaceChildren();
  appShell.inert = false;
  if (opener?.isConnected) opener.focus();
  else document.querySelector(`[data-open-album="${albumId}"]`)?.focus();
}

function effectMarkup(index) {
  if (index === -1) return '<span class="effect-off">动画已关闭</span>';
  if (index === 0) return Array.from({ length: 24 }, (_, i) => `<span class="effect-particle" style="--x:${(i * 37 + 11) % 100}%;--y:${(i * 29 + 17) % 84 + 8}%;--delay:${(i % 7) * -.24}s;--size:${i % 3 + 3}px"></span>`).join('');
  if (index === 1) return '<span class="effect-galaxy-core"></span>' + Array.from({ length: 4 }, (_, i) => `<span class="effect-orbit" style="--width:${42 + i * 42}px;--height:${19 + i * 11}px;--angle:${i * 34}deg;--speed:${4 + i}s"></span>`).join('');
  if (index === 2) return Array.from({ length: 5 }, (_, i) => `<span class="effect-pulse" style="--size:${23 + i * 25}px;--opacity:${1 - i * .16};--speed:${1.9 + i * .3}s"></span>`).join('');
  return Array.from({ length: 35 }, (_, i) => `<span class="effect-bar" style="--h:${20 + ((i * 41 + i * i * 7) % 70)}%;--delay:${(i % 9) * -.12}s"></span>`).join('');
}

function updateEffect() {
  const stage = coverRoot.querySelector('#cover-effect');
  if (!stage) return;
  stage.className = `cover-effect effect-mode-${state.effectIndex}`;
  stage.innerHTML = effectMarkup(state.effectIndex);
  const button = coverRoot.querySelector('#effect-toggle');
  const label = state.effectIndex === -1 ? '开启动画' : `切换动画：${effectModes[state.effectIndex]}`;
  button.setAttribute('aria-label', label);
  button.title = label;
  coverRoot.querySelector('#effect-name').textContent = state.effectIndex === -1 ? '动画已关闭' : effectModes[state.effectIndex];
}

function updateCover() {
  const panel = coverRoot.querySelector('.cover-modal');
  if (!panel) return;
  const currentSong = songs.find(item => item.id === state.currentId);
  const album = state.coverFollowPlayer ? albumFor(currentSong) : albums.find(item => item.id === state.coverAlbumId);
  const song = state.coverFollowPlayer ? currentSong : songsForAlbum(album.id).find(item => item.audio);
  const playing = Boolean(song?.id === state.currentId && !audio.paused);
  panel.classList.toggle('is-playing', playing);
  coverRoot.querySelector('#cover-art').className = `cover-art art ${album.art}`;
  coverRoot.querySelector('#cover-eyebrow').textContent = song ? `NOW PLAYING / ${album.title}` : `ALBUM / ${album.year}`;
  coverRoot.querySelector('#cover-title').textContent = song?.title ?? album.title;
  coverRoot.querySelector('#cover-artist').textContent = song?.artist ?? album.artist;
  coverRoot.querySelector('#cover-playback').hidden = !song;
  coverRoot.querySelector('#cover-unavailable').hidden = Boolean(song);
  const button = coverRoot.querySelector('#cover-play-toggle');
  button.innerHTML = icon(playing ? 'pause' : 'play');
  button.setAttribute('aria-label', playing ? '暂停' : '播放');
  coverRoot.querySelector('#cover-volume').value = String(Math.round(audio.volume * 100));
  updateProgress();
}

function openCover(albumId, opener) {
  const album = albumId === 'current' ? albumFor(songs.find(item => item.id === state.currentId)) : albums.find(item => item.id === albumId);
  if (!album) return;
  closeQueue();
  state.coverAlbumId = album.id;
  state.coverOpener = opener;
  state.coverFollowPlayer = albumId === 'current' || songsForAlbum(album.id).some(song => song.audio);
  coverRoot.innerHTML = `<div class="cover-overlay"><button class="cover-backdrop" type="button" data-close-cover aria-label="关闭专辑大图"></button><section class="cover-modal" role="dialog" aria-modal="true" aria-labelledby="cover-title"><button class="cover-close" type="button" data-close-cover aria-label="关闭专辑大图">${icon('x')}</button><div class="cover-frame"><span class="cover-art art" id="cover-art" aria-hidden="true"></span></div><p class="cover-eyebrow" id="cover-eyebrow"></p><h2 id="cover-title"></h2><p class="cover-artist" id="cover-artist"></p><div class="cover-playback" id="cover-playback"><div class="effect-heading"><span>播放特效</span><span id="effect-name"></span></div><div class="cover-effect" id="cover-effect" aria-hidden="true"></div><div class="cover-timeline"><input id="cover-seek" type="range" min="0" max="1000" value="0" aria-label="大图播放器播放进度"><div><span id="cover-elapsed">0:00</span><span id="cover-duration">0:00</span></div></div><div class="cover-controls"><button type="button" data-cover-prev aria-label="上一首可试听曲目">${icon('prev')}</button><button class="cover-play-button" id="cover-play-toggle" type="button" data-cover-play aria-label="播放">${icon('play')}</button><button type="button" data-cover-next aria-label="下一首可试听曲目">${icon('next')}</button><button class="effect-toggle" id="effect-toggle" type="button" data-effect-next aria-label="切换动画">${icon('waves')}</button></div><label class="cover-volume">${icon('volume')}<input id="cover-volume" type="range" min="0" max="100" value="75" aria-label="大图播放器音量"></label></div><p class="cover-unavailable" id="cover-unavailable" hidden>这张专辑只有示例信息，暂无可试听录音。</p></section></div>`;
  appShell.inert = true;
  drawerRoot.inert = true;
  document.body.classList.add('cover-open');
  updateEffect();
  updateCover();
  coverRoot.querySelector('.cover-close').focus();
}

function closeCover() {
  if (!state.coverAlbumId) return;
  const opener = state.coverOpener;
  state.coverAlbumId = null;
  state.coverOpener = null;
  state.coverFollowPlayer = false;
  coverRoot.replaceChildren();
  drawerRoot.inert = false;
  appShell.inert = Boolean(state.drawerId);
  document.body.classList.remove('cover-open');
  if (opener?.isConnected) opener.focus();
}

function openQueue() {
  state.queueOpen = true;
  $('#queue-toggle').setAttribute('aria-expanded', 'true');
  $('#queue-toggle').setAttribute('aria-label', '关闭试听队列');
  queueRoot.innerHTML = `<section class="queue-panel" role="region" aria-label="试听队列"><div class="queue-heading"><strong>试听队列</strong><button class="queue-close" type="button" data-close-queue aria-label="关闭试听队列">${icon('x')}</button></div><p>仅列出已获开放授权、随页面打包的真实录音。</p>${playableSongs.map(song => `<button class="queue-item ${song.id === state.currentId ? 'is-current' : ''}" type="button" data-play-id="${song.id}">${albumArt(albumFor(song), 'small-art')}<span><strong>${safe(song.title)}</strong><small>${safe(song.artist)} · ${formatTime(song.duration)}</small></span></button>`).join('')}</section>`;
}

function closeQueue() {
  state.queueOpen = false;
  queueRoot.replaceChildren();
  $('#queue-toggle').setAttribute('aria-expanded', 'false');
  $('#queue-toggle').setAttribute('aria-label', '打开试听队列');
}

function updatePlaybackButtons() {
  document.querySelectorAll('[data-song-id]').forEach(row => row.classList.toggle('is-current', row.dataset.songId === state.currentId));
  document.querySelectorAll('[data-play-id]').forEach(button => {
    const song = songs.find(item => item.id === button.dataset.playId);
    const playing = song.id === state.currentId && !audio.paused;
    button.innerHTML = icon(playing ? 'pause' : 'play') + (button.classList.contains('solid-action') ? '立即试听' : '');
    button.setAttribute('aria-label', `${playing ? '暂停' : '播放'} ${song.title}`);
  });
}

function updatePlayer() {
  const song = songs.find(item => item.id === state.currentId);
  const album = albumFor(song);
  $('#now-title').textContent = song.title;
  $('#now-artist').textContent = song.artist;
  $('#now-art').className = `now-art art ${album.art}`;
  const playing = !audio.paused;
  $('#play-toggle').dataset.playing = String(playing);
  $('#play-toggle').setAttribute('aria-label', playing ? '暂停' : '播放');
  $('#play-toggle').innerHTML = icon(playing ? 'pause' : 'play');
  updateProgress();
  updatePlaybackButtons();
  queueRoot.querySelectorAll('.queue-item').forEach(button => button.classList.toggle('is-current', button.dataset.playId === state.currentId));
  updateCover();
}

function updateProgress() {
  const song = songs.find(item => item.id === state.currentId);
  $('#elapsed').textContent = formatTime(audio.currentTime);
  $('#duration').textContent = formatTime(Number.isFinite(audio.duration) ? audio.duration : song.duration);
  $('#seek').value = Number.isFinite(audio.duration) && audio.duration > 0 ? String(Math.round(audio.currentTime / audio.duration * 1000)) : '0';
  const coverSeek = coverRoot.querySelector('#cover-seek');
  if (coverSeek) {
    coverRoot.querySelector('#cover-elapsed').textContent = $('#elapsed').textContent;
    coverRoot.querySelector('#cover-duration').textContent = $('#duration').textContent;
    coverSeek.value = $('#seek').value;
  }
}

async function playSong(songId) {
  const song = songs.find(item => item.id === songId);
  if (!song?.audio) { showToast('这首歌曲是示例信息，暂时没有可播放的音频。'); return; }
  if (state.currentId === songId && !audio.paused) { audio.pause(); return; }
  if (state.currentId !== songId || !audio.src) {
    state.currentId = songId;
    audio.src = song.audio;
    audio.load();
  }
  updatePlayer();
  try { await audio.play(); } catch { showToast('浏览器未能开始播放，请再次点击播放按钮。'); }
}

function toggleFavorite(songId) {
  if (state.favorites.has(songId)) state.favorites.delete(songId);
  else state.favorites.add(songId);
  save('cat-music-demo-favorites', [...state.favorites]);
  $('#favorite-count').textContent = state.favorites.size;
  document.querySelectorAll(`[data-favorite-id="${songId}"]`).forEach(button => {
    const liked = state.favorites.has(songId);
    button.dataset.liked = String(liked);
    button.setAttribute('aria-label', `${liked ? '取消喜欢' : '喜欢'} ${songs.find(song => song.id === songId).title}`);
  });
  if (state.view === 'favorites') renderContent();
}

document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.closeCover !== undefined) { closeCover(); return; }
  if (target.dataset.openCover !== undefined) { openCover(target.dataset.openCover, target); return; }
  if (target.dataset.coverPlay !== undefined) { void playSong(state.currentId); return; }
  if (target.dataset.coverPrev !== undefined) { void playSong(nextPlayableId(state.currentId, -1)); return; }
  if (target.dataset.coverNext !== undefined) { void playSong(nextPlayableId(state.currentId, 1)); return; }
  if (target.dataset.effectNext !== undefined) { state.effectIndex = nextEffectIndex(state.effectIndex); updateEffect(); return; }
  if (target.dataset.closeDrawer !== undefined) { closeDrawer(); return; }
  if (target.dataset.closeQueue !== undefined) { closeQueue(); return; }
  if (target.dataset.openAlbum) { openDrawer(target.dataset.openAlbum, target); return; }
  if (target.dataset.playId) { void playSong(target.dataset.playId); return; }
  if (target.dataset.favoriteId) { toggleFavorite(target.dataset.favoriteId); return; }
  if (target.dataset.view) {
    closeDrawer();
    state.view = target.dataset.view;
    state.artist = null;
    renderContent();
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  if (target.dataset.artist) {
    state.view = 'songs';
    state.artist = target.dataset.artist;
    renderContent();
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  if (target.dataset.clearArtist !== undefined) { state.artist = null; renderContent(); }
});

$('#search').addEventListener('input', event => { state.query = event.target.value; renderContent(); });
$('#play-toggle').addEventListener('click', () => { void playSong(state.currentId); });
$('#previous').addEventListener('click', () => { void playSong(nextPlayableId(state.currentId, -1)); });
$('#next').addEventListener('click', () => { void playSong(nextPlayableId(state.currentId, 1)); });
$('#seek').addEventListener('input', event => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(event.target.value) / 1000 * audio.duration;
});
$('#volume').addEventListener('input', event => { audio.volume = Number(event.target.value) / 100; });
coverRoot.addEventListener('input', event => {
  if (event.target.id === 'cover-seek' && Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(event.target.value) / 1000 * audio.duration;
  if (event.target.id === 'cover-volume') {
    audio.volume = Number(event.target.value) / 100;
    $('#volume').value = event.target.value;
  }
});
$('#queue-toggle').addEventListener('click', () => state.queueOpen ? closeQueue() : openQueue());
$('#theme-toggle').addEventListener('click', () => {
  state.dark = !state.dark;
  document.body.dataset.theme = state.dark ? 'dark' : 'light';
  $('#theme-toggle').innerHTML = icon(state.dark ? 'sun' : 'moon');
  $('#theme-toggle').setAttribute('aria-label', state.dark ? '切换浅色模式' : '切换深色模式');
  save('cat-music-demo-dark', state.dark);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (state.coverAlbumId) closeCover();
    else if (state.drawerId) closeDrawer();
    else if (state.queueOpen) closeQueue();
    return;
  }
  if (event.key !== 'Tab' || (!state.drawerId && !state.coverAlbumId)) return;
  const panel = state.coverAlbumId ? coverRoot.querySelector('.cover-modal') : drawerRoot.querySelector('.drawer-panel');
  const focusable = [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

audio.addEventListener('loadedmetadata', updatePlayer);
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('play', updatePlayer);
audio.addEventListener('pause', updatePlayer);
audio.addEventListener('ended', () => { void playSong(nextPlayableId(state.currentId, 1)); });
audio.addEventListener('error', () => showToast('音频加载失败，请检查本地文件是否完整。'));

audio.volume = .75;
audio.src = playableSongs[0].audio;
document.body.dataset.theme = state.dark ? 'dark' : 'light';
$('#theme-toggle').innerHTML = icon(state.dark ? 'sun' : 'moon');
$('#theme-toggle').setAttribute('aria-label', state.dark ? '切换浅色模式' : '切换深色模式');
renderContent();
updatePlayer();
