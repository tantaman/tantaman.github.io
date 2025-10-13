/**
 * Plugin to inject layout-specific CSS before rehypeDocument runs
 */
export default function injectLayoutCSS() {
  return (tree, file) => {
    const layout = file.data?.matter?.layout;

    if (!file.data) {
      file.data = {};
    }

    if (!file.data.layoutCSS) {
      file.data.layoutCSS = [];
    }

    // Add layout-specific CSS
    if (layout === 'chat') {
      file.data.layoutCSS.push('/chat.css');
    }

    return tree;
  };
}
