export const TRACKS = Object.freeze([
  {
    title: '阳关三叠',
    src: './assets/audio/yangguan-sandie.mp3',
    source: 'https://commons.wikimedia.org/wiki/File:Guqin-Yangguan_Sandie.ogg',
  },
  {
    title: '醉渔唱晚',
    src: './assets/audio/zuiyu-changwan.mp3',
    source: 'https://commons.wikimedia.org/wiki/File:Guqin-Zuiyu_Changwan.ogg',
  },
]);

if (typeof document !== 'undefined') {
  const audio = document.querySelector('[data-music-audio]');
  const toggle = document.querySelector('[data-music-toggle]');
  const next = document.querySelector('[data-music-next]');
  const label = document.querySelector('[data-music-label]');
  const title = document.querySelector('[data-music-title]');
  const status = document.querySelector('[data-music-status]');
  let trackIndex = 0;

  if (audio && toggle && next && label && title && status) {
    audio.volume = 0.45;
    audio.src = TRACKS[trackIndex].src;

    function syncState() {
      const playing = !audio.paused;
      toggle.setAttribute('aria-pressed', String(playing));
      label.textContent = playing ? '暂停音乐' : '开启音乐';
      title.textContent = `古琴 · ${TRACKS[trackIndex].title}`;
    }

    async function play() {
      try {
        await audio.play();
        status.textContent = `正在播放古琴曲《${TRACKS[trackIndex].title}》`;
      } catch {
        status.textContent = '录音加载失败，请稍后重试';
        syncState();
      }
    }

    toggle.addEventListener('click', async () => {
      if (audio.paused) await play();
      else {
        audio.pause();
        syncState();
        status.textContent = '背景音乐已暂停';
      }
    });

    async function selectNextTrack(continuePlaying) {
      audio.pause();
      trackIndex = (trackIndex + 1) % TRACKS.length;
      audio.src = TRACKS[trackIndex].src;
      audio.load();
      syncState();
      status.textContent = `已切换至《${TRACKS[trackIndex].title}》`;
      if (continuePlaying) await play();
    }

    next.addEventListener('click', () => selectNextTrack(!audio.paused));
    audio.addEventListener('ended', () => selectNextTrack(true));
    audio.addEventListener('play', syncState);
    audio.addEventListener('pause', syncState);
    audio.addEventListener('error', () => {
      status.textContent = '录音加载失败，请切换曲目或稍后重试';
      syncState();
    });
    syncState();
  }
}
