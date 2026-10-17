/**
 * Runs each page's own `lint` and `test` scripts, where the page defines them.
 * Type checking runs as part of each page's `build`.
 *
 * Usage: bun run check [slug...]   (no slugs = every page)
 */
import { discoverPages, selectPages } from './lib/pages.ts'
import { bun, runMain } from './lib/proc.ts'

const CHECKS = ['lint', 'test']

runMain(async () => {
  const pages = selectPages(await discoverPages(), process.argv.slice(2))
  for (const page of pages) {
    const checks = CHECKS.filter((name) => name in page.scripts)
    console.log(`\n==> ${page.slug}: ${checks.join(', ') || '(no checks defined)'}`)
    if (checks.length === 0) continue
    await bun(['install', '--frozen-lockfile'], page.dir)
    for (const name of checks) await bun(['run', name], page.dir)
  }
})
