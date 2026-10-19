import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { flattenWords, formatTime, spaceForPause, wordIndexAt } from '../assets/js/timing.js';

const sample = {
  duration: 5,
  blocks: [
    {
      type: 'title',
      words: [
        { text: 'On', start: 0.5, end: 0.7 },
        { text: 'keeping', start: 0.7, end: 1.2 },
      ],
    },
    {
      type: 'paragraph',
      words: [
        { text: 'My', start: 2.5, end: 2.7 },
        { text: 'grandmother', start: 2.7, end: 3.4 },
      ],
    },
  ],
};

describe('flattenWords', () => {
  const words = flattenWords(sample);

  it('keeps every word in order with its block', () => {
    assert.deepEqual(
      words.map((w) => [w.text, w.block]),
      [
        ['On', 0],
        ['keeping', 0],
        ['My', 1],
        ['grandmother', 1],
      ],
    );
  });

  it('records the silence after each word', () => {
    assert.deepEqual(
      words.map((w) => Math.round(w.gap * 10) / 10),
      [0, 1.3, 0, 0],
    );
  });
});

describe('wordIndexAt', () => {
  const words = flattenWords(sample);

  it('is -1 before the first word', () => {
    assert.equal(wordIndexAt(words, 0), -1);
    assert.equal(wordIndexAt(words, 0.49), -1);
  });

  it('finds the word being spoken', () => {
    assert.equal(wordIndexAt(words, 0.5), 0);
    assert.equal(wordIndexAt(words, 0.9), 1);
    assert.equal(wordIndexAt(words, 3), 3);
  });

  it('holds the last word through a pause and after the end', () => {
    assert.equal(wordIndexAt(words, 2), 1);
    assert.equal(wordIndexAt(words, 99), 3);
  });

  it('handles an empty list', () => {
    assert.equal(wordIndexAt([], 1), -1);
  });
});

describe('spaceForPause', () => {
  it('adds nothing for ordinary gaps', () => {
    assert.equal(spaceForPause(0), 0);
    assert.equal(spaceForPause(0.1), 0);
    assert.equal(spaceForPause(Number.NaN), 0);
  });

  it('grows with the pause and is capped', () => {
    assert.ok(spaceForPause(0.3) > 0);
    assert.ok(spaceForPause(0.6) > spaceForPause(0.3));
    assert.equal(spaceForPause(10), 0.6);
  });
});

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(84.16), '1:24');
    assert.equal(formatTime(-1), '0:00');
    assert.equal(formatTime(Number.NaN), '0:00');
  });
});

describe('content/timings.json', () => {
  const transcript = JSON.parse(readFileSync(new URL('../content/timings.json', import.meta.url)));
  const words = flattenWords(transcript);

  it('has words in strictly increasing time order', () => {
    for (let i = 1; i < words.length; i++) {
      assert.ok(words[i].start >= words[i - 1].end - 0.001, `word ${i} overlaps`);
      assert.ok(words[i].end > words[i].start, `word ${i} has no length`);
    }
  });

  it('ends within the recording', () => {
    assert.ok(words.at(-1).end <= transcript.duration);
  });

  it('matches the source text word for word', () => {
    const source = readFileSync(new URL('../content/piece.txt', import.meta.url), 'utf8');
    assert.deepEqual(
      words.map((w) => w.text),
      source.split(/\s+/).filter(Boolean),
    );
  });
});
