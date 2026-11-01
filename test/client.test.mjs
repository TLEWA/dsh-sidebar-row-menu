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
  const hosts = [];
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
    setTimeout: () => 0,
  };
  const document = {
    body: { appendChild(el) { hosts.push(el); } },
    createElement(tag) {
      return {
        tag,
        style: {},
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        remove() { this.removed = true; },
      };
    },
  };
  vm.runInNewContext(source, { window, document, console, URL });
  assert.ok(registration, 'client.js must call window.__ModuleLoader__.load');
  return { registration, listeners, hosts, window, document };
}

function makeRequire(seen, roots, clipboard) {
  const primitive = new Proxy(
    {
      writeClipboard: async (text) => {
        clipboard.push(text);
        return true;
      },
      Menu: function Menu() {},
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
        return {
          createRoot(host) {
            const root = {
              render(element) { host.__element = element; },
              unmount() { host.__unmounted = true; },
            };
            roots.push({ host, root });
            return root;
          },
        };
      case '@deepseek-ai/dsh-client-ui-primitives':
        return primitive;
      default:
        throw new Error(`unexpected require: ${id}`);
    }
  };
}

function makeCtx(services = {}) {
  return {
    locale: {
      register: () => () => {},
      bind: () => (key) => key,
    },
    effect(fn) {
      const dispose = fn();
      return typeof dispose === 'function' ? dispose : () => {};
    },
    get(name) {
      return services[name];
    },
    ...services,
  };
}

test('client module registers the expected factory and exports', () => {
  const { registration } = loadClient();
  assert.equal(registration.id, 'dsh-sidebar-row-menu');
  assert.equal(typeof registration.factory, 'function');

  const seen = [];
  const exported = registration.factory(makeRequire(seen, [], []));
  assert.equal(exported.name, 'sidebar-row-menu');
  assert.equal(typeof exported.apply, 'function');
  // The array lives in the vm realm, so compare by value rather than prototype.
  assert.equal(exported.inject.join(','), 'locale,sessions,workspaces,uiWorkspace');
  assert.equal(
    [...new Set(seen)].sort().join(','),
    [
      '@deepseek-ai/dsh-client-ui-primitives',
      'react',
      'react-dom/client',
      'react/jsx-runtime',
    ].join(','),
  );
});

test('client apply installs and uninstalls a capture listener', () => {
  const { registration, listeners } = loadClient();
  const exported = registration.factory(makeRequire([], [], []));

  const cleanups = [];
  const ctx = makeCtx();
  const originalEffect = ctx.effect;
  ctx.effect = (fn) => {
    const dispose = originalEffect(fn);
    if (typeof dispose === 'function') cleanups.push(dispose);
    return () => {};
  };

  exported.apply(ctx);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].type, 'contextmenu');
  assert.equal(listeners[0].capture, true);
  for (const dispose of cleanups) dispose();
  assert.equal(listeners.length, 0);
});

/** Build a fake sidebar row carrying React fiber props. */
function makeRowTarget(rowKey, props) {
  const row = { getAttribute: () => rowKey };
  const fiber = { memoizedProps: props, return: null };
  return {
    closest: () => row,
    __reactFiber$test: fiber,
  };
}

function fireContextMenu(listener, target) {
  const event = {
    defaultPrevented: false,
    target,
    clientX: 40,
    clientY: 60,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {},
    stopImmediatePropagation() {},
  };
  listener(event);
  return event;
}

function menuOf(roots) {
  const host = [...roots].reverse().find((entry) => entry.host.__element !== undefined);
  assert.ok(host, 'a menu root should have been mounted');
  const element = host.host.__element;
  const menu = element.type(element.props);
  return { host, menu };
}

test('workspace row opens the expected menu without touching unrelated rows', () => {
  const { registration, listeners } = loadClient();
  const roots = [];
  const exported = registration.factory(makeRequire([], roots, []));
  const renamed = [];
  const events = [];

  const props = {
    group: { key: 'w1', workspaceId: 'w1', label: 'Work', cwd: 'C:\\Work' },
    actions: { rename: () => renamed.push('w1'), delete: () => events.push('delete') },
    onCreate: () => events.push('new-session'),
  };
  const target = makeRowTarget('workspace:w1', props);

  exported.apply(makeCtx());
  const listener = listeners[listeners.length - 1].listener;

  // Rows such as the overflow row must not be intercepted.
  const overflow = fireContextMenu(listener, makeRowTarget('overflow:w1', {}));
  assert.equal(overflow.defaultPrevented, false);

  const event = fireContextMenu(listener, target);
  assert.equal(event.defaultPrevented, true);

  const { menu } = menuOf(roots);
  assert.equal(
    menu.props.items.map((item) => item.id).join(','),
    ['new-session', 'rename', 'sep1', 'vscode', 'explorer', 'copy-path', 'sep2', 'delete'].join(','),
  );

  menu.props.onSelect('rename');
  assert.equal(renamed.join(','), 'w1');
  menu.props.onSelect('new-session');
  assert.equal(events.join(','), 'new-session');
});

test('session row menu renames, forks, copies and archives through services', async () => {
  const roots = [];
  const clipboard = [];
  const calls = [];

  const ui = {
    forkSession: (...args) => calls.push(['fork', ...args]),
    openSession: (...args) => calls.push(['open', ...args]),
    pinSession: (...args) => calls.push(['pin', ...args]),
    unpinSession: (...args) => calls.push(['unpin', ...args]),
    archiveSession: (...args) => calls.push(['archive', ...args]),
    unarchiveSession: (...args) => calls.push(['unarchive', ...args]),
  };
  const props = {
    node: {
      id: 's1',
      title: 'Session 1',
      blank: false,
      running: false,
      archived: false,
      pinned: false,
      updatedAt: 1,
    },
    onRenameRequest: (...args) => calls.push(['rename', ...args]),
  };
  const target = makeRowTarget('session:s1', props);

  const ctx = makeCtx({ uiWorkspace: ui });
  const fresh = loadClient();
  const freshExported = fresh.registration.factory(makeRequire([], roots, clipboard));
  freshExported.apply(ctx);

  const listener = fresh.listeners[fresh.listeners.length - 1].listener;
  const event = fireContextMenu(listener, target);
  assert.equal(event.defaultPrevented, true);

  const { menu } = menuOf(roots);
  assert.equal(
    menu.props.items.map((item) => item.id).join(','),
    ['rename', 'fork', 'pin', 'sep1', 'vscode', 'explorer', 'sep2', 'copy-link', 'copy-id', 'sep3', 'archive'].join(','),
  );

  menu.props.onSelect('rename');
  assert.equal(calls.at(-1).join(','), 'rename,s1,Session 1');

  menu.props.onSelect('copy-id');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(clipboard.join(','), 's1');

  menu.props.onSelect('copy-link');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(clipboard.at(-1), 'http://127.0.0.1:10102/?session=s1');
});
