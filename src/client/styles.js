
const STYLE = `
.dsrm-submenu-host{position:relative;display:flex;align-items:center;width:100%}
.dsrm-submenu-trigger{display:flex;align-items:center;gap:6px;width:100%;min-height:34px;padding:6px 8px;border:0;border-radius:var(--dsw-radius-md);background:none;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;text-align:left;cursor:pointer}
.dsrm-submenu-trigger:hover:not(:disabled),.dsrm-submenu-trigger:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}
.dsrm-submenu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsrm-submenu-chevron{color:var(--dsw-alias-label-caption)}
.dsrm-submenu-chevron-flipped{transform:scaleX(-1)}
.dsrm-host-label{display:flex;align-items:center;gap:6px;width:100%}
.dsrm-host-label-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.dsrm-check{margin-left:auto;flex:none;color:var(--dsw-alias-label-primary)}
.dsrm-submenu{position:fixed;z-index:1101;min-width:180px;max-width:300px;max-height:min(380px,64vh);overflow:auto;padding:4px}
.dsrm-submenu-empty{padding:6px 8px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-menu{position:fixed;z-index:2147483647}
.dsrm-menu-surface{box-sizing:border-box;min-width:144px;padding:4px}
.dsrm-header-menu{max-height:min(70vh,520px);overflow:auto}
.dsrm-header-icon{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;color:inherit}
.dsrm-header-icon svg{width:14px;height:14px;display:block}
.dsrm-header-icon-img{width:14px;height:14px;border-radius:3px;display:block;object-fit:contain}
.dsrm-openwith{display:block}
.dsrm-openwith-note{padding:4px 12px 2px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsrm-sep{height:.5px;margin:3px 8px;background:var(--dsw-alias-border-l2)}
/* 150% 缩放等分数像素比下，宿主 0.5px 的分隔线会被摊成两行近乎透明，补到 1px 才看得见。 */
@media (min-resolution:1.2dppx) and (max-resolution:1.99dppx){[role="menu"] [role="separator"],.dsrm-sep{height:1px}}
.dsrm-app-icon{width:14px;height:14px;border-radius:3px;display:block;object-fit:contain}
.dsrm-settings{max-width:820px;margin:0 auto;padding:2px 0 36px}
.dsrm-settings-title{margin:0;font-size:16px;line-height:24px;font-weight:600}
.dsrm-settings-subtitle{margin-top:28px}
.dsrm-settings-groups{margin-top:10px;display:flex;flex-direction:column;gap:18px}
.dsrm-settings-group-title{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;font-weight:600;margin-bottom:2px}
.dsrm-settings-note{margin-top:8px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-settings-list{margin-top:10px;display:flex;flex-direction:column}
.dsrm-settings-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 0;border-top:.5px solid var(--dsw-alias-border-l2)}
.dsrm-settings-row:first-child{border-top:0}
.dsrm-settings-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
.dsrm-settings-label{font-size:14px;line-height:20px}
.dsrm-settings-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsrm-settings-controls{display:flex;align-items:center;gap:10px}
.dsrm-placement-controls{gap:16px}
.dsrm-placement-choice{display:flex;align-items:center;gap:6px;white-space:nowrap}
.dsrm-placement-choice-label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsrm-settings-children{margin-left:12px;padding:0 0 12px 18px;border-left:1px solid var(--dsw-alias-border-l2)}
.dsrm-settings-child{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:6px 14px 6px 0}
.dsrm-settings-child-label{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:18px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsrm-settings-child-actions{display:flex;align-items:center;gap:10px;flex:none}
.dsrm-pin{border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;background:none;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;padding:1px 8px;cursor:pointer}
.dsrm-pin:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsrm-pin:disabled{opacity:.45;cursor:default}
.dsrm-pin-on{border-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary)}
.dsrm-settings-empty{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-expander{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;border-radius:var(--dsw-radius-sm);background:none;color:var(--dsw-alias-label-caption);cursor:pointer}
.dsrm-expander:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsrm-expander-icon{transition:transform .12s ease}
.dsrm-expander-open{transform:rotate(90deg)}
.dsrm-danger-label{color:var(--dsw-alias-label-danger,#d33)}
.dsrm-status-text{margin-top:8px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsrm-error-text{margin-top:8px;color:var(--dsw-alias-label-danger,#d33);font-size:12px;line-height:18px;word-break:break-word}
`;

function installStyles() {
  if (document.head === null || document.head === undefined) return () => {};
  const style = document.createElement('style');
  style.setAttribute('data-dsh-sidebar-row-menu-style', '');
  style.textContent = STYLE;
  document.head.appendChild(style);
  return () => style.remove();
}

/* -------------------------------------------------------------- 安装 */

/**
 * 0.2.2 的会话行自己带 contextmenu 触发器（宿主 getTriggerProps 展开的
 * onContextMenu），它会把同一份菜单开在指针处。0.2.1 的行没有这个处理器，
 * 只能由插件代点行尾「…」再改锚点。
 */

export { STYLE, installStyles };
