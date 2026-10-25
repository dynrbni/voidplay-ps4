import { z } from 'zod';
import { workspaceSchema } from '../shared/catalog.ts';
import type { Draft, Workspace } from '../shared/catalog.ts';

const publicationSchema = z.strictObject({ revision: z.number().int().nonnegative(), commit: z.string(), catalogUrl: z.string().url(), storeUrl: z.string().url(), state: z.enum(['committed', 'live']) });
export type Publication = z.infer<typeof publicationSchema>;
export type OwnerApi = ReturnType<typeof createOwnerApi>;

export function createOwnerApi(base: string, token: string, expired: () => void) {
  async function request(path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(40_000) });
    const value: unknown = await response.json();
    if (!response.ok) {
      if (response.status === 401) expired();
      throw new Error(z.object({ error: z.string() }).safeParse(value).data?.error ?? `Owner request failed (${response.status}).`);
    }
    return value;
  }
  return {
    async load() { return workspaceSchema.parse(await request('/api/workspace')); },
    async action(expectedRevision: number, draft: Draft, action: 'save' | 'publish' | 'unpublish') { return workspaceSchema.parse(await request('/api/action', { expectedRevision, draft, action })); },
    async import(expectedRevision: number, workspace: Workspace) { return workspaceSchema.parse(await request('/api/import', { expectedRevision, workspace })); },
    async publish(expectedRevision: number) { return publicationSchema.parse(await request('/api/publish', { expectedRevision })); },
    async publication() { return publicationSchema.nullable().parse(await request('/api/publication')); },
    async checkPublication() { return publicationSchema.nullable().parse(await request('/api/publication/check', {})); },
    async logout() { await request('/api/logout', {}); }
  };
}
