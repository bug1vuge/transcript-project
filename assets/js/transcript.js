import { flattenWords, formatTime, spaceForPause, wordIndexAt } from './timing.js';

const spread = document.querySelector('.spread');
const titleEl = document.querySelector('[data-bind="title"]');
const essay = document.querySelector('[data-bind="essay"]');
const control = document.querySelector('.control');
const toggle = document.querySelector('.control__toggle');
const seek = document.querySelector('.control__seek');
const elapsedEl = document.querySelector('[data-bind="elapsed"]');
const durationEl = document.querySelector('[data-bind="duration"]');
const lengthEl = document.querySelector('[data-bind="length"]');
const audio = document.querySelector('#recording');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** @type {ReturnType<typeof flattenWords>} */
let words = [];
/** @type {HTMLSpanElement[]} */
let wordEls = [];
let current = -1;
let frame = 0;
let scrubbing = false;
let lastManualScroll = 0;

/* --------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */

/**
 * @param {ReturnType<typeof flattenWords>[number]} word
 * @param {number} index
 */
function renderWord(word, index) {
  const span = document.createElement('span');
  span.className = 'w';
  span.textContent = word.text;
  span.dataset.index = String(index);
  const extra = spaceForPause(word.gap);
  if (extra) span.style.setProperty('--pause', `${extra}em`);
  return span;
}

/** @param {HTMLElement} parent @param {HTMLSpanElement[]} spans */
function appendWords(parent, spans) {
  spans.forEach((span, i) => {
    if (i > 0) parent.append(' ');
    parent.append(span);
  });
}

function render(transcript) {
  words = flattenWords(transcript);
  wordEls = words.map(renderWord);

  const byBlock = transcript.blocks.map(() => []);
  words.forEach((word, i) => byBlock[word.block].push(wordEls[i]));

  transcript.blocks.forEach((block, i) => {
    if (block.type === 'title') {
      titleEl.replaceChildren();
      appendWords(titleEl, byBlock[i]);
    } else {
      const p = document.createElement('p');
      appendWords(p, byBlock[i]);
      essay.append(p);
    }
  });

  const total = transcript.duration;
  durationEl.textContent = formatTime(total);
  lengthEl.textContent = `${Math.floor(total / 60)} min ${Math.round(total % 60)} sec`;
}

/* --------------------------------------------------------------------------
   Following the voice
   -------------------------------------------------------------------------- */

/** Marks words up to `index` as spoken, touching only what changed. */
function setCurrent(index) {
  if (index === current) return;
  const [from, to] = index > current ? [current + 1, index] : [index + 1, current];
  const spoken = index > current;
  for (let i = Math.max(0, from); i <= to; i++) wordEls[i].classList.toggle('is-spoken', spoken);
  wordEls[current]?.classList.remove('is-current');
  wordEls[index]?.classList.add('is-current');
  current = index;
  follow(wordEls[index]);
}

/** Keeps the spoken word comfortably in view, unless the reader has scrolled away. */
function follow(el) {
  if (!el || audio.paused || Date.now() - lastManualScroll < 4000) return;
  const { top, bottom } = el.getBoundingClientRect();
  const view = window.innerHeight;
  const bar = control.getBoundingClientRect();
  const limit = bar.top > view / 2 ? bar.top - 24 : view * 0.8;
  if (top < view * 0.12 || bottom > limit) {
    window.scrollTo({
      top: window.scrollY + top - view * 0.38,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  }
}

function draw() {
  const { currentTime } = audio;
  const duration = audio.duration || 0;
  setCurrent(wordIndexAt(words, currentTime));
  const progress = duration ? currentTime / duration : 0;
  control.style.setProperty('--progress', progress.toFixed(4));
  if (!scrubbing) seek.value = String(progress * 100);
  seek.setAttribute('aria-valuetext', `${formatTime(currentTime)} of ${formatTime(duration)}`);
  elapsedEl.textContent = formatTime(currentTime);
}

function tick() {
  draw();
  frame = requestAnimationFrame(tick);
}

/* --------------------------------------------------------------------------
   Playback
   -------------------------------------------------------------------------- */

const LABELS = { idle: 'Listen', playing: 'Pause', paused: 'Resume', ended: 'Again' };

function setState(state) {
  control.dataset.state = state;
  spread.dataset.state = state;
  toggle.textContent = LABELS[state];
  toggle.setAttribute('aria-pressed', String(state === 'playing'));
}

async function play() {
  try {
    await audio.play();
  } catch (error) {
    if (error?.name !== 'AbortError') toggle.textContent = 'Unavailable';
  }
}

/** @param {number} time */
function jumpTo(time) {
  audio.currentTime = Math.max(0, Math.min(time, audio.duration || time));
  draw();
}

toggle.addEventListener('click', () => (audio.paused ? play() : audio.pause()));

audio.addEventListener('playing', () => {
  setState('playing');
  cancelAnimationFrame(frame);
  tick();
});
audio.addEventListener('pause', () => {
  cancelAnimationFrame(frame);
  if (!audio.ended) setState('paused');
  draw();
});
audio.addEventListener('ended', () => {
  cancelAnimationFrame(frame);
  setState('ended');
});

seek.addEventListener('input', () => {
  scrubbing = true;
  if (audio.duration) jumpTo((Number(seek.value) / 100) * audio.duration);
});
seek.addEventListener('change', () => {
  scrubbing = false;
});

// Tap a word to hear it from there.
const onWordClick = (event) => {
  const el = event.target.closest('.w');
  if (!el) return;
  // Leave room for the reader to finish selecting text.
  if (String(window.getSelection())) return;
  lastManualScroll = 0;
  jumpTo(words[Number(el.dataset.index)].start - 0.05);
  play();
};
essay.addEventListener('click', onWordClick);
titleEl.addEventListener('click', onWordClick);

// Space plays and pauses; arrows step five seconds.
document.addEventListener('keydown', (event) => {
  if (event.target.closest('button, input, a, textarea')) return;
  if (event.key === ' ') {
    event.preventDefault();
    if (audio.paused) play();
    else audio.pause();
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    jumpTo(audio.currentTime + (event.key === 'ArrowRight' ? 5 : -5));
  }
});

// Reader-initiated scrolling pauses auto-follow for a few seconds.
for (const type of ['wheel', 'touchmove']) {
  window.addEventListener(type, () => (lastManualScroll = Date.now()), { passive: true });
}

if ('mediaSession' in navigator) {
  audio.addEventListener(
    'play',
    () => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'On keeping voicemails',
        artist: 'Margin, Issue 4',
      });
    },
    { once: true },
  );
}

/* --------------------------------------------------------------------------
   Start
   -------------------------------------------------------------------------- */

fetch('content/timings.json')
  .then((response) => {
    if (!response.ok) throw new Error(`timings: HTTP ${response.status}`);
    return response.json();
  })
  .then((transcript) => {
    render(transcript);
    setState('idle');
  })
  .catch((error) => {
    console.error(error);
    spread.dataset.state = 'error';
    essay.textContent = 'The transcript could not be loaded. Reload the page to try again.';
  });
