// Снимки страницы на трёх экранах из списка приёмки (DESIGN.md, раздел 9).
// Запуск: node scripts/shoot.mjs [адрес] [имя] [--only=phone,desktop] [--scroll=селектор] [--sheets]
// --sheets: страница целиком, нарезанная на экраны и сложенная в листы — удобно просматривать.
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const OUTPUT_DIR = 'test-results/shots';
const DEFAULT_URL = 'http://localhost:4321/';
const SETTLE_MS = 400;
const LAZY_SCROLL_PAUSE_MS = 150;
const SHEET_GAP = 12;
const SHEET_BACKGROUND = '#444444';
const SHEET_NUMBER_DIGITS = 2;
const CLI_ARGUMENTS_START = 2;

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, perSheet: 5 },
  { name: 'tablet', width: 820, height: 1180, deviceScaleFactor: 1, isMobile: true, hasTouch: true, perSheet: 2 },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, perSheet: 1 },
];

function readFlag(flags, name) {
  return flags.find((flag) => flag.startsWith(`--${name}=`))?.slice(name.length + '--='.length);
}

function parseArguments(argv) {
  const flags = argv.filter((argument) => argument.startsWith('--'));
  const [url = DEFAULT_URL, name = 'page'] = argv.filter((argument) => !argument.startsWith('--'));
  return {
    url,
    name,
    sheets: flags.includes('--sheets'),
    scrollTo: readFlag(flags, 'scroll'),
    only: readFlag(flags, 'only')?.split(','),
    scale: readFlag(flags, 'scale'),
  };
}

async function loadLazyImages(page, pauseMs) {
  await page.evaluate(async (pause) => {
    for (let offset = 0; offset < document.body.scrollHeight; offset += window.innerHeight) {
      window.scrollTo({ top: offset, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, pause));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, pauseMs);
  // Скрытые фото (QR на телефоне) браузер не грузит вовсе — ждём только видимые.
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.offsetParent === null || image.complete),
  );
}

async function openPage(browser, viewport, options) {
  const contextOptions = {
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
  };
  const deviceScaleFactor = options.scale ? Number(options.scale) : viewport.deviceScaleFactor;
  const viewportSize = { width: viewport.width, height: viewport.height };
  const context = await browser.newContext({ ...contextOptions, deviceScaleFactor, viewport: viewportSize });
  const page = await context.newPage();
  await page.goto(options.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, deviceScaleFactor };
}

async function composeSheet(slices, sliceWidth, sliceHeight, path) {
  const width = slices.length * sliceWidth + (slices.length - 1) * SHEET_GAP;
  const composites = slices.map((input, index) => ({ input, left: index * (sliceWidth + SHEET_GAP), top: 0 }));
  await sharp({ create: { width, height: sliceHeight, channels: 3, background: SHEET_BACKGROUND } })
    .composite(composites)
    .png()
    .toFile(path);
}

async function sliceIntoScreens(fullPage, sliceWidth, sliceHeight) {
  const { height } = await sharp(fullPage).metadata();
  const slices = [];
  for (let top = 0; top < height; top += sliceHeight) {
    const cropHeight = Math.min(sliceHeight, height - top);
    const crop = sharp(fullPage).extract({ left: 0, top, width: sliceWidth, height: cropHeight });
    slices.push(await crop.extend({ bottom: sliceHeight - cropHeight, background: SHEET_BACKGROUND }).png().toBuffer());
  }
  return slices;
}

async function shootSheets(page, viewport, options, deviceScaleFactor) {
  await loadLazyImages(page, LAZY_SCROLL_PAUSE_MS);
  await page.waitForTimeout(SETTLE_MS);
  const fullPage = await page.screenshot({ fullPage: true });
  const sliceWidth = viewport.width * deviceScaleFactor;
  const sliceHeight = viewport.height * deviceScaleFactor;
  const slices = await sliceIntoScreens(fullPage, sliceWidth, sliceHeight);
  const paths = [];
  for (let start = 0; start < slices.length; start += viewport.perSheet) {
    const path = `${OUTPUT_DIR}/${options.name}-${viewport.name}-sheet${String(start / viewport.perSheet + 1).padStart(SHEET_NUMBER_DIGITS, '0')}.png`;
    await composeSheet(slices.slice(start, start + viewport.perSheet), sliceWidth, sliceHeight, path);
    paths.push(path);
  }
  return paths;
}

async function shootScreen(page, viewport, options) {
  if (options.scrollTo) await page.locator(options.scrollTo).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(SETTLE_MS);
  const path = `${OUTPUT_DIR}/${options.name}-${viewport.name}.png`;
  await page.screenshot({ path });
  return [path];
}

async function shootViewport(browser, viewport, options) {
  const { context, page, deviceScaleFactor } = await openPage(browser, viewport, options);
  const paths = options.sheets
    ? await shootSheets(page, viewport, options, deviceScaleFactor)
    : await shootScreen(page, viewport, options);
  await context.close();
  return paths;
}

const options = parseArguments(process.argv.slice(CLI_ARGUMENTS_START));
const viewports = VIEWPORTS.filter((viewport) => !options.only || options.only.includes(viewport.name));
mkdirSync(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch();
for (const viewport of viewports) {
  console.log((await shootViewport(browser, viewport, options)).join('\n'));
}
await browser.close();
