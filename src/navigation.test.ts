import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findNext } from './navigation.ts';

const origin = { x: 10, y: 10 };
const points = [{ x: 110, y: 10 }, { x: 10, y: 110 }, { x: -90, y: 10 }, { x: 10, y: -90 }];

test('arrows select the closest aligned control in each direction', () => {
  assert.equal(findNext(origin, points, 'ArrowRight'), 0);
  assert.equal(findNext(origin, points, 'ArrowDown'), 1);
  assert.equal(findNext(origin, points, 'ArrowLeft'), 2);
  assert.equal(findNext(origin, points, 'ArrowUp'), 3);
});

test('does not wrap at edges or select the origin; prefers alignment', () => {
  assert.equal(findNext(origin, [], 'ArrowLeft'), -1);
  assert.equal(findNext(origin, [origin, points[0]!], 'ArrowLeft'), -1);
  assert.equal(findNext(origin, [{ x: 30, y: 250 }, { x: 110, y: 10 }], 'ArrowRight'), 1);
});
