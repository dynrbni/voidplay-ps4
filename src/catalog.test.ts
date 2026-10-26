import assert from 'node:assert/strict';
import { test } from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { filterCatalog, parseCatalog, loadCatalog, sortCatalog } from './catalog.ts';

const entry = {
  id: 'sample-tool', title: 'Sample tool', description: 'A mock file browser.',
  category: 'Utilities', mock: true, compatibilityNotes: 'PS4 compatibility unverified.'
};

test('validates fields, rejects duplicate IDs, unsafe IDs and disguised live metadata', () => {
  assert.equal(parseCatalog([entry]).length, 1);
  assert.deepEqual(parseCatalog([]), []);
  for (const value of [null, {}, [entry, entry], [{ ...entry, title: '' }],
    [{ ...entry, id: '../file' }], [{ ...entry, coverUrl: 'https://example.com/art.svg' }],
    [{ ...entry, coverUrl: '/art/../secret.svg' }], [{ ...entry, mock: false }],
    [{ ...entry, downloadUrl: 'https://example.com/file.pkg' }]]) {
    assert.throws(() => parseCatalog(value));
  }
});

test('search is trimmed/case insensitive and intersects category without mutation', () => {
  const entries = parseCatalog([entry, { ...entry, id: 'game', title: 'Orbit', category: 'Games' }]);
  assert.equal(filterCatalog(entries, ' FILE ', 'All')[0]?.id, entry.id);
  assert.equal(filterCatalog(entries, 'orbit', 'Games').length, 1);
  assert.equal(filterCatalog(entries, 'orbit', 'Utilities').length, 0);
  assert.equal(filterCatalog(entries, '', 'All').length, 2);
  assert.equal(entries.length, 2);
});

test('sorts titles without changing curated order or mutating input', () => {
  const entries = parseCatalog([entry, { ...entry, id: 'alpha', title: 'Alpha' }]);
  assert.equal(sortCatalog(entries, 'title')[0]?.id, 'alpha');
  assert.equal(sortCatalog(entries, 'curated')[0]?.id, entry.id);
  assert.equal(entries[0]?.id, entry.id);
});

test('checked-in fixture conforms to the same input contract', async () => {
  const data: unknown = JSON.parse(await readFile(new URL('../public/catalog.mock.json', import.meta.url), 'utf8'));
  const entries = parseCatalog(data);
  assert.ok(entries.length > 0);
  await Promise.all(entries.flatMap(item => [item.coverUrl, item.heroUrl].filter((url): url is string => Boolean(url)))
    .map(path => access(new URL(`../public${path}`, import.meta.url))));
});

test('detail artwork and optional metadata stay inside the validated catalog boundary', () => {
  const detail = { ...entry, heroUrl: '/art/sample-tool.webp', summary: 'A concise concept summary.',
    author: 'Fixture author', version: 'Fixture version', license: 'Fixture license', releaseNotes: 'Fixture notes',
    screenshots: [{ url: '/art/sample-tool.png', description: 'Test-only fixture image' }] };
  assert.equal(parseCatalog([detail])[0]?.screenshots?.length, 1);
  for (const patch of [ { heroUrl: 'https://example.com/image.webp' }, { heroUrl: '/art/../secret.webp' },
    { summary: '' }, { screenshots: [{ url: 'javascript:alert(1)', description: 'Unsafe' }] },
    { screenshots: [{ url: '/art/sample-tool.webp', description: '' }] } ]) {
    assert.throws(() => parseCatalog([{ ...detail, ...patch }]));
  }
});

test('loader handles HTTP errors, malformed JSON and aborted transfers', async () => {
  const signal = new AbortController().signal;
  assert.equal((await loadCatalog(signal, async url => new Response(JSON.stringify(String(url).endsWith('catalog.mock.json') ? [entry] : { schemaVersion: 1, revision: 0, publishedAt: '2026-10-25T00:00:00.000Z', previewMode: true, entries: [] })))).length, 1);
  await assert.rejects(loadCatalog(signal, async () => new Response('', { status: 503 })), /503/);
  await assert.rejects(loadCatalog(signal, async () => new Response('{')), SyntaxError);
  await assert.rejects(loadCatalog(signal, async () => { throw new DOMException('Aborted', 'AbortError'); }), /Aborted/);
});

 test('a published manifest drives the store and empty publication never falls back to concepts', async () => {
  const { metadataSchema, exportManifest, emptyWorkspace, updateWorkspace } = await import('../shared/catalog.ts');
  const { testEntry } = await import('../shared/fixtures.ts');
  const manifest = exportManifest(updateWorkspace(emptyWorkspace(), 0, testEntry(), 'publish'));
  const requests: string[] = [];
  const entries = await loadCatalog(new AbortController().signal, async url => { requests.push(String(url)); return new Response(JSON.stringify(manifest)); });
  assert.equal(entries[0]?.mock, false);
  assert.equal(entries[0]?.title, metadataSchema.parse(testEntry()).title);
  assert.equal(requests.length, 1);
  assert.deepEqual(await loadCatalog(new AbortController().signal, async () => new Response(JSON.stringify({ ...manifest, entries: [] }))), []);
  await assert.rejects(loadCatalog(new AbortController().signal, async () => new Response(JSON.stringify({ ...manifest, entries: [{ ...testEntry(), id: '' }] }))));
});
