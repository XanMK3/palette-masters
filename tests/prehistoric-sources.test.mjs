import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURED_MOVEMENTS } from '../.cache/tests/featured-collections.js';
import { createArtworkSources } from '../.cache/tests/artwork-sources.js';
import {
  FEATURED_IMAGE_FILENAMES,
  FEATURED_DIRECT_IMAGES,
  FEATURED_FILE_PAGES,
  FEATURED_IMAGE_METADATA,
} from '../.cache/tests/featured-images.js';
import { EMBEDDED_ART_IMAGES } from '../.cache/tests/embedded-art.js';

const prehistoric = FEATURED_MOVEMENTS.find(
  (movement) => movement.id === 'prehistoric-cave-painting',
).paintings;

test('prehistoric attribution and image sources live in the shared featured catalog', () => {
  for (const work of prehistoric) {
    const key = work.wikipediaTitle;
    assert.ok(FEATURED_IMAGE_FILENAMES[key]);
    assert.match(FEATURED_DIRECT_IMAGES[key], /^https:\/\/(thumb|upload)\.wikimedia\.org\//);
    assert.ok(FEATURED_FILE_PAGES[key]);
    assert.ok(FEATURED_IMAGE_METADATA[key].credit);
    assert.ok(FEATURED_IMAGE_METADATA[key].note);
  }
  assert.equal(
    new Set(prehistoric.map((work) => FEATURED_DIRECT_IMAGES[work.wikipediaTitle])).size,
    9,
  );
});

test('prehistoric and other featured images share embedded priority and cached API resolution', async () => {
  const calls = [];
  const resolved = { thumbnailUrl: 'https://example.test/resolved.jpg' };
  const sources = createArtworkSources({
    resolveArtworkImage: async (lookup) => {
      calls.push(lookup);
      return resolved;
    },
  });
  const works = [
    ...prehistoric,
    FEATURED_MOVEMENTS.find((movement) => movement.id === 'renaissance').paintings[0],
  ];
  for (const work of works) {
    const key = work.wikipediaTitle;
    const previous = EMBEDDED_ART_IMAGES[key];
    try {
      EMBEDDED_ART_IMAGES[key] = 'data:image/png;base64,fixture';
      assert.equal(sources.featuredDirectImage(work), EMBEDDED_ART_IMAGES[key]);
      delete EMBEDDED_ART_IMAGES[key];
      assert.equal(sources.featuredDirectImage(work), FEATURED_DIRECT_IMAGES[key]);
    } finally {
      if (previous === undefined) delete EMBEDDED_ART_IMAGES[key];
      else EMBEDDED_ART_IMAGES[key] = previous;
    }
    assert.equal(await sources.resolveFeatured(work), resolved);
    assert.equal(await sources.resolveFeatured(work), resolved);
    assert.deepEqual(calls.at(-1), {
      title: work.title,
      artist: work.artist,
      filename: FEATURED_IMAGE_FILENAMES[key],
    });
  }
  assert.equal(calls.length, works.length);
});
