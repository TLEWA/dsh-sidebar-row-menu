import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import {
  apply,
  inspectOpenPath,
  isLoopbackRequest,
  toVscodeFileUrl,
} from '../lib/index.js';

const dir = mkdtempSync(join(tmpdir(), 'dsh-row-menu-'));
const existingFile = join(dir, 'a.txt');
writeFileSync(existingFile, 'x');

test.after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('inspectOpenPath accepts an absolute directory and strips quotes', () => {
  assert.deepEqual(inspectOpenPath(dir), { path: dir });
  assert.deepEqual(inspectOpenPath(`"${dir}"`), { path: dir });
});

test('inspectOpenPath rejects empty, relative, missing and non-directory paths', () => {
  assert.deepEqual(inspectOpenPath(''), { error: 'path-required' });
  assert.deepEqual(inspectOpenPath('   '), { error: 'path-required' });
  assert.deepEqual(inspectOpenPath('relative/path'), { error: 'path-not-absolute' });
  assert.deepEqual(inspectOpenPath(join(dir, 'missing')), { error: 'path-not-found' });
  assert.deepEqual(inspectOpenPath(existingFile), { error: 'path-not-directory' });
  assert.deepEqual(inspectOpenPath(`${dir}\0x`), { error: 'path-invalid' });
});

test('toVscodeFileUrl keeps the drive colon and encodes segments', () => {
  assert.equal(
    toVscodeFileUrl('C:\\Users\\TLEWA\\My Projects\\中文'),
    'vscode://file/C:/Users/TLEWA/My%20Projects/%E4%B8%AD%E6%96%87',
  );
});

test('isLoopbackRequest accepts loopback hosts and rejects foreign ones', () => {
  const base = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:10102' },
  };
  assert.equal(isLoopbackRequest(base), true);
  assert.equal(isLoopbackRequest({ ...base, socket: { remoteAddress: '::1' } }), true);
  assert.equal(isLoopbackRequest({ ...base, socket: { remoteAddress: '::ffff:127.0.0.1' } }), true);
  assert.equal(isLoopbackRequest({ ...base, socket: { remoteAddress: '10.0.0.5' } }), false);
  assert.equal(isLoopbackRequest({ ...base, headers: { host: 'evil.example' } }), false);
  assert.equal(isLoopbackRequest({ ...base, headers: { host: '127.0.0.1:10102', 'sec-fetch-site': 'cross-site' } }), false);
  assert.equal(
    isLoopbackRequest({ ...base, headers: { host: '127.0.0.1:10102', origin: 'http://evil.example' } }),
    false,
  );
  assert.equal(
    isLoopbackRequest({ ...base, headers: { host: '127.0.0.1:10102', origin: 'http://127.0.0.1:10102' } }),
    true,
  );
});

function createRoute() {
  let route;
  apply({
    effect(fn) {
      fn();
      return () => {};
    },
    webServer: {
      register(value) {
        route = value;
        return () => {};
      },
    },
    logger: { warn() {} },
  });
  assert.equal(route.kind, 'prefix');
  assert.equal(route.path, '/dsh-sidebar-row-menu');
  return route;
}

async function call(route, { method = 'POST', url = '/dsh-sidebar-row-menu/open', body, raw, remote = '127.0.0.1', headers = {} } = {}) {
  const payload = raw ?? (body === undefined ? undefined : JSON.stringify(body));
  const request = Readable.from(payload === undefined ? [] : [Buffer.from(payload)]);
  request.method = method;
  request.url = url;
  request.headers = { host: '127.0.0.1:10102', ...headers };
  request.socket = { remoteAddress: remote };
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(text) {
      this.body = text;
    },
  };
  await route.handler(request, response);
  return { status: response.statusCode, body: JSON.parse(response.body) };
}

test('route rejects non-loopback, non-POST, unknown paths and bad targets', async () => {
  const route = createRoute();
  assert.equal((await call(route, { remote: '10.0.0.5' })).status, 403);
  assert.equal((await call(route, { method: 'GET' })).status, 405);
  assert.equal((await call(route, { url: '/dsh-sidebar-row-menu/nope' })).status, 404);
  assert.equal((await call(route, { body: { target: 'cmd', path: dir } })).status, 400);
  assert.equal((await call(route, { raw: '{oops' })).status, 400);
});

test('route validates the path before spawning anything', async () => {
  const route = createRoute();
  const relative = await call(route, { body: { target: 'explorer', path: 'relative/path' } });
  assert.equal(relative.status, 400);
  assert.equal(relative.body.error, 'path-not-absolute');
  const missing = await call(route, { body: { target: 'explorer', path: join(dir, 'missing') } });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, 'path-not-found');
  const file = await call(route, { body: { target: 'explorer', path: existingFile } });
  assert.equal(file.status, 404);
  assert.equal(file.body.error, 'path-not-directory');
});
