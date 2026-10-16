// Vitest configuration for modern testing
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    passWithNoTests: true,
    exclude: ['node_modules', 'dist', '.git'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Count every source file, including ones no test imports (shown as 0%)
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts']
      // Reporting only, no thresholds yet. Once coverage settles, add a floor:
      // thresholds: { lines: 70, functions: 70 }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
})