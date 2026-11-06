import { jsx } from '../platform.js';

function h(type, props, ...children) {
  if (children.length === 0) return jsx(type, props);
  return jsx(type, { ...props, children: children.length === 1 ? children[0] : children });
}

export { h };
