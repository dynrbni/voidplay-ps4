import { spawn } from 'node:child_process';
import { z } from 'zod';
import { manifestSchema } from '../shared/catalog.ts';
import type { Manifest } from '../shared/catalog.ts';

export const repository = 'dynrbni/voidplay-ps4';
export const deploymentBranch = 'gh-pages';
export const catalogUrl = 'https://dynrbni.github.io/voidplay-ps4/catalog.json';
export const storeUrl = 'https://dynrbni.github.io/voidplay-ps4/';
export const publicationSchema = z.strictObject({ revision: z.number().int().nonnegative(), commit: z.string(), catalogUrl: z.string().url(), storeUrl: z.string().url(), state: z.enum(['committed', 'live']) });
export type Publication = z.infer<typeof publicationSchema>;
export class CatalogConflict extends Error {}

export async function checkPublication(current: Publication): Promise<Publication> {
  const response = await fetch(catalogUrl, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return current;
  const manifest = manifestSchema.parse(await response.json());
  return !manifest.previewMode && manifest.revision >= current.revision ? { ...current, state: 'live' } : current;
}

export function ghJson(args: string[], body?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const process = spawn('gh', ['api', ...args, ...(body === undefined ? [] : ['--input', '-'])], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errors = '';
    const timeout = setTimeout(() => process.kill('SIGTERM'), 30_000);
    process.stdout.on('data', chunk => { output += String(chunk); if (output.length > 12_000_000) process.kill('SIGTERM'); });
    process.stderr.on('data', chunk => { if (errors.length < 3000) errors += String(chunk); });
    process.on('error', () => { clearTimeout(timeout); reject(new Error('GitHub CLI is unavailable. Install gh and sign in on this Mac.')); });
    process.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) { reject(new Error(/404/.test(errors) ? 'Pages deployment branch/catalog is not initialized. Run the Pages deployment command first.' : /409|422/.test(errors) ? 'GitHub catalog changed during publication. Reload its status before retrying.' : 'GitHub request failed. Check this Mac’s gh authentication, permissions and network.')); return; }
      try { resolve(JSON.parse(output)); } catch { reject(new Error('GitHub returned an invalid response.')); }
    });
    process.stdin.on('error', () => {});
    process.stdin.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

export async function publishCatalog(value: Manifest): Promise<Publication> {
  const manifest = manifestSchema.parse(value);
  if (manifest.previewMode) throw new Error('Mock catalogs cannot be published through the owner server.');
  const path = `repos/${repository}/contents/catalog.json`;
  const current = z.object({ sha: z.string(), content: z.string(), encoding: z.literal('base64') }).parse(await ghJson([`${path}?ref=${deploymentBranch}`]));
  const previous = manifestSchema.parse(JSON.parse(Buffer.from(current.content, 'base64').toString('utf8')));
  if (previous.revision >= manifest.revision) throw new CatalogConflict('The public catalog revision is already equal or newer. Reload status before publishing; no file was changed.');
  const body = { message: `feat(catalog): publish owner catalog revision ${manifest.revision}`, branch: deploymentBranch, sha: current.sha, content: Buffer.from(JSON.stringify(manifest, null, 2) + '\n').toString('base64') };
  const result = z.object({ commit: z.object({ sha: z.string() }) }).parse(await ghJson([path, '--method', 'PUT'], body));
  return { revision: manifest.revision, commit: result.commit.sha, catalogUrl, storeUrl, state: 'committed' };
}
