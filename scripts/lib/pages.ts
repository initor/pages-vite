import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const ROOT = join(import.meta.dir, '..', '..')
export const PAGES_DIR = join(ROOT, 'pages')
export const TEMPLATES_DIR = join(ROOT, 'templates')

/** A page's directory name is its URL path segment, so it must be URL-safe. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface Page {
  slug: string
  dir: string
  scripts: Record<string, string>
}

/**
 * Lists every page under `pagesDir`, enforcing the page contract (see
 * README.md). Contract violations throw: a malformed page must fail the build,
 * not silently drop off the site.
 */
export async function discoverPages(pagesDir = PAGES_DIR): Promise<Page[]> {
  const entries = await readdir(pagesDir, { withFileTypes: true }).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') return []
    throw err
  })
  const pages: Page[] = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new Error(`pages/${entry.name}: symlinks are not allowed; a page lives in its directory`)
    }
    if (!entry.isDirectory()) continue
    const slug = entry.name
    const dir = join(pagesDir, slug)
    if (!SLUG_RE.test(slug)) {
      throw new Error(`pages/${slug}: directory name must match ${SLUG_RE}`)
    }
    let pkg: { scripts?: Record<string, unknown> }
    try {
      pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    } catch {
      throw new Error(`pages/${slug}: missing or unparseable package.json`)
    }
    if (typeof pkg.scripts?.build !== 'string') {
      throw new Error(`pages/${slug}: package.json has no "build" script`)
    }
    if (!(await exists(join(dir, 'bun.lock')))) {
      throw new Error(`pages/${slug}: missing bun.lock (run \`bun install\` in the page)`)
    }
    pages.push({ slug, dir, scripts: pkg.scripts as Record<string, string> })
  }
  return pages.sort((a, b) => a.slug.localeCompare(b.slug))
}

/** Narrows `pages` to the requested slugs; no slugs means all pages. */
export function selectPages(pages: Page[], slugs: string[]): Page[] {
  if (slugs.length === 0) return pages
  const unknown = slugs.filter((s) => !pages.some((p) => p.slug === s))
  if (unknown.length > 0) throw new Error(`unknown page(s): ${unknown.join(', ')}`)
  return pages.filter((p) => slugs.includes(p.slug))
}

/**
 * Returns root-relative `src`/`href` URLs in `html` that escape `/<slug>/`.
 * Any hit means the page was built without the right base path and would
 * request another page's (or a nonexistent) asset once deployed.
 */
export function findEscapingUrls(html: string, slug: string): string[] {
  const prefix = `/${slug}/`
  const escaping: string[] = []
  for (const [, url] of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']*)["']/gi)) {
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith(prefix)) {
      escaping.push(url)
    }
  }
  return escaping
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  )
}
