import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    reporters: ['verbose'],
    server: {
      deps: {
        inline: [/.*\.ts$/, /.*\.tsx$/],
      },
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
});
