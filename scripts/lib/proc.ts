/** Runs bun (the same binary executing this script) in `cwd`; throws on failure. */
export async function bun(args: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn([process.execPath, ...args], { cwd, stdio: ['inherit', 'inherit', 'inherit'] })
  const code = await proc.exited
  if (code !== 0) throw new Error(`\`bun ${args.join(' ')}\` exited ${code} in ${cwd}`)
}

/** Runs `main`, printing a thrown error's message (not its stack) and exiting 1. */
export function runMain(main: () => Promise<void>): void {
  main().catch((err: unknown) => {
    console.error(`\nerror: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
}
