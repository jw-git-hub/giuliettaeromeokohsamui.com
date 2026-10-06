// Проверка переводов, до сборки. Для каждого языка, у которого есть словарь:
// 1. Те же ключи, что в английском, и те же метки разметки в каждой строке.
// 2. Русский и тайский: латиницей остаётся только разрешённое (название, бренды).
// 3. Строка, совпадающая с английской, — скорее всего забытый перевод.
// 4. В переводе меню есть каждая позиция, раздел, группа и название категории, и нет лишних.
import { existsSync } from 'node:fs';
import { assertSameShape } from '../src/i18n/shape.ts';
import { fail, flattenStrings, menuGroups, menuItems, pass, readJson, removeKnown, stripMarkers } from './lib/content.mjs';

const HAS_LATIN = /[A-Za-z]/;
const MARKER = /\{\/?\w+\}/g;

const registry = readJson('src/i18n/registry.json');
const english = readJson('src/i18n/dictionaries/en.json');
const menu = readJson('content/menu.json');
const shared = readJson('src/i18n/shared.json');
const allowlist = readJson('scripts/i18n-allowlist.json');
const englishByPath = new Map(flattenStrings(english).map(({ path, value }) => [path, value]));

function dictionaryPath(locale) {
  return `src/i18n/dictionaries/${locale}.json`;
}

function markersOf(value) {
  return (value.match(MARKER) ?? []).sort().join(' ');
}

function findShapeProblems(locale, dictionary) {
  try {
    assertSameShape(english, dictionary, locale);
    return [];
  } catch (error) {
    return [error.message];
  }
}

function findMarkerProblems(strings) {
  return strings
    .filter(({ path, value }) => markersOf(value) !== markersOf(englishByPath.get(path) ?? ''))
    .map(({ path }) => `${path}: метки разметки не как в английском`);
}

function findLatinLeftovers(locale, strings) {
  if (!allowlist.nonLatinLocales.includes(locale)) return [];
  return strings
    .filter(({ path }) => !allowlist.untranslatedKeys.includes(path))
    .map(({ path, value }) => ({ path, rest: removeKnown(stripMarkers(value), allowlist.latinInNonLatinLocales) }))
    .filter(({ rest }) => HAS_LATIN.test(rest))
    .map(({ path, rest }) => `${path}: латиница в переводе — «${rest.trim()}»`);
}

function findUntranslated(strings) {
  return strings
    .filter(({ path }) => !allowlist.untranslatedKeys.includes(path))
    .filter(({ path, value }) => value === englishByPath.get(path))
    .map(({ path, value }) => `${path}: совпадает с английским — «${value}»`);
}

function findKeyMismatch(expected, actual, what) {
  const missing = expected.filter((key) => !actual.includes(key)).map((key) => `меню: нет перевода ${what} ${key}`);
  const extra = actual.filter((key) => !expected.includes(key)).map((key) => `меню: лишний перевод ${what} ${key}`);
  return [...missing, ...extra];
}

function findMenuProblems(locale) {
  const path = `src/i18n/menu/${locale}.json`;
  if (!existsSync(path)) return ['нет перевода меню'];
  const translation = readJson(path);
  const titledGroups = menuGroups(menu).filter((group) => group.title !== null);
  const descriptions = Object.entries(translation.items).map(([id, value]) => ({ path: `меню.${id}`, value }));
  const categoryNames = Object.entries(translation.categories ?? {}).map(([key, value]) => ({ path: `категория.${key}`, value }));
  return [
    ...findKeyMismatch(Object.keys(shared.categories), Object.keys(translation.categories ?? {}), 'категории'),
    ...findKeyMismatch(menuItems(menu).map((item) => item.id), Object.keys(translation.items), 'позиции'),
    ...findKeyMismatch(menu.sections.map((section) => section.id), Object.keys(translation.sections), 'раздела'),
    ...findKeyMismatch(titledGroups.map((group) => group.id), Object.keys(translation.groups), 'группы'),
    ...findLatinLeftovers(locale, [...descriptions, ...categoryNames]),
  ];
}

function checkLocale(locale) {
  const dictionary = readJson(dictionaryPath(locale));
  const strings = flattenStrings(dictionary);
  return [
    ...findShapeProblems(locale, dictionary),
    ...findMarkerProblems(strings),
    ...findLatinLeftovers(locale, strings),
    ...findUntranslated(strings),
    ...findMenuProblems(locale),
  ].map((problem) => `[${locale}] ${problem}`);
}

const translatedLocales = Object.keys(registry.locales)
  .filter((locale) => locale !== registry.defaultLocale)
  .filter((locale) => existsSync(dictionaryPath(locale)));
const problems = translatedLocales.flatMap(checkLocale);
if (problems.length > 0) fail('Переводы не прошли проверку', problems);
pass(`переводы проверены: ${translatedLocales.join(', ')} — ключи полные, непереведённых строк нет`);
