# CLAUDE.md

The codebase is a content driven website. It contains a custom compiler that converts markdown present in `./content` to html files output to `./docs`. `./content` can also contain JS files to generate static pages based on filesystem contents or other things available at build time. See `./content/index.js` as an example that create a blog index page.

## Development

- Run `pnpm serve` to start a static server that serves site contents
- Run `pnpm build` to build the site after changing any files in `./content`
- Run `pnpm dev` or `pnpm build:watch` to watch for changes and rebuild automatically
- The site is served from the `./docs` directory after building

## Package Management

- Uses pnpm as the package manager (required via `only-allow` preinstall script)
- Workspace setup with packages in `./packages/`
- Main dependencies include unified, rehype, and mdx processing libraries

## Code Structure

### Build System
- `./packages/compiler/src/bin/sitecompiler.ts` - CLI entrypoint that builds multiple content directories in parallel:
  - Root content (`''`) - main blog posts
  - `bookmarks/` - bookmark collection 
  - `notes/` - note collection
  - `the-mirror-room/` - short story collection
- `./packages/compiler/src/index.ts` - main build logic and unified pipeline
- `./packages/compiler/package.json` - defines `sitecompiler` and `sitecompiler-watch` binaries

### Content Processing
- `./packages/compiler/src/layouts/layouts.js` - layout registry with `default` and `mirrorRoom` layouts
- `./packages/compiler/src/layouts/defaultLayout.tsx` - standard blog post layout
- `./packages/compiler/src/layouts/mirrorRoomLayout.tsx` - custom layout for mirror room content
- Layout selection via `layout` property in markdown frontmatter

### Content Structure
- `./content/` - source markdown and MDX files organized by type
  - Root level: main blog posts (dated YYYY-MM-DD-title.md format)
  - `bookmarks/` - curated links and resources
  - `notes/` - research notes and thoughts
  - `the-mirror-room/` - creative writing/short stories
  - `pages/` - static pages (commented out in build)
  - `tweets/` - twitter-like content (commented out in build)
- `./content/index.js` - generates blog index page from filesystem metadata
- `./docs/` - compiled HTML output directory served by static server

### File Types
- `.md` - standard markdown files
- `.mdx` - MDX files with React components
- `.js` - custom page generators (like index.js)
- Frontmatter used for metadata (title, layout, tags, description)
