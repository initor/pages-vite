# pages-vite

Independent static pages served under one subdomain:
`https://pages.waynewen.com/<page>/`. A personal GitHub Pages, deployed by
Vercel on every push to `main`.

Each page in [`pages/`](pages/) is self-contained (its own dependencies,
lockfile, and build). The repo only builds them and lays them out side by side.
Design and trade-offs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Add a page

```bash
bun install                       # once, repo tooling
bun run new-page foo              # scaffolds pages/foo from templates/vite-react
cd pages/foo && bun run dev       # http://localhost:5173/foo/
```

Commit `pages/foo/` (including its `bun.lock`) and open a PR. On merge it is
live at `https://pages.waynewen.com/foo/`. Any toolchain works as long as the
page meets the [page contract](pages/README.md).

## Commands (repo root)

| Command | What it does |
|---|---|
| `bun run build [slug...]` | Install and build each page, check the contract, assemble `dist/`. This is what Vercel runs |
| `bun run preview` | Serve `dist/` at http://localhost:4173, approximating Vercel |
| `bun run check [slug...]` | Run each page's own `lint` and `test` scripts |
| `bun run new-page <slug>` | Scaffold a page from a template (`--template <name>`) |
| `bun run test` / `lint` / `typecheck` | Checks for the repo tooling in `scripts/` |

## Layout

```
pages/<slug>/       one self-contained page per directory; name = URL path
templates/          starting points for new pages (built in CI so they stay green)
site/               files served at the root of the domain (404.html)
scripts/            build, check, scaffold, preview (Bun + TypeScript)
vercel.json         routing, headers, build commands
docs/               architecture and decisions
```

## Deployment

One Vercel project serves the assembled `dist/`. All settings live in
`vercel.json`, so the project needs no dashboard configuration beyond:

1. Vercel: **Add New Project**, import `initor/pages-vite`. Leave framework,
   build, and output settings at their defaults; `vercel.json` overrides them.
2. Project **Settings > Domains**: add `pages.waynewen.com`.
3. DNS: add `CNAME pages -> cname.vercel-dns.com` (or the exact target the
   Vercel domain page shows).
4. GitHub branch protection on `main`: require the `ci` checks, so a broken
   page never blocks a deploy.

Pull requests get Vercel preview deployments automatically.
