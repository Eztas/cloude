import path from 'path';
import react from '@vitejs/plugin-react';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // --- フロントエンド (React / jsdom) ---
        plugins: [react()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
        },
        test: {
          name: 'frontend',
          environment: 'jsdom',
          globals: true,
          setupFiles: './src/setupTests.ts',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        // --- Cloudflare Workers ---
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
          }),
        ],
        test: {
          name: 'worker',
          include: ['worker/**/!(*.integration).test.ts'],
        },
      },
      {
        // --- Cloudflare Workers 結合テスト ---
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
          }),
        ],
        test: {
          name: 'worker integration',
          include: ['worker/**/*.integration.test.ts'],
        },
      },
    ],
  },
});
