import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  bundle: true,
  // Bundle workspace dep — no separate @hookpm/schema needed on npm
  noExternal: ['@hookpm/schema'],
  // Keep true runtime deps external (installed from npm)
  external: ['cac', 'tar', 'zod'],
  dts: false,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
})
