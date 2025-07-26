import React from 'https://esm.sh/react';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({
    theme: 'dark',
});
export default function Mermaid({ id, chart }) {
    return (React.createElement("div", { ref: async (node) => {
            const { svg } = await mermaid.render(id, chart);
            node.innerHTML = svg;
        } }));
}
