import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyWorkspace, exportManifest, metadataSchema, newDraft, updateWorkspace, validateImport, workspaceSchema } from './catalog.ts';
import { testEntry } from './fixtures.ts';
import { importCatalog } from '../scripts/catalog-cli.ts';

test('draft edits cannot leak into published snapshots; unpublish removes the final entry', () => {
  let workspace = updateWorkspace(emptyWorkspace(), 0, newDraft('first'), 'save');
  assert.deepEqual(exportManifest(workspace).entries, []);
  workspace = updateWorkspace(workspace, 1, testEntry('first'), 'publish');
  assert.equal(exportManifest(workspace).entries[0]?.title, 'Authorized test tool');
  workspace = updateWorkspace(workspace, 2, { ...testEntry('first'), title: 'Unpublished edit', sources: [] }, 'save');
  assert.equal(exportManifest(workspace).entries[0]?.title, 'Authorized test tool');
  assert.equal(workspace.records[0]?.publishedRevision, 2);
  workspace = updateWorkspace(workspace, 3, workspace.records[0]!.draft, 'unpublish');
  assert.equal(exportManifest(workspace).previewMode, false);
  assert.deepEqual(exportManifest(workspace).entries, []);
});
test('publication accepts incomplete metadata but rejects unsafe values and fake verification', () => {
  const entry = testEntry();
  assert.equal(metadataSchema.parse(entry).id, entry.id);
  for (const url of ['javascript:alert(1)', 'http://example.com/a', 'https://user:password@example.com/a', 'https://127.0.0.1/a', 'https://192.168.1.1/a', 'https://localhost/a', 'https://[::1]/a', 'https://example.com/a?token=secret', 'https://example.com/a?X-Amz-Signature=secret', 'https://example.com/a#password']) assert.equal(metadataSchema.safeParse({ ...entry, sources: [{ ...entry.sources[0], url }] }).success, false, url);
  for (const patch of [{ releaseDate: '2026-02-30' }, { sources: Array(4).fill(entry.sources[0]) }, { sources: [{ ...entry.sources[0], sha256: 'abc' }] }, { compatibility: { ...entry.compatibility, status: 'verified' } }, { githubToken: 'secret' }, { description: 'github_pat_' + 'x'.repeat(30) }]) assert.equal(metadataSchema.safeParse({ ...entry, ...patch }).success, false, JSON.stringify(patch));
});
test('workspace rejects duplicate or mismatched IDs, stale edits, conflicting backups and invalid revisions', () => {
  const workspace = updateWorkspace(emptyWorkspace(), 0, testEntry(), 'publish');
  assert.throws(() => workspaceSchema.parse({ ...workspace, records: [...workspace.records, ...workspace.records] }));
  assert.throws(() => workspaceSchema.parse({ ...workspace, revision: 0 }));
  assert.throws(() => workspaceSchema.parse({ ...workspace, records: [{ ...workspace.records[0], id: 'another' }] }));
  assert.throws(() => updateWorkspace(workspace, 0, testEntry(), 'save'), /changed/);
  assert.throws(() => validateImport(workspace, emptyWorkspace()), /older/);
  assert.throws(() => validateImport(workspace, { ...workspace, updatedAt: '2026-01-01T00:00:00.000Z' }), /Conflicting/);
});
test('atomic local publisher preserves the catalog on validation, revision and lock failures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'voidplay-catalog-'));
  try {
    const target = join(dir, 'catalog.json'); const source = join(dir, 'export.json');
    const initial = { schemaVersion: 1, revision: 0, publishedAt: new Date().toISOString(), previewMode: true, entries: [] };
    await writeFile(target, JSON.stringify(initial));
    const manifest = exportManifest(updateWorkspace(emptyWorkspace(), 0, testEntry(), 'publish'));
    await writeFile(source, JSON.stringify(manifest));
    await assert.rejects(importCatalog(source, target, 1), /Stale/);
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), initial);
    await writeFile(`${target}.lock`, 'another process');
    await assert.rejects(importCatalog(source, target, 0), /EEXIST/);
    await rm(`${target}.lock`);
    await importCatalog(source, target, 0);
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), manifest);
    await assert.rejects(importCatalog(source, target, 1), /newer/);
    await writeFile(source, JSON.stringify({ ...manifest, entries: [{ bad: true }] }));
    await assert.rejects(importCatalog(source, target, 1));
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), manifest);
  } finally { await rm(dir, { recursive: true }); }
});

test('one to three sources retain independent sizes, checksums and access requirements', () => {
  const draft = testEntry();
  const parsed = metadataSchema.parse({ ...draft, sources: [draft.sources[0], { ...draft.sources[0], id: 'archive', expectedSize: 2048, sha256: 'b'.repeat(64), authentication: { required: true, instructions: 'Sign in at the provider.' } }] });
  assert.equal(parsed.sources[1]?.expectedSize, 2048);
  assert.equal(parsed.sources[1]?.authentication.required, true);
});

test('an ID-only catalog entry publishes with honest empty defaults and optional mirrors', () => {
  const minimal = metadataSchema.parse({ id: 'minimal-entry' });
  assert.equal(minimal.title, 'minimal-entry'); assert.equal(minimal.fileSize, 0);
  assert.equal(minimal.redistribution.authorized, false); assert.deepEqual(minimal.sources, []);
  assert.deepEqual(minimal.languages.interface, []); assert.equal(minimal.compatibility.status, 'unverified');
  const workspace = updateWorkspace(emptyWorkspace(), 0, newDraft('minimal-entry'), 'publish');
  assert.equal(exportManifest(workspace).entries[0]?.title, 'minimal-entry');
  const source = metadataSchema.parse({ id: 'with-link', sources: [{ url: 'https://example.com/file.pkg' }] }).sources[0]!;
  assert.equal(source.id, 'mirror-1'); assert.equal(source.expectedSize, 0); assert.equal(source.sha256, '');
  assert.deepEqual(metadataSchema.parse({ id: 'blank-row', sources: [{ id: 'mirror-1', url: '' }] }).sources, []);
});
