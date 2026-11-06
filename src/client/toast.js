import { TOAST_ATTR } from './constants.js';
import { IconWarningOutlineRegular, Toast, createRoot, jsx } from './platform.js';

let toastHost = null;
let toastRoot = null;

function closeToast() {
  const host = toastHost;
  const root = toastRoot;
  toastHost = null;
  toastRoot = null;
  if (root !== null) {
    try {
      root.unmount();
    } catch {
    }
  }
  if (host !== null) host.remove();
}

function toast(message, tone) {
  if (document.body === null) return;
  closeToast();
  const host = document.createElement('div');
  host.setAttribute(TOAST_ATTR, '');
  host.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
  document.body.appendChild(host);
  const root = createRoot(host);
  toastHost = host;
  toastRoot = root;
  const props = {
    text: message,
    onDone: () => window.setTimeout(closeToast, 0),
  };
  if (tone === 'success') props.tone = 'success';
  if (tone === 'warning') {
    props.tone = 'warning';
    props.icon = jsx(IconWarningOutlineRegular, {});
  }
  root.render(jsx(Toast, props));
}


export { closeToast, toast, toastHost, toastRoot };
