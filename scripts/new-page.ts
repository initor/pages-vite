/**
 * Scaffolds pages/<slug>/ from a template and installs its dependencies.
 *
 * Usage: bun run new-page <slug> [--template <name>]   (default: vite-react)
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { parseArgs } from 'node:util'
import { PAGES_DIR, SLUG_RE, TEMPLATES_DIR } from './lib/pages.ts'
import { bun, runMain } from './lib/proc.ts'

/** Files whose `__SLUG__` placeholders are filled in on scaffold. */
const PLACEHOLDER_FILES = ['index.html', 'README.md']

runMain(async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { template: { type: 'string', default: 'vite-react' } },
  })
  const [slug] = positionals
  const template = values.template
  const templates = await readdir(TEMPLATES_DIR)

  if (positionals.length !== 1 || !slug) throw new Error('usage: bun run new-page <slug> [--template <name>]')
  if (!SLUG_RE.test(slug)) throw new Error(`slug "${slug}" must match ${SLUG_RE}`)
  if (!templates.includes(template)) throw new Error(`unknown template "${template}"; have: ${templates.join(', ')}`)
  await mkdir(PAGES_DIR, { recursive: true })
  if ((await readdir(PAGES_DIR)).includes(slug)) throw new Error(`pages/${slug} already exists`)

  const src = join(TEMPLATES_DIR, template)
  const dest = join(PAGES_DIR, slug)
  try {
    await scaffold(src, dest, slug)
  } catch (err) {
    // A half-scaffolded page (no bun.lock) would fail every later build.
    await rm(dest, { recursive: true, force: true })
    throw err
  }

  console.log(`\ncreated pages/${slug} from templates/${template}`)
  console.log(`  cd pages/${slug} && bun run dev   # http://localhost:5173/${slug}/`)
})

async function scaffold(src: string, dest: string, slug: string): Promise<void> {
  await cp(src, dest, {
    recursive: true,
    errorOnExist: true,
    filter: (path) => !relative(src, path).split(sep).some((part) => part === 'node_modules' || part === 'dist'),
  })

  const pkgPath = join(dest, 'package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  await writeFile(pkgPath, JSON.stringify({ ...pkg, name: slug }, null, 2) + '\n')
  for (const file of PLACEHOLDER_FILES) {
    const path = join(dest, file)
    const text = await readFile(path, 'utf8').catch(() => null)
    if (text !== null) await writeFile(path, text.replaceAll('__SLUG__', slug))
  }

  // Not --frozen-lockfile: the rename above changes the lockfile's root entry.
  await bun(['install'], dest)
}
