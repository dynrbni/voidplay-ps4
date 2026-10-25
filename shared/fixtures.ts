import type { Draft } from './catalog.ts';
import { newDraft } from './catalog.ts';
// Metadata fixture only: example.com never hosts a package for this project.
export function testEntry(id = 'authorized-tool'): Draft {
  return { ...newDraft(id), title: 'Authorized test tool', summary: 'Schema and browser fixture.', description: 'Test-only homebrew metadata. No executable is distributed.', author: 'Test author', version: '1.0.0', releaseDate: '2026-10-25', coverUrl: '/art/orbit-workshop-hero.webp', heroUrl: '/art/orbit-workshop-hero.webp', languages: { interface: ['English'], audio: [], subtitles: [] }, fileSize: 1024, fileFormat: 'pkg', compatibility: { status: 'unverified', firmwares: [], notes: 'Not tested on any console.', evidence: '' }, releaseNotes: 'Test metadata.', license: 'Test fixture; no package included.', redistribution: { authorized: true, statement: 'Fixture author permits redistribution of this test metadata only.' }, sources: [{ id: 'primary', provider: 'Example test host', url: 'https://example.com/authorized-test.pkg', expectedSize: 1024, sha256: 'a'.repeat(64), authentication: { required: false, instructions: '' } }] };
}
