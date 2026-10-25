import type { PublishedEntry } from '../../shared/catalog.ts';
export type StorageReport =
  | { status: 'available'; provenance: 'verified' | 'mock'; target: string; totalBytes: number; availableBytes: number; observedAt: string; evidence: string }
  | { status: 'unavailable' | 'unsupported' | 'error'; provenance: 'unavailable'; target: string | null; message: string };
export interface StorageAdapter { inspect(target?: string): Promise<StorageReport> }
export interface CatalogNetwork { fetchCatalog(signal: AbortSignal): Promise<unknown> }
export type TransferStatus = { id: string; state: 'queued' | 'downloading' | 'paused' | 'downloaded' | 'failed'; receivedBytes: number; bytesPerSecond: number; error?: string };
export interface DownloadAdapter {
  start(entry: PublishedEntry, sourceId: string, signal: AbortSignal): Promise<TransferStatus>;
  pause(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}
export type InstallEvidence = { authorized: boolean; compatible: boolean; integrity: 'verified' | 'unverified' | 'failed'; storage: StorageReport; requiredBytes: number; installation: 'confirmed' | 'unconfirmed' | 'failed' };
export interface InstallationAdapter {
  install(entry: PublishedEntry, evidence: InstallEvidence): Promise<{ status: 'confirmed' | 'failed'; receipt?: string }>;
}
export function canInstall(evidence: InstallEvidence): boolean {
  return evidence.authorized && evidence.compatible && evidence.integrity === 'verified' &&
    Number.isSafeInteger(evidence.requiredBytes) && evidence.requiredBytes > 0 && evidence.storage.status === 'available' && evidence.storage.provenance === 'verified' &&
    Number.isSafeInteger(evidence.storage.totalBytes) && evidence.storage.totalBytes > 0 && Number.isSafeInteger(evidence.storage.availableBytes) && evidence.storage.availableBytes <= evidence.storage.totalBytes && evidence.storage.availableBytes >= evidence.requiredBytes;
}
export function canCleanDownloadedFile(evidence: InstallEvidence): boolean {
  return canInstall(evidence) && evidence.installation === 'confirmed';
}
