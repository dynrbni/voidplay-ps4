import { z } from 'zod';

export const collectionKey = 'voidplay.collections.v1';
const ids = z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80)).max(500);
const collectionSchema = z.strictObject({
  version: z.literal(1), favorites: ids, library: ids, reduceMotion: z.boolean()
});
export type Collections = z.infer<typeof collectionSchema>;
export type CollectionName = 'favorites' | 'library';
export const emptyCollections: Collections = { version: 1, favorites: [], library: [], reduceMotion: false };

export function parseCollections(raw: string | null): Collections {
  return raw === null ? { ...emptyCollections } : collectionSchema.parse(JSON.parse(raw));
}

export function toggleCollection(data: Collections, name: CollectionName, id: string): Collections {
  return { ...data, [name]: data[name].includes(id) ? data[name].filter(value => value !== id) : [...data[name], id] };
}
