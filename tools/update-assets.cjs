'use strict';
// Development helper only. The published app still needs no build or Node runtime.
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const root = resolve(__dirname, '..');
const files = ['src/styles.css', 'src/numbers.js', 'src/calculations.js', 'src/main.js'];
let html = readFileSync(resolve(root, 'index.html'), 'utf8');
for (const file of files) {
  // Stable on Windows and Linux, including before Git normalizes line endings.
  const source = readFileSync(resolve(root, file), 'utf8').replace(/\r\n/g, '\n');
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reference = new RegExp(`((?:href|src)=")${escaped}(?:\\?v=[^"]*)?(")`, 'g');
  if ((html.match(reference) || []).length !== 1) throw new Error('Genau ein Asset-Verweis erwartet: ' + file);
  html = html.replace(reference, `$1${file}?v=${hash}$2`);
}
writeFileSync(resolve(root, 'index.html'), html.replace(/\r\n/g, '\n'));
process.stdout.write('Asset-Versionen in index.html aktualisiert.\n');
