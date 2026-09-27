import { visibleCards, nextIndex, swipeDirection } from './cards.mjs';
import { illustrationFor } from './illustrations.mjs';

const $ = selector => document.querySelector(selector);
const grid = $('#card-grid');
const flashcard = $('#flashcard');
const status = $('#speech-status');
let category = 'all';
let index = 0;
let pointerStart = null;

function currentCards() {
  return visibleCards(category);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  $('#speak-button').classList.remove('speaking');
  status.textContent = '';
}

function renderCard(animate = true) {
  const collection = currentCards();
  const card = collection[index];
  stopSpeaking();
  $('#card-category').textContent = card.category === 'fruit' ? 'FRUIT · 水果' : 'VEGETABLE · 蔬菜';
  $('#card-number').textContent = `${String(index + 1).padStart(2, '0')} / ${String(collection.length).padStart(2, '0')}`;
  $('#card-art').style.setProperty('--art-bg', card.color);
  $('#card-art').innerHTML = illustrationFor(card.id);
  $('#card-word').textContent = card.word;
  $('#card-zh').textContent = card.zh;
  $('#speak-button').setAttribute('aria-label', `朗读英文单词 ${card.word}`);
  $('#progress-text').textContent = `${index + 1} / ${collection.length}`;
  $('#progress-fill').style.width = `${((index + 1) / collection.length) * 100}%`;
  $('#prev-button').disabled = index === 0;
  $('#next-button').disabled = index === collection.length - 1;
  grid.querySelectorAll('.mini-card').forEach((button, buttonIndex) => {
    const selected = buttonIndex === index;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
  if (animate) {
    flashcard.classList.remove('change');
    void flashcard.offsetWidth;
    flashcard.classList.add('change');
  }
}

function renderGrid() {
  grid.replaceChildren();
  currentCards().forEach((card, cardIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-card';
    button.setAttribute('aria-label', `查看 ${card.word}，${card.zh}`);
    button.style.setProperty('--mini-bg', card.color);
    button.innerHTML = `<span class="mini-art" aria-hidden="true">${illustrationFor(card.id)}</span><span class="mini-word"></span><span class="mini-zh"></span>`;
    button.querySelector('.mini-word').textContent = card.word;
    button.querySelector('.mini-zh').textContent = card.zh;
    button.addEventListener('click', () => {
      index = cardIndex;
      renderCard();
      $('#flashcard-area').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    });
    grid.append(button);
  });
}

function move(step) {
  const next = nextIndex(index, step, currentCards().length);
  if (next === index) return;
  index = next;
  renderCard();
}

function speak() {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    status.textContent = '此浏览器暂不支持语音朗读。';
    return;
  }
  const word = currentCards()[index].word;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(voice => voice.lang.toLowerCase() === 'en-us') || voices.find(voice => voice.lang.toLowerCase().startsWith('en')) || null;
  utterance.onstart = () => {
    $('#speak-button').classList.add('speaking');
    status.textContent = `正在朗读 ${word}`;
  };
  utterance.onend = () => {
    $('#speak-button').classList.remove('speaking');
    status.textContent = '';
  };
  utterance.onerror = () => {
    $('#speak-button').classList.remove('speaking');
    status.textContent = '发音未能播放，请检查设备声音后重试。';
  };
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    status.textContent = '发音未能播放，请检查设备声音后重试。';
  }
}

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    category = button.dataset.category;
    index = 0;
    document.querySelectorAll('.filter').forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    renderGrid();
    renderCard();
  });
});

$('#prev-button').addEventListener('click', () => move(-1));
$('#next-button').addEventListener('click', () => move(1));
$('#speak-button').addEventListener('click', speak);
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
});
flashcard.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) return;
  pointerStart = { x: event.clientX, y: event.clientY };
  flashcard.setPointerCapture(event.pointerId);
});
flashcard.addEventListener('pointerup', event => {
  if (!pointerStart) return;
  const direction = swipeDirection(pointerStart.x - event.clientX, pointerStart.y - event.clientY);
  pointerStart = null;
  if (direction) move(direction);
});
flashcard.addEventListener('pointercancel', () => { pointerStart = null; });

renderGrid();
renderCard(false);
