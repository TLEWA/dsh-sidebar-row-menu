import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const clientPath = fileURLToPath(new URL('../lib/client.js', import.meta.url));
const source = readFileSync(clientPath, 'utf8');

function loadClient() {
  let registration;
  const listeners = [];
  const window = {
    __ModuleLoader__: {
      load(value) {
        registration = value;
      },
    },
    location: { href: 'http://127.0.0.1:10102/' },
    addEventListener(type, listener, capture) {
      listeners.push({ type, listener, capture });
    },
    removeEventListener(type, listener, capture) {
      const index = listeners.findIndex(
        (entry) => entry.type === type && entry.listener === listener && entry.capture === capture,
      );
      if (index >= 0) listeners.splice(index, 1);
    },
    setTimeout,
  };
  const document = {
    body: null,
    createElement: () => ({ style: {}, setAttribute() {}, remove() {} }),
  };
  vm.runInNewContext(source, { window, document, console });
  assert.ok(registration, 'client.js must call window.__ModuleLoader__.load');
  return { registration, listeners };
}

function makeRequire(seen) {
  const primitive = new Proxy(
    {
      writeClipboard: async () => true,
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        return () => null;
      },
    },
  );
  return (id) => {
    seen.push(id);
    switch (id) {
      case 'react':
        return { useCallback: (fn) => fn, useState: (value) => [value, () => {}], Fragment: Symbol('Fragment') };
      case 'react/jsx-runtime':
        return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      case 'react-dom/client':
        return { createRoot: () => ({ render() {}, unmount() {} }) };
      case '@deepseek-ai/dsh-client-ui-primitives':
        return primitive;
      default:
        throw new Error(`unexpected require: ${id}`);
    }
  };
}

test('client module registers the expected factory and exports', () => {
  const { registration } = loadClient();
  assert.equal(registration.id, 'dsh-sidebar-row-menu');
  assert.equal(typeof registration.factory, 'function');

  const seen = [];
  const exported = registration.factory(makeRequire(seen));
  assert.equal(exported.name, 'sidebar-row-menu');
  assert.equal(typeof exported.apply, 'function');
  // The array lives in the vm realm, so compare by value rather than prototype.
  assert.equal(exported.inject.join(','), 'locale,sessions,workspaces,uiWorkspace');
  assert.deepEqual(
    [...new Set(seen)].sort(),
    [
      '@deepseek-ai/dsh-client-ui-primitives',
      'react',
      'react-dom/client',
      'react/jsx-runtime',
    ],
  );
});

test('client apply installs and uninstalls a capture listener', () => {
  const { registration, listeners } = loadClient();
  const exported = registration.factory(makeRequire([]));

  const cleanups = [];
  const ctx = {
    locale: {
      register: () => () => {},
      bind: () => (key) => key,
    },
    effect(fn) {
      const dispose = fn();
      if (typeof dispose === 'function') cleanups.push(dispose);
      return () => {};
    },
    get: () => null,
  };

  exported.apply(ctx);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].type, 'contextmenu');
  assert.equal(listeners[0].capture, true);
  for (const dispose of cleanups) dispose();
  assert.equal(listeners.length, 0);
});
