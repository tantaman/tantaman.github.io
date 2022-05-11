export default function index(file, cwd, files) {
  return {
    content: (index) => {
      return `<ol>${Object.entries(index)
        .map(
          ([key, meta]) =>
            `<li><a href="./${meta.compiledFilename}">${key}</a></li>`,
        )
        .join('\n')}</ol>`;
    },
    frontmatter: {},
    greymatter: {},
  };
}
