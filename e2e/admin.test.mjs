import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPasswordRecord } from '../server/password.ts';
import { testEntry } from '../shared/fixtures.ts';
import { emptyWorkspace, exportManifest, updateWorkspace } from '../shared/catalog.ts';
let session = `voidplay-admin-${process.pid}`;
function browser(...args) {
  const result = spawnSync(process.env.AGENT_BROWSER_BIN ?? 'agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 35000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const response = JSON.parse(result.stdout); assert.equal(response.success, true, JSON.stringify(response)); return response.data;
}
const evaluate = script => browser('eval', script).result;
const click = name => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const wait = script => {
  try { browser('wait', '--fn', `Boolean(${script})`); }
  catch (error) { throw new Error(`Browser condition failed: ${script}\n${evaluate('document.querySelector("[role=alert]")?.textContent ?? document.body.innerText.slice(0, 2000)')}`, { cause: error }); }
};
const store = process.env.VOIDPLAY_URL ?? 'http://127.0.0.1:4175/';
function screenshot(name) { evaluate('(async()=>{window.scrollTo(0,0);await document.fonts.ready;return true;})()'); browser('screenshot', `artifacts/owner-${name}.png`); }

test('password login, private authoring, three sources, trailers and publication work end to end', { timeout: 240000 }, async () => {
  mkdirSync('artifacts', { recursive: true });
  const directory = await mkdtemp(join(tmpdir(), 'voidplay-owner-e2e-'));
  const password = 'fixture-owner-password';
  await writeFile(join(directory, 'credentials.json'), JSON.stringify(await createPasswordRecord(password)), { mode: 0o600 });
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import { startOwnerServer } from './server/owner.ts';
    import { writeFile } from 'node:fs/promises';
    import { join, resolve } from 'node:path';
    const directory=process.env.VP_TEST_DIRECTORY;
    const app=await startOwnerServer({directory,assets:resolve('admin-dist'),port:0,publish:async manifest=>{
      await writeFile(join(directory,'submitted.json'),JSON.stringify(manifest));
      return {revision:manifest.revision,commit:'fixture-commit',catalogUrl:'https://example.com/catalog.json',storeUrl:'https://example.com/',state:'committed'};
    }});
    console.log(JSON.stringify({url:app.url}));
  `], { env: { ...process.env, VP_TEST_DIRECTORY: directory }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const admin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Fixture backend did not start.')), 10000);
      child.stdout.once('data', chunk => { clearTimeout(timer); resolve(JSON.parse(String(chunk)).url); });
      child.once('error', reject);
    });
    browser('open', admin); wait('document.querySelector("#owner-password")');
    screenshot('login');
    assert.equal(browser('a11y', '--tags', 'wcag2a,wcag2aa').counts.violations, 0);
    browser('find', 'label', 'Password', 'fill', 'wrong'); click('Sign in'); wait('document.querySelector("[role=alert]")');
    browser('find', 'label', 'Password', 'fill', password); click('Sign in'); wait('document.querySelector("#new-id")');
    assert.equal(evaluate('localStorage.length + sessionStorage.length'), 0);
    browser('find', 'label', 'New entry ID', 'fill', 'first-entry'); click('Create'); click('Save draft');
    wait('document.querySelector(".notice")?.textContent.includes("Draft saved")');
    click('Stage published snapshot'); wait('document.querySelector(".validation")');
    const fixture = testEntry('first-entry');
    for (const key of ['title', 'summary', 'description', 'author', 'version', 'coverUrl', 'heroUrl', 'fileFormat', 'releaseNotes', 'license']) browser('fill', `#${key}`, fixture[key]);
    evaluate('(()=>{const input=document.querySelector("#releaseDate");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"2026-10-25");input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
    browser('find', 'label', 'Genres (comma separated)', 'fill', 'Puzzle, Adventure');
    browser('find', 'label', 'YouTube trailer URL (optional)', 'fill', 'https://youtu.be/M7lc1UVf-VE');
    browser('find', 'label', 'Interface languages (comma separated)', 'fill', 'English, Indonesian');
    browser('find', 'label', 'File size (bytes)', 'fill', '1024');
    browser('find', 'label', 'Compatibility notes', 'fill', fixture.compatibility.notes);
    browser('check', '.wide.checkbox input');
    browser('find', 'label', 'Authorization statement', 'fill', fixture.redistribution.statement);
    for (let i = 1; i <= 3; i++) {
      click('Add source');
      browser('fill', `[aria-label="Source ${i} provider"]`, `Fixture mirror ${i}`);
      browser('fill', `[aria-label="Source ${i} url"]`, `https://example.com/fixture-${i}.pkg`);
      browser('fill', `[aria-label="Source ${i} sha256"]`, 'a'.repeat(64));
      browser('fill', `[aria-label="Source ${i} expected size"]`, String(i * 1024));
    }
    assert.equal(evaluate('Array.from(document.querySelectorAll("button")).find(e=>e.textContent === "Add source").disabled'), true);
    click('Preview entry'); wait('document.querySelector(".entry-preview")');
    assert.equal(evaluate('document.querySelector("iframe") === null'), true);
    screenshot('preview');
    browser('network', 'route', '**/www.youtube-nocookie.com/embed/**', '--body', '<p>Trailer fixture</p>');
    click('Load trailer'); wait('document.querySelector("iframe")');
    assert.equal(evaluate('document.querySelector("iframe").src'), 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0');
    click('Edit metadata'); wait('document.querySelector("#title")'); click('Stage published snapshot'); wait('document.querySelector(".notice")?.textContent.includes("snapshot is ready")');
    browser('fill', '#title', 'Private draft edit'); click('Save draft'); wait('document.querySelector(".notice")?.textContent.includes("Draft saved")');
    click('Publish to Pages'); wait('document.querySelector(".notice")?.textContent.includes("Catalog committed")');
    const published = JSON.parse(await readFile(join(directory, 'submitted.json'), 'utf8'));
    assert.equal(published.entries[0].title, fixture.title);
    assert.equal(published.entries[0].sources.length, 3);
    assert.deepEqual(published.entries[0].genres, ['Puzzle', 'Adventure']);
    assert.equal(published.entries[0].trailerUrl, 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
    screenshot('editor');
    assert.equal(browser('a11y', '--tags', 'wcag2a,wcag2aa').counts.violations, 0);
    click('Unpublish'); wait('document.querySelector(".notice")?.textContent.includes("Entry unpublished")');
    click('Publish to Pages'); wait('document.querySelector(".notice")?.textContent.includes("Catalog committed")');
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'submitted.json'), 'utf8')).entries, []);
    browser('set', 'viewport', '390', '844'); assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true); screenshot('mobile');
    click('Sign out'); wait('document.querySelector("#owner-password")');
    browser('reload'); wait('document.querySelector("#owner-password")');
  } finally {
    browser('close');
    if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); }
    await rm(directory, { recursive: true, force: true });
  }
});
test('one published catalog supplies Discover, Browse, Search and direct detail routes', { timeout: 90000 }, () => {
  session = `voidplay-published-${process.pid}`;
  const manifest = exportManifest(updateWorkspace(emptyWorkspace(), 0, { ...testEntry(), genres: ['Puzzle'], trailerUrl: 'https://youtu.be/M7lc1UVf-VE' }, 'publish'));
  try {
    browser('open', store);
    browser('network', 'route', '**/catalog.json', '--body', JSON.stringify(manifest)); browser('reload');
    wait('document.querySelector(".featured h1")?.textContent === "Authorized test tool"');
    assert.equal(evaluate('document.querySelector(".hero-disclosure").textContent.includes("Demo")'), false);
    click('Browse'); wait('document.querySelector(".catalog-page:not([hidden])") || location.hash === "#/browse"');
    assert.equal(evaluate('Array.from(document.querySelectorAll(".app-card")).filter(e=>e.getClientRects().length).length'), 1);
    click('Search'); browser('find', 'label', 'Search applications', 'fill', 'Puzzle');
    wait('Array.from(document.querySelectorAll(".app-card")).some(e=>e.getClientRects().length && e.textContent.includes("Authorized test tool"))');
    browser('find', 'role', 'button', 'click', '--name', 'View Authorized test tool', '--exact');
    wait('document.querySelector(".detail-page")');
    assert.equal(evaluate('document.querySelector(".download-to-console").disabled'), true);
    assert.equal(evaluate('document.querySelectorAll(".download-sources a").length'), 1);
    assert.equal(evaluate('document.querySelector(".item-metadata").textContent.includes("Puzzle")'), true);
    browser('network', 'route', '**/www.youtube-nocookie.com/embed/**', '--body', '<p>Trailer fixture</p>');
    click('Load trailer'); wait('document.querySelector(".trailer iframe")');
    assert.equal(evaluate('document.querySelector(".trailer iframe").src'), 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0');
    screenshot('published-detail');
    browser('reload'); wait('document.querySelector(".detail-page")');
    browser('network', 'unroute', '**/catalog.json');
    browser('network', 'route', '**/catalog.json', '--body', JSON.stringify({ ...manifest, revision: 2, entries: [] })); browser('reload');
    wait('Array.from(document.querySelectorAll("h1")).some(e=>e.getClientRects().length && e.textContent === "That discovery isn’t here.")');
    click('Discover'); wait('Array.from(document.querySelectorAll("h1")).some(e=>e.getClientRects().length && e.textContent === "No applications yet")');
    const longEntry = { ...manifest.entries[0], title: 'A'.repeat(100), summary: 'B'.repeat(240), description: 'Long description. '.repeat(500) };
    browser('network', 'unroute', '**/catalog.json');
    browser('network', 'route', '**/catalog.json', '--body', JSON.stringify({ ...manifest, revision: 3, entries: [longEntry] })); browser('reload');
    wait('Boolean(document.querySelector(".featured"))');
    for (const [width, height] of [[1366,768],[390,844]]) {
      browser('set', 'viewport', String(width), String(height));
      assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      assert.equal(evaluate('document.querySelector(".featured .hero-actions").getBoundingClientRect().bottom < document.querySelector(".home-shelves").getBoundingClientRect().top'), true);
    }
    click('View application'); wait('Boolean(document.querySelector(".detail-page"))');
    assert.equal(evaluate('document.querySelector(".detail-information p").textContent.length'), longEntry.description.trim().length);
    assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  } finally { browser('close'); }
});
