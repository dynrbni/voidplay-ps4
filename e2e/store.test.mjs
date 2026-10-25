import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const session = `voidplay-check-${process.pid}`;
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

test('cinematic shelves, catalog, focus, image fallback and recovery', { timeout: 240000 }, () => {
  mkdirSync('artifacts', { recursive: true });
  try {
    browser('open', process.env.VOIDPLAY_URL ?? 'http://127.0.0.1:5173');
    browser('set', 'viewport', '1920', '1080');
    waitFor('document.querySelectorAll(".content-shelf").length === 3');
    noOverflow();
    assert.equal(evaluate('getComputedStyle(document.body).fontFamily.includes("Manrope")'), true);
    assert.equal(evaluate('document.querySelector(".featured").getBoundingClientRect().height >= 480'), true);
    assert.equal(evaluate('document.querySelector(".shelf-row").scrollWidth > document.querySelector(".shelf-row").clientWidth'), true);
    browser('screenshot', 'artifacts/home-1080.png');
    click('View details');
    waitFor('document.querySelector("dialog")?.open === true');
    assert.equal(evaluate('document.activeElement.textContent'), 'Close details');
    browser('press', 'Escape');
    assert.equal(evaluate('document.activeElement.textContent.trim()'), 'View details');
    click('Browse utilities');
    waitFor(`${visibleCount} === 3`);
    browser('press', 'Escape');
    waitFor('document.querySelector(".featured").getClientRects().length > 0');
    evaluate('document.querySelector(".shelf-row .app-card").focus(); true');
    browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'View Orbit Workshop (mock)');
    for (let i = 0; i < 4; i++) browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'View Signal Room (mock)');
    assert.equal(evaluate('document.querySelector(".shelf-row").scrollLeft > 0'), true);
    evaluate('window.shelfOffset = document.querySelector(".shelf-row").scrollLeft; true');
    browser('press', 'Enter');
    click('Close details');
    waitFor('document.querySelector("dialog") === null');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'View Signal Room (mock)');
    assert.equal(evaluate('document.querySelector(".shelf-row").scrollLeft === window.shelfOffset'), true);
    browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'View Signal Room (mock)');
    browser('press', 'ArrowDown');
    assert.equal(evaluate('document.activeElement.closest(".content-shelf").querySelector("h2").textContent'), 'Tools & utilities');
    assert.equal(evaluate('getComputedStyle(document.activeElement).outlineWidth'), '3px');
    click('Next in Homebrew spotlight');
    click('Previous in Homebrew spotlight');
    click('View all Homebrew spotlight');
    waitFor(`${visibleCount} === 6`);
    browser('find', 'label', 'Search applications', 'fill', ' ORBIT ');
    waitFor(`${visibleCount} === 1`);
    browser('select', '.filters select', 'Utilities');
    waitFor('document.body.textContent.includes("No matching applications")');
    click('Clear filters');
    waitFor(`${visibleCount} === 6`);
    browser('select', '.filters label:nth-child(3) select', 'title');
    assert.equal(evaluate('document.querySelector(".app-grid .app-card").getAttribute("aria-label")'), 'View File Desk (mock)');
    for (const title of ['Save Shelf', 'Orbit Workshop', 'Local Player', 'File Desk', 'Pixel Forge', 'Signal Room']) {
      click(`View ${title} (mock)`);
      waitFor('document.querySelector("dialog")?.open === true');
      click('Close details');
      waitFor('document.querySelector("dialog") === null');
    }
    browser('screenshot', 'artifacts/browse-1080.png');
    click('Search');
    waitFor('document.activeElement.type === "search"');
    browser('set', 'viewport', '390', '844');
    noOverflow();
    browser('screenshot', 'artifacts/browse-mobile.png');
    click('Discover');
    noOverflow();
    browser('screenshot', 'artifacts/home-mobile.png');
    browser('set', 'offline', 'on');
    waitFor('document.body.textContent.includes("You’re offline")');
    browser('set', 'offline', 'off');
    waitFor('!document.body.textContent.includes("You’re offline")');
    browser('network', 'route', '**/art/save-shelf.svg', '--abort');
    browser('reload');
    waitFor('document.querySelector(".featured .art-fallback") !== null');
    noOverflow();
    browser('network', 'unroute', '**/art/save-shelf.svg');
    browser('network', 'route', '**/catalog.mock.json', '--body', '[]');
    browser('reload');
    waitFor('document.body.textContent.includes("No applications yet")');
    click('Reload catalog');
    waitFor('document.body.textContent.includes("No applications yet")');
    browser('network', 'unroute', '**/catalog.mock.json');
    browser('network', 'route', '**/catalog.mock.json', '--body', '[{"title":"invalid"}]');
    browser('reload');
    waitFor('document.body.textContent.includes("Catalog unavailable")');
    browser('network', 'unroute', '**/catalog.mock.json');
    evaluate('window.originalFetch = window.fetch; window.fetch = (...args) => new Promise(resolve => { window.releaseCatalog = () => resolve(window.originalFetch(...args)); }); true');
    click('Retry catalog');
    waitFor('document.body.textContent.includes("Loading local catalog")');
    evaluate('window.fetch = window.originalFetch; window.releaseCatalog(); true');
    waitFor('document.querySelectorAll(".content-shelf").length === 3');
    browser('network', 'route', '**/catalog.mock.json', '--abort');
    browser('reload');
    waitFor('document.body.textContent.includes("Catalog unavailable")');
    browser('network', 'unroute', '**/catalog.mock.json');
    click('Retry catalog');
    waitFor('document.querySelectorAll(".content-shelf").length === 3');
    assert.deepEqual(browser('errors').errors, []);
  } finally { browser('close'); }
});
