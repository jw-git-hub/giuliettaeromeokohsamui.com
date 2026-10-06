// Проверка скорости и чистоты собранного сайта, после сборки. Сторожит то, что однажды починено:
// 1. В dist/_astro нет файлов, на которые не ссылается ни одна страница (исходники фото и подобное).
// 2. Все файлы из src и srcset существуют, а ширина в srcset — настоящая ширина файла.
// 3. У каждого фото заданы ширина и высота; главное фото одно, грузится сразу и с высоким приоритетом,
//    остальные — лениво.
// 4. Ссылка на стили стоит в начале страницы, раньше разметки для поиска.
// 5. Шрифты, которые грузятся заранее, существуют и описаны в @font-face; все файлы из url() в стилях на месте.
// 6. Стили записаны так, что их понимают старые iPhone (Safari до 16.4).
import { existsSync, readdirSync } from 'node:fs';
import { parse } from 'node-html-parser';
import sharp from 'sharp';
import { fail, pass, readJson, readText } from './lib/content.mjs';

const DIST = 'dist';
const ASSETS_DIR = `${DIST}/_astro`;
const ASSETS_URL_PART = '/_astro/';
const TEXT_FILE = /\.(html|css|js|txt|xml)$/;
// Перед стилями стоят только заголовок, описание, карточка для мессенджеров и шрифты: это 3–4,5 КБ
// (на русской и тайской страницах буквы занимают по 2–3 байта), после сжатия — около 1,5 КБ.
const STYLESHEET_LIMIT_BYTES = 6144;
const STYLESHEET_MARK = 'rel="stylesheet"';
const SCHEMA_MARK = 'application/ld+json';
const MODERN_MEDIA_SYNTAX = /@media[^{]*([<>]|not\s*\()/;
const CSS_URL = /url\(\s*["']?([^"')]+)["']?\s*\)/g;

const registry = readJson('src/i18n/registry.json');

function pagePath(locale) {
  return locale === registry.defaultLocale ? `${DIST}/index.html` : `${DIST}/${locale}/index.html`;
}

/** Путь файла в dist по адресу со страницы: базовый путь демо отбрасывается. */
function toDistPath(url) {
  return `${ASSETS_DIR}/${url.slice(url.indexOf(ASSETS_URL_PART) + ASSETS_URL_PART.length)}`;
}

function listTextFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return listTextFiles(path);
    return TEXT_FILE.test(entry.name) ? [path] : [];
  });
}

function findOrphans() {
  const allText = listTextFiles(DIST).map(readText).join('\n');
  return readdirSync(ASSETS_DIR)
    .filter((file) => !allText.includes(file))
    .map((file) => `в dist/_astro лежит файл, на который нет ссылок: ${file}`);
}

/** Кандидаты srcset: [{ url, width }]. */
function parseSrcset(srcset) {
  return srcset.split(',').map((candidate) => {
    const [url, descriptor = ''] = candidate.trim().split(/\s+/);
    return { url, width: Number(descriptor.replace('w', '')) };
  });
}

async function findWrongWidth({ url, width }) {
  const file = toDistPath(url);
  if (!existsSync(file)) return [`в srcset указан файл, которого нет: ${url}`];
  const actualWidth = (await sharp(file).metadata()).width;
  return actualWidth === width ? [] : [`${url}: в srcset ширина ${width}, у файла ${actualWidth}`];
}

async function findSrcsetProblems(root) {
  const srcsets = root.querySelectorAll('[srcset]').map((node) => node.getAttribute('srcset'));
  const candidates = [...new Map(srcsets.flatMap(parseSrcset).map((candidate) => [candidate.url, candidate])).values()];
  return (await Promise.all(candidates.map(findWrongWidth))).flat();
}

function findMissingFiles(root) {
  const urls = root.querySelectorAll('[src], [href]').map((node) => node.getAttribute('src') ?? node.getAttribute('href'));
  return urls
    .filter((url) => url.includes(ASSETS_URL_PART) && !existsSync(toDistPath(url)))
    .map((url) => `страница ссылается на файл, которого нет: ${url}`);
}

