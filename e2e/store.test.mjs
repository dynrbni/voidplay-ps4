import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

let session = `voidplay-v2-check-${process.pid}`;
const url = process.env.VOIDPLAY_URL ?? 'http://127.0.0.1:5173';
function browser(...args) {
  const result = spawnSync(process.env.AGENT_BROWSER_BIN ?? 'agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 35000 });
  assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
  const response = JSON.parse(result.stdout);
  assert.equal(response.success, true, JSON.stringify(response));
  return response.data;
}
function evaluate(script) { return browser('eval', script).result; }
function waitFor(script) { browser('wait', '--fn', script); }
function click(name) { browser('find', 'role', 'button', 'click', '--name', name, '--exact'); }
function noOverflow() { assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true); }
const visibleCount = 'Array.from(document.querySelectorAll(".app-card")).filter(e => e.getClientRects().length).length';
function readyHome() { waitFor('document.querySelector(".featured")?.getClientRects().length > 0'); }
function onItem(id) { waitFor(`location.hash === '#/item/${id}' && document.querySelector('.detail-page') !== null`); }
function screenshot(name) {
  waitFor('Array.from(document.images).filter(i=>{const r=i.getBoundingClientRect();return r.width>0 && r.top<innerHeight && r.bottom>0;}).every(i=>i.complete && i.naturalWidth>0)');
  evaluate('(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).filter(i=>{const r=i.getBoundingClientRect();return r.width>0 && r.top<innerHeight && r.bottom>0;}).map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()');
  browser('screenshot', `artifacts/v2-${name}.png`);
}

