// Облегчённые шрифты сайта: из файлов пакетов fontsource убираются начертания, которых на сайте нет.
// Знаки остаются все (кроме файла с одним знаком бата) — меняется только диапазон жирности: у Bodoni на сайте одна жирность (400),
// у текстовых шрифтов — от 400 до 600. Вид букв тот же, файлы легче примерно на треть–половину.
// Жирности на сайте задают --weight-display и --weight-label в src/styles/tokens.css:
// понадобится другая — поменять диапазон здесь и в src/data/fonts.ts, затем запустить заново.
// Запуск: npm run make:fonts → src/assets/fonts/*.woff2
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';

const PACKAGES_DIR = 'node_modules/@fontsource-variable';
const OUTPUT_DIR = 'src/assets/fonts';
const BYTES_IN_KB = 1024;
const DISPLAY_WEIGHT = { wght: 400 };
const TEXT_WEIGHTS = { wght: { min: 400, max: 600 } };

const FONTS = [
  { source: 'bodoni-moda/files/bodoni-moda-latin-opsz-normal.woff2', output: 'bodoni-moda-latin-normal.woff2', axes: DISPLAY_WEIGHT },
  { source: 'bodoni-moda/files/bodoni-moda-latin-opsz-italic.woff2', output: 'bodoni-moda-latin-italic.woff2', axes: DISPLAY_WEIGHT },
  { source: 'source-serif-4/files/source-serif-4-latin-wght-normal.woff2', output: 'source-serif-4-latin.woff2', axes: TEXT_WEIGHTS },
  { source: 'source-serif-4/files/source-serif-4-cyrillic-wght-normal.woff2', output: 'source-serif-4-cyrillic.woff2', axes: TEXT_WEIGHTS },
  { source: 'noto-serif-thai/files/noto-serif-thai-thai-wght-normal.woff2', output: 'noto-serif-thai.woff2', axes: TEXT_WEIGHTS },
  // Знак бата у цен: в Source Serif его нет. На нетайских страницах — файл из одного этого знака.
  { source: 'noto-serif-thai/files/noto-serif-thai-thai-wght-normal.woff2', output: 'noto-serif-thai-baht.woff2', axes: TEXT_WEIGHTS, characters: '฿' },
];

function toKb(bytes) {
  return (bytes / BYTES_IN_KB).toFixed(1);
}

/** Все знаки исходного файла: набор букв не трогаем. */
function allCharacters(font) {
  return font.characterSet.map((codePoint) => String.fromCodePoint(codePoint)).join('');
}

function assertSameCharacters(original, lightened, name) {
  if (lightened.characterSet.length === original.characterSet.length) return;
  throw new Error(`${name}: знаков стало ${lightened.characterSet.length}, было ${original.characterSet.length}`);
}

async function lighten({ source, output, axes, characters }) {
  const sourceBuffer = readFileSync(`${PACKAGES_DIR}/${source}`);
  const original = fontkit.create(sourceBuffer);
  const kept = characters ?? allCharacters(original);
  const lightBuffer = await subsetFont(sourceBuffer, kept, { targetFormat: 'woff2', variationAxes: axes });
  if (!characters) assertSameCharacters(original, fontkit.create(lightBuffer), output);
  writeFileSync(`${OUTPUT_DIR}/${output}`, lightBuffer);
  return { file: output, 'было, КБ': toKb(sourceBuffer.length), 'стало, КБ': toKb(lightBuffer.length) };
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const report = [];
for (const font of FONTS) report.push(await lighten(font));
console.table(report);
