/**
 * Pure helpers for word-timed transcripts. No DOM, so they run in Node tests.
 *
 * A transcript is { duration, blocks: [{ type, words: [{ text, start, end }] }] }.
 */

/**
 * Flattens all blocks into one ordered list of words, each tagged with its
 * block index and the silence that follows it.
 *
 * @param {{ blocks: { type: string, words: { text: string, start: number, end: number }[] }[] }} transcript
 */
export function flattenWords(transcript) {
  const words = transcript.blocks.flatMap((block, blockIndex) =>
    block.words.map((word) => ({ ...word, block: blockIndex })),
  );
  return words.map((word, i) => ({
    ...word,
    gap: i < words.length - 1 ? Math.max(0, words[i + 1].start - word.end) : 0,
  }));
}

/**
 * Index of the word being spoken at `time`: the last word whose start is at
 * or before `time`. Returns -1 before the first word. Binary search, so it is
 * cheap enough to call on every animation frame.
 *
 * @param {{ start: number }[]} words  sorted by start
 * @param {number} time  seconds
 */
export function wordIndexAt(words, time) {
  let low = 0;
  let high = words.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (words[mid].start <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/**
 * Extra space to set after a word, in em, so that pauses in the voice show
 * up as space on the page. Ordinary word gaps get nothing; a breath between
 * sentences gets a little; nothing grows beyond `max`.
 *
 * @param {number} gap  seconds of silence after the word
 * @param {{ threshold?: number, perSecond?: number, max?: number }} [options]
 */
export function spaceForPause(gap, { threshold = 0.15, perSecond = 0.6, max = 0.6 } = {}) {
  if (!(gap > threshold)) return 0;
  return Math.min(max, Math.round((gap - threshold) * perSecond * 100) / 100);
}

/** @param {number} seconds */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
