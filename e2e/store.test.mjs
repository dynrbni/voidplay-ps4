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
function click(name, scope) {
  if (!scope) return browser('find', 'role', 'button', 'click', '--name', name, '--exact');
  const ref = Object.entries(browser('snapshot', '-i', '-s', scope).refs).find(([,value])=>value.role === 'button' && value.name === name)?.[0];
  assert.ok(ref, name);
  return browser('click', `@${ref}`);
}
function noOverflow() { assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true); }
const visibleCount = 'Array.from(document.querySelectorAll(".app-card")).filter(e => e.getClientRects().length).length';
function readyHome() { waitFor('document.querySelector(".featured")?.getClientRects().length > 0'); }
function onItem(id) { waitFor(`location.hash === '#/item/${id}' && document.querySelector('.detail-page') !== null`); }
function screenshot(name) {
  waitFor('Array.from(document.images).filter(i=>{const r=i.getBoundingClientRect();return r.width>0 && r.top<innerHeight && r.bottom>0;}).every(i=>i.complete && i.naturalWidth>0)');
  evaluate('(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).filter(i=>{const r=i.getBoundingClientRect();return r.width>0 && r.top<innerHeight && r.bottom>0;}).map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()');
  browser('screenshot', `artifacts/v2-${name}.png`);
}

