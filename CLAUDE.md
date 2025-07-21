# CLAUDE.md

The codebase is a content driven website. It contains a custom compiler that converts markdown present in `./content` to html files output to `./docs`. `./content` can also contain JS files to generate static pages based on filesystem contents or other things available at build time. See `./content/index.js` as an example that create a blog index page.

## Development

- Run `pnpm serve` to start a static server that serves site contents
- Run `pnpm build` to build the site after changing any files in `./content`

## Code Structure

- `./packages/compiler/src/bind/sitecompiler.ts` - this is the entrypoint to compiling the site. A series of subdirectories of `./content` are listed which can be built.
- `./packages/compiler/src/layouts/layouts.js` - contains a list of layouts. The default layout is for a blog post. `mirrorRoom` is a custom layout for the `mirror-room` short story collection. New layouts can be added. Layouts are picked via the `layout` property in the front matter of markdown files.
