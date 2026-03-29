import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that transforms ```mermaid code blocks into <div class="mermaid">
 * elements for client-side rendering, and flags the file so the document wrapper
 * can conditionally inject the mermaid CDN script.
 */
export default function rehypeMermaid() {
  return (tree, file) => {
    visit(tree, 'element', (node, index, parent) => {
      if (
        node.tagName !== 'pre' ||
        !node.children ||
        node.children.length !== 1
      ) return;

      const code = node.children[0];
      if (
        code.tagName !== 'code' ||
        !code.properties?.className?.includes('language-mermaid')
      ) return;

      const text = code.children
        .filter(c => c.type === 'text')
        .map(c => c.value)
        .join('');

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid'] },
        children: [{ type: 'text', value: text }],
      };

      file.data.hasMermaid = true;
    });
  };
}
