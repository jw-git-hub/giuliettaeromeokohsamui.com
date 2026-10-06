// Замер веса страницы на телефоне (DESIGN.md, раздел 9): первый экран со шрифтами, вся страница
// после прокрутки и свои скрипты. Считается то, что реально идёт по сети (со сжатием, как на хостинге).
// Запуск: сначала сборка, затем node scripts/check-budget.mjs
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { parse } from 'node-html-parser';
import { readJson } from './lib/content.mjs';

const PORT = 4323;
const ORIGIN = `http://localhost:${PORT}`;
const PHONE = { width: 390, height: 844 };
const PHONE_PIXEL_RATIO = 3;
const BYTES_IN_KB = 1024;
const ROUND_TO_TENTHS = 10;
const LIMITS_KB = { firstScreen: 450, fullPage: 2500, scripts: 10 };
const SERVER_START_MS = 600;
const SCROLL_PAUSE_MS = 150;
const DATA_SCRIPT_TYPE = 'application/ld+json';
const IMAGE_FILE = /\.(avif|webp|jpg|png)$/;

const registry = readJson('src/i18n/registry.json');

function pagePath(locale) {
  return locale === registry.defaultLocale ? '/' : `/${locale}/`;
}

function toKb(bytes) {
  return Math.round((bytes / BYTES_IN_KB) * ROUND_TO_TENTHS) / ROUND_TO_TENTHS;
}

/** Ведёт учёт: сколько байт пришло по сети на каждый адрес. */
async function trackTransfer(page) {
  const urlByRequest = new Map();
  const bytesByUrl = new Map();
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  session.on('Network.requestWillBeSent', (event) => urlByRequest.set(event.requestId, event.request.url));
  session.on('Network.loadingFinished', (event) => {
    bytesByUrl.set(urlByRequest.get(event.requestId), event.encodedDataLength);
  });
  return bytesByUrl;
}

function sumBytes(bytesByUrl, isCounted = () => true) {
  return [...bytesByUrl].filter(([url]) => isCounted(url)).reduce((sum, [, bytes]) => sum + bytes, 0);
}

/** Первый экран: страница, стили, шрифты, скрипты и только те фото, что видны без прокрутки.
    Фото ниже экрана браузер может подгрузить заранее — они считаются отдельно («до прокрутки»). */
async function measureFirstScreen(page, bytesByUrl) {
  const visibleImages = await page.evaluate(() =>
    Array.from(document.images)
      .filter((image) => image.offsetParent !== null && image.getBoundingClientRect().top < window.innerHeight)
      .map((image) => image.currentSrc),
  );
  const isImage = (url) => IMAGE_FILE.test(url);
  return sumBytes(bytesByUrl, (url) => !isImage(url) || visibleImages.includes(url));
}

async function scrollThrough(page) {
  await page.evaluate(async (pause) => {
    for (let offset = 0; offset < document.body.scrollHeight; offset += window.innerHeight) {
      window.scrollTo({ top: offset, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, pause));
    }
  }, SCROLL_PAUSE_MS);
  await page.waitForLoadState('networkidle');
}

/** Свои скрипты страницы: встроенные и внешние, без разметки для поиска. */
function measureScripts(locale) {
  const root = parse(readFileSync(`dist${pagePath(locale)}index.html`, 'utf8'));
  const scripts = root.querySelectorAll('script').filter((node) => node.getAttribute('type') !== DATA_SCRIPT_TYPE);
  const inlineBytes = scripts.reduce((sum, node) => sum + Buffer.byteLength(node.text), 0);
  const externalBytes = scripts
    .map((node) => node.getAttribute('src'))
    .filter(Boolean)
    .reduce((sum, src) => sum + readFileSync(`dist${src}`).length, 0);
  return inlineBytes + externalBytes;
}

async function measureLocale(browser, locale) {
  const context = await browser.newContext({ viewport: PHONE, deviceScaleFactor: PHONE_PIXEL_RATIO, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const bytesByUrl = await trackTransfer(page);
  await page.goto(`${ORIGIN}${pagePath(locale)}`, { waitUntil: 'networkidle' });
  const firstScreen = await measureFirstScreen(page, bytesByUrl);
  const beforeScroll = sumBytes(bytesByUrl);
  await scrollThrough(page);
  const result = {
    locale,
    firstScreen: toKb(firstScreen),
    beforeScroll: toKb(beforeScroll),
    fullPage: toKb(sumBytes(bytesByUrl)),
    scripts: toKb(measureScripts(locale)),
  };
  await context.close();
  return result;
}

function findOverLimit(result) {
  return Object.keys(LIMITS_KB)
    .filter((metric) => result[metric] > LIMITS_KB[metric])
    .map((metric) => `[${result.locale}] ${metric}: ${result[metric]} КБ при пределе ${LIMITS_KB[metric]} КБ`);
}

const server = spawn('node', ['scripts/serve-dist.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, SERVER_START_MS));
const browser = await chromium.launch();
const locales = Object.keys(registry.locales).filter((locale) => existsSync(`dist${pagePath(locale)}index.html`));
const results = [];
for (const locale of locales) results.push(await measureLocale(browser, locale));
await browser.close();
server.kill();

console.table(results);
console.log(`Пределы, КБ: первый экран ${LIMITS_KB.firstScreen}, вся страница ${LIMITS_KB.fullPage}, скрипты ${LIMITS_KB.scripts}`);
const problems = results.flatMap(findOverLimit);
if (problems.length > 0) {
  problems.forEach((problem) => console.error(`✗ ${problem}`));
  process.exit(1);
}
console.log('✓ вес в пределах');
