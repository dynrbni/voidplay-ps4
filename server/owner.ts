import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { draftSchema, exportManifest, updateWorkspace, validateImport } from '../shared/catalog.ts';
import type { Manifest } from '../shared/catalog.ts';
import { passwordRecordSchema, verifyPassword } from './password.ts';
import { loadWorkspace, withWorkspaceLock, writePrivateJson } from './storage.ts';
import { CatalogConflict, checkPublication, publicationSchema, publishCatalog } from './github.ts';
import type { Publication } from './github.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const actionSchema = z.strictObject({ expectedRevision: z.number().int().nonnegative(), draft: draftSchema, action: z.enum(['save', 'publish', 'unpublish']) });
const revisionSchema = z.strictObject({ expectedRevision: z.number().int().nonnegative() });
const sessionLifetime = 60 * 60 * 1000;
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function jsonBody(request: IncomingMessage, limit = 2_000_000): Promise<unknown> {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') throw new HttpError(415, 'Send application/json.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += Buffer.byteLength(chunk);
    if (size > limit) throw new HttpError(413, 'Request is too large.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}

function send(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

type Options = { directory?: string; assets?: string; port?: number; publish?: (manifest: Manifest) => Promise<Publication>; checkPublication?: (current: Publication) => Promise<Publication>; now?: () => number };

export async function startOwnerServer(options: Options = {}) {
  const directory = options.directory ?? join(root, '.owner-data');
  const assets = resolve(options.assets ?? join(root, 'admin-dist'));
  const credentials = passwordRecordSchema.parse(JSON.parse(await readFile(join(directory, 'credentials.json'), 'utf8')));
  await loadWorkspace(directory);
  const sessions = new Map<string, number>();
  const now = options.now ?? Date.now;
  const failures: number[] = [];
  const pendingLogins = { count: 0 };
  let port = options.port ?? 5186;

  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; font-src 'self'; frame-src https://www.youtube-nocookie.com; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'");
    const origin = request.headers.origin;
    const allowed = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`, 'http://127.0.0.1:5185', 'http://127.0.0.1:4185', 'https://dynrbni.github.io']);
    try {
      if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host ?? '')) throw new HttpError(403, 'Unexpected request host.');
      if (origin && !allowed.has(origin)) throw new HttpError(403, 'This origin cannot access the owner backend.');
      if (origin) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
      }
      if (request.method === 'OPTIONS') {
        if (!origin) throw new HttpError(403, 'Origin required.');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        if (request.headers['access-control-request-private-network'] === 'true') response.setHeader('Access-Control-Allow-Private-Network', 'true');
        response.writeHead(204); response.end(); return;
      }
      const path = new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname;
      if (path === '/owner-config.json' && request.method === 'GET') { send(response, 200, { apiBase: '' }); return; }
      if (path === '/api/login' && request.method === 'POST') {
        if (!origin) throw new HttpError(403, 'Origin required.');
        while (failures.length && failures[0]! < now() - 15 * 60_000) failures.shift();
        if (failures.length + pendingLogins.count >= 5 || pendingLogins.count >= 2) { response.setHeader('Retry-After', '900'); throw new HttpError(429, 'Too many login attempts. Try again in 15 minutes.'); }
        pendingLogins.count++;
        let valid: boolean;
        try {
          const body = z.strictObject({ password: z.string().max(128) }).parse(await jsonBody(request, 512));
          valid = await verifyPassword(body.password, credentials);
        } finally { pendingLogins.count--; }
        if (!valid) { failures.push(now()); throw new HttpError(401, 'Incorrect password.'); }
        failures.length = 0;
        for (const [key, expiry] of sessions) if (expiry <= now()) sessions.delete(key);
        if (sessions.size >= 16) sessions.delete(sessions.keys().next().value!);
        const token = randomBytes(32).toString('base64url');
        const expiresAt = now() + sessionLifetime;
        sessions.set(createHash('sha256').update(token).digest('hex'), expiresAt);
        send(response, 200, { token, expiresAt }); return;
      }
      if (path.startsWith('/api/')) {
        const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? '');
        const session = match ? createHash('sha256').update(match[1]!).digest('hex') : '';
        if (!session || (sessions.get(session) ?? 0) <= now()) { sessions.delete(session); throw new HttpError(401, 'Session expired. Sign in again.'); }
        if (request.method === 'POST' && !origin) throw new HttpError(403, 'Origin required.');
        if (path === '/api/logout' && request.method === 'POST') { sessions.delete(session); send(response, 200, { ok: true }); return; }
        if (path === '/api/workspace' && request.method === 'GET') { send(response, 200, await loadWorkspace(directory)); return; }
        if (path === '/api/publication' && request.method === 'GET') {
          try { send(response, 200, publicationSchema.parse(JSON.parse(await readFile(join(directory, 'publication.json'), 'utf8')))); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; send(response, 200, null); }
          return;
        }
        if (path === '/api/publication/check' && request.method === 'POST') {
          z.strictObject({}).parse(await jsonBody(request, 512));
          let current;
          try { current = publicationSchema.parse(JSON.parse(await readFile(join(directory, 'publication.json'), 'utf8'))); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; send(response, 200, null); return; }
          const result = await (options.checkPublication ?? checkPublication)(current);
          const latest = await withWorkspaceLock(directory, async () => {
            const value = publicationSchema.parse(JSON.parse(await readFile(join(directory, 'publication.json'), 'utf8')));
            if (value.commit !== current.commit) return value;
            await writePrivateJson(directory, 'publication.json', result);
            return result;
          });
          send(response, 200, latest); return;
        }
        if (path === '/api/action' && request.method === 'POST') {
          const body = actionSchema.parse(await jsonBody(request));
          const next = await withWorkspaceLock(directory, async () => {
            const current = await loadWorkspace(directory);
            if (current.revision !== body.expectedRevision) throw new HttpError(409, 'Workspace changed. Reload before editing.');
            const workspace = updateWorkspace(current, body.expectedRevision, body.draft, body.action);
            await writePrivateJson(directory, 'workspace.json', workspace);
            return workspace;
          });
          send(response, 200, next); return;
        }
        if (path === '/api/import' && request.method === 'POST') {
          const body = revisionSchema.extend({ workspace: z.unknown() }).parse(await jsonBody(request, 8_000_000));
          const next = await withWorkspaceLock(directory, async () => {
            const current = await loadWorkspace(directory);
            if (current.revision !== body.expectedRevision) throw new HttpError(409, 'Workspace changed. Reload before importing.');
            const workspace = validateImport(current, body.workspace);
            await writePrivateJson(directory, 'workspace.json', workspace);
            return workspace;
          });
          send(response, 200, next); return;
        }
        if (path === '/api/publish' && request.method === 'POST') {
          const body = revisionSchema.parse(await jsonBody(request, 512));
          const publication = await withWorkspaceLock(directory, async () => {
            const workspace = await loadWorkspace(directory);
            if (workspace.revision !== body.expectedRevision) throw new HttpError(409, 'Workspace changed. Reload before publishing.');
            const result = await (options.publish ?? publishCatalog)(exportManifest(workspace));
            await writePrivateJson(directory, 'publication.json', result);
            return result;
          });
          send(response, 200, publication); return;
        }
        throw new HttpError(404, 'Endpoint unavailable.');
      }
      if (request.method !== 'GET') throw new HttpError(405, 'Method unavailable.');
      const local = resolve(assets, path === '/' ? 'index.html' : '.' + decodeURIComponent(path));
      if (!local.startsWith(assets + sep)) throw new HttpError(404, 'Not found.');
      let info;
      try { info = await stat(local); } catch { throw new HttpError(404, 'Admin build not found. Run npm run admin:build.'); }
      if (!info.isFile() || info.size > 8_000_000 || !mime[extname(local)]) throw new HttpError(404, 'Not found.');
      response.writeHead(200, { 'Content-Type': mime[extname(local)]! });
      response.end(await readFile(local));
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      if (error instanceof HttpError) send(response, error.status, { error: error.message });
      else if (error instanceof CatalogConflict) send(response, 409, { error: error.message });
      else if (error instanceof z.ZodError) send(response, 400, { error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n') });
      else if ((error as NodeJS.ErrnoException).code === 'EEXIST') send(response, 409, { error: 'Workspace is busy or a previous write left a lock. Retry after checking the owner backend.' });
      else send(response, 500, { error: error instanceof Error ? error.message : 'Owner operation failed.' });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  await new Promise<void>((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Owner server address unavailable.');
  port = address.port;
  return { server, url: `http://127.0.0.1:${port}` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startOwnerServer().then(({ server, url }) => {
    console.log(`Owner backend: ${url}\nPrivate workspace stays on this Mac. Leave this process running while editing or publishing.`);
    const stop = () => server.close(() => process.exit(0));
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  }).catch(() => { console.error('Owner backend could not start. Run npm run owner:setup, build the admin, and check port 5186.'); process.exitCode = 1; });
}
