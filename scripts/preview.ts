/**
 * Serves the assembled dist/ locally, approximating Vercel's static serving:
 * directory index, `trailingSlash: true` redirects, and the root 404.html.
 * Other vercel.json redirects and headers are not emulated.
 *
 * Usage: bun run preview   (after `bun run build`; PORT env, default 4173)
 */
import { stat } from 'node:fs/promises'
import { isAbsolute, join, normalize, relative } from 'node:path'
import { ROOT } from './lib/pages.ts'

const OUT = join(ROOT, 'dist')
const port = Number(process.env.PORT ?? 4173)

async function isFile(path: string): Promise<boolean> {
  return stat(path).then((s) => s.isFile(), () => false)
}

const server = Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    let path: string
    try {
      path = join(OUT, normalize(decodeURIComponent(pathname)))
    } catch {
      return new Response('bad request', { status: 400 })
    }
    const rel = relative(OUT, path)
    if (rel.startsWith('..') || isAbsolute(rel)) return new Response('bad request', { status: 400 })
    if (await isFile(path)) return new Response(Bun.file(path))
    if (await isFile(join(path, 'index.html'))) {
      if (!pathname.endsWith('/')) return Response.redirect(`${pathname}/`, 308)
      return new Response(Bun.file(join(path, 'index.html')))
    }
    return new Response(Bun.file(join(OUT, '404.html')), { status: 404 })
  },
})

console.log(`serving dist/ at ${server.url}`)
