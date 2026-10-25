import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyCollections, parseCollections, toggleCollection } from './collections.ts';
import { parseRoute, routeHash } from './routes.ts';

test('favorites and tracked library remain separate and survive a storage round trip', () => {
  const favorited = toggleCollection(emptyCollections, 'favorites', 'orbit-workshop');
  assert.deepEqual(favorited.library, []);
  const tracked = toggleCollection(favorited, 'library', 'file-desk');
  assert.deepEqual(parseCollections(JSON.stringify(tracked)), tracked);
  assert.deepEqual(toggleCollection(tracked, 'favorites', 'orbit-workshop').favorites, []);
  assert.deepEqual(emptyCollections.favorites, []);
});

test('rejects malformed, oversized and incompatible local collection storage', () => {
  assert.deepEqual(parseCollections(null), emptyCollections);
  for (const raw of ['{', '{}', JSON.stringify({ ...emptyCollections, version: 2 }),
    JSON.stringify({ ...emptyCollections, library: ['../file'] }),
    JSON.stringify({ ...emptyCollections, favorites: Array(501).fill('orbit') })]) {
    assert.throws(() => parseCollections(raw));
  }
});

test('routes support direct item links and reject malformed paths', () => {
  assert.deepEqual(parseRoute(''), { page: 'discover' });
  assert.deepEqual(parseRoute('#/favorites'), { page: 'favorites' });
  assert.deepEqual(parseRoute('#/item/orbit-workshop'), { page: 'item', id: 'orbit-workshop' });
  assert.equal(routeHash({ page: 'item', id: 'orbit-workshop' }), '#/item/orbit-workshop');
  assert.deepEqual(parseRoute('#/item/../secret'), { page: 'missing' });
});
