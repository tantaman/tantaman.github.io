const classic = require('@docusaurus/preset-classic');

module.exports = function preset(context, opts = {}) {
  const base = classic.default(context, opts);
  // const blogPluginIndex = base.plugins.findIndex(
  //   (plugin) => plugin[0].indexOf('@docusaurus/plugin-content-blog') !== -1,
  // );
  // base.plugins.splice(blogPluginIndex, 1, [
  //   './src/plugins/blog-plugin',
  //   {
  //     id: 'blog',
  //     routeBasePath: 'blog',
  //     path: './blog',
  //   },
  // ]);
  return base;
};
