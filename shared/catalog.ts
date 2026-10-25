import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const idSchema = text(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const categories = ['Utilities', 'Games', 'Media'] as const;
const bytes = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1);
export const httpsUrl = text(2000).superRefine((value, ctx) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateHost = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      /^\[/.test(host) || /^(0|10|127|169\.254|192\.168)\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) || !host.includes('.');
    const secret = Array.from(url.searchParams.keys()).some(key => /token|secret|password|credential|api.?key|signature|^x-amz-|^auth$/i.test(key));
    if (url.protocol !== 'https:' || url.username || url.password || privateHost || secret || url.hash) throw new Error();
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Use a public HTTPS URL without credentials, tokens or fragments.' });
  }
});
export const artworkUrl = z.union([z.string().regex(/^\/art\/[a-z0-9-]+\.(?:svg|webp|png|jpg)$/), httpsUrl]);
export const sourceSchema = z.strictObject({
  id: idSchema, provider: text(100), url: httpsUrl, expectedSize: bytes,
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/, 'SHA-256 must contain 64 hexadecimal characters.'),
  authentication: z.strictObject({ required: z.boolean(), instructions: z.string().trim().max(500) })
}).superRefine((source, ctx) => {
  if (source.authentication.required && !source.authentication.instructions) ctx.addIssue({ code: 'custom', path: ['authentication', 'instructions'], message: 'Describe how the user obtains access; never include credentials.' });
});
const languageList = z.array(text(80)).max(100);
export const metadataSchema = z.strictObject({
  id: idSchema, title: text(100), summary: text(240), description: text(10000),
  category: z.enum(categories), author: text(120), version: text(80),
  releaseDate: z.iso.date(), coverUrl: artworkUrl, heroUrl: artworkUrl,
  screenshots: z.array(z.strictObject({ url: artworkUrl, description: text(300) })).max(12),
  languages: z.strictObject({ interface: languageList.min(1), audio: languageList, subtitles: languageList }),
  fileSize: bytes, fileFormat: text(40),
  compatibility: z.strictObject({ status: z.enum(['unverified', 'verified']), firmwares: z.array(text(40)).max(30), notes: text(2000), evidence: z.string().trim().max(2000) }),
  releaseNotes: text(5000), license: text(2000),
  redistribution: z.strictObject({ authorized: z.literal(true), statement: text(2000), referenceUrl: httpsUrl.optional() }),
  sources: z.array(sourceSchema).min(1).max(3)
}).superRefine((entry, ctx) => {
  if (/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/.test(JSON.stringify(entry))) ctx.addIssue({ code: 'custom', message: 'Credential or private-key markers cannot be published.' });
  if (new Set(entry.sources.map(source => source.id)).size !== entry.sources.length) ctx.addIssue({ code: 'custom', path: ['sources'], message: 'Source IDs must be unique within an entry.' });
  if (entry.compatibility.status === 'verified' && (!entry.compatibility.firmwares.length || !entry.compatibility.evidence)) ctx.addIssue({ code: 'custom', path: ['compatibility'], message: 'Verified compatibility requires firmware versions and test evidence.' });
});
export type PublishedEntry = z.infer<typeof metadataSchema>;
// Drafts retain the same shape but can contain empty, unfinished form values.
export const draftSchema = z.strictObject({
  id: idSchema, title: z.string().max(100), summary: z.string().max(240), description: z.string().max(10000), category: z.enum(categories),
  author: z.string().max(120), version: z.string().max(80), releaseDate: z.string().max(20), coverUrl: z.string().max(2000), heroUrl: z.string().max(2000),
  screenshots: z.array(z.strictObject({ url: z.string().max(2000), description: z.string().max(300) })).max(12),
  languages: z.strictObject({ interface: languageList, audio: languageList, subtitles: languageList }),
  fileSize: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER), fileFormat: z.string().max(40),
  compatibility: z.strictObject({ status: z.enum(['unverified', 'verified']), firmwares: languageList, notes: z.string().max(2000), evidence: z.string().max(2000) }),
  releaseNotes: z.string().max(5000), license: z.string().max(2000),
  redistribution: z.strictObject({ authorized: z.boolean(), statement: z.string().max(2000), referenceUrl: z.string().max(2000).optional() }),
  sources: z.array(z.strictObject({ id: z.string().max(80), provider: z.string().max(100), url: z.string().max(2000), expectedSize: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER), sha256: z.string().max(64), authentication: z.strictObject({ required: z.boolean(), instructions: z.string().max(500) }) })).max(3)
});
export type Draft = z.infer<typeof draftSchema>;
const recordSchema = z.strictObject({ id: idSchema, revision, state: z.enum(['draft', 'published', 'unpublished']), draft: draftSchema, published: metadataSchema.optional(), publishedRevision: revision.optional() });
export const workspaceSchema = z.strictObject({ schemaVersion: z.literal(1), revision, updatedAt: z.iso.datetime(), records: z.array(recordSchema).max(500) }).superRefine((workspace, ctx) => {
  const ids = new Set<string>();
  for (const [index, record] of workspace.records.entries()) {
    if (ids.has(record.id) || record.id !== record.draft.id || record.published && record.id !== record.published.id) ctx.addIssue({ code: 'custom', path: ['records', index, 'id'], message: 'Entry IDs must be unique and consistent.' });
    ids.add(record.id);
    if (record.revision > workspace.revision || record.publishedRevision !== undefined && record.publishedRevision > record.revision || record.state !== 'draft' && !record.published || Boolean(record.published) !== (record.publishedRevision !== undefined)) ctx.addIssue({ code: 'custom', path: ['records', index], message: 'Invalid snapshot or revision history.' });
  }
});
export type Workspace = z.infer<typeof workspaceSchema>;
export const manifestSchema = z.strictObject({ schemaVersion: z.literal(1), revision, publishedAt: z.iso.datetime(), previewMode: z.boolean(), entries: z.array(metadataSchema).max(500) }).superRefine((manifest, ctx) => {
  if (new Set(manifest.entries.map(entry => entry.id)).size !== manifest.entries.length) ctx.addIssue({ code: 'custom', message: 'Catalog IDs must be unique.' });
  if (manifest.previewMode && manifest.entries.length) ctx.addIssue({ code: 'custom', message: 'Preview mode cannot contain published entries.' });
});
export type Manifest = z.infer<typeof manifestSchema>;
export const emptyWorkspace = (): Workspace => ({ schemaVersion: 1, revision: 0, updatedAt: new Date().toISOString(), records: [] });
export const newDraft = (id: string): Draft => ({ id, title: '', summary: '', description: '', category: 'Utilities', author: '', version: '', releaseDate: '', coverUrl: '', heroUrl: '', screenshots: [], languages: { interface: [], audio: [], subtitles: [] }, fileSize: 0, fileFormat: '', compatibility: { status: 'unverified', firmwares: [], notes: '', evidence: '' }, releaseNotes: '', license: '', redistribution: { authorized: false, statement: '' }, sources: [] });

