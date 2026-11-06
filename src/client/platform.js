/**
 * 平台模块的唯一入口。
 *
 * DSH 的客户端模块系统把 react / react-dom/client / ui-primitives 放进
 * 一张静态模块表，由 loader 传给 factory 的 require 解析。拆成多文件后，
 * 每个模块都直接 import 'react' 也能工作，但集中在这里便于：
 *   - 一眼看清插件依赖了平台的哪些导出；
 *   - 打包时统一标成 external（见 scripts/build-client.mjs）。
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { jsx } from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import {
  MenuItemButton,
  MenuSurface,
  Modal,
  Button,
  Switch,
  Toast,
  writeClipboard,
  IconEditOutlineRegular,
  IconTrashOutlineRegular,
  IconProjectAddOutlineRegular,
  IconNewChatOutlineRegular,
  IconWarningOutlineRegular,
  IconCopyOutlineRegular,
  IconChevronRightOutlineRegular,
  IconArchiveOutlineRegular,
  IconArchiveOffOutlineRegular,
  IconRightUpOutlineRegular,
  IconTriangleRightFillRegular,
} from '@deepseek-ai/dsh-client-ui-primitives';

export {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  jsx,
  createRoot,
  MenuItemButton,
  MenuSurface,
  Modal,
  Button,
  Switch,
  Toast,
  writeClipboard,
  IconEditOutlineRegular,
  IconTrashOutlineRegular,
  IconProjectAddOutlineRegular,
  IconNewChatOutlineRegular,
  IconWarningOutlineRegular,
  IconCopyOutlineRegular,
  IconChevronRightOutlineRegular,
  IconArchiveOutlineRegular,
  IconArchiveOffOutlineRegular,
  IconRightUpOutlineRegular,
  IconTriangleRightFillRegular,
};
