// takes a compiled page and adds all the relevant things to
// make it standalone.
// Basically LAMP of old but ahead of time.
import path from 'path';

export default function postProcess(filepath, artifact, index) {
  const ext = path.extname(filepath).substring(1);
  filepath = filepath.substring(0, filepath.lastIndexOf('.'));

  // We'll use
  // https://unifiedjs.com/explore/package/rehype-document/
  // to make everything standalone.
  // We need to integrate that into `bundleMdx` too
  // and then just get rid of `makeStandalone`
  // because it'll all be standalone.
  if (ext === 'md') {
    return [
      `${filepath}.${artifact.frontmatter?.standalone || 'html'}`,
      artifact.content,
    ];
  }

  if (ext === 'js') {
    return [
      `${filepath}.${artifact.frontmatter?.standalone || 'html'}`,
      typeof artifact.content === 'function'
        ? artifact.content(index)
        : artifact.content,
    ];
  }

  return [
    `${filepath}.${artifact.frontmatter?.standalone || 'html'}`,
    `<!DOCTYPE html>
<html>
  <body>${artifact.content}</body>
</html>
`,
  ];
}
