import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const schemaDir = fileURLToPath(new URL('../schema/src/index.ts', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@hookpm/schema': resolve(schemaDir),
    },
  },
  test: {
    environment: 'node',
  },
})
