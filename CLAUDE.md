# pages-vite: agent context

Independent static pages under `https://pages.waynewen.com/<slug>/`. One repo,
one Vercel project; `scripts/build.ts` builds every page in isolation and
assembles `dist/`. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before
changing anything outside a single page.

## Stack

- Bun is the package manager and script runner (version pinned in
  `package.json` `packageManager` and in `vercel.json`; keep both equal, a test
  enforces it). No npm, pnpm, tsx, or ts-node.
- Repo tooling: TypeScript in `scripts/`, tests with `bun test`, lint with oxlint.
- Default page template: Vite 8 + React 19 + TypeScript + Tailwind CSS v4 +
  oxlint (`templates/vite-react`).

## Commands

- `bun run build [slug...]`: build pages and assemble `dist/` (what Vercel runs)
- `bun run check [slug...]`: each page's own `lint`/`test`
- `bun run new-page <slug>`: scaffold from a template
- `bun run preview`: serve `dist/` locally
- `bun run test && bun run lint && bun run typecheck`: repo tooling checks

Before declaring a page change done: `bun run check <slug> && bun run build
<slug>`, then render it in a browser via `bun run preview`. A passing build
is not proof that the page renders.

## Hard rules

- **Pages are independent.** Never import across `pages/*`, never add a root
  workspace, never create shared page code. Copy instead.
- **The directory name is the URL.** Every page builds for base `/<slug>/`.
  Renaming a page directory changes a public URL; treat it as a breaking change.
- **Each page owns its `bun.lock`.** Commit it; installs are
  `--frozen-lockfile`.
- **Same origin.** Pages namespace browser storage, cookies, and service
  worker scope by slug (see `pages/README.md`). Pages needing isolation do not
  belong here.
- Global `vercel.json` rules must be safe for every page. Page-specific
  routing is a page-scoped rule (`/<slug>/...`), never a global one.
- When changing a template, CI scaffolds and builds it; run
  `bun run new-page tmp && bun run build tmp` locally, then delete `pages/tmp`.

## Not building yet

See "Not building yet" in `docs/ARCHITECTURE.md`. Each item has a trigger; do
not pre-build.
