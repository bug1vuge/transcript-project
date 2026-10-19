# Transcript

An audio essay you can read and hear at once. Press listen and the text recedes, then each word inks back in as it is spoken. Tap any word to hear the essay from there. Pauses in the voice show on the page as a little extra space, so the text breathes with the reader.

**[Live demo](https://bug1vuge.github.io/transcript-project/)**

> Concept project. The essay, _On keeping voicemails_, and the magazine, _Margin_, were written for this demo.

## Why

Most audio on the web is a player stuck on top of a page. Here the audio drives the typography. There's one control: a word, a hairline and a time. The rest of the interface is the text itself.

## How it works

- `content/timings.json` holds the start and end time of every word.
- `assets/js/timing.js` finds the word being spoken with a binary search on each animation frame. Only the words that changed are restyled, so the page stays smooth on older phones.
- Silence after a word becomes extra space (`--pause`), capped at 0.6em.
- Auto-follow keeps the spoken line in view, and steps aside for a few seconds whenever the reader scrolls.
- Before listening and after the end, the text is ordinary, fully legible type, so the page works as reading on its own.

## Using your own recording

1. Record the piece and save it as `assets/audio/piece.mp3`.
2. Put the text in `content/piece.txt`: title, then paragraphs separated by blank lines.
3. Produce word timings with a forced-alignment tool and write them in the same shape:

   ```json
   {
     "title": "On keeping voicemails",
     "duration": 84.16,
     "blocks": [
       { "type": "title", "words": [{ "text": "On", "start": 0.6, "end": 0.77 }] },
       { "type": "paragraph", "words": [{ "text": "My", "start": 4.1, "end": 4.3 }] }
     ]
   }
   ```

4. Run `npm test`. It checks the timings are in order, fit the recording and match the text word for word.

## Accessibility

- The transcript is plain paragraphs, so screen readers read it as text.
- The control is a real button plus a range input. Space plays and pauses, and the arrow keys step five seconds.
- Reduced motion turns off the ink transitions and smooth scrolling.

## Development

```sh
npm install
npm run dev     # http://localhost:5174
npm test
npm run lint
```

Static files only, with no build step. CI runs lint and tests on every push. Pushing to `main` deploys to GitHub Pages; enable it under **Settings → Pages → Source: GitHub Actions**.

## Credits

Set in [Literata](https://github.com/googlefonts/literata) and [Schibsted Grotesk](https://github.com/schibsted/schibsted-grotesk) (SIL Open Font License).
