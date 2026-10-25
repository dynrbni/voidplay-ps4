import type { CatalogNetwork, DownloadAdapter, InstallationAdapter, StorageAdapter } from './interfaces.ts';
export const desktopMockStorage: StorageAdapter = {
  async inspect() {
    return { status: 'available', provenance: 'mock', target: 'Desktop preview fixture (not a PS4 mount)', totalBytes: 512 * 1024 ** 3, availableBytes: 128 * 1024 ** 3, observedAt: new Date().toISOString(), evidence: 'Fixed demonstration values. No browser quota or console storage query.' };
  }
};
export const unsupportedConsoleStorage: StorageAdapter = {
  async inspect(target) { return { status: 'unsupported', provenance: 'unavailable', target: target ?? null, message: 'Native bridge and console storage measurement have not been verified.' }; }
};
export function httpCatalog(url: string, request: typeof fetch = fetch): CatalogNetwork {
  return { async fetchCatalog(signal) {
    const response = await request(url, { signal, credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
    return response.json() as Promise<unknown>;
  } };
}
const unavailable = async (): Promise<never> => { throw new Error('Console transfer/installation adapter is unavailable. No operation was performed.'); };
export const unavailableDownloads: DownloadAdapter = { start: unavailable, pause: unavailable, cancel: unavailable };
export const unavailableInstallation: InstallationAdapter = { install: unavailable };