test('compact store: transparent sticky header, shared hearts, details and responsive layout', { timeout: 240000 }, () => {
  mkdirSync('artifacts', { recursive: true });
  try {
    browser('open', url);
    browser('set', 'viewport', '1920', '1080');
    readyHome();
    noOverflow();
    assert.deepEqual(evaluate('Array.from(document.querySelectorAll(".main-nav button")).map(b=>b.textContent.trim())'), ['Discover', 'Browse', 'Downloads', 'Library']);
    assert.deepEqual(evaluate('Array.from(document.querySelectorAll(".utility-nav button")).map(b=>b.getAttribute("aria-label"))'), ['Favorites', 'Search', 'Settings']);
    assert.equal(evaluate('getComputedStyle(document.querySelector(".header")).position'), 'sticky');
    assert.equal(evaluate('getComputedStyle(document.querySelector(".header")).backgroundColor'), 'rgba(0, 0, 0, 0)');
    assert.equal(evaluate('getComputedStyle(document.querySelector(".header")).backgroundImage'), 'none');
    assert.equal(evaluate('getComputedStyle(document.querySelector(".beta-badge")).backgroundColor'), 'rgb(255, 255, 255)');
    assert.ok(evaluate('document.querySelector(".shelf-row .cover").getBoundingClientRect().bottom < innerHeight'));
    screenshot('compact-home-1080');
    evaluate('window.scrollTo(0,500); true');
    assert.equal(evaluate('document.querySelector(".header").getBoundingClientRect().top'), 0);
    screenshot('compact-header-scrolled-1080');
    evaluate('window.scrollTo(0,0); document.querySelector(".shelf-row .app-card").focus(); true');
    browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.dataset.entryId'), 'save-shelf');
    assert.equal(evaluate('document.querySelector(".featured h1").textContent'), 'Save Shelf');
    browser('press', 'Tab');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'Add Save Shelf to favorites');
    browser('press', 'Enter');
    assert.equal(evaluate('getComputedStyle(document.activeElement.querySelector("svg")).fill'), 'rgb(255, 255, 255)');
    assert.equal(evaluate('document.querySelector(".featured .favorite-button").getAttribute("aria-pressed")'), 'true');
    browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'Add Local Player to favorites');
    click('Favorites');
    waitFor(`${visibleCount} === 1`);
    click('View Save Shelf (concept)');
    onItem('save-shelf');
    assert.equal(evaluate('document.querySelector(".detail-actions .favorite-button").getAttribute("aria-pressed")'), 'true');
    click('Remove Save Shelf from favorites');
    browser('press', 'Escape');
    waitFor('location.hash === "#/favorites"');
    assert.equal(evaluate(visibleCount), 0);
    click('Browse');
    waitFor(`${visibleCount} === 6`);
    click('Add Orbit Workshop to favorites');
    click('View Orbit Workshop (concept)');
    onItem('orbit-workshop');
    screenshot('compact-detail-1080');
    click('Application information');
    assert.equal(evaluate('document.activeElement.textContent'), 'About this application');
    click('Add to library');
    click('Library');
    waitFor(`${visibleCount} === 1`);
    browser('reload');
    waitFor(`${visibleCount} === 1`);
    click('View Orbit Workshop (concept)');
    onItem('orbit-workshop');
    click('In your library');
    click('Library');
    waitFor('location.hash === "#/library"');
    assert.equal(evaluate(visibleCount), 0);
    click('Favorites');
    waitFor(`${visibleCount} === 1`);
    click('Remove Orbit Workshop from favorites');
    waitFor(`${visibleCount} === 0`);
    assert.equal(evaluate('document.activeElement.className'), 'page-focus');
    click('Browse');
    browser('find', 'label', 'Search applications', 'fill', ' ORBIT ');
    waitFor(`${visibleCount} === 1`);
    click('Utilities');
    waitFor(`${visibleCount} === 0`);
    click('Clear filters');
    waitFor(`${visibleCount} === 6`);
    const sortRef = Object.entries(browser('snapshot', '-i').refs).find(([, value]) => value.role === 'combobox' && value.name === 'Sort by')?.[0];
    assert.ok(sortRef);
    browser('select', `@${sortRef}`, 'title');
    assert.equal(evaluate('document.querySelector(".app-grid .app-card").dataset.entryId'), 'file-desk');
    for (const [id,title] of [['save-shelf','Save Shelf'],['orbit-workshop','Orbit Workshop'],['local-player','Local Player'],['file-desk','File Desk'],['pixel-forge','Pixel Forge'],['signal-room','Signal Room']]) {
      click(`View ${title} (concept)`); onItem(id);
      assert.equal(evaluate('document.querySelector(".detail-page h1").textContent'), title);
      click('Back'); waitFor('location.hash === "#/browse"');
      assert.equal(evaluate('document.activeElement.dataset.entryId'), id);
    }
    screenshot('compact-browse-1080');
    click('View File Desk (concept)'); onItem('file-desk');
    click('View Pixel Forge (concept)'); onItem('pixel-forge');
    browser('press','Escape'); onItem('file-desk');
    browser('press','Escape'); waitFor('location.hash === "#/browse"');
    click('Search'); waitFor('document.activeElement.type === "search"');
    browser('find','label','Search applications','fill','zz-no-such-title');
    waitFor(`${visibleCount} === 0`);
    click('Clear filters'); waitFor(`${visibleCount} === 6`);
    click('View Orbit Workshop (concept)'); onItem('orbit-workshop');
    browser('press','Escape'); waitFor('location.hash === "#/search"');
    assert.equal(evaluate('document.activeElement.dataset.entryId'), 'orbit-workshop');
    click('Settings');
    browser('find','role','checkbox','check','--name','Reduce motion','--exact');
    browser('reload'); waitFor('document.querySelector("input[type=checkbox]")?.checked === true');
    click('Discover'); readyHome();
    evaluate('document.querySelector(".shelf-row .app-card").focus(); true');
    for (let i=0;i<5;i++) browser('press','ArrowRight');
    assert.equal(evaluate('document.activeElement.dataset.entryId'),'signal-room');
    waitFor('document.querySelector(".shelf-row").scrollLeft > 0');
    evaluate('window.savedOffset=document.querySelector(".shelf-row").scrollLeft;window.savedScroll=scrollY;true');
    browser('press','Enter'); onItem('signal-room');
    browser('press','Escape'); readyHome();
    assert.equal(evaluate('document.activeElement.dataset.entryId'),'signal-room');
    assert.equal(evaluate('document.querySelector(".shelf-row").scrollLeft === window.savedOffset'),true);
    assert.equal(evaluate('Math.abs(scrollY-window.savedScroll)<2'),true);
    browser('press','ArrowRight');
    assert.equal(evaluate('document.activeElement.dataset.entryId'),'signal-room');
    assert.equal(evaluate('getComputedStyle(document.activeElement.querySelector(".cover")).outlineColor'),'rgb(255, 255, 255)');
    browser('set','viewport','1366','768');
    evaluate('window.scrollTo(0,0);true'); noOverflow(); screenshot('compact-home-laptop');
    browser('set','viewport','390','844');
    evaluate('window.scrollTo(0,0);true'); noOverflow(); screenshot('compact-home-mobile');
    click('Browse'); noOverflow(); screenshot('compact-browse-mobile');
    click('View Orbit Workshop (concept)'); onItem('orbit-workshop'); noOverflow(); screenshot('compact-detail-mobile');
    click('Search'); noOverflow(); click('Favorites'); noOverflow(); click('Library'); noOverflow();
    click('Downloads'); noOverflow(); click('Settings'); noOverflow();
    browser('open',`${url}/#/item/file-desk`); browser('reload'); onItem('file-desk');
    browser('open',`${url}/#/item/missing-title`); waitFor('document.body.textContent.includes("That discovery isn’t here")');
    click('Back to Discover'); readyHome();
    assert.deepEqual(browser('errors').errors,[]);
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
    click('Add Orbit Workshop to favorites', '.featured');
    waitFor('document.body.textContent.includes("Your changes are saved for this session only")');
    click('Favorites');
    waitFor(`${visibleCount} === 1`);
    evaluate('Storage.prototype.setItem = window.originalSet; localStorage.setItem("voidplay.collections.v1", "malformed"); true');
    browser('reload');
    waitFor('document.body.textContent.includes("Saved collections could not be read")');
    assert.equal(evaluate(visibleCount), 0);
    click('Discover');
    click('Add Orbit Workshop to favorites', '.featured');
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

test('dummy Download to PS4 shares a persistent, controllable demo queue', { timeout: 120000 }, () => {
  session = `voidplay-demo-queue-${process.pid}`;
  const transfer = id => `JSON.parse(localStorage.getItem('voidplay.demo-transfers.v1')).jobs.find(j=>j.entryId==='${id}')`;
  try {
    browser('open', url);
    browser('set','viewport','1920','1080');
    readyHome();
    evaluate('window.demoFetches=[]; window.originalDemoFetch=window.fetch; window.fetch=(...args)=>{window.demoFetches.push(String(args[0]));return window.originalDemoFetch(...args)};true');
    click('View application'); onItem('orbit-workshop');
    click('Download to PS4'); waitFor('location.hash === "#/downloads"');
    waitFor('document.querySelector("progress")?.value > 0');
    assert.ok(evaluate('document.querySelector(".demo-notice").textContent.includes("No files are downloaded or sent to PS4")'));
    screenshot('compact-downloads-active-1080');
    click('Pause Orbit Workshop demo');
    const paused = evaluate('document.querySelector("progress").value');
    const afterTick = evaluate('new Promise(resolve=>setTimeout(()=>resolve(document.querySelector("progress").value),1100))');
    assert.equal(afterTick,paused);
    click('Browse'); click('View File Desk (concept)'); onItem('file-desk');
    click('Download to PS4'); waitFor(`${transfer('file-desk')}?.status === 'downloading'`);
    click('Browse'); click('View Local Player (concept)'); onItem('local-player');
    click('Download to PS4'); waitFor('document.querySelectorAll(".transfer-row").length === 3');
    assert.equal(evaluate(`${transfer('local-player')}.status`),'queued');
    click('Browse'); click('View Local Player (concept)'); onItem('local-player');
    click('View download'); waitFor('location.hash === "#/downloads"');
    assert.equal(evaluate('document.querySelectorAll(".transfer-row").length'),3);
    assert.deepEqual(evaluate('window.demoFetches'),[]);
    click('Pause File Desk demo'); waitFor(`${transfer('local-player')}?.status === 'downloading'`);
    click('Pause Local Player demo');
    click('Resume Orbit Workshop demo'); waitFor(`${transfer('orbit-workshop')}?.status === 'downloading'`);
    const beforeNavigation = evaluate(`${transfer('orbit-workshop')}.receivedBytes`);
    click('Browse');
    waitFor(`${transfer('orbit-workshop')}.receivedBytes > ${beforeNavigation}`);
    click('Downloads');
    browser('set','viewport','390','844'); noOverflow(); screenshot('compact-downloads-mobile');
    browser('reload');
    waitFor('document.querySelectorAll(".transfer-row").length === 3');
    assert.equal(evaluate('JSON.parse(localStorage.getItem("voidplay.demo-transfers.v1")).jobs.filter(j=>j.status==="completed").length'),0);
    assert.equal(evaluate('Array.from(document.querySelectorAll(".transfer-status")).every(e=>e.textContent === "Paused")'),true);
    click('Library'); assert.equal(evaluate(visibleCount),0);
    click('Downloads');
    click('Cancel Orbit Workshop demo');
    click('Retry Orbit Workshop demo');
    waitFor(`${transfer('orbit-workshop')}?.status === 'completed'`);
    assert.equal(evaluate(`${transfer('orbit-workshop')}.receivedBytes === ${transfer('orbit-workshop')}.totalBytes`),true);
    assert.ok(evaluate('document.querySelector(".transfer-metrics").textContent.includes("No file transferred")'));
    click('Clear finished');
    assert.equal(evaluate('document.querySelectorAll(".transfer-row").length'),2);
    click('Cancel File Desk demo'); click('Cancel Local Player demo'); click('Clear finished');
    waitFor('document.querySelectorAll(".transfer-row").length === 0');
    evaluate('window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error("storage disabled")};true');
    click('Browse'); click('View Orbit Workshop (concept)'); onItem('orbit-workshop'); click('Download to PS4');
    waitFor('document.body.textContent.includes("The demo queue is kept for this session only")');
    click('Pause Orbit Workshop demo');
    evaluate('Storage.prototype.setItem=window.originalSet;true');
    click('Resume Orbit Workshop demo');
    waitFor('document.querySelector(".storage-warning") === null');
    click('Pause Orbit Workshop demo');
    evaluate('localStorage.setItem("voidplay.demo-transfers.v1","malformed");true');
    browser('reload');
    waitFor('document.body.textContent.includes("The saved demo queue could not be read")');
    assert.equal(evaluate('document.querySelectorAll(".transfer-row").length'),0);
    assert.deepEqual(browser('errors').errors,[]);
  } finally { browser('close'); }
});
