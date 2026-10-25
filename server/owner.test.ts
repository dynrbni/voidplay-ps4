import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startOwnerServer } from './owner.ts';
import { createPasswordRecord } from './password.ts';
import { exportManifest, workspaceSchema } from '../shared/catalog.ts';
import { testEntry } from '../shared/fixtures.ts';
import type { Manifest } from '../shared/catalog.ts';

const password = 'fixture-owner-password';
async function setup(t: { after: (callback: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), 'voidplay-owner-'));
  const assets = join(directory, 'assets'); await mkdir(assets);
  await writeFile(join(assets, 'index.html'), '<h1>Login shell</h1>');
  await writeFile(join(directory, 'credentials.json'), JSON.stringify(await createPasswordRecord(password)), { mode: 0o600 });
  let clock = Date.now(); const submissions: Manifest[] = [];
  const app = await startOwnerServer({ directory, assets, port: 0, now: () => clock, checkPublication: async current => ({ ...current, state: 'live' }), publish: async manifest => { submissions.push(manifest); return { revision: manifest.revision, commit: 'fixture-commit', state: 'committed', catalogUrl: 'https://example.com/catalog.json', storeUrl: 'https://example.com/' }; } });
  t.after(async () => { app.server.closeAllConnections(); await new Promise<void>(resolve => app.server.close(() => resolve())); await rm(directory, { recursive: true, force: true }); });
  async function request(path: string, body?: unknown, token?: string, origin = app.url) {
    return fetch(app.url + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  async function login() { const response = await request('/api/login', { password }); assert.equal(response.status, 200); return (await response.json() as { token: string }).token; }
  return { ...app, directory, submissions, request, login, advance: (milliseconds: number) => { clock += milliseconds; } };
}

test('private workspace and publication reject unauthenticated access and foreign origins', async t => {
  const app = await setup(t);
  assert.equal((await app.request('/api/workspace')).status, 401);
  assert.equal((await app.request('/api/publish', { expectedRevision: 0 })).status, 401);
  assert.equal((await app.request('/api/login', { password }, undefined, 'https://evil.example')).status, 403);
  assert.equal((await app.request('/.owner-data/credentials.json')).status, 404);
  assert.equal((await app.request('/api/login', { password: 'wrong' })).status, 401);
  assert.equal(app.submissions.length, 0);
  const response = await fetch(app.url + '/api/login', { method: 'OPTIONS', headers: { Origin: 'https://dynrbni.github.io', 'Access-Control-Request-Private-Network': 'true' } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://dynrbni.github.io');
  assert.equal(response.headers.get('access-control-allow-private-network'), 'true');
});

test('authenticated editing persists privately; stale revisions and invalid metadata cannot publish', async t => {
  const app = await setup(t); const token = await app.login();
  const draft = { ...testEntry(), genres: ['Adventure'], trailerUrl: 'https://youtu.be/M7lc1UVf-VE' };
  assert.equal((await app.request('/api/action', { expectedRevision: 0, draft, action: 'save' }, token)).status, 200);
  assert.equal((await app.request('/api/action', { expectedRevision: 0, draft, action: 'publish' }, token)).status, 409);
  assert.equal((await app.request('/api/action', { expectedRevision: 1, draft: { ...draft, redistribution: { authorized: false, statement: '' } }, action: 'publish' }, token)).status, 400);
  assert.equal((await app.request('/api/action', { expectedRevision: 1, draft, action: 'publish' }, token)).status, 200);
  assert.equal((await app.request('/api/action', { expectedRevision: 2, draft: { ...draft, title: 'Private draft edit' }, action: 'save' }, token)).status, 200);
  const response = await app.request('/api/publish', { expectedRevision: 3 }, token);
  assert.equal(response.status, 200);
  assert.equal(app.submissions[0]?.entries[0]?.title, 'Authorized test tool');
  assert.equal(app.submissions[0]?.entries[0]?.trailerUrl, 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  assert.equal(JSON.stringify(app.submissions[0]).includes('Private draft edit'), false);
  const checked = await app.request('/api/publication/check', {}, token);
  assert.equal(checked.status, 200);
  assert.equal((await checked.json() as { state: string }).state, 'live');
  const workspace = workspaceSchema.parse(JSON.parse(await readFile(join(app.directory, 'workspace.json'), 'utf8')));
  assert.equal(workspace.records[0]?.draft.title, 'Private draft edit');
  assert.equal((await stat(join(app.directory, 'workspace.json'))).mode & 0o777, 0o600);
  assert.equal((await readFile(join(app.directory, 'credentials.json'), 'utf8')).includes(password), false);
  assert.equal((await app.request('/api/action', { expectedRevision: 3, draft, action: 'unpublish' }, token)).status, 200);
  assert.equal((await app.request('/api/publish', { expectedRevision: 4 }, token)).status, 200);
  assert.deepEqual(app.submissions[1]?.entries, []);
  assert.equal(exportManifest(workspace).previewMode, false);
});

test('logout and session expiry revoke access; tokens are not accepted as query parameters', async t => {
  const app = await setup(t); const token = await app.login();
  assert.equal((await app.request('/api/workspace?token=' + token)).status, 401);
  assert.equal((await app.request('/api/logout', {}, token)).status, 200);
  assert.equal((await app.request('/api/workspace', undefined, token)).status, 401);
  const second = await app.login(); app.advance(60 * 60_000 + 1);
  assert.equal((await app.request('/api/workspace', undefined, second)).status, 401);
});

test('password attempts are rate limited and the window expires', async t => {
  const app = await setup(t);
  for (let i = 0; i < 5; i++) assert.equal((await app.request('/api/login', { password: 'wrong' })).status, 401);
  assert.equal((await app.request('/api/login', { password })).status, 429);
  app.advance(15 * 60_000 + 1);
  await app.login();
});