test('cinematic store: navigation, all details, collections, persistence and responsive layout', { timeout: 360000 }, () => {
  mkdirSync('artifacts', { recursive: true });
  try {
    browser('open', url);
    browser('set', 'viewport', '1920', '1080');
    readyHome();
    noOverflow();
    assert.equal(evaluate('getComputedStyle(document.body).fontFamily.includes("Manrope")'), true);
    assert.equal(evaluate('document.querySelector(".featured").getBoundingClientRect().height >= 620'), true);
    assert.equal(evaluate('document.querySelector(".shelf-row").scrollWidth > document.querySelector(".shelf-row").clientWidth'), true);
    screenshot('home-1080');
    click('Feature Local Player');
    assert.equal(evaluate('document.querySelector(".featured h1").textContent'), 'Local Player');
    click('View details');
    onItem('local-player');
    assert.equal(evaluate('document.querySelector(".detail-page h1").textContent'), 'Local Player');
    click('Back');
    readyHome();
    assert.equal(evaluate('document.activeElement.textContent.trim()'), 'View details');
    click('Feature Orbit Workshop');
    click('Add to favorites');
    click('Favorites');
    waitFor(`${visibleCount} === 1`);
    assert.equal(evaluate('document.querySelector(".collection-page:not([hidden])") !== null'), true);
    click('View Orbit Workshop (concept)');
    onItem('orbit-workshop');
    click('Add to library');
    screenshot('detail-1080');
    assert.equal(evaluate('document.querySelector(".screenshot-gallery") === null'), true);
    click('Library');
    waitFor(`${visibleCount} === 1`);
    browser('reload');
    waitFor(`${visibleCount} === 1`);
    click('View Orbit Workshop (concept)');
    onItem('orbit-workshop');
    click('In your library');
    click('Library');
    waitFor('document.body.textContent.includes("A little space for your discoveries")');
    assert.equal(evaluate(visibleCount), 0);
    click('Favorites');
    waitFor(`${visibleCount} === 1`);
    click('View Orbit Workshop (concept)');
    onItem('orbit-workshop');
    click('In favorites');
    browser('press', 'Escape');
    waitFor('location.hash === "#/favorites"');
    assert.equal(evaluate(visibleCount), 0);
    click('Browse');
    waitFor(`${visibleCount} === 6`);
    browser('find', 'label', 'Search applications', 'fill', ' ORBIT ');
    waitFor(`${visibleCount} === 1`);
    click('Utilities');
    waitFor('document.querySelector(".catalog-page .message") !== null');
    click('Clear filters');
    waitFor(`${visibleCount} === 6`);
    const sortRef = Object.entries(browser('snapshot', '-i').refs).find(([, value]) => value.role === 'combobox' && value.name === 'Sort by')?.[0];
    assert.ok(sortRef);
    browser('select', `@${sortRef}`, 'title');
    assert.equal(evaluate('document.querySelector(".app-grid .app-card").dataset.entryId'), 'file-desk');
    for (const [id, title] of [['save-shelf', 'Save Shelf'], ['orbit-workshop', 'Orbit Workshop'], ['local-player', 'Local Player'], ['file-desk', 'File Desk'], ['pixel-forge', 'Pixel Forge'], ['signal-room', 'Signal Room']]) {
      click(`View ${title} (concept)`);
      onItem(id);
      assert.equal(evaluate('document.querySelector(".detail-page h1").textContent'), title);
      click('Back');
      waitFor('location.hash === "#/browse"');
      assert.equal(evaluate('document.activeElement.dataset.entryId'), id);
    }
    screenshot('browse-1080');
    click('View File Desk (concept)');
    onItem('file-desk');
    click('View Pixel Forge (concept)');
    onItem('pixel-forge');
    browser('press', 'Escape');
    onItem('file-desk');
    browser('press', 'Escape');
    waitFor('location.hash === "#/browse"');
    click('Search');
    waitFor('document.activeElement.type === "search"');
    browser('find', 'label', 'Search applications', 'fill', 'zz-no-such-title');
    waitFor(`${visibleCount} === 0`);
    screenshot('search-empty-1080');
    click('Clear filters');
    waitFor(`${visibleCount} === 6`);
    click('View Orbit Workshop (concept)');
    onItem('orbit-workshop');
    browser('press', 'Escape');
    waitFor('location.hash === "#/search"');
    assert.equal(evaluate('document.activeElement.dataset.entryId'), 'orbit-workshop');
    click('Downloads');
    waitFor('location.hash === "#/downloads"');
    assert.equal(evaluate('document.querySelector("progress, [role=progressbar]") === null'), true);
    screenshot('downloads-1080');
    click('Settings');
    browser('find', 'role', 'checkbox', 'check', '--name', 'Reduce motion', '--exact');
    assert.equal(evaluate('document.querySelector(".shell").dataset.reduceMotion'), 'true');
    browser('reload');
    waitFor('document.querySelector("input[type=checkbox]")?.checked === true');
    screenshot('settings-1080');
    click('Discover');
    readyHome();
    evaluate('document.querySelector(".shelf-row .app-card").focus(); true');
    browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.dataset.entryId'), 'save-shelf');
    for (let i = 0; i < 4; i++) browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.dataset.entryId'), 'signal-room');
    waitFor('document.querySelector(".shelf-row").scrollLeft > 0');
    evaluate('window.savedOffset = document.querySelector(".shelf-row").scrollLeft; window.savedScroll = scrollY; true');
    browser('press', 'Enter');
    onItem('signal-room');
    browser('press', 'Escape');
    readyHome();
    assert.equal(evaluate('document.activeElement.dataset.entryId'), 'signal-room');
    assert.equal(evaluate('document.querySelector(".shelf-row").scrollLeft === window.savedOffset'), true);
    assert.equal(evaluate('Math.abs(scrollY-window.savedScroll) < 2'), true);
    browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.dataset.entryId'), 'signal-room');
    browser('press', 'ArrowDown');
    assert.equal(evaluate('document.activeElement.closest(".content-shelf")?.querySelector("h2").textContent'), 'Tools for your next idea');
    assert.equal(evaluate('getComputedStyle(document.activeElement).outlineColor'), 'rgb(255, 255, 255)');
    assert.equal(evaluate('getComputedStyle(document.activeElement).outlineWidth'), '3px');
    click('Previous in Made to explore');
    click('Next in Made to explore');
    browser('set', 'viewport', '1366', '768');
    click('Discover');
    evaluate('window.scrollTo(0,0); true');
    noOverflow();
    screenshot('home-laptop');
    browser('set', 'viewport', '390', '844');
    noOverflow();
    screenshot('home-mobile');
    click('Browse');
    noOverflow();
    screenshot('browse-mobile');
    click('View Orbit Workshop (concept)');
    onItem('orbit-workshop');
    noOverflow();
    screenshot('detail-mobile');
    click('Search');
    noOverflow();
    click('Favorites');
    noOverflow();
    screenshot('favorites-empty-mobile');
    click('Library');
    noOverflow();
    click('Downloads');
    noOverflow();
    click('Settings');
    noOverflow();
    screenshot('settings-mobile');
    browser('open', `${url}/#/item/file-desk`);
    onItem('file-desk');
    browser('reload');
    onItem('file-desk');
    browser('open', `${url}/#/item/missing-title`);
    waitFor('document.body.textContent.includes("That discovery isn’t here")');
    click('Back to Discover');
    readyHome();
    assert.deepEqual(browser('errors').errors, []);
  } finally { browser('close'); }
});

