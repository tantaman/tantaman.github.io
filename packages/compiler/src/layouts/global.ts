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
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'alternate', type: 'application/rss+xml', title: 'Tantaman', href: '/feed.xml' },
  ],
  css: ['https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css', '/index.css'],
  headScript: [
    `(function(){var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})()`,
  ],
  js: [
    {
      src: 'https://cloud.umami.is/script.js',
      defer: true,
      'data-website-id': 'f2e3a69c-3f8b-4eef-9619-75b2677c4ee6',
    },
    {
      src: '/toc.js',
    },
    {
      src: '/theme.js',
    },
  ],
};
