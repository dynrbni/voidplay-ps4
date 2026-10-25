import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceDemo, commandDemo, enqueueDemo, formatBytes, parseDemoTransfers } from './demoTransfers.ts';

test('demo queue prevents duplicates and advances one transfer at a time', () => {
  const jobs = enqueueDemo(enqueueDemo([], 'orbit-workshop', 1), 'file-desk', 2);
  assert.equal(enqueueDemo(jobs, 'orbit-workshop', 3), jobs);
  const tick = advanceDemo(jobs, 500);
  assert.equal(tick[0]?.status, 'downloading');
  assert.ok(tick[0]!.receivedBytes > 0);
  assert.equal(tick[1]?.receivedBytes, 0);
  assert.equal(jobs[0]?.receivedBytes, 0);
  assert.equal(advanceDemo(jobs, -1), jobs);
});

test('pause/resume/cancel/retry preserve the queue and progress correctly', () => {
  const started = advanceDemo(enqueueDemo([], 'orbit-workshop', 1), 500);
  const paused = commandDemo(started, 'orbit-workshop', 'pause');
  assert.equal(advanceDemo(paused, 1000), paused);
  assert.equal(paused[0]?.bytesPerSecond, 0);
  assert.equal(paused[0]?.receivedBytes, started[0]?.receivedBytes);
  const resumed = advanceDemo(commandDemo(paused, 'orbit-workshop', 'resume'), 500);
  assert.ok(resumed[0]!.receivedBytes > paused[0]!.receivedBytes);
  const cancelled = commandDemo(resumed, 'orbit-workshop', 'cancel');
  assert.equal(cancelled[0]?.status, 'cancelled');
  const retry = commandDemo(cancelled, 'orbit-workshop', 'retry');
  assert.equal(retry[0]?.receivedBytes, 0);
  assert.equal(retry[0]?.status, 'queued');
});

test('completion is bounded and the next queued demo starts on the next tick', () => {
  let jobs = enqueueDemo(enqueueDemo([], 'orbit-workshop', 1), 'file-desk', 2);
  for (let i = 0; i < 30; i++) jobs = advanceDemo(jobs, 1000);
  assert.equal(jobs[0]?.status, 'completed');
  assert.equal(jobs[0]?.receivedBytes, jobs[0]?.totalBytes);
  assert.equal(jobs[0]?.bytesPerSecond, 0);
  assert.equal(jobs[1]?.status, 'completed');
});

test('restored demos pause, reject malformed data and never become live transfers', () => {
  const jobs = advanceDemo(enqueueDemo([], 'orbit-workshop', 1), 500);
  const restored = parseDemoTransfers(JSON.stringify({ version: 1, jobs }));
  assert.equal(restored[0]?.status, 'paused');
  assert.equal(restored[0]?.receivedBytes, jobs[0]?.receivedBytes);
  assert.deepEqual(parseDemoTransfers(null), []);
  for (const value of ['{', '{}', JSON.stringify({ version: 1, jobs: [{ ...jobs[0], mode: 'live' }] }),
    JSON.stringify({ version: 1, jobs: [jobs[0], jobs[0]] }),
    JSON.stringify({ version: 1, jobs: [{ ...jobs[0], receivedBytes: -1 }] })]) {
    assert.throws(() => parseDemoTransfers(value));
  }
  assert.equal(formatBytes(1048576), '1.0 MiB');
});
