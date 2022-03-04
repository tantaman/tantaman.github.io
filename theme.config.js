// theme.config.js
export default {
  projectLink: 'https://tantaman.com', // GitHub link in the navbar
  docsRepositoryBase: 'https://github.com/tantaman/tantaman.github.io', // base URL for the docs repository
  titleSuffix: '',
  nextLinks: true,
  prevLinks: true,
  search: true,
  customSearch: null, // customizable, you can use algolia for example
  darkMode: true,
  footer: true,
  footerText: `MIT ${new Date().getFullYear()} © Tantaman`,
  footerEditLink: `Edit this page on GitHub`,
  logo: (
    <>
      <img src="/avatar-icon.png" width={42} height={42}></img>
      <span className="mr-2 font-extrabold hidden md:inline">
        Tantamanlands
      </span>
    </>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="Contrarian thoughts on life and software"
      />
      <meta name="og:title" content="Tantamanlands" />
      <title>Tantamanlands</title>
    </>
  ),
};
