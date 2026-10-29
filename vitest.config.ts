import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate vitest config — keeps test config isolated from vite's plugin types
export default defineConfig({
  plugins: [react() as Parameters<typeof defineConfig>[0]['plugins']],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
