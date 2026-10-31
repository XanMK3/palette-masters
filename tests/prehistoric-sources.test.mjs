import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURED_MOVEMENTS } from '../.cache/tests/featured-collections.js';
import { createArtworkSources } from '../.cache/tests/artwork-sources.js';

test('all prehistoric works have pinned display images and corrected panels never use fuzzy search', async () => {
  const sources = createArtworkSources({
    resolveArtworkImage: async () => {
      throw new Error('Unexpected fuzzy lookup');
    },
  });
  const works = FEATURED_MOVEMENTS.find(
    (movement) => movement.id === 'prehistoric-cave-painting',
  ).paintings;
  const urls = works.map((work) => sources.featuredDirectImage(work));
  assert.ok(urls.every((url) => /^https:\/\/(thumb|upload)\.wikimedia\.org\//.test(url)));
  assert.equal(new Set(urls).size, 9);
  for (const index of works.keys()) {
    assert.equal(await sources.resolveFeatured(works[index]), null);
  }
});
