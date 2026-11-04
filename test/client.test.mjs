import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const clientPath = fileURLToPath(new URL('../lib/client.js', import.meta.url));
const source = readFileSync(clientPath, 'utf8');

function loadClient(stored = {}) {
  let registration;
  const listeners = [];
  const hosts = [];
  const storage = new Map(Object.entries(stored));
  const localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const window = {
    __ModuleLoader__: {
      load(value) {
        registration = value;
      },
    },
    location: { href: 'http://127.0.0.1:10102/' },
    localStorage,
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
  const documentListeners = [];
  const document = {
    body: { appendChild(el) { hosts.push(el); } },
    addEventListener(type, listener, capture) {
      documentListeners.push({ type, listener, capture });
    },
    removeEventListener(type, listener, capture) {
      const index = documentListeners.findIndex(
        (entry) => entry.type === type && entry.listener === listener && entry.capture === capture,
      );
      if (index >= 0) documentListeners.splice(index, 1);
    },
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
    localStorage,
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
  return { registration, listeners, documentListeners, hosts, window, document, storage };
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
      Toast: function Toast() {},
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
          Fragment: function Fragment() {},
          useCallback: (fn) => fn,
          useEffect: () => {},
          useLayoutEffect: () => {},
          useRef: (value) => ({ current: value ?? null }),
          useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
          useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
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
  const sessionEntries = ctx.slots.registrations.filter(
    (entry) => entry.spec.name === 'sidebar.workspaces.session.menu.item',
  );
  assert.equal(
    sessionEntries.map((entry) => entry.spec.id).join(','),
    'row-menu-open-with-pinned,row-menu-open-with,row-menu-delete-session,row-menu-delete-archived',
  );
  for (const entry of sessionEntries) {
    assert.equal(entry.spec.locale, 'sidebar-row-menu');
  }
  assert.deepEqual(
    sessionEntries.map((entry) => entry.spec.order),
    [495, 500, 510, 520],
  );

  // New capabilities are configurable and the delete confirmation has an overlay host.
  const settings = ctx.slots.registrations.find((entry) => entry.spec.name === 'settings.section');
  assert.ok(settings, 'settings.section must be registered');
  assert.equal(settings.spec.id, 'sidebar-row-menu');
  assert.equal(settings.spec.locale, 'sidebar-row-menu');
  const overlay = ctx.slots.registrations.find((entry) => entry.spec.name === 'shell.overlay');
  assert.ok(overlay, 'the delete dialog must live on shell.overlay');
  assert.equal(overlay.spec.id, 'sidebar-row-menu-delete-dialog');

  for (const dispose of cleanups) dispose();
  assert.equal(listeners.length, 0);
});

test('workspace context menu registers ordered providers for 0.2.2', () => {
  const { registration, listeners, documentListeners } = loadClient();
  const exported = registration.factory(makeRequire([], [], []));
  const providers = [];
  const ctx = makeCtx({
    contextMenus: {
      register(spec) {
        providers.push(spec);
        return () => {};
      },
    },
  });
  exported.apply(ctx);

  assert.deepEqual(
    providers.map((spec) => `${spec.id}:${spec.target}:${spec.order}`),
    [
      'sidebar-row-menu.workspace.new:workspace:90',
      'sidebar-row-menu.workspace.tab:workspace:110',
      'sidebar-row-menu.workspace.copy:workspace:150',
      'sidebar-row-menu.workspace.pinned:workspace:210',
      'sidebar-row-menu.workspace.open-with:workspace:220',
      'sidebar-row-menu.workspace.delete:workspace:310',
    ],
  );

  const iconKeys = ctx.slots.registrations
    .filter((entry) => entry.spec.name === 'contextMenu.icon')
    .map((entry) => entry.spec.key);
  assert.ok(iconKeys.includes('sidebar-row-menu.open-with'), 'the open-with entry needs an icon slot');

  const target = { workspaceId: 'w1', path: 'C:\\work', displayTitle: 'Demo' };
  const resolve = (key) => providers.find((spec) => spec.id.endsWith(`.${key}`)).resolve(target);

  // 「…」打开的菜单默认不带插件条目：provider 只在右键手势里返回动作。
  assert.equal(resolve('new').length, 0);
  assert.equal(resolve('copy').length, 0);

  const menu = listeners.find((entry) => entry.type === 'contextmenu').listener;
  const rowProps = {
    group: { workspaceId: 'w1', displayTitle: 'Demo' },
    actions: { rename: () => {}, delete: () => {} },
    onContextMenu: () => {},
  };
  const event = fireContextMenu(menu, makeRowTarget('workspace:w1', rowProps));
  // 0.2.2 的宿主行自己开菜单：插件只打标记，不拦事件也不自绘。
  assert.equal(event.defaultPrevented, false);

  assert.equal(resolve('new').map((action) => action.id).join(','), 'new-session');
  assert.equal(resolve('copy').map((action) => action.id).join(','), 'copy-path');
  // 会话菜单的分组分隔线规则：复制/在文件夹显示自成一块，删除组另起一块。
  assert.equal(resolve('copy')[0].separatorBefore, true);
  assert.equal(resolve('delete')[0].separatorBefore, false);
  const deleting = resolve('delete');
  assert.equal(deleting.map((action) => action.id).join(','), 'delete-sessions');
  assert.equal(deleting[0].danger, true);
  for (const action of [...resolve('new'), ...resolve('copy'), ...deleting]) {
    assert.equal('group' in action, false, 'the grouping marker must not leak into the menu');
  }

  // 行尾「…」按下会收掉手势标记，随后打开的菜单只留原生项。
  const pointerdown = documentListeners.find((entry) => entry.type === 'pointerdown').listener;
  pointerdown({
    isTrusted: true,
    target: { nodeType: 1, closest: (selector) => (String(selector).includes('rowActions') ? {} : null) },
  });
  assert.equal(resolve('new').length, 0);

  // Unknown targets resolve to nothing rather than throwing.
  assert.equal(providers[0].resolve({}).length, 0);
});

test('workspace entries can be opted into the native ellipsis menu', () => {
  const ELLIPSIS_KEY = 'dsh.sidebar-row-menu.ellipsis.v1';
  const { registration } = loadClient({
    [ELLIPSIS_KEY]: JSON.stringify({ newSession: true, deleteSessions: true }),
  });
  const exported = registration.factory(makeRequire([], [], []));
  const providers = [];
  const ctx = makeCtx({
    contextMenus: {
      register(spec) {
        providers.push(spec);
        return () => {};
      },
    },
  });
  exported.apply(ctx);

  const target = { workspaceId: 'w1', path: 'C:\\work', displayTitle: 'Demo' };
  const resolve = (key) => providers.find((spec) => spec.id.endsWith(`.${key}`)).resolve(target);
  // 没有右键手势，但开了附加开关：条目照常进入宿主的「…」菜单。
  assert.equal(resolve('new').map((action) => action.id).join(','), 'new-session');
  assert.equal(resolve('delete').map((action) => action.id).join(','), 'delete-sessions');
  assert.equal(resolve('copy').length, 0);
  assert.equal(resolve('tab').length, 0);
});


test('session entries disappear when dsh-session-menu already provides them', () => {
  const { registration, listeners } = loadClient();
  const exported = registration.factory(makeRequire([], [], []));
  const ctx = makeCtx();
  const registrations = [];
  const foreign = new Set(['session-menu-open-with', 'session-menu-delete-archived']);
  ctx.slots = {
    entriesOfSlot() {
      return [...foreign].map((id) => ({ options: { id } }));
    },
    inject(_name, generator) {
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
  exported.apply(ctx);

  const menuProps = {
    open: false,
    anchor: { props: { onClick: () => {} } },
  };
  const target = makeRowTarget(
    'session:s1',
    { node: { id: 's1', title: 'Session 1', blank: false }, onRenameRequest: () => {} },
    menuProps,
  );
  fireContextMenu(listeners[listeners.length - 1].listener, target);

  const t = (key) => key;
  const openWith = registrations.find((entry) => entry.spec.id === 'row-menu-open-with');
  const deleteArchived = registrations.find((entry) => entry.spec.id === 'row-menu-delete-archived');
  assert.equal(openWith.Component({ sessionId: 's1', displayTitle: 'Session 1', useMenuOpenState: () => [true, () => {}], t }), null);
  assert.equal(deleteArchived.Component({ sessionId: 's1', displayTitle: 'Session 1', useMenuOpenState: () => [true, () => {}], t }), null);
});

test('unarchived sessions get the delete entry only after opting in', () => {
  const ITEMS_KEY = 'dsh.sidebar-row-menu.items.v1';

  function deleteComponent(stored, archivedIds) {
    const { registration, listeners } = loadClient(stored);
    const exported = registration.factory(makeRequire([], [], []));
    const ctx = makeCtx({
      workspaces: {
        list: {
          getSnapshot: () => ({ archivedSessionIds: archivedIds }),
          subscribe: () => () => {},
        },
      },
    });
    exported.apply(ctx);
    fireContextMenu(
      listeners[listeners.length - 1].listener,
      makeRowTarget(
        'session:s1',
        { node: { id: 's1', title: 'Session 1', blank: false }, onRenameRequest: () => {} },
        { open: false, anchor: { props: { onClick: () => {} } } },
      ),
    );
    const entry = ctx.slots.registrations.find((candidate) => candidate.spec.id === 'row-menu-delete-session');
    assert.ok(entry, 'the single-session delete entry must be registered');
    return entry.Component;
  }

  const props = {
    sessionId: 's1',
    displayTitle: 'Session 1',
    useMenuOpenState: () => [true, () => {}],
    t: (key) => key,
  };

  // Default stays conservative: archived rows keep the entry, unarchived rows do not.
  assert.equal(deleteComponent({}, [])(props), null);
  const archived = deleteComponent({}, ['s1'])(props);
  assert.equal(archived.type.name, 'MenuItemButton');

  // Opting in extends the same entry to unarchived sessions.
  const optedIn = deleteComponent({ [ITEMS_KEY]: JSON.stringify({ deleteUnarchived: true }) }, [])(props);
  assert.equal(optedIn.type.name, 'MenuItemButton');
  assert.equal(optedIn.props.danger, true);
  assert.equal(optedIn.props.children, 'deleteSession');
});

test('workspace ellipsis stays native until an entry is enabled', () => {
  const { registration, documentListeners } = loadClient();
  const roots = [];
  const exported = registration.factory(makeRequire([], roots, []));
  exported.apply(makeCtx());

  const click = documentListeners.find((entry) => entry.type === 'click').listener;
  assert.equal(typeof click, 'function');

  const props = {
    group: { key: 'w1', workspaceId: 'w1', label: 'Work', cwd: 'C:\\Work' },
    actions: { rename: () => {}, delete: () => {} },
    onCreate: () => {},
  };
  const target = makeRowTarget('workspace:w1', props);
  let prevented = false;
  const button = {
    getAttribute: () => null,
    getBoundingClientRect: () => ({ left: 100, top: 20, width: 24, height: 24, bottom: 44 }),
  };
  const row = target.row;
  target.closest = (selector) => (selector === '[data-row-key]' ? row : selector === 'button' ? button : null);
  row.contains = (value) => value === button;
  row.querySelectorAll = () => [button, {}];

  click({ defaultPrevented: false, button: 0, target, preventDefault: () => { prevented = true; }, stopPropagation: () => {} });

  // No entry opted in: the click is left to the official menu.
  assert.equal(prevented, false);
  assert.equal(roots.length, 0);
});

test('workspace ellipsis menu only carries the enabled extras', () => {
  const ELLIPSIS_KEY = 'dsh.sidebar-row-menu.ellipsis.v1';
  const { registration, documentListeners } = loadClient({
    [ELLIPSIS_KEY]: JSON.stringify({ deleteSessions: true }),
  });
  const roots = [];
  const exported = registration.factory(makeRequire([], roots, []));
  exported.apply(makeCtx());

  const click = documentListeners.find((entry) => entry.type === 'click').listener;
  const props = {
    group: { key: 'w1', workspaceId: 'w1', label: 'Work', cwd: 'C:\\Work' },
    actions: { rename: () => {}, delete: () => {} },
    onCreate: () => {},
  };
  const target = makeRowTarget('workspace:w1', props);
  let prevented = false;
  const button = {
    getAttribute: () => null,
    getBoundingClientRect: () => ({ left: 100, top: 20, width: 24, height: 24, bottom: 44 }),
  };
  const row = target.row;
  target.closest = (selector) => (selector === '[data-row-key]' ? row : selector === 'button' ? button : null);
  row.contains = (value) => value === button;
  row.querySelectorAll = () => [button, {}];

  click({ defaultPrevented: false, button: 0, target, preventDefault: () => { prevented = true; }, stopPropagation: () => {} });

  assert.equal(prevented, true);
  const rows = workspaceRows(roots);
  assert.equal(
    rows.map((row) => row.props.key).join(','),
    'rename,delete,delete-sessions',
  );
  assert.equal(rows.at(-1).props.danger, true);
});

test('session entries can be opted into the native ellipsis menu', () => {
  const ELLIPSIS_KEY = 'dsh.sidebar-row-menu.ellipsis.v1';
  const { registration } = loadClient({
    [ELLIPSIS_KEY]: JSON.stringify({ sessionOpenWith: true }),
  });
  const exported = registration.factory(makeRequire([], [], []));
  const ctx = makeCtx({
    workspaces: {
      list: {
        getSnapshot: () => ({ archivedSessionIds: [] }),
        subscribe: () => () => {},
      },
    },
  });
  exported.apply(ctx);

  const entry = ctx.slots.registrations.find((candidate) => candidate.spec.id === 'row-menu-open-with');
  assert.ok(entry);
  const props = {
    sessionId: 's1',
    displayTitle: 'Session 1',
    useMenuOpenState: () => [true, () => {}],
    t: (key) => key,
  };
  // Outside a right-click window the entry is still mounted when opted in.
  const rendered = entry.Component(props);
  assert.notEqual(rendered, null);
  assert.equal(rendered.type.name, 'OpenWithSubmenu');
});

function collectText(node, out = []) {
  if (node === null || node === undefined || node === false) return out;
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return out;
  }
  if (typeof node === 'object' && node.props) collectText(node.props.children, out);
  return out;
}

function settingsTree(services, stored) {
  const { registration } = loadClient(stored);
  const exported = registration.factory(makeRequire([], [], []));
  const ctx = makeCtx(services);
  exported.apply(ctx);
  const entry = ctx.slots.registrations.find((candidate) => candidate.spec.name === 'settings.section');
  assert.ok(entry, 'settings.section must be registered');
  return collectText(entry.Component({ t: (key) => key }));
}

test('settings keep the workspace ellipsis switches on hosts with native menus', () => {
  const menu = {
    register: () => () => {},
    open: () => {},
    resolve: () => null,
    close: () => {},
    notify: () => {},
  };
  const texts = settingsTree({ contextMenus: menu });
  // 0.2.2 的「…」与右键共用一份菜单，工作区行的附加开关重新生效。
  assert.ok(texts.includes('settings.ellipsisHint'));
  assert.ok(!texts.includes('settings.ellipsisHintNative'));
  assert.ok(texts.includes('settings.ellipsisWorkspace'));
  assert.ok(texts.includes('settings.ellipsis.newSession.label'));
  assert.ok(texts.includes('settings.ellipsisSession'));
  assert.ok(texts.includes('settings.ellipsis.sessionOpenWith.label'));
});

test('settings keeps workspace ellipsis switches on hosts without native menus', () => {
  const texts = settingsTree({});
  assert.ok(texts.includes('settings.ellipsisHint'));
  assert.ok(texts.includes('settings.ellipsisWorkspace'));
  assert.ok(texts.includes('settings.ellipsis.newSession.label'));
  assert.ok(texts.includes('settings.ellipsisSession'));
});

test('workspace copy path reports through the official success toast', async () => {
  const roots = [];
  const clipboard = [];
  const { registration, listeners } = loadClient();
  const exported = registration.factory(makeRequire([], roots, clipboard));
  exported.apply(makeCtx());

  const props = {
    group: { key: 'w1', workspaceId: 'w1', label: 'Work', cwd: 'C:\\Work' },
    actions: { rename: () => {}, delete: () => {} },
    onCreate: () => {},
  };
  const listener = listeners[listeners.length - 1].listener;
  fireContextMenu(listener, makeRowTarget('workspace:w1', props));

  const rows = workspaceRows(roots);
  rows.find((row) => row.props.key === 'copy-path').props.onSelect();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(clipboard.at(-1), 'C:\\Work');
  const toastElement = roots.at(-1).host.__element;
  assert.equal(toastElement.type.name, 'Toast');
  assert.equal(toastElement.props.text, 'copied');
  // Same success presentation as the built-in "Copy Session ID" toast.
  assert.equal(toastElement.props.tone, 'success');
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

/** The custom workspace menu keeps its rows in the MenuSurface children. */
function workspaceRows(roots) {
  const host = [...roots].reverse().find((entry) => {
    const element = entry.host.__element;
    return element !== undefined && element.type?.name === 'WorkspaceRowMenu';
  });
  assert.ok(host, 'a workspace menu root should have been mounted');
  const element = host.host.__element;
  const tree = element.type(element.props);
  return tree.props.children.props.children;
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

  const rows = workspaceRows(roots);
  assert.equal(
    rows.map((row) => row.props.key).join(','),
    ['new-session', 'rename', 'open-with', 'copy-path', 'delete', 'delete-sessions'].join(','),
  );
  // 工作区菜单和会话菜单共用同一套「打开方式」二级菜单。
  assert.equal(rows.find((row) => row.props.key === 'open-with').type.name, 'OpenWithSubmenu');
  assert.equal(rows.find((row) => row.props.key === 'delete').props.separatorBefore, true);

  rows.find((row) => row.props.key === 'rename').props.onSelect();
  assert.equal(renamed.join(','), 'w1');
  // Selecting closes this menu first, so re-open it for the second action.
  fireContextMenu(listener, target);
  workspaceRows(roots).find((row) => row.props.key === 'new-session').props.onSelect();
  assert.equal([...events, ...renamed].join(','), 'new-session,w1');
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

/** The session entry that is only visible for right-click opened menus. */
function openWithEntry(ctx) {
  const entry = ctx.slots.registrations.find((candidate) => candidate.spec.id === 'row-menu-open-with');
  assert.ok(entry, 'row-menu-open-with must be registered');
  return entry;
}

const SESSION_ITEM_PROPS = {
  sessionId: 's1',
  displayTitle: 'Session 1',
  useMenuOpenState: () => [true, () => {}],
  t: (key) => key,
};

test('0.2.2 rows let the host open the menu at the pointer', () => {
  const { registration, listeners } = loadClient();
  const roots = [];
  const exported = registration.factory(makeRequire([], roots, []));
  const events = [];
  const trigger = {
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
  };
  const props = {
    node: { id: 's1', title: 'Session 1', blank: false, updatedAt: 1 },
    onRenameRequest: () => {},
    // 0.2.2: the row div carries the host trigger props (useContextMenu().getTriggerProps).
    onContextMenu: () => events.push('host-open'),
  };
  const target = makeRowTarget('session:s1', props, null, trigger);
  const ctx = makeCtx();
  exported.apply(ctx);
  const listener = listeners.find((entry) => entry.type === 'contextmenu').listener;
  const entry = openWithEntry(ctx);

  // 没有右键手势时条目保持隐藏（例如行尾「…」打开的菜单）。
  assert.equal(entry.Component(SESSION_ITEM_PROPS), null);

  const event = fireContextMenu(listener, target);
  // 宿主自己会把菜单开在指针处：不 preventDefault（宿主看到 defaultPrevented 会放弃），
  // 也不代点「…」——只补一次 pointerdown 让同步注入的插件条目同帧出现。
  assert.equal(event.defaultPrevented, false);
  assert.equal(events.join(','), 'pointerdown');
  assert.equal(roots.length, 0);
  assert.notEqual(entry.Component(SESSION_ITEM_PROPS), null);
});

test('the row action button hides the right-click entries for its own menu', () => {
  const { registration, listeners, documentListeners } = loadClient();
  const exported = registration.factory(makeRequire([], [], []));
  const props = {
    node: { id: 's1', title: 'Session 1', blank: false, updatedAt: 1 },
    onRenameRequest: () => {},
    onContextMenu: () => {},
  };
  const ctx = makeCtx();
  exported.apply(ctx);
  const menu = listeners.find((entry) => entry.type === 'contextmenu').listener;
  const pointerdown = documentListeners.find((entry) => entry.type === 'pointerdown').listener;
  const entry = openWithEntry(ctx);

  fireContextMenu(menu, makeRowTarget('session:s1', props, null, null));
  assert.notEqual(entry.Component(SESSION_ITEM_PROPS), null);

  pointerdown({
    isTrusted: true,
    target: { nodeType: 1, closest: (selector) => (String(selector).includes('rowActions') ? {} : null) },
  });
  assert.equal(entry.Component(SESSION_ITEM_PROPS), null);
});