function findImageProblems(root) {
  const images = root.querySelectorAll('img');
  const sized = [...images, ...root.querySelectorAll('picture source')];
  const unsized = sized.filter((node) => !node.getAttribute('width') || !node.getAttribute('height'));
  const priority = images.filter((image) => image.getAttribute('fetchpriority') === 'high');
  const eager = images.filter((image) => image.getAttribute('loading') !== 'lazy');
  return [
    ...unsized.map((node) => `у фото нет ширины или высоты: ${node.getAttribute('src') ?? node.getAttribute('srcset')}`),
    ...(priority.length === 1 ? [] : [`главных фото (fetchpriority="high") должно быть одно, а их ${priority.length}`]),
    ...(eager.length === 1 && eager[0] === priority[0] ? [] : ['сразу должно грузиться только главное фото, остальные — лениво']),
  ];
}

function findHeadOrderProblems(html) {
  const stylesheetAt = Buffer.byteLength(html.slice(0, html.indexOf(STYLESHEET_MARK)));
  const schemaAt = html.indexOf(SCHEMA_MARK);
  return [
    ...(html.includes(STYLESHEET_MARK) ? [] : ['на странице нет ссылки на стили']),
    ...(stylesheetAt <= STYLESHEET_LIMIT_BYTES ? [] : [`ссылка на стили стоит на ${stylesheetAt}-м байте, предел — ${STYLESHEET_LIMIT_BYTES}`]),
    ...(schemaAt > html.indexOf(STYLESHEET_MARK) ? [] : ['разметка для поиска стоит раньше ссылки на стили']),
  ];
}

/** Файлы, названные в стилях через url(): шрифты из @font-face на странице и всё, что есть в файлах стилей. */
function findMissingCssFiles(css, where) {
  return [...css.matchAll(CSS_URL)]
    .map((match) => match[1])
    .filter((url) => url.includes(ASSETS_URL_PART) && !existsSync(toDistPath(url)))
    .map((url) => `${where}: в стилях назван файл, которого нет: ${url}`);
}

function findStylesheetProblems() {
  const stylesheets = readdirSync(ASSETS_DIR).filter((file) => file.endsWith('.css'));
  return stylesheets.flatMap((file) => findMissingCssFiles(readText(`${ASSETS_DIR}/${file}`), file));
}

function findFontProblems(root) {
  const fontFaceCss = root.querySelectorAll('style').map((node) => node.text).join('');
  const preloads = root.querySelectorAll('link[rel="preload"][as="font"]');
  return [
    ...(preloads.length > 0 ? [] : ['ни один шрифт не грузится заранее — текст первого экрана будет перерисовываться']),
    ...findMissingCssFiles(fontFaceCss, '@font-face'),
    ...preloads.flatMap(findPreloadProblems(fontFaceCss)),
  ];
}

function findPreloadProblems(fontFaceCss) {
  return (link) => {
    const url = link.getAttribute('href');
    return [
      ...(existsSync(toDistPath(url)) ? [] : [`заранее грузится шрифт, которого нет: ${url}`]),
      ...(fontFaceCss.includes(url) ? [] : [`заранее грузится шрифт, которого нет в @font-face: ${url}`]),
      ...(link.hasAttribute('crossorigin') ? [] : [`у шрифта ${url} нет crossorigin — браузер скачает его дважды`]),
    ];
  };
}

function findLegacyCssProblems() {
  return readdirSync(ASSETS_DIR)
    .filter((file) => file.endsWith('.css') && MODERN_MEDIA_SYNTAX.test(readText(`${ASSETS_DIR}/${file}`)))
    .map((file) => `${file}: условие @media записано по-новому — старые iPhone его не поймут (cssTarget в astro.config.ts)`);
}

async function checkPage(locale) {
  const html = readText(pagePath(locale));
  const root = parse(html);
  const problems = [
    ...findMissingFiles(root),
    ...(await findSrcsetProblems(root)),
    ...findImageProblems(root),
    ...findHeadOrderProblems(html),
    ...findFontProblems(root),
  ];
  return problems.map((problem) => `[${locale}] ${problem}`);
}

const builtLocales = Object.keys(registry.locales).filter((locale) => existsSync(pagePath(locale)));
const pageProblems = (await Promise.all(builtLocales.map(checkPage))).flat();
const problems = [...pageProblems, ...findOrphans(), ...findStylesheetProblems(), ...findLegacyCssProblems()];
if (problems.length > 0) fail('Собранный сайт не прошёл проверку скорости и чистоты', problems);
pass(`скорость и чистота проверены: ${builtLocales.join(', ')} — лишних файлов нет, фото и шрифты на месте, стили в начале страницы`);
