import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import {
  apply,
  inspectOpenPath,
  isLoopbackRequest,
  removeSessions,
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

function createRoute(services) {
  let route;
  apply({
    effect(fn) {
      fn();
      return () => {};
    },
    get(name) {
      return services?.[name];
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

/** Build a host ctx whose session services are scripted by the test. */
function createDeleteContext({ headers = [], live, calls = [] }) {
  let route;
  const ctx = {
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
    emit(...args) {
      calls.push(['emit', ...args]);
    },
    get(name) {
      if (name === 'sessions') {
        return {
          get(id) {
            return live?.header?.id === id ? live : undefined;
          },
          liveEntryFor(value) {
            calls.push(['liveEntryFor']);
            return { live: value };
          },
          detachEntered(entry) {
            calls.push(['detachEntered', entry]);
          },
        };
      }
      if (name === 'sessionQuery') {
        return {
          async listSessions() {
            return headers.map((header) => ({ header }));
          },
        };
      }
      if (name === 'sessionPersistence') {
        return {
          root: '',
          locate({ id }) {
            return { path: join(dir, id, 'transcript.jsonl') };
          },
        };
      }
      if (name === 'workspaceRegistry') {
        return {
          async unarchiveSession(id) {
            calls.push(['unarchiveSession', id]);
          },
          async unpinSession(id) {
            calls.push(['unpinSession', id]);
          },
        };
      }
      return undefined;
    },
  };
  apply(ctx);
  return { route, calls };
}

function seedSession(id) {
  const sessionDir = join(dir, id);
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(join(sessionDir, 'transcript.jsonl'), '{}');
  return sessionDir;
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

const DELETE_URL = '/dsh-sidebar-row-menu/session/delete';

test('delete route rejects bad requests and unreachable hosts', async () => {
  // No host services at all: the route still exists but reports 503.
  const bare = createRoute();
  assert.equal((await call(bare, { url: DELETE_URL, body: { sessionIds: ['s1'] } })).status, 503);

  const { route } = createDeleteContext({ headers: [] });
  assert.equal(
    (await call(route, { url: DELETE_URL, body: { sessionIds: ['s1'] }, remote: '10.0.0.5' })).status,
    403,
  );
  assert.equal((await call(route, { url: DELETE_URL, method: 'GET' })).status, 405);
  assert.equal((await call(route, { url: '/dsh-sidebar-row-menu/nope' })).status, 404);
  assert.equal((await call(route, { url: DELETE_URL, body: {} })).status, 400);
  assert.equal((await call(route, { url: DELETE_URL, body: { sessionIds: [] } })).status, 400);
  assert.equal((await call(route, { url: DELETE_URL, body: { sessionIds: ['ok', 1] } })).status, 400);
  assert.equal(
    (await call(route, { url: DELETE_URL, body: { sessionIds: Array.from({ length: 501 }, (_, i) => `s${i}`) } })).status,
    400,
  );
});

test('delete route removes a cold session transcript and clears ledger entries', async () => {
  const sessionDir = seedSession('cold-session');
  const calls = [];
  const { route } = createDeleteContext({
    headers: [{ id: 'cold-session', cwd: dir }],
    calls,
  });
  const result = await call(route, { url: DELETE_URL, body: { sessionIds: ['cold-session'] } });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true, deleted: 1, failed: 0, error: '' });
  assert.equal(existsSync(sessionDir), false);
  assert.deepEqual(calls, [
    ['unarchiveSession', 'cold-session'],
    ['unpinSession', 'cold-session'],
    ['emit', 'api-session/removed', 'cold-session'],
  ]);
});

test('delete route detaches a live session before removing its transcript', async () => {
  const sessionDir = seedSession('live-session');
  const calls = [];
  const live = { header: { id: 'live-session', cwd: dir } };
  const { route } = createDeleteContext({ live, calls });
  const result = await call(route, { url: DELETE_URL, body: { sessionIds: ['live-session'] } });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(existsSync(sessionDir), false);
  assert.deepEqual(calls.map((entry) => entry[0]), [
    'liveEntryFor',
    'detachEntered',
    'unarchiveSession',
    'unpinSession',
    'emit',
  ]);
});

test('delete route refuses an unverified directory and keeps it on disk', async () => {
  const sessionDir = seedSession('needs-verify');
  const calls = [];
  const ctx = {
    effect(fn) {
      fn();
      return () => {};
    },
    webServer: { register(value) { ctx.route = value; return () => {}; } },
    logger: { warn() {} },
    emit() {},
    get(name) {
      if (name === 'sessions') return { get: () => undefined };
      if (name === 'sessionQuery') {
        return { listSessions: async () => [{ header: { id: 'needs-verify', cwd: dir } }] };
      }
      if (name === 'sessionPersistence') {
        return { root: '', locate: () => ({ path: join(dir, 'wrong-name', 'x.jsonl') }) };
      }
      if (name === 'workspaceRegistry') return {};
      return undefined;
    },
  };
  apply(ctx);
  const result = await call(ctx.route, { url: DELETE_URL, body: { sessionIds: ['needs-verify'] } });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.deleted, 0);
  assert.equal(result.body.failed, 1);
  assert.equal(result.body.code, 'batch-failed');
  assert.equal(existsSync(sessionDir), true);
  assert.deepEqual(calls, []);
});

test('removeSessions filters, dedupes and reports already-missing sessions as success', async () => {
  const sessionDir = seedSession('keep-me');
  const calls = [];
  const { route } = createDeleteContext({ headers: [{ id: 'keep-me', cwd: dir }], calls });
  assert.ok(route);

  const result = await removeSessions({
    get(name) {
      if (name === 'sessions') return { get: () => undefined };
      if (name === 'sessionQuery') {
        return { listSessions: async () => [{ header: { id: 'keep-me', cwd: dir } }] };
      }
      if (name === 'sessionPersistence') {
        return { root: '', locate: ({ id }) => ({ path: join(dir, id, 't.jsonl') }) };
      }
      if (name === 'workspaceRegistry') return {};
      return undefined;
    },
    emit() {},
  }, [' keep-me ', 'keep-me', '', 'ghost', null]);

  assert.deepEqual(result, { ok: true, deleted: 1, failed: 0, error: '' });
  assert.equal(existsSync(sessionDir), false);
});
