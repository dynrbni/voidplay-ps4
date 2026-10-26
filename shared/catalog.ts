import { z } from 'zod';
import { youtubeWatchUrl } from './youtube.ts';

const text = (max: number) => z.string().trim().min(1).max(max);
export const idSchema = text(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const categories = ['Utilities', 'Games', 'Media'] as const;
const bytes = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0);
const optionalText = (max: number) => z.string().trim().max(max).default('');
const optionalValue = <T extends z.ZodType>(schema: T) => z.union([z.string().trim().length(0), schema]).optional();
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
  id: z.union([z.literal(''), idSchema]).default(''), provider: optionalText(100), url: optionalValue(httpsUrl), expectedSize: bytes,
  sha256: z.union([z.literal(''), z.string().regex(/^[a-fA-F0-9]{64}$/, 'SHA-256 must contain 64 hexadecimal characters.')]).default(''),
  authentication: z.strictObject({ required: z.boolean().default(false), instructions: optionalText(500) }).default({ required: false, instructions: '' })
});
const languageList = z.array(text(80)).max(100);
const genres = z.array(text(60)).max(12).refine(values => new Set(values.map(value => value.toLowerCase())).size === values.length, 'Genres must be unique.');
const trailerUrl = text(2000).transform((value, ctx) => {
  const url = youtubeWatchUrl(value);
  if (!url) { ctx.addIssue({ code: 'custom', message: 'Use an HTTPS YouTube video URL.' }); return z.NEVER; }
  return url;
});
export const metadataSchema = z.strictObject({
  id: idSchema, title: optionalText(100), summary: optionalText(240), description: optionalText(10000),
  category: z.enum(categories).default('Utilities'), author: optionalText(120), version: optionalText(80),
  genres: genres.default([]), trailerUrl: optionalValue(trailerUrl),
  releaseDate: z.union([z.literal(''), z.iso.date()]).default(''), coverUrl: optionalValue(artworkUrl), heroUrl: optionalValue(artworkUrl),
  screenshots: z.array(z.strictObject({ url: optionalValue(artworkUrl), description: optionalText(300) })).max(12).default([]).transform(shots => shots.filter(shot => shot.url).map(shot => ({ ...shot, url: shot.url! }))),
  languages: z.strictObject({ interface: languageList.default([]), audio: languageList.default([]), subtitles: languageList.default([]) }).default({ interface: [], audio: [], subtitles: [] }),
  fileSize: bytes, fileFormat: optionalText(40),
  compatibility: z.strictObject({ status: z.enum(['unverified', 'verified']).default('unverified'), firmwares: z.array(text(40)).max(30).default([]), notes: optionalText(2000), evidence: optionalText(2000) }).default({ status: 'unverified', firmwares: [], notes: '', evidence: '' }),
  releaseNotes: optionalText(5000), license: optionalText(2000),
  redistribution: z.strictObject({ authorized: z.boolean().default(false), statement: optionalText(2000), referenceUrl: optionalValue(httpsUrl) }).default({ authorized: false, statement: '' }),
  sources: z.array(sourceSchema).max(3).default([]).transform(sources => sources.filter(source => source.url).map((source, index) => ({ ...source, id: source.id || `mirror-${index + 1}`, url: source.url! })))
}).superRefine((entry, ctx) => {
  if (/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/.test(JSON.stringify(entry))) ctx.addIssue({ code: 'custom', message: 'Credential or private-key markers cannot be published.' });
  if (new Set(entry.sources.map(source => source.id)).size !== entry.sources.length) ctx.addIssue({ code: 'custom', path: ['sources'], message: 'Source IDs must be unique within an entry.' });
  if (entry.compatibility.status === 'verified' && (!entry.compatibility.firmwares.length || !entry.compatibility.evidence)) ctx.addIssue({ code: 'custom', path: ['compatibility'], message: 'Verified compatibility requires firmware versions and test evidence. Choose Unverified when unknown.' });
}).transform(entry => ({ ...entry, title: entry.title || entry.id }));
export type PublishedEntry = z.infer<typeof metadataSchema>;
// Drafts retain the same shape but can contain empty, unfinished form values.
export const draftSchema = z.strictObject({
  id: idSchema, title: z.string().max(100), summary: z.string().max(240), description: z.string().max(10000), category: z.enum(categories),
  author: z.string().max(120), version: z.string().max(80), releaseDate: z.string().max(20), coverUrl: z.string().max(2000), heroUrl: z.string().max(2000),
  genres: z.array(z.string().max(60)).max(12).default([]), trailerUrl: z.string().max(2000).optional(),
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
export const newDraft = (id: string): Draft => ({ id, title: '', summary: '', description: '', category: 'Utilities', author: '', version: '', releaseDate: '', coverUrl: '', heroUrl: '', genres: [], screenshots: [], languages: { interface: [], audio: [], subtitles: [] }, fileSize: 0, fileFormat: '', compatibility: { status: 'unverified', firmwares: [], notes: '', evidence: '' }, releaseNotes: '', license: '', redistribution: { authorized: false, statement: '' }, sources: [] });

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
