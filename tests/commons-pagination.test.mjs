import assert from 'node:assert/strict';
import test from 'node:test';
import { WikimediaArtService } from '../.cache/tests/wikimedia-art.service.js';

test('Commons search forwards the complete continuation and preserves search options and rank', async () => {
  const calls = [];
  const continuation = { continue: 'gsroffset||', gsroffset: 24 };
  const art = new WikimediaArtService({
    fetchImpl: async (url) => {
      calls.push(new URL(url));
      return new Response(
        JSON.stringify(
          calls.length === 1
            ? {
                continue: continuation,
                query: {
                  pages: {
                    1: {
                      index: 2,
                      title: 'File:Second.jpg',
                      imageinfo: [{ url: 'https://upload.wikimedia.org/second.jpg' }],
                    },
                    2: {
                      index: 1,
                      title: 'File:First.jpg',
                      imageinfo: [
                        {
                          url: 'https://upload.wikimedia.org/first.jpg',
                          thumburl: 'https://upload.wikimedia.org/first-small.jpg',
                        },
                      ],
                    },
                  },
                },
              }
            : { query: { pages: {} } },
        ),
        { status: 200 },
      );
    },
  });
  const first = await art.searchCommonsImagesPage('Rembrandt', { limit: 24 });
  assert.deepEqual(
    first.images.map((image) => image.fileTitle),
    ['File:First.jpg', 'File:Second.jpg'],
  );
  assert.deepEqual(first.continuation, continuation);
  const last = await art.searchCommonsImagesPage('Rembrandt', {
    limit: 24,
    continuation: first.continuation,
  });
  assert.deepEqual(last, { images: [], continuation: null });
  assert.equal(calls[1].searchParams.get('continue'), 'gsroffset||');
  assert.equal(calls[1].searchParams.get('gsroffset'), '24');
  assert.equal(calls[1].searchParams.get('gsrsearch'), 'Rembrandt painting');
  assert.equal(calls[1].searchParams.get('gsrlimit'), '24');
  assert.equal(calls[0].searchParams.has('gsroffset'), false);
  assert.equal(typeof art.getArtistPaintings, 'function');
});

test('legacy Commons search still returns an array', async () => {
  const art = new WikimediaArtService({
    fetchImpl: async () => new Response(JSON.stringify({ query: { pages: {} } })),
  });
  assert.deepEqual(await art.searchCommonsImages('Monet'), []);
});
