export const pages = ['discover', 'browse', 'search', 'favorites', 'downloads', 'library', 'settings'] as const;
export type Page = typeof pages[number];
export type Route = { page: Page } | { page: 'item'; id: string } | { page: 'missing' };

export function parseRoute(hash: string): Route {
  if (!hash || hash === '#/' || hash === '#') return { page: 'discover' };
  const path = hash.replace(/^#\//, '');
  if (pages.includes(path as Page)) return { page: path as Page };
  const match = /^item\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  return match?.[1] ? { page: 'item', id: match[1] } : { page: 'missing' };
}

export function routeHash(route: Route): string {
  return `#/${route.page === 'item' ? `item/${route.id}` : route.page}`;
}
