import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
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
const wait = script => browser('wait', '--fn', `Boolean(${script})`);
const admin = process.env.VOIDPLAY_ADMIN_URL ?? 'http://127.0.0.1:4185/';
const store = process.env.VOIDPLAY_URL ?? 'http://127.0.0.1:4175/';
function screenshot(name) { evaluate('(async()=>{window.scrollTo(0,0);await document.fonts.ready;return true;})()'); browser('screenshot', `artifacts/admin-${name}.png`); }
test('owner editor validates drafts, snapshots edits, previews, exports and unpublishes independently', { timeout: 150000 }, () => {
  mkdirSync('artifacts', { recursive: true });
  try {
    browser('open', admin); wait('document.querySelector("#new-id")');
    screenshot('empty');
    browser('fill', '#new-id', 'first-entry'); click('Create'); click('Save draft'); click('Stage published snapshot');
    wait('document.querySelector(".validation")');
    assert.equal(evaluate('JSON.parse(localStorage.getItem("voidplay.owner-workspace.v1")).records[0].state'), 'draft');
    const fixture = testEntry('first-entry');
    for (const key of ['title', 'summary', 'description', 'author', 'version', 'coverUrl', 'heroUrl', 'fileFormat', 'releaseNotes', 'license']) browser('fill', `#${key}`, fixture[key]);
    evaluate('(()=>{const input=document.querySelector("#releaseDate");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"2026-10-25");input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
    browser('find', 'label', 'Interface languages (comma separated)', 'fill', 'English, Indonesian');
    browser('find', 'label', 'File size (bytes)', 'fill', '1024');
    browser('find', 'label', 'Compatibility notes', 'fill', fixture.compatibility.notes);
    browser('check', '.wide.checkbox input');
    browser('find', 'label', 'Authorization statement', 'fill', fixture.redistribution.statement);
    click('Add source');
    for (const key of ['provider', 'url', 'sha256']) browser('fill', `[aria-label="Source 1 ${key}"]`, fixture.sources[0][key]);
    browser('check', '.source input[type="checkbox"]');
    click('Validate'); wait('document.querySelector(".validation")');
    browser('find', 'label', 'Access instructions (requirements only)', 'fill', 'Obtain access from the provider; no credentials stored.');
    click('Add source'); click('Add source');
    assert.equal(evaluate('Array.from(document.querySelectorAll("button")).find(e=>e.textContent === "Add source").disabled'), true);
    click('Remove source 3'); click('Remove source 2');
    click('Add screenshot');
    browser('find', 'label', 'Screenshot 1 URL', 'fill', fixture.coverUrl);
    browser('find', 'label', 'Screenshot 1 description', 'fill', 'Test artwork');
    click('Preview entry'); wait('document.querySelector(".entry-preview")');
    screenshot('preview');
    assert.equal(browser('a11y', '--tags', 'wcag2a,wcag2aa').counts.violations, 0);
    click('Edit metadata');
    click('Stage published snapshot');
    assert.equal(evaluate('document.querySelector(".validation")?.textContent ?? ""'), '');
    wait('document.querySelector(".notice")');
    assert.equal(evaluate('JSON.parse(localStorage.getItem("voidplay.owner-workspace.v1")).records[0].state'), 'published');
    browser('fill', '#title', 'Unpublished changed title'); click('Save draft');
    assert.equal(evaluate('JSON.parse(localStorage.getItem("voidplay.owner-workspace.v1")).records[0].published.title'), 'Authorized test tool');
    screenshot('editor');
    assert.equal(browser('a11y', '--tags', 'wcag2a,wcag2aa').counts.violations, 0);
    click('Export public catalog'); wait('document.querySelector(".notice").textContent.includes("Exported")');
    click('Unpublish');
    assert.equal(evaluate('JSON.parse(localStorage.getItem("voidplay.owner-workspace.v1")).records[0].state'), 'unpublished');
    browser('set', 'viewport', '390', '844');
    assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true); screenshot('mobile');
  } finally { browser('close'); }
});
test('one published catalog supplies Discover, Browse, Search and direct detail routes', { timeout: 90000 }, () => {
  session = `voidplay-published-${process.pid}`;
  const manifest = exportManifest(updateWorkspace(emptyWorkspace(), 0, testEntry(), 'publish'));
  try {
    browser('open', store);
    browser('network', 'route', '**/catalog.json', '--body', JSON.stringify(manifest)); browser('reload');
    wait('document.querySelector(".featured h1")?.textContent === "Authorized test tool"');
    assert.equal(evaluate('document.querySelector(".hero-disclosure").textContent.includes("Demo")'), false);
    click('Browse'); wait('document.querySelector(".catalog-page:not([hidden])") || location.hash === "#/browse"');
    assert.equal(evaluate('Array.from(document.querySelectorAll(".app-card")).filter(e=>e.getClientRects().length).length'), 1);
    click('Search'); browser('find', 'label', 'Search applications', 'fill', 'Authorized');
    wait('Array.from(document.querySelectorAll(".app-card")).some(e=>e.getClientRects().length && e.textContent.includes("Authorized test tool"))');
    browser('find', 'role', 'button', 'click', '--name', 'View Authorized test tool', '--exact');
    wait('document.querySelector(".detail-page")');
    assert.equal(evaluate('document.querySelector(".download-to-console").disabled'), true);
    assert.equal(evaluate('document.querySelectorAll(".download-sources a").length'), 1);
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
