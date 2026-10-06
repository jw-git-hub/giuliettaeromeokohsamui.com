// После сборки убирает из dist шрифты языков, которых в этой сборке нет.
// Сборщик кладёт в dist все шрифты, названные в src/data/fonts.ts, — даже когда страница языка
// не собирается (боевая сборка — пока только английская). Удаляются только файлы шрифтов,
// на которые не ссылается ни одна собранная страница; остальное сторожит check-assets.mjs.
import { readdirSync, rmSync } from 'node:fs';
import { readText } from './lib/content.mjs';

const DIST = 'dist';
const ASSETS_DIR = `${DIST}/_astro`;
const FONT_FILE = /\.woff2$/;
const STYLE_FILE = /\.css$/;
const PAGE_FILE = 'index.html';

function listPages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return listPages(`${directory}/${entry.name}`);
    return entry.name === PAGE_FILE ? [`${directory}/${entry.name}`] : [];
  });
}

// Шрифты описаны прямо в страницах; файлы стилей смотрим на случай, если @font-face переедет туда.
const stylesheets = readdirSync(ASSETS_DIR).filter((file) => STYLE_FILE.test(file)).map((file) => `${ASSETS_DIR}/${file}`);
const usedIn = [...listPages(DIST), ...stylesheets].map(readText).join('\n');
const unusedFonts = readdirSync(ASSETS_DIR).filter((file) => FONT_FILE.test(file) && !usedIn.includes(file));
unusedFonts.forEach((file) => rmSync(`${ASSETS_DIR}/${file}`));
if (unusedFonts.length > 0) console.log(`убраны шрифты языков, которых нет в сборке: ${unusedFonts.join(', ')}`);
