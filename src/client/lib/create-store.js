import { useSyncExternalStore } from '../platform.js';

/**
 * 极薄的状态容器：一份 state + 订阅者集合 + useSyncExternalStore 绑定。
 *
 * 插件里所有「设置项 / 菜单缓存」都是这个形状，抽出来以免每个 store 都
 * 手写一遍 publish / subscribe / snapshot / use 四件套。
 */
export function createStore(initial, options = {}) {
  let state = typeof initial === 'function' ? initial() : initial;
  const listeners = new Set();

  function snapshot() {
    return state;
  }

  function publish(next) {
    if (next !== undefined) state = next;
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        /* 单个订阅者出错不影响其它订阅者 */
      }
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function useValue() {
    return useSyncExternalStore(subscribe, snapshot, snapshot);
  }

  /** 更新 state 并持久化；persist 抛错（隐私模式）也保留本次会话内的值。 */
  function set(next) {
    state = typeof next === 'function' ? next(state) : next;
    try {
      options.persist?.(state);
    } catch {
      /* ignore */
    }
    publish();
    return state;
  }

  return { listeners, publish, set, snapshot, subscribe, useValue };
}

/** 读一个 JSON 形式的 localStorage 值；坏数据 / 隐私模式返回 undefined。 */
export function readStoredJson(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (typeof raw !== 'string' || raw === '') return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** 写一个 JSON 形式的 localStorage 值；失败静默（隐私模式）。 */
export function writeStoredJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** 只保留 keys 里 boolean 类型的字段，其余回退 defaults。 */
export function readBooleanRecord(key, keys, defaults) {
  const result = { ...defaults };
  const parsed = readStoredJson(key);
  if (parsed === null || typeof parsed !== 'object') return result;
  for (const name of keys) {
    if (typeof parsed[name] === 'boolean') result[name] = parsed[name];
  }
  return result;
}
