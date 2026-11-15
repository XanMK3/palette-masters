import assert from 'node:assert/strict';
import test from 'node:test';
import { WikimediaArtService } from '../.cache/tests/wikimedia-art.service.js';

const service = (payload) =>
  new WikimediaArtService({
    cacheTtlMs: 0,
    fetchImpl: async () => new Response(JSON.stringify(payload)),
  });

for (const [name, payload, request] of [
  ['null response', null, (art) => art.searchEntities('art')],
  ['search array', { search: {} }, (art) => art.searchEntities('art')],
  [
    'search description',
    { search: [{ id: 'Q1', description: 12 }] },
    (art) => art.searchEntities('art'),
  ],
  [
    'entity labels',
    { entities: { Q1: { labels: { en: { value: [] } } } } },
    (art) => art.getLabels(['Q1']),
  ],
  [
    'entity claims',
    { entities: { Q1: { claims: { P31: [null] } } } },
    (art) => art.getEntity('Q1'),
  ],
  [
    'image metadata',
    { query: { pages: { 1: { imageinfo: [{ extmetadata: { Artist: { value: 3 } } }] } } } },
    (art) => art.getCommonsFile('Art.jpg'),
  ],
  ['continuation', { continue: { gsroffset: {} } }, (art) => art.searchCommonsImagesPage('art')],
  [
    'SPARQL bindings',
    { results: { bindings: [{ painting: { value: false } }] } },
    (art) => art.getArtistPaintings('Q1'),
  ],
  ['summary URL', { thumbnail: { source: [] } }, (art) => art.getWikipediaSummary('Art')],
  ['error payload', { error: 'broken' }, (art) => art.searchEntities('art')],
]) {
  test(`rejects malformed ${name} at the API boundary`, async () => {
    await assert.rejects(request(service(payload)), /Malformed Wikimedia response/);
  });
}

test('accepts absent optional fields and unknown API additions', async () => {
  assert.deepEqual(await service({ search: [], extra: true }).searchEntities('art'), []);
  const hits = await service({ search: [{ id: 'Q1', label: '', extra: true }] }).searchEntities(
    'art',
  );
  assert.equal(hits[0].label, '');
  assert.deepEqual(await service({}).searchCommonsImagesPage('art'), {
    images: [],
    continuation: null,
  });
});

test('preserves API error messages', async () => {
  await assert.rejects(
    service({ error: { info: 'Rate limited' } }).searchEntities('art'),
    /Rate limited/,
  );
});
