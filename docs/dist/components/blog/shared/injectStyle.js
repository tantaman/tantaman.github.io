const injected = new Set();
export function injectStyle(id, css) {
    if (typeof document === 'undefined')
        return;
    if (injected.has(id))
        return;
    injected.add(id);
    const tag = document.createElement('style');
    tag.setAttribute('data-blog-style', id);
    tag.textContent = css;
    document.head.appendChild(tag);
}
