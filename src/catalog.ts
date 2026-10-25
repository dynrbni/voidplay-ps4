import { z } from 'zod';

const artworkPath = z.string().regex(/^\/art\/[a-z0-9-]+\.(?:svg|webp|png|jpg)$/);
const entrySchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
  category: z.enum(['Utilities', 'Games', 'Media']),
  mock: z.literal(true),
  coverUrl: artworkPath.optional(),
  heroUrl: artworkPath.optional(),
  summary: z.string().trim().min(1).max(240).optional(),
  author: z.string().trim().min(1).max(120).optional(),
  version: z.string().trim().min(1).max(80).optional(),
  license: z.string().trim().min(1).max(500).optional(),
  releaseNotes: z.string().trim().min(1).max(5000).optional(),
  screenshots: z.array(z.strictObject({ url: artworkPath, description: z.string().trim().min(1).max(300) })).max(12).optional(),
  compatibilityNotes: z.string().trim().min(1).max(1000)
});

export type CatalogEntry = z.infer<typeof entrySchema>;

export function parseCatalog(value: unknown): CatalogEntry[] {
  const entries = z.array(entrySchema).max(500).parse(value);
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) {
    throw new Error('Catalog IDs must be unique.');
  }
  return entries;
}

export function filterCatalog(entries: CatalogEntry[], query: string, category: string): CatalogEntry[] {
  const term = query.trim().toLowerCase();
  return entries.filter(entry =>
    (category === 'All' || entry.category === category) &&
    `${entry.title} ${entry.description} ${entry.category}`.toLowerCase().includes(term)
  );
}

export function sortCatalog(entries: CatalogEntry[], order: string): CatalogEntry[] {
  return order === 'title' ? [...entries].sort((a, b) => a.title.localeCompare(b.title, 'en')) : entries;
}

export async function loadCatalog(signal: AbortSignal, request: typeof fetch = fetch): Promise<CatalogEntry[]> {
  const response = await request('/catalog.mock.json', { signal });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
  return parseCatalog(await response.json());
}
