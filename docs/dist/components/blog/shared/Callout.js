// @ts-ignore
import React from 'https://esm.sh/react';
import { injectStyle } from './injectStyle.js';
const CSS = `
.blog-callout {
  margin: 1.5em 0;
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 4px solid;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(127, 127, 127, 0.08);
}
.blog-callout-icon { font-size: 1.2em; line-height: 1.4; }
.blog-callout-body { flex: 1; }
.blog-callout-body > :first-child { margin-top: 0; }
.blog-callout-body > :last-child { margin-bottom: 0; }
.blog-callout-default { border-color: #6b7280; }
.blog-callout-info { border-color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
.blog-callout-warning { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.blog-callout-error { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
`;
const ICONS = {
    default: '💡',
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚫',
};
export function Callout({ type = 'default', emoji, children }) {
    injectStyle('blog-callout', CSS);
    const icon = emoji != null ? emoji : ICONS[type] || ICONS.default;
    return (React.createElement("div", { className: `blog-callout blog-callout-${type}` },
        React.createElement("div", { className: "blog-callout-icon" }, icon),
        React.createElement("div", { className: "blog-callout-body" }, children)));
}
export default Callout;
