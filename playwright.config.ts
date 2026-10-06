import { defineConfig } from '@playwright/test';

const PORT = 4322;

// Тесты идут по собранному сайту из dist/: сначала npm run build (или сборка с PREVIEW_LOCALES).
export default defineConfig({
  testDir: 'tests/e2e',
  // Своя папка: иначе каждый запуск тестов стирает снимки из test-results/shots.
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
  },
});
