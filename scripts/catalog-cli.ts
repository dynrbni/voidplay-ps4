import { readFile, open, rename, unlink } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { manifestSchema } from '../shared/catalog.ts';
import type { Manifest } from '../shared/catalog.ts';
export async function readManifest(path: string): Promise<Manifest> {
  const file = await open(path, 'r');
  try { if ((await file.stat()).size > 8_000_000) throw new Error('Catalog exceeds 8 MB.'); return manifestSchema.parse(JSON.parse(await file.readFile('utf8'))); } finally { await file.close(); }
}
export async function importCatalog(source: string, target: string, expectedRevision: number) {
  const incoming = await readManifest(source);
  const lock = `${target}.lock`;
  const handle = await open(lock, 'wx', 0o600);
  const temporary = join(dirname(target), `.catalog-${randomUUID()}.tmp`);
  try {
    const current = await readManifest(target);
    if (current.revision !== expectedRevision) throw new Error(`Stale base: expected ${expectedRevision}, found ${current.revision}.`);
    if (incoming.previewMode || incoming.revision <= current.revision) throw new Error('Import requires a newer published revision with preview mode disabled.');
    const file = await open(temporary, 'wx', 0o644);
    try { await file.writeFile(JSON.stringify(incoming, null, 2) + '\n'); await file.sync(); } finally { await file.close(); }
    await rename(temporary, target);
    return incoming;
  } finally { await unlink(temporary).catch(() => {}); await handle.close(); await unlink(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [action, source, flag, expected] = process.argv.slice(2);
    if (action === 'validate') {
      const path = resolve(source ?? 'public/catalog.json');
      const catalog = await readManifest(path);
      // Validate the preview fixture too; public builds must never bypass either boundary.
      if (catalog.previewMode) { const { parseCatalog } = await import('../src/catalog.ts'); parseCatalog(JSON.parse(await readFile('public/catalog.mock.json', 'utf8'))); }
      console.log(`Valid catalog: revision ${catalog.revision}, ${catalog.entries.length} published entries, preview=${catalog.previewMode}.`);
    } else if (action === 'import' && source && flag === '--expected-revision' && expected !== undefined && /^\d+$/.test(expected)) {
      const result = await importCatalog(resolve(source), resolve('public/catalog.json'), Number(expected));
      console.log(`Imported revision ${result.revision}. Review the Git diff before committing.`);
    } else throw new Error('Usage: npm run catalog:validate -- [file] OR npm run catalog:import -- export.json --expected-revision N');
  } catch (error) { console.error(error instanceof Error ? error.message : 'Catalog operation failed.'); process.exitCode = 1; }
}
