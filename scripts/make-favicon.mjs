// Временная иконка сайта: курсивная «G» золотом на фоне сайта (DESIGN.md, раздел 7).
// Контур буквы берётся из шрифта Bodoni Moda — логотип сами не рисуем.
// Запуск: npm run make:favicon → public/favicon.svg и public/apple-touch-icon.png
import { writeFileSync } from 'node:fs';
import * as fontkit from 'fontkit';
import sharp from 'sharp';
import { readColorToken } from './lib/tokens.mjs';

const FONT_PATH = 'node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-italic.woff2';
const LETTER = 'G';
// Берётся начертание шрифта по умолчанию — малый оптический размер: штрихи толще, буква читается в 16 px.
const ICON_SIZE = 64;
const LETTER_HEIGHT_SHARE = 0.62;
const APPLE_ICON_SIZE = 180;
const HALF = 0.5;
const PRECISION = 4;

function loadGlyph() {
  return fontkit.openSync(FONT_PATH).glyphForCodePoint(LETTER.codePointAt(0));
}

/** Масштаб и сдвиг, чтобы буква встала по центру квадрата. В шрифте ось Y смотрит вверх. */
function fitToIcon(bbox) {
  const scale = (ICON_SIZE * LETTER_HEIGHT_SHARE) / (bbox.maxY - bbox.minY);
  const center = ICON_SIZE * HALF;
  const offsetX = center - (bbox.minX + bbox.maxX) * HALF * scale;
  const offsetY = center + (bbox.minY + bbox.maxY) * HALF * scale;
  return `translate(${round(offsetX)} ${round(offsetY)}) scale(${round(scale)} ${round(-scale)})`;
}

function round(value) {
  return Number(value.toFixed(PRECISION));
}

function buildSvg(glyph) {
  const background = readColorToken('bg');
  const gold = readColorToken('gold');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">`,
    `<rect width="${ICON_SIZE}" height="${ICON_SIZE}" fill="${background}"/>`,
    `<path fill="${gold}" transform="${fitToIcon(glyph.bbox)}" d="${glyph.path.toSVG()}"/>`,
    '</svg>',
  ].join('');
}

const svg = buildSvg(loadGlyph());
writeFileSync('public/favicon.svg', svg);
await sharp(Buffer.from(svg), { density: 600 }).resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE).png().toFile('public/apple-touch-icon.png');
console.log('public/favicon.svg, public/apple-touch-icon.png');
