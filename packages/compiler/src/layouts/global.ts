export const meta = {
  og: true,
  twitter: true,
  copyright: true,
  type: 'article',
  name: 'Tantamanlands',
  siteTags: ['software', 'statistics', 'economics'],
  siteAuthor: 'Matt Wonlaw',
  siteTwitter: '@tantaman',
  image: {
    url: 'https://tantaman.com/img/avatar-icon.png',
    width: 312,
    height: 369,
    alt: 'Tantaman',
  },
};

export const doc = {
  css: ['/index.css'],
  headScript: [
    `(function(){var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})()`,
  ],
  js: [
    {
      src: 'https://www.googletagmanager.com/gtag/js?id=G-87CH8D1XSS',
      async: true,
    },
    {
      src: '/ga.js',
    },
    {
      src: '/toc.js',
    },
    {
      src: '/theme.js',
    },
  ],
};
