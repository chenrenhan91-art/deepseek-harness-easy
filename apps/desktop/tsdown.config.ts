import { defineConfig } from 'tsdown'

/** Electron main and the Desktop-install CLI; `electron` stays external. */
export default defineConfig({
  entry: ['lib/types/index.js', 'lib/types/main.js', 'lib/types/bin.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  external: ['electron'],
})
