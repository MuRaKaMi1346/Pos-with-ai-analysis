import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vitest/config'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(currentDir, './src'),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.config.*', '**/*.d.ts', 'src/main.tsx'],
    },
  },
})
