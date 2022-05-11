export default function index(file, cwd, files) {
  return {
    content: (index) => {
      return 'index!';
    },
    frontmatter: {},
    greymatter: {},
  };
}
