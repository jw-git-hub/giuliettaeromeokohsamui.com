// Снимки страницы на трёх экранах из списка приёмки (DESIGN.md, раздел 9).
// Запуск: node scripts/shoot.mjs [адрес] [имя] [--full] [--scroll=селектор]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUTPUT_DIR = 'test-results/shots';
const DEFAULT_URL = 'http://localhost:4321/';
const SETTLE_MS = 400;

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'tablet', width: 820, height: 1180, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
];

function parseArguments(argv) {
  const flags = argv.filter((argument) => argument.startsWith('--'));
  const [url = DEFAULT_URL, name = 'page'] = argv.filter((argument) => !argument.startsWith('--'));
  const scrollFlag = flags.find((flag) => flag.startsWith('--scroll='));
  const onlyFlag = flags.find((flag) => flag.startsWith('--only='));
  return {
    url,
    name,
    fullPage: flags.includes('--full'),
    scrollTo: scrollFlag?.slice('--scroll='.length),
    only: onlyFlag?.slice('--only='.length).split(','),
  };
}

async function loadLazyImages(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let offset = 0; offset < document.body.scrollHeight; offset += step) {
      window.scrollTo(0, offset);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
}

async function shootViewport(browser, viewport, options) {
  const { name: viewportName, ...contextOptions } = viewport;
  const context = await browser.newContext({ viewport: contextOptions, ...contextOptions });
  const page = await context.newPage();
  await page.goto(options.url, { waitUntil: 'networkidle' });
  if (options.fullPage) await loadLazyImages(page);
  if (options.scrollTo) await page.locator(options.scrollTo).first().scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE_MS);
  const path = `${OUTPUT_DIR}/${options.name}-${viewportName}.png`;
  await page.screenshot({ path, fullPage: options.fullPage });
  await context.close();
  return path;
}

const options = parseArguments(process.argv.slice(2));
const viewports = VIEWPORTS.filter((viewport) => !options.only || options.only.includes(viewport.name));
mkdirSync(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch();
for (const viewport of viewports) {
  console.log(await shootViewport(browser, viewport, options));
}
await browser.close();
