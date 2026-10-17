# pages/

One directory per page. The directory name is the URL:
`pages/foo/` is served at `https://pages.waynewen.com/foo/`.

Create a page with `bun run new-page <slug>` from the repo root.

## Page contract

Every directory here must satisfy all of the following. `bun run build`
checks everything it can mechanically (name, `package.json`, `build` script,
`bun.lock`, `dist/index.html`, base path) and fails loudly on a violation.

1. **Name**: lowercase letters, digits, and single hyphens
   (`^[a-z0-9]+(-[a-z0-9]+)*$`). Renaming the directory moves the URL.
2. **Self-contained**: its own `package.json` with a `build` script and its own
   `bun.lock`. No imports from outside the directory, no root workspace. A page
   can be copied into its own repo and build unchanged.
3. **Output**: `build` writes a static site to `dist/` with `dist/index.html`.
4. **Base path**: everything is built for `/<slug>/`. Root-relative URLs in
   `dist/index.html` that escape `/<slug>/` fail the build. The template derives
   the base from the directory name; any other toolchain must set it itself.

Optional: `lint` and `test` scripts run in CI (`bun run check`) when defined.

## Same origin, shared browser state

All pages share one origin, so the browser does not isolate them. Each page
must:

- prefix `localStorage`, `sessionStorage`, and IndexedDB keys with its slug;
- set cookies with `Path=/<slug>/`;
- register any service worker with `scope: '/<slug>/'`.

A page that needs real isolation (auth, untrusted content) belongs on its own
subdomain, not here. See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).
