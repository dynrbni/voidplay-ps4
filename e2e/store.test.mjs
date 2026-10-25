import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const session = `voidplay-check-${process.pid}`;
function browser(...args) {
  const result = spawnSync(process.env.AGENT_BROWSER_BIN ?? 'agent-browser', ['--session', session, '--json', ...args], {
    encoding: 'utf8', timeout: 35000
  });
  assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
  const response = JSON.parse(result.stdout);
  assert.equal(response.success, true, JSON.stringify(response));
  return response.data;
}
function evaluate(script) { return browser('eval', script).result; }
function waitFor(script) { browser('wait', '--fn', script); }
function click(name) { browser('find', 'role', 'button', 'click', '--name', name, '--exact'); }
function noOverflow() {
  assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
}

test('desktop/mobile store flows, focus, filtering and recovery states', { timeout: 180000 }, () => {
  mkdirSync('artifacts', { recursive: true });
  try {
    browser('open', process.env.VOIDPLAY_URL ?? 'http://127.0.0.1:5173');
    browser('set', 'viewport', '1920', '1080');
    waitFor('document.querySelectorAll(".app-card").length === 4');
    noOverflow();
    browser('screenshot', 'artifacts/home-1080.png');
    click('View application');
    waitFor('document.querySelector("dialog")?.open === true');
    assert.equal(evaluate('document.activeElement.textContent'), 'Close details');
    browser('press', 'Tab');
    browser('press', 'Tab');
    assert.equal(evaluate('document.activeElement.textContent'), 'Close details');
    browser('press', 'Escape');
    assert.equal(evaluate('document.activeElement.textContent'), 'View application');
    for (const title of ['Save Shelf', 'Orbit Workshop', 'Local Player', 'File Desk']) {
      click(`View ${title} (mock)`);
      waitFor('document.querySelector("dialog")?.open === true');
      click('Close details');
      waitFor('document.querySelector("dialog") === null');
    }
    evaluate('document.querySelector(\'[aria-label="View Save Shelf (mock)"]\').focus(); true');
    browser('press', 'ArrowRight');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'View Orbit Workshop (mock)');
    browser('press', 'ArrowLeft');
    assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), 'View Save Shelf (mock)');
    assert.equal(evaluate('getComputedStyle(document.activeElement).outlineWidth'), '3px');
    click('Browse all applications');
    browser('find', 'label', 'Search applications', 'fill', ' ORBIT ');
    waitFor('document.querySelectorAll(".app-card").length === 1');
    browser('select', 'select', 'Utilities');
    waitFor('document.body.textContent.includes("No matching applications")');
    click('Clear filters');
    waitFor('document.querySelectorAll(".app-card").length === 4');
    browser('select', 'select', 'Media');
    waitFor('document.querySelectorAll(".app-card").length === 1');
    click('Clear filters');
    browser('set', 'viewport', '390', '844');
    noOverflow();
    browser('screenshot', 'artifacts/browse-mobile.png');
    click('View Local Player (mock)');
    noOverflow();
    browser('press', 'Escape');
    click('Home');
    noOverflow();
    browser('screenshot', 'artifacts/home-mobile.png');
    click('Browse');
    browser('find', 'role', 'link', 'click', '--name', 'Voidplay home', '--exact');
    waitFor('document.querySelector("h1").textContent === "Make room for homebrew."');
    browser('set', 'offline', 'on');
    waitFor('document.body.textContent.includes("You’re offline")');
    assert.equal(evaluate('document.querySelectorAll(".app-card").length'), 4);
    browser('set', 'offline', 'off');
    waitFor('!document.body.textContent.includes("You’re offline")');

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
    waitFor('document.querySelectorAll(".app-card").length === 4');
    browser('network', 'route', '**/catalog.mock.json', '--abort');
    browser('reload');
    waitFor('document.body.textContent.includes("Catalog unavailable")');
    browser('network', 'unroute', '**/catalog.mock.json');
    click('Retry catalog');
    waitFor('document.querySelectorAll(".app-card").length === 4');
    assert.deepEqual(browser('errors').errors, []);
  } finally {
    browser('close');
  }
});
