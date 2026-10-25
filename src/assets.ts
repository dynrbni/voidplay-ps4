export function publicAsset(path: string): string {
  return path.startsWith('/') ? `${(import.meta.env?.BASE_URL ?? '/')}${path.slice(1)}` : path;
}
