# __SLUG__

Served at <https://pages.waynewen.com/__SLUG__/>.

```bash
bun install
bun run dev     # http://localhost:5173/__SLUG__/
bun run build   # tsc -b && vite build -> dist/
bun run lint
```

This page is self-contained: its own dependencies, lockfile, and build. The
repo-level contract it must satisfy is in [../README.md](../README.md).
