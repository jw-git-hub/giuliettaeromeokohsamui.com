// Проверка собранных страниц, после сборки. Для каждого языка в dist/:
// 1. На странице нет слов сверх словаря, меню и общих данных (ни новых фраз, ни склеек).
// 2. Каждая строка словаря на странице есть.
// 3. Меню: 41 позиция, названия и цены — как в content/menu.json, описания — как в переводе.
// 4. Черновик языка может быть только в сборке, закрытой от поиска.
// 5. Внутренние файлы и пометки в dist не попали.
import { existsSync, readdirSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { mergeOverReference } from '../src/i18n/shape.ts';
import {
  collapseSpaces,
  fail,
  flattenStrings,
  menuGroups,
  menuItems,
  pass,
  readJson,
  readText,
  removeKnown,
  stripMarkers,
} from './lib/content.mjs';

const DIST = 'dist';
const V_MARK = 'V';
const PUBLISHED = 'published';
const TRIAL = 'trial';
const TEXT_ATTRIBUTES = ['alt', 'aria-label', 'placeholder'];
const HAS_WORD = /[\p{L}\p{N}]/u;
const PREVIEW_LENGTH = 200;
const INTERNAL_MARKERS = ['_about', 'corrections', 'sourcePage'];

const registry = readJson('src/i18n/registry.json');
const english = readJson('src/i18n/dictionaries/en.json');
const shared = readJson('src/i18n/shared.json');
const menu = readJson('content/menu.json');
const restaurantConfig = readText('src/config/restaurant.ts');

const restaurantName = `${shared.name.first} ${shared.name.conjunction} ${shared.name.last}`;
const guestCounts = ['1', '2', '3', '4', '5', '6', '7', '8'];

function pagePath(locale) {
  return locale === registry.defaultLocale ? `${DIST}/index.html` : `${DIST}/${locale}/index.html`;
}

function loadDictionary(locale) {
  if (locale === registry.defaultLocale) return english;
  const raw = readJson(`src/i18n/dictionaries/${locale}.json`);
  return registry.locales[locale].status === TRIAL ? mergeOverReference(english, raw, locale) : raw;
}

function loadMenuTranslation(locale) {
  const path = `src/i18n/menu/${locale}.json`;
  return existsSync(path) ? readJson(path) : { sections: {}, groups: {}, items: {} };
}

function timeLabels(locale) {
  const pattern = registry.locales[locale].hour12 ? /value: '([^']+)'/g : /label24: '([^']+)'/g;
  return [...restaurantConfig.matchAll(pattern)].map((match) => match[1]);
}

function menuStrings(translation) {
  const items = menuItems(menu);
  const descriptions = items.map((item) => translation.items[item.id] ?? item.description);
  const sectionTitles = menu.sections.map((section) => translation.sections[section.id]?.title ?? section.title);
  const groupTitles = menuGroups(menu).map((group) => translation.groups[group.id] ?? group.title);
  const prices = items.map((item) => String(item.price));
  return [...items.map((item) => item.name), ...descriptions, ...sectionTitles, ...groupTitles, ...prices, V_MARK];
}

function dictionaryValues(dictionary) {
  return flattenStrings(dictionary).map(({ path, value }) => ({ path, value: collapseSpaces(stripMarkers(value)) }));
}

function knownStrings(locale, dictionary) {
  const labels = Object.values(registry.locales).map((info) => info.label);
  return [
    ...dictionaryValues(dictionary).map(({ value }) => value),
    ...flattenStrings(shared).map(({ value }) => value),
    ...menuStrings(loadMenuTranslation(locale)),
    ...timeLabels(locale),
    ...guestCounts,
    ...labels,
    restaurantName,
  ];
}

function readPage(locale) {
  const root = parse(readText(pagePath(locale)));
  root.querySelectorAll('script, style').forEach((node) => node.remove());
  return root;
}

function attributeTexts(root) {
  const fromAttributes = TEXT_ATTRIBUTES.flatMap((name) =>
    root.querySelectorAll(`[${name}]`).map((node) => node.getAttribute(name)),
  );
  const fromMeta = root.querySelectorAll('meta[content]').map((node) => node.getAttribute('content'));
  return [...fromAttributes, ...fromMeta].map((value) => collapseSpaces(value ?? ''));
}

function findExtraWords(root, known) {
  const bodyText = collapseSpaces(root.querySelector('body').structuredText);
  const rest = collapseSpaces(removeKnown(bodyText, known));
  return HAS_WORD.test(rest) ? [`на странице есть текст вне словаря: «${rest.slice(0, PREVIEW_LENGTH)}»`] : [];
}

function findMissingStrings(root, locale, dictionary) {
  const pageText = collapseSpaces(`${root.querySelector('head').text} ${root.querySelector('body').structuredText}`);
  const attributes = attributeTexts(root);
  const isHidden = (path) => path === 'hero.quoteTranslation' && registry.locales[locale].htmlLang === 'it';
  return dictionaryValues(dictionary)
    .filter(({ path }) => !isHidden(path))
    .filter(({ value }) => !pageText.includes(value) && !attributes.includes(value))
    .map(({ path, value }) => `строки словаря нет на странице — ${path}: «${value.slice(0, PREVIEW_LENGTH)}»`);
}

function readMenuFromPage(root) {
  return root.querySelectorAll('.menu-item').map((node) => {
    const hasVMark = node.querySelector('.menu-item__v') !== null;
    node.querySelector('.menu-item__v')?.remove();
    return {
      name: collapseSpaces(node.querySelector('.menu-item__name').text),
      description: collapseSpaces(node.querySelector('.menu-item__description').text),
      price: Number(node.querySelector('.menu-item__price').text),
      hasVMark,
    };
  });
}

function findMenuMismatch(root, locale) {
  const translation = loadMenuTranslation(locale);
  const expected = menuItems(menu).map((item) => ({
    name: item.name,
    description: translation.items[item.id] ?? item.description,
    price: item.price,
    hasVMark: item.v,
  }));
  const actual = readMenuFromPage(root);
  if (actual.length !== expected.length) return [`в меню ${actual.length} позиций, должно быть ${expected.length}`];
  return expected
    .filter((item, index) => JSON.stringify(item) !== JSON.stringify(actual[index]))
    .map((item) => `позиция меню отличается от menu.json — ${item.name}`);
}

function findDraftLeak(root, locale) {
  const isDraft = registry.locales[locale].status !== PUBLISHED;
  const isClosedFromSearch = root.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex');
  return isDraft && !isClosedFromSearch ? ['язык-черновик попал в сборку, открытую для поиска'] : [];
}

function findInternalLeak() {
  const html = readText(pagePath(registry.defaultLocale));
  const markers = INTERNAL_MARKERS.filter((marker) => html.includes(marker));
  const strayFiles = readdirSync(DIST).filter((name) => name.endsWith('.md') || name === 'content' || name === 'original');
  return [...markers, ...strayFiles].map((item) => `в dist попало внутреннее: ${item}`);
}

function checkLocale(locale) {
  const dictionary = loadDictionary(locale);
  const root = readPage(locale);
  return [
    ...findExtraWords(root, knownStrings(locale, dictionary)),
    ...findMissingStrings(readPage(locale), locale, dictionary),
    ...findMenuMismatch(readPage(locale), locale),
    ...findDraftLeak(readPage(locale), locale),
  ].map((problem) => `[${locale}] ${problem}`);
}

const builtLocales = Object.keys(registry.locales).filter((locale) => existsSync(pagePath(locale)));
const problems = [...builtLocales.flatMap(checkLocale), ...findInternalLeak()];
if (problems.length > 0) fail('Собранные страницы не прошли проверку', problems);
pass(`собранные страницы проверены: ${builtLocales.join(', ')} — лишних слов нет, меню совпадает с menu.json`);
