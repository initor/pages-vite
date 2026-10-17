import { expect, test } from 'bun:test'
import pkg from '../../package.json'
import vercel from '../../vercel.json'

// Vercel's build image ships its own Bun and ignores `packageManager`, so
// vercel.json pins the version via bunx. Both pins must agree.
test('vercel.json pins the same Bun version as package.json', () => {
  const version = pkg.packageManager.replace(/^bun@/, '')
  for (const command of [vercel.installCommand, vercel.buildCommand]) {
    expect(command).toStartWith(`bunx bun@${version} `)
  }
})
