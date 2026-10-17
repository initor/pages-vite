/**
 * Builds pages and assembles the deployable site (what Vercel serves) in dist/:
 *
 *   dist/404.html        <- site/
 *   dist/<slug>/...      <- pages/<slug>/dist/
 *
 * Usage: bun run build [slug...]   (no slugs = every page)
 */
import { cp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { discoverPages, findEscapingUrls, ROOT, selectPages } from './lib/pages.ts'
import { bun, runMain } from './lib/proc.ts'

const OUT = join(ROOT, 'dist')

runMain(async () => {
  const pages = selectPages(await discoverPages(), process.argv.slice(2))
  await rm(OUT, { recursive: true, force: true })
  await cp(join(ROOT, 'site'), OUT, { recursive: true })

  for (const page of pages) {
    console.log(`\n==> ${page.slug}`)
    await bun(['install', '--frozen-lockfile'], page.dir)
    await bun(['run', 'build'], page.dir)

    const pageOut = join(page.dir, 'dist')
    const html = await readFile(join(pageOut, 'index.html'), 'utf8').catch(() => {
      throw new Error(`pages/${page.slug}: build did not produce dist/index.html`)
    })
    const escaping = findEscapingUrls(html, page.slug)
    if (escaping.length > 0) {
      throw new Error(
        `pages/${page.slug}: dist/index.html references URLs outside /${page.slug}/ ` +
          `(is the build base set to /${page.slug}/?): ${escaping.join(', ')}`,
      )
    }
    await cp(pageOut, join(OUT, page.slug), { recursive: true })
  }

  console.log(`\nassembled ${pages.length} page(s) into dist/: ${pages.map((p) => p.slug).join(', ') || '(none)'}`)
})
