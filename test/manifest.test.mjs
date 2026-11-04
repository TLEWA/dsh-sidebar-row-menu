import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(join(root, name), 'utf8');
const pkg = JSON.parse(read('package.json'));

test('package.json declares the DSH range the host and the market read', () => {
  const range = pkg.engines?.dsh;
  // Top-level engines.dsh is the only declaration DSH app-boot enforces, and the
  // only one the plugin-market index reads; dsh.engines.dsh is not consulted.
  assert.equal(typeof range, 'string', 'engines.dsh must be a string');
  assert.match(range, /^\s*>=\d+\.\d+\.\d+/, 'engines.dsh must be a lower-bounded range');
});

test('both READMEs quote the declared DSH range', () => {
  const range = pkg.engines.dsh;
  assert.ok(read('README.md').includes(range), 'README.md must quote engines.dsh');
  assert.ok(read('README.en.md').includes(range), 'README.en.md must quote engines.dsh');
});
