import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { filterCatalog, parseCatalog, loadCatalog } from './catalog.ts';

const entry = {
  id: 'sample-tool', title: 'Sample tool', description: 'A mock file browser.',
  category: 'Utilities', mock: true, compatibilityNotes: 'PS4 compatibility unverified.'
};

test('validates fields, rejects duplicate IDs, unsafe IDs and disguised live metadata', () => {
  assert.equal(parseCatalog([entry]).length, 1);
  assert.deepEqual(parseCatalog([]), []);
  for (const value of [null, {}, [entry, entry], [{ ...entry, title: '' }],
    [{ ...entry, id: '../file' }], [{ ...entry, mock: false }],
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

test('checked-in fixture conforms to the same input contract', async () => {
  const data: unknown = JSON.parse(await readFile(new URL('../public/catalog.mock.json', import.meta.url), 'utf8'));
  assert.ok(parseCatalog(data).length > 0);
});

test('loader handles HTTP errors, malformed JSON and aborted transfers', async () => {
  const signal = new AbortController().signal;
  assert.equal((await loadCatalog(signal, async () => new Response(JSON.stringify([entry])))).length, 1);
  await assert.rejects(loadCatalog(signal, async () => new Response('', { status: 503 })), /503/);
  await assert.rejects(loadCatalog(signal, async () => new Response('{')), SyntaxError);
  await assert.rejects(loadCatalog(signal, async () => { throw new DOMException('Aborted', 'AbortError'); }), /Aborted/);
});
