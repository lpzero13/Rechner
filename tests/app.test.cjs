'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { boot, html, root } = require('./helpers/app-fixture.cjs');

function userCase() {
  const app = boot();
  app.input('portfolio', '10000');
  app.input('entry', '200,09');
  app.input('stop', '197,59');
  app.input('salePrice', '300,99');
  app.input('buyDate', '2025-08-21', 'change');
  app.input('saleDate', '2026-12-17', 'change');
  return app;
}

test('real HTML and scripts: screenshot case updates step 3 through form events', () => {
  const app = userCase();
  assert.equal(app.text('shares'), '39');
  assert.equal(app.text('purchase'), '7.804,51\u00a0€');
  assert.equal(app.text('scenario-shares'), '39');
  assert.equal(app.text('scenario-entry'), '200,09\u00a0€');
  assert.equal(app.text('scenario-gross'), '+3.935,10\u00a0€');
  assert.equal(app.text('scenario-total-fees'), '2,00\u00a0€');
  assert.equal(app.text('scenario-net'), '+3.933,10\u00a0€');
  assert.equal(app.text('scenario-days'), '483 Kalendertage');
  assert.equal(app.text('scenario-daily-average'), '+8,14\u00a0€');
  assert.match(app.text('period-summary'), /21\.08\.2025 – 17\.12\.2026/);
  assert.equal(app.elements.get('app-status').hidden, true);
});

test('step 3 keeps updating after broker changes and shows losses', () => {
  const app = userCase();
  app.input('costProfile', 'ing', 'change');
  assert.equal(app.text('scenario-shares'), app.text('shares'));
  assert.notEqual(app.text('scenario-sell-fee'), '1,00\u00a0€');
  app.input('salePrice', '190');
  assert.match(app.text('scenario-net'), /^−/);
  assert.equal(app.elements.get('scenario-net').classList.contains('negative'), true);
});

test('invalid prices clear stale scenario outputs but keep step 2 working', () => {
  const app = userCase();
  app.input('salePrice', '0');
  assert.equal(app.text('scenario-net'), '—');
  assert.equal(app.text('scenario-daily-average'), '—');
  assert.equal(app.text('shares'), '39');
  assert.ok(app.text('salePrice-error'));
  app.input('salePrice', '300,99');
  app.input('portfolio', '');
  assert.equal(app.text('scenario-net'), '—');
  assert.equal(app.text('scenario-shares'), '—');
});

test('date errors only clear the period and same-day trades never divide by zero', () => {
  const app = userCase();
  app.input('saleDate', '2025-08-20');
  assert.ok(app.text('saleDate-error'));
  assert.equal(app.text('scenario-days'), '—');
  assert.equal(app.text('scenario-net'), '+3.933,10\u00a0€');
  app.input('saleDate', '2025-08-21');
  assert.equal(app.text('scenario-days'), '0 Kalendertage');
  assert.equal(app.text('scenario-daily-average'), '—');
});

test('pageshow clears both forms, including prices and dates', () => {
  const app = userCase();
  app.window.fire('pageshow');
  for (const id of ['portfolio', 'entry', 'stop', 'salePrice', 'buyDate', 'saleDate']) assert.equal(app.elements.get(id).value, '', id);
  assert.equal(app.text('scenario-net'), '—');
  assert.equal(app.text('scenario-days'), '—');
});

test('startup failure is visible instead of leaving an unexplained empty step 3', () => {
  const app = boot({ mainSource: '' });
  assert.equal(app.elements.get('app-status').hidden, false);
  assert.match(app.text('app-status'), /Dateien.*geladen/);
  const loaded = boot();
  loaded.window.fire('error');
  assert.equal(loaded.elements.get('app-status').hidden, false);
  assert.match(loaded.text('app-status'), /vollständig neu/);
});

test('every CSS/JS URL carries its actual content hash to invalidate stale caches', () => {
  const refs = [...html.matchAll(/(?:href|src)="(src\/[^"?]+)\?v=([a-f0-9]{12})"/g)];
  assert.equal(refs.length, 4);
  for (const [, path, version] of refs) {
    const source = readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(version, createHash('sha256').update(source).digest('hex').slice(0, 12), path + ': run node tools/update-assets.cjs after edits');
  }
  assert.equal((html.match(/(?:href|src)="src\//g) || []).length, refs.length);
});
