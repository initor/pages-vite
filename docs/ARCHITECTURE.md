# Architecture

## Goal

Host many unrelated static pages under one subdomain, each at its own path:
`pages.waynewen.com/foo/`, `pages.waynewen.com/bar/`. Pages share a hostname
and nothing else: no shared code, dependencies, styling, or release cadence.
Think of it as a personal GitHub Pages.

## Decision: one repo, one Vercel project, one assembled static output

```
pages/foo/  --bun install + build-->  pages/foo/dist/  --copy-->  dist/foo/
pages/bar/  --bun install + build-->  pages/bar/dist/  --copy-->  dist/bar/
site/                                                  --copy-->  dist/404.html
                                                                     |
                                       Vercel serves dist/ as static files
```

`scripts/build.ts` discovers every page, builds each one in isolation with its
own lockfile, checks the page contract ([pages/README.md](../pages/README.md)),
and assembles a single `dist/`. Vercel runs exactly that command; CI runs it on
every PR.

### Independence is enforced at the source, not the deploy

| Property | How |
|---|---|
| Own dependencies | Per-page `package.json` + `bun.lock`; no root workspace, so one page's upgrade cannot re-resolve another's tree |
| Own toolchain | The only requirement is a `build` script that emits `dist/index.html` for base `/<slug>/`; Vite is the default, not a rule |
| Own upgrade cadence | Dependabot opens one grouped PR per page directory |
| Portable | A page can be copied to its own repo and build unchanged |

The one shared thing is the deploy: every merge to `main` rebuilds and
redeploys all pages atomically. Two consequences, both accepted:

- A page that fails to build blocks deploys of the others. Mitigation: CI runs
  the same build on every PR, so a red build does not reach `main`. Vercel
  deploys are atomic; a failed build leaves the previous deployment live.
- Build time grows linearly with page count. Fine for tens of small pages.

### Alternatives considered

- **One Vercel project per page, behind a router project that rewrites
  `/foo/*` to `foo.vercel.app`.** True deploy isolation, but each page needs
  its own project setup and the router needs a rewrite pair per page. Vercel
  Microfrontends formalizes this but includes only two projects on Hobby.
  Overhead not justified for static pages.
- **Bun workspaces.** One install and one lockfile, but a shared lockfile
  couples pages: hoisting means one page's bump can move another's
  transitive versions. Rejected on the independence requirement.
- **Subdomain per page (`foo.pages.waynewen.com`).** Strongest browser
  isolation, but not the URL shape wanted. Remains the escape hatch for any
  page that needs isolation (see below).

## Routing (`vercel.json`)

| Rule | Why |
|---|---|
| `trailingSlash: true` | `/foo` redirects (308) to `/foo/`, the URL every page is built for. Relative links resolve correctly. Paths with a file extension are exempt |
| `/` redirects (307) to waynewen.com | The subdomain has no landing page of its own. Temporary, so it can change later without browsers caching it |
| `site/404.html` | Served by Vercel for any path no static file matches |
| `/:page/assets/*` cached immutable | Vite emits content-hashed filenames there; everything else keeps Vercel's revalidating default |
| `nosniff`, `Referrer-Policy` | Safe for every page. Page-specific policy (CSP, framing) is deliberately not global |

Redirects and headers apply before the filesystem check; an existing static
file always wins over a rewrite.

Not supported out of the box: client-side routing with deep links (an SPA's
`/foo/settings` needs a rewrite to `/foo/index.html`) and per-page 404 pages.
A page that needs either adds an explicit, page-scoped rule to `vercel.json`.

## Same origin: what is shared

Every page is served from the same origin, so browsers treat them as one
site. `localStorage`, `sessionStorage`, IndexedDB, cookies, and service worker
scopes are shared, and any page can script another through `window.open` or
an iframe. The rules in [pages/README.md](../pages/README.md) (namespace keys,
scope cookies and service workers by slug) prevent accidental collisions
between trusted pages. They are not a security boundary. A page with auth,
user data, or third-party content goes on its own subdomain.

## Toolchain pinning

Bun is pinned once in `package.json` (`packageManager`), which CI's
`setup-bun` reads. Vercel's build image ships its own Bun and ignores that
field, so `vercel.json` invokes `bunx bun@<version>` for install and build. A
test fails if the two pins disagree. `build.ts` re-executes the Bun binary
running it, so nested per-page installs use the same pinned version.

## Not building yet (each has a trigger)

- **Selective rebuilds** (build only changed pages): when a full build
  exceeds about 5 minutes.
- **Per-page Vercel projects**: when a page needs its own deploy cadence,
  environment variables, or server functions.
- **A generated index page at `/`**: when there is something worth listing
  publicly.
- **Shared components or styles**: never. Copy instead; independence is the
  point.
