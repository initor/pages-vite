import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { discoverPages, findEscapingUrls, SLUG_RE, selectPages, type Page } from './pages.ts'

describe('SLUG_RE', () => {
  test.each(['foo', 'foo-bar', 'a1', '2026-recap'])('accepts %p', (slug) => {
    expect(SLUG_RE.test(slug)).toBe(true)
  })
  test.each(['Foo', 'foo_bar', '-foo', 'foo-', 'foo--bar', 'foo.bar', '.hidden', ''])('rejects %p', (slug) => {
    expect(SLUG_RE.test(slug)).toBe(false)
  })
})

describe('discoverPages', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'pages-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function page(slug: string, pkg: object | string = { scripts: { build: 'vite build' } }, lock = true) {
    await mkdir(join(dir, slug))
    await writeFile(join(dir, slug, 'package.json'), typeof pkg === 'string' ? pkg : JSON.stringify(pkg))
    if (lock) await writeFile(join(dir, slug, 'bun.lock'), '{}')
  }

  test('returns valid pages sorted by slug and ignores plain files', async () => {
    await page('zeta')
    await page('alpha', { scripts: { build: 'vite build', lint: 'oxlint' } })
    await writeFile(join(dir, 'README.md'), '# pages')

    const pages = await discoverPages(dir)

    expect(pages.map((p) => p.slug)).toEqual(['alpha', 'zeta'])
    expect(pages[0]).toEqual({ slug: 'alpha', dir: join(dir, 'alpha'), scripts: { build: 'vite build', lint: 'oxlint' } })
  })

  test('treats a missing pages directory as no pages', async () => {
    expect(await discoverPages(join(dir, 'absent'))).toEqual([])
  })

  test('rejects a symlinked page instead of silently skipping it', async () => {
    await page('real')
    await symlink(join(dir, 'real'), join(dir, 'alias'))
    await expect(discoverPages(dir)).rejects.toThrow('pages/alias: symlinks are not allowed')
  })

  test('rejects a directory name that is not a valid slug', async () => {
    await page('Bad_Name')
    await expect(discoverPages(dir)).rejects.toThrow('pages/Bad_Name: directory name must match')
  })

  test('rejects a missing package.json', async () => {
    await mkdir(join(dir, 'foo'))
    await expect(discoverPages(dir)).rejects.toThrow('pages/foo: missing or unparseable package.json')
  })

  test('rejects an unparseable package.json', async () => {
    await page('foo', '{not json')
    await expect(discoverPages(dir)).rejects.toThrow('pages/foo: missing or unparseable package.json')
  })

  test('rejects a package.json without a build script', async () => {
    await page('foo', { scripts: { dev: 'vite' } })
    await expect(discoverPages(dir)).rejects.toThrow('pages/foo: package.json has no "build" script')
  })

  test('rejects a page without bun.lock', async () => {
    await page('foo', undefined, false)
    await expect(discoverPages(dir)).rejects.toThrow('pages/foo: missing bun.lock')
  })
})

describe('selectPages', () => {
  const pages: Page[] = ['a', 'b', 'c'].map((slug) => ({ slug, dir: `/p/${slug}`, scripts: { build: 'x' } }))

  test('no slugs selects every page', () => {
    expect(selectPages(pages, [])).toBe(pages)
  })

  test('selects the requested pages in discovery order', () => {
    expect(selectPages(pages, ['c', 'a']).map((p) => p.slug)).toEqual(['a', 'c'])
  })

  test('rejects unknown slugs', () => {
    expect(() => selectPages(pages, ['a', 'nope', 'zip'])).toThrow('unknown page(s): nope, zip')
  })
})

describe('findEscapingUrls', () => {
  test('accepts URLs under the page base, external, protocol-relative, relative, and fragment URLs', () => {
    const html = `
      <link rel="icon" href="/foo/favicon.svg">
      <script type="module" crossorigin src="/foo/assets/index-abc.js"></script>
      <link rel="stylesheet" href='/foo/assets/index-def.css'>
      <a href="https://example.com/x">x</a>
      <script src="//cdn.example.com/lib.js"></script>
      <img src="img/logo.png"><a href="#top">top</a><img src="data:image/png;base64,AA==">`
    expect(findEscapingUrls(html, 'foo')).toEqual([])
  })

  test('flags root-relative URLs outside the page base', () => {
    const html = `
      <link rel="icon" href="/favicon.svg">
      <script type="module" src="/assets/index-abc.js"></script>
      <link href="/foobar/x.css" rel="stylesheet">
      <a HREF="/">home</a>`
    expect(findEscapingUrls(html, 'foo')).toEqual(['/favicon.svg', '/assets/index-abc.js', '/foobar/x.css', '/'])
  })
})