export function updateWorkspace(value: Workspace, expectedRevision: number, draft: Draft, action: 'save' | 'publish' | 'unpublish'): Workspace {
  const workspace = workspaceSchema.parse(value);
  if (expectedRevision !== workspace.revision) throw new Error('Workspace changed. Reload before editing.');
  const input = draftSchema.parse(draft);
  const existing = workspace.records.find(record => record.id === input.id);
  if (action === 'unpublish' && !existing?.published) throw new Error('This entry has no published snapshot.');
  const nextRevision = workspace.revision + 1;
  const published = action === 'publish' ? metadataSchema.parse(input) : existing?.published;
  const record = { id: input.id, revision: nextRevision, state: action === 'publish' ? 'published' as const : action === 'unpublish' ? 'unpublished' as const : existing?.state ?? 'draft' as const, draft: input,
    ...(published ? { published, publishedRevision: action === 'publish' ? nextRevision : existing?.publishedRevision } : {}) };
  return workspaceSchema.parse({ ...workspace, revision: nextRevision, updatedAt: new Date().toISOString(), records: [...workspace.records.filter(item => item.id !== input.id), record] });
}

export function exportManifest(workspace: Workspace): Manifest {
  const valid = workspaceSchema.parse(workspace);
  return manifestSchema.parse({ schemaVersion: 1, revision: valid.revision, publishedAt: valid.updatedAt, previewMode: false, entries: valid.records.filter(record => record.state === 'published').map(record => record.published) });
}

export function validateImport(current: Workspace, incoming: unknown): Workspace {
  const next = workspaceSchema.parse(incoming);
  if (next.revision < current.revision) throw new Error('This backup is older than the open workspace. Use a separate browser profile to inspect it.');
  if (next.revision === current.revision && JSON.stringify(next) !== JSON.stringify(current)) throw new Error('Conflicting workspace at the same revision.');
  return next;
}
