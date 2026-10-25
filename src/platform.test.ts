import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canCleanDownloadedFile, canInstall } from './platform/interfaces.ts';
import type { InstallEvidence } from './platform/interfaces.ts';
import { desktopMockStorage, unavailableDownloads, unavailableInstallation, unsupportedConsoleStorage } from './platform/adapters.ts';
import { metadataSchema } from '../shared/catalog.ts';
import { testEntry } from '../shared/fixtures.ts';
test('desktop storage is explicitly mock; unsupported/error states do not invent capacity', async () => {
  const mock = await desktopMockStorage.inspect();
  assert.equal(mock.provenance, 'mock');
  const unsupported = await unsupportedConsoleStorage.inspect('/app0');
  assert.equal(unsupported.status, 'unsupported'); assert.equal(unsupported.provenance, 'unavailable');
  assert.equal('availableBytes' in unsupported, false);
});
test('download completion cannot authorize installation or cleanup; each gate is required', async () => {
  const evidence: InstallEvidence = { authorized: true, compatible: true, integrity: 'verified', storage: { status: 'available', provenance: 'verified', target: 'test only', totalBytes: 2000, availableBytes: 1000, observedAt: new Date().toISOString(), evidence: 'unit fixture' }, requiredBytes: 100, installation: 'confirmed' };
  assert.equal(canCleanDownloadedFile(evidence), true);
  for (const patch of [{ authorized: false }, { compatible: false }, { integrity: 'unverified' as const }, { requiredBytes: NaN }, { requiredBytes: 0 }, { requiredBytes: 2001 }, { storage: await desktopMockStorage.inspect() }, { storage: await unsupportedConsoleStorage.inspect() }]) { assert.equal(canInstall({ ...evidence, ...patch }), false); assert.equal(canCleanDownloadedFile({ ...evidence, ...patch }), false); }
  assert.equal(canCleanDownloadedFile({ ...evidence, installation: 'unconfirmed' }), false);
  const entry = metadataSchema.parse(testEntry());
  await assert.rejects(unavailableDownloads.start(entry, 'primary', new AbortController().signal), /unavailable/);
  await assert.rejects(unavailableInstallation.install(entry, evidence), /unavailable/);
});
