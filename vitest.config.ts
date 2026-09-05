/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname_new = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // Never fetch/execute external ad-network scripts during tests —
    // the ad slot components inject them into <head> and happy-dom would
    // otherwise download the real tags over the network.
    environmentOptions: {
      happyDom: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableCSSFileLoading: true,
        },
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**', 'src/components/**', 'src/pages/**'],
      exclude: ['src/test/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname_new, './src'),
    },
  },
})
