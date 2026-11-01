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
  vm.runInNewContext(source, {
    window,
    document,
    console,
    URL,
    PointerEvent: class PointerEvent {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    },
  });
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
      MenuItemButton: function MenuItemButton() {},
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
        return {
          useCallback: (fn) => fn,
          useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
        };
      case 'react/jsx-runtime':
        return { jsx: (type, props) => ({ type, props }) };
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

function makeSlots() {
  const registrations = [];
  return {
    registrations,
    inject(name, generator) {
      const iterator = generator();
      let step = iterator.next();
      while (!step.done) step = iterator.next();
      return () => {};
    },
    register(spec, Component) {
      registrations.push({ spec, Component });
      return () => {};
    },
  };
}

function makeCtx(services = {}) {
  const slots = makeSlots();
  return {
    slots,
    locale: {
      register: () => () => {},
      bind: () => (key) => key,
    },
    effect(fn) {
      const dispose = fn();
      return typeof dispose === 'function' ? dispose : () => {};
    },
    get(name) {
      if (name === 'slots') return slots;
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
  assert.equal(exported.inject.join(','), 'locale,sessions,workspaces,slots');
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

test('apply installs the capture listener and registers session menu entries', () => {
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

  // Right-click must not hardcode built-in actions: the only session entries are ours,
  // contributed through the same slot the built-in "..." menu renders.
  assert.equal(
    ctx.slots.registrations.map((entry) => entry.spec.id).join(','),
    'row-menu-vscode,row-menu-explorer,row-menu-copy-link',
  );
  for (const entry of ctx.slots.registrations) {
    assert.equal(entry.spec.name, 'sidebar.workspaces.session.menu.item');
    assert.equal(entry.spec.locale, 'sidebar-row-menu');
  }
  assert.deepEqual(
    ctx.slots.registrations.map((entry) => entry.spec.order),
    [500, 510, 520],
  );

  for (const dispose of cleanups) dispose();
  assert.equal(listeners.length, 0);
});

test('session menu contribution copies the deep link and closes the menu', async () => {
  const roots = [];
  const clipboard = [];
  const { registration, listeners } = loadClient();
  const exported = registration.factory(makeRequire([], roots, clipboard));
  const ctx = makeCtx();
  exported.apply(ctx);

  const link = ctx.slots.registrations.find((entry) => entry.spec.id === 'row-menu-copy-link');
  const closed = [];
  const render = () => link.Component({
    sessionId: 's1',
    useMenuOpenState: () => [true, (value) => closed.push(value)],
    t: (key) => key,
  });

  // 点「…」打开的菜单里不显示插件条目。
  assert.equal(render(), null);

  // 右键之后打开的菜单里才显示。
  const listener = listeners[listeners.length - 1].listener;
  fireContextMenu(listener, makeRowTarget(
    'session:s1',
    { node: { id: 's1', title: 'Session 1', blank: false, updatedAt: 1 }, onRenameRequest: () => {} },
    { open: false, anchor: { props: { onClick: () => {} } } },
  ));

  const element = render();
  assert.equal(element.type.name, 'MenuItemButton');
  element.props.onSelect();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(clipboard.at(-1), 'http://127.0.0.1:10102/?session=s1');
  assert.equal(closed.join(','), 'false');
});

/** Build a fake sidebar row carrying React fiber props. */
function makeRowTarget(rowKey, props, menuProps = null, trigger = null) {
  const menuFiber = menuProps === null
    ? null
    : { memoizedProps: menuProps, child: null, sibling: null, return: null };
  const fiber = { memoizedProps: props, child: menuFiber, sibling: null, return: null };
  const row = {
    getAttribute: () => rowKey,
    querySelector: (selector) => (trigger !== null && String(selector).includes('rowActions') ? trigger : null),
    __reactFiber$test: fiber,
  };
  return {
    closest: () => row,
    __reactFiber$test: fiber,
    row,
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

test('session row right-click opens the built-in slot-composed menu', () => {
  const { registration, listeners } = loadClient();
  const roots = [];
  const exported = registration.factory(makeRequire([], roots, []));
  const clicks = [];

  const menuProps = {
    open: false,
    anchor: { props: { onClick: () => clicks.push('toggle') } },
  };
  const props = {
    node: { id: 's1', title: 'Session 1', blank: false, updatedAt: 1 },
    onRenameRequest: () => {},
  };
  const target = makeRowTarget('session:s1', props, menuProps);

  exported.apply(makeCtx());
  const listener = listeners[listeners.length - 1].listener;

  const event = fireContextMenu(listener, target);
  assert.equal(event.defaultPrevented, true);
  assert.equal(clicks.join(','), 'toggle');
  // The official menu was toggled in place; this plugin did not mount its own copy.
  assert.equal(roots.length, 0);

  // Draft sessions have no built-in menu and must not be intercepted.
  const draft = fireContextMenu(
    listener,
    makeRowTarget('session:draft', { node: { id: 'draft', blank: true }, onRenameRequest: () => {} }),
  );
  assert.equal(draft.defaultPrevented, false);

  // An already open menu is left alone rather than toggled shut.
  menuProps.open = true;
  fireContextMenu(listener, target);
  assert.equal(clicks.join(','), 'toggle');
});

test('session right-click primes row-action pointer listeners before opening the menu', () => {
  const { registration, listeners } = loadClient();
  const roots = [];
  const exported = registration.factory(makeRequire([], roots, []));
  const events = [];
  const trigger = {
    dispatchEvent(event) {
      events.push(`${event.type}:${event.pointerType}:${event.bubbles}`);
      return true;
    },
  };
  const menuProps = {
    open: false,
    anchor: { props: { onClick: () => events.push('toggle') } },
  };
  const props = {
    node: { id: 's1', title: 'Session 1', blank: false, updatedAt: 1 },
    onRenameRequest: () => {},
  };
  const target = makeRowTarget('session:s1', props, menuProps, trigger);

  exported.apply(makeCtx());
  const listener = listeners[listeners.length - 1].listener;
  fireContextMenu(listener, target);

  // pointerdown is emitted first so DOM-injecting menu extensions (meow-memory)
  // can add their rows in the same frame instead of after their 120 ms debounce.
  assert.equal(events.join(','), 'pointerdown:mouse:true,toggle');
  assert.equal(roots.length, 0);
});