test('catalog, missing artwork, offline and local storage failures recover honestly', { timeout: 240000 }, () => {
  session = `voidplay-v2-recovery-${process.pid}`;
  try {
    browser('open', url);
    browser('set', 'viewport', '1920', '1080');
    readyHome();
    browser('set', 'offline', 'on');
    waitFor('document.body.textContent.includes("You’re offline")');
    browser('set', 'offline', 'off');
    waitFor('!document.body.textContent.includes("You’re offline")');
    browser('network', 'route', '**/art/orbit-workshop-hero.webp', '--abort');
    browser('reload');
    waitFor('document.querySelector(".featured .art-fallback") !== null');
    noOverflow();
    screenshot('missing-art-1080');
    browser('network', 'unroute', '**/art/orbit-workshop-hero.webp');
    browser('network', 'route', '**/catalog.mock.json', '--body', '[]');
    browser('reload');
    waitFor('document.body.textContent.includes("No applications yet")');
    click('Reload catalog');
    waitFor('document.body.textContent.includes("No applications yet")');
    browser('network', 'unroute', '**/catalog.mock.json');
    browser('network', 'route', '**/catalog.mock.json', '--body', '[{"title":"invalid"}]');
    browser('reload');
    waitFor('document.body.textContent.includes("Catalog unavailable")');
    screenshot('catalog-error-1080');
    browser('network', 'unroute', '**/catalog.mock.json');
    evaluate('window.originalFetch = window.fetch; window.fetch = (...args) => new Promise(resolve => { window.releaseCatalog = () => resolve(window.originalFetch(...args)); }); true');
    click('Retry catalog');
    waitFor('document.body.textContent.includes("Loading local catalog")');
    evaluate('window.fetch = window.originalFetch; window.releaseCatalog(); true');
    readyHome();
    browser('network', 'route', '**/catalog.mock.json', '--abort');
    browser('reload');
    waitFor('document.body.textContent.includes("Catalog unavailable")');
    browser('network', 'unroute', '**/catalog.mock.json');
    click('Retry catalog');
    readyHome();
    evaluate('window.originalSet = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new Error("storage unavailable"); }; true');
    click('Add to favorites');
    waitFor('document.body.textContent.includes("Your changes are saved for this session only")');
    click('Favorites');
    waitFor(`${visibleCount} === 1`);
    evaluate('Storage.prototype.setItem = window.originalSet; localStorage.setItem("voidplay.collections.v1", "malformed"); true');
    browser('reload');
    waitFor('document.body.textContent.includes("Saved collections could not be read")');
    assert.equal(evaluate(visibleCount), 0);
    click('Discover');
    click('Add to favorites');
    waitFor('document.querySelector(".storage-warning") === null');
    browser('reload');
    readyHome();
    click('Favorites');
    waitFor(`${visibleCount} === 1`);
    assert.deepEqual(browser('errors').errors, []);
  } finally { browser('close'); }
});


test('optional screenshot gallery uses selected data and handles missing images', { timeout: 120000 }, () => {
  session = `voidplay-v2-gallery-${process.pid}`;
  const fixture = JSON.parse(readFileSync(new URL('../public/catalog.mock.json', import.meta.url), 'utf8'));
  fixture[0].screenshots = [
    { url: '/art/save-shelf-concept.webp', description: 'Test-only fixture image one' },
    { url: '/art/missing-test-image.webp', description: 'Test-only missing image two' }
  ];
  try {
    browser('open', url);
    browser('network', 'route', '**/catalog.mock.json', '--body', JSON.stringify(fixture));
    browser('network', 'route', '**/art/missing-test-image.webp', '--abort');
    browser('open', `${url}/#/item/save-shelf`);
    browser('reload');
    onItem('save-shelf');
    waitFor('document.querySelector(".screenshot-gallery img")?.alt === "Test-only fixture image one"');
    click('Next screenshot');
    waitFor('document.querySelector(".screenshot-gallery .art-fallback") !== null');
    assert.equal(evaluate('document.querySelector(".detail-page h1").textContent'), 'Save Shelf');
    click('Previous screenshot');
    waitFor('document.querySelector(".screenshot-gallery img")?.alt === "Test-only fixture image one"');
    click('View File Desk (concept)');
    onItem('file-desk');
    assert.equal(evaluate('document.querySelector(".screenshot-gallery") === null'), true);
  } finally { browser('close'); }
});
