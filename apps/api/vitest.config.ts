import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/prebid-builds/**',
      '**/data/**',
    ],
    // Coverage removed - install @vitest/coverage-v8 to enable
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'json', 'html'],
    //   exclude: [
    //     '**/__tests__/**',
    //     '**/node_modules/**',
    //     '**/dist/**',
    //     '**/prebid-builds/**',
    //     '**/*.config.ts',
    //     '**/data/**',
    //   ],
    // },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
