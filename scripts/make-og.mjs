// Картинка для мессенджеров и соцсетей, 1200×630: название ресторана на фоне сайта и своё фото.
// Одна на все языки: на ней только название латиницей.
// Запуск: npm run make:og → public/og.jpg
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { readJson } from './lib/content.mjs';
import { readColorToken } from './lib/tokens.mjs';

const WIDTH = 1200;
const HEIGHT = 630;
const JPEG_QUALITY = 84;
const OUTPUT = 'public/og.jpg';
const FONT_DIR = 'node_modules/@fontsource-variable/bodoni-moda/files';

function fileUrl(path) {
  return pathToFileURL(path).href;
}

function buildStyles() {
  return `
    @font-face { font-family: Bodoni; font-style: normal; font-weight: 400 900;
      src: url("${fileUrl(`${FONT_DIR}/bodoni-moda-latin-opsz-normal.woff2`)}") format("woff2"); }
    @font-face { font-family: Bodoni; font-style: italic; font-weight: 400 900;
      src: url("${fileUrl(`${FONT_DIR}/bodoni-moda-latin-opsz-italic.woff2`)}") format("woff2"); }
    * { margin: 0; box-sizing: border-box; }
    body { width: ${WIDTH}px; height: ${HEIGHT}px; display: grid; grid-template-columns: 1fr ${HEIGHT}px;
      align-items: center; background: ${readColorToken('bg')}; color: ${readColorToken('text')}; }
    h1 { padding-left: 88px; font: 400 104px/1.02 Bodoni, serif; font-variation-settings: "opsz" 48; }
    em { color: ${readColorToken('gold')}; }
    .line { width: 96px; height: 1px; margin: 40px 0 0 92px; background: ${readColorToken('gold')}; }
    .photo { width: ${HEIGHT}px; height: ${HEIGHT}px; padding: 36px; }
    .photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
      -webkit-mask-image: radial-gradient(circle closest-side, #000 91%, transparent 100%); }
  `;
}

function buildHtml() {
  const { first, conjunction, last } = readJson('src/i18n/shared.json').name;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${buildStyles()}</style></head><body>
    <div><h1>${first}<br><em>${conjunction}</em> ${last}</h1><div class="line"></div></div>
    <div class="photo"><img src="${fileUrl('src/assets/img/hero-lantern.jpg')}"></div>
  </body></html>`;
}

async function renderPng() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.goto(fileUrl('package.json'));
  await page.setContent(buildHtml(), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot();
  await browser.close();
  return png;
}

await sharp(await renderPng()).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(OUTPUT);
console.log(OUTPUT);
