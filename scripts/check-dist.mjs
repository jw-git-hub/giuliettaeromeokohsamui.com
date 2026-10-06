// Проверка собранных страниц, после сборки. Для каждого языка в dist/:
// 1. Тексты стоят на своих местах (lib/expectations.mjs).
// 2. На странице нет слов сверх словаря, меню и общих данных — ни в тексте, ни в подписях,
//    ни в стилях; знак валюты — только бат у цен меню.
// 3. Меню: разделы, группы, позиции, цены и буквы V — как в content/menu.json.
// 4. В <head> и в разметке для поиска — только разрешённые поля: ни оценок, ни координат, ни цен;
//    адрес в разметке, разбитый на части, совпадает с адресом на странице.
// 5. Черновик языка может быть только в сборке, закрытой от поиска.
// 6. Внутренние файлы и пометки в dist не попали.
// 7. В llms.txt (карта сайта для ИИ) нет слов сверх английского словаря и меню.
import { existsSync, readdirSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { mergeOverReference } from '../src/i18n/shape.ts';
import {
  collapseSpaces,
  fail,
  flattenStrings,
  pass,
  readJson,
  readText,
  removeKnown,
  restaurantName,
  stripMarkers,
  taggedTexts,
} from './lib/content.mjs';
import { ALLOWED_CSS_CONTENT, ALLOWED_META, ALLOWED_SCHEMA_KEYS, pageBindings } from './lib/expectations.mjs';

const DIST = 'dist';
const ASSETS_DIR = `${DIST}/_astro`;
const V_MARK_SELECTOR = '.menu-item__v';
const PUBLISHED = 'published';
const TRIAL = 'trial';
const TEXT_ATTRIBUTES = ['alt', 'aria-label', 'placeholder', 'title'];
const HAS_WORD_OR_CURRENCY = /[\p{L}\p{N}\p{Sc}]/u;
const CSS_CONTENT = /content:\s*"([^"]*)"/g;
const SCHEMA_SELECTOR = 'script[type="application/ld+json"]';
const PREVIEW_LENGTH = 200;
const INTERNAL_MARKERS = ['_about', 'corrections', 'sourcePage', '<!--'];
const LLMS_FILE = `${DIST}/llms.txt`;
const MARKDOWN_LINK_TARGET = /\]\([^)]*\)/g;

const registry = readJson('src/i18n/registry.json');
const english = readJson('src/i18n/dictionaries/en.json');
const shared = readJson('src/i18n/shared.json');
const menu = readJson('content/menu.json');
const restaurantConfig = readText('src/config/restaurant.ts');
const name = restaurantName(shared);
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

/** Меню так, как оно должно стоять на странице этого языка. */
function expectedMenu(locale) {
  const translation = loadMenuTranslation(locale);
  const toItem = (item) => ({
    name: item.name,
    description: translation.items[item.id] ?? item.description,
    price: `${menu.currency.sign}${item.price}`,
    hasVMark: item.v,
  });
  const toGroup = (group) => ({
    title: group.title === null ? null : (translation.groups[group.id] ?? group.title),
    items: group.items.map(toItem),
  });
  return menu.sections.map((section) => ({
    title: translation.sections[section.id]?.title ?? section.title,
    groups: section.groups.map(toGroup),
  }));
}

function timeLabels(locale) {
  const pattern = registry.locales[locale].hour12 ? /value: '([^']+)'/g : /label24: '([^']+)'/g;
  return [...restaurantConfig.matchAll(pattern)].map((match) => match[1]);
}

function menuStrings(sections) {
  const groups = sections.flatMap((section) => section.groups);
  const items = groups.flatMap((group) => group.items);
  const itemStrings = items.flatMap((item) => [item.name, item.description, item.price]);
  return [...sections.map((section) => section.title), ...groups.map((group) => group.title), ...itemStrings];
}

function knownStrings(locale, dictionary) {
  const entries = flattenStrings(dictionary);
  return [
    ...entries.map(({ value }) => collapseSpaces(stripMarkers(value))),
    ...entries.flatMap(({ value }) => taggedTexts(value)),
    ...flattenStrings(shared).map(({ value }) => value),
    ...menuStrings(expectedMenu(locale)),
    ...timeLabels(locale),
    ...guestCounts,
    ...Object.values(registry.locales).map((info) => info.label),
    name,
  ].filter(Boolean);
}

function readPage(locale) {
  return parse(readText(pagePath(locale)));
}

function textsOf(root, selector, attribute) {
  const read = (node) => (attribute ? (node.getAttribute(attribute) ?? '') : node.text);
  return root.querySelectorAll(selector).map((node) => collapseSpaces(read(node)));
}

function findMisplacedTexts(root, context) {
  return pageBindings(context)
    .map((binding) => ({ ...binding, actual: textsOf(root, binding.selector, binding.attribute) }))
    .filter(({ actual, expected }) => actual.join(' | ') !== expected.map(collapseSpaces).join(' | '))
    .map(({ what, actual, expected }) => `${what}: на странице «${actual.join(' | ')}», должно быть «${expected.join(' | ')}»`);
}

/** Видимый текст страницы без скриптов и стилей. Буквы V проверяются вместе с меню,
    варианты списков формы — привязками: в тексте страницы они слипаются в одну строку. */
function visibleText(locale) {
  const root = readPage(locale);
  root.querySelectorAll(`script, style, option, ${V_MARK_SELECTOR}`).forEach((node) => node.remove());
  return collapseSpaces(root.querySelector('body').structuredText);
}

function findExtraWords(locale, known) {
  const rest = collapseSpaces(removeKnown(visibleText(locale), known));
  if (!HAS_WORD_OR_CURRENCY.test(rest)) return [];
  return [`на странице есть текст вне словаря: «${rest.slice(0, PREVIEW_LENGTH)}»`];
}

function findUnknownAttributes(root, known) {
  const values = TEXT_ATTRIBUTES.flatMap((attribute) => textsOf(root, `[${attribute}]`, attribute));
  return values
    .filter((value) => value !== '' && !known.includes(value))
    .map((value) => `подпись в атрибуте вне словаря: «${value.slice(0, PREVIEW_LENGTH)}»`);
}

function readMenuFromPage(root) {
  const toItem = (node) => ({
    name: collapseSpaces(node.querySelector('.menu-item__name > span').text),
    description: collapseSpaces(node.querySelector('.menu-item__description').text),
    price: collapseSpaces(node.querySelector('.menu-item__price').text),
    hasVMark: node.querySelector(V_MARK_SELECTOR) !== null,
  });
  const toGroup = (node) => ({
    title: node.querySelector('.menu-section__group-title') ? collapseSpaces(node.querySelector('.menu-section__group-title').text) : null,
    items: node.querySelectorAll('.menu-item').map(toItem),
  });
  return root.querySelectorAll('.menu-section').map((node) => ({
    title: collapseSpaces(node.querySelector('.menu-section__title').text),
    groups: node.querySelectorAll('.menu-section__group').map(toGroup),
  }));
}

function findMenuMismatch(root, locale) {
  const expected = expectedMenu(locale);
  const actual = readMenuFromPage(root);
  if (actual.length !== expected.length) return [`в меню ${actual.length} разделов, должно быть ${expected.length}`];
  return expected
    .filter((section, index) => JSON.stringify(section) !== JSON.stringify(actual[index]))
    .map((section) => `раздел меню «${section.title}» отличается от menu.json: группы, позиции, цены или буквы V`);
}

function collectKeys(node) {
  if (Array.isArray(node)) return node.flatMap(collectKeys);
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => [key, ...collectKeys(value)]);
}

function findForbiddenData(root) {
  const schemaKeys = root.querySelectorAll(SCHEMA_SELECTOR).flatMap((node) => collectKeys(JSON.parse(node.text)));
  const metaNames = root.querySelectorAll('meta').map((node) => node.getAttribute('name') ?? node.getAttribute('property'));
  const extraKeys = [...new Set(schemaKeys)].filter((key) => !ALLOWED_SCHEMA_KEYS.includes(key));
  const extraMeta = metaNames.filter((metaName) => metaName && !ALLOWED_META.includes(metaName));
  return [
    ...extraKeys.map((key) => `в разметке для поиска лишнее поле: ${key}`),
    ...extraMeta.map((metaName) => `в <head> лишний meta: ${metaName}`),
  ];
}

/** Адрес в разметке для поиска разбит на части; склеенные обратно, они обязаны дать адрес со страницы. */
function findAddressMismatch(root, dictionary) {
  const schemaNodes = root.querySelectorAll(SCHEMA_SELECTOR).flatMap((node) => JSON.parse(node.text)['@graph'] ?? []);
  const address = schemaNodes.find((node) => node.address)?.address ?? {};
  const joined = `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`;
  if (joined === dictionary.reservations.address) return [];
  return [`адрес в разметке для поиска «${joined}» не совпадает с адресом на странице «${dictionary.reservations.address}»`];
}

function findDraftLeak(root, locale) {
  const isDraft = registry.locales[locale].status !== PUBLISHED;
  const isClosedFromSearch = root.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex');
  return isDraft && !isClosedFromSearch ? ['язык-черновик попал в сборку, открытую для поиска'] : [];
}

function checkLocale(locale) {
  const dictionary = loadDictionary(locale);
  const known = knownStrings(locale, dictionary);
  const root = readPage(locale);
  const context = { dictionary, shared, info: registry.locales[locale], name, timeLabels: timeLabels(locale), guestCounts };
  return [
    ...findMisplacedTexts(root, context),
    ...findExtraWords(locale, known),
    ...findUnknownAttributes(root, known),
    ...findMenuMismatch(root, locale),
    ...findForbiddenData(root),
    ...findAddressMismatch(root, dictionary),
    ...findDraftLeak(root, locale),
  ].map((problem) => `[${locale}] ${problem}`);
}

/** Текст, вставленный стилями (content: "…"), на странице не виден проверке слов — смотрим отдельно. */
function findCssText() {
  const cssFiles = readdirSync(ASSETS_DIR).filter((file) => file.endsWith('.css'));
  const contents = cssFiles.flatMap((file) => [...readText(`${ASSETS_DIR}/${file}`).matchAll(CSS_CONTENT)]);
  return contents
    .map((match) => match[1])
    .filter((value) => !ALLOWED_CSS_CONTENT.includes(value))
    .map((value) => `в стилях есть текст: content "${value}"`);
}

/** Карта сайта для ИИ собирается из тех же текстов: слов сверх английского словаря и меню в ней быть не должно. */
function findLlmsExtraWords() {
  if (!existsSync(LLMS_FILE)) return ['в dist нет llms.txt'];
  const text = readText(LLMS_FILE).replace(MARKDOWN_LINK_TARGET, ' ');
  const rest = collapseSpaces(removeKnown(text, knownStrings(registry.defaultLocale, english)));
  return HAS_WORD_OR_CURRENCY.test(rest) ? [`в llms.txt есть текст вне словаря: «${rest.slice(0, PREVIEW_LENGTH)}»`] : [];
}

function findInternalLeak(locales) {
  const markers = locales.flatMap((locale) =>
    INTERNAL_MARKERS.filter((marker) => readText(pagePath(locale)).includes(marker)).map((marker) => `${locale}: ${marker}`),
  );
  const strayFiles = readdirSync(DIST).filter((file) => file.endsWith('.md') || file === 'content' || file === 'original');
  return [...markers, ...strayFiles].map((item) => `в dist попало внутреннее: ${item}`);
}

const builtLocales = Object.keys(registry.locales).filter((locale) => existsSync(pagePath(locale)));
const problems = [...builtLocales.flatMap(checkLocale), ...findCssText(), ...findLlmsExtraWords(), ...findInternalLeak(builtLocales)];
if (problems.length > 0) fail('Собранные страницы не прошли проверку', problems);
pass(`собранные страницы проверены: ${builtLocales.join(', ')} — тексты на своих местах, лишнего нет, меню совпадает с menu.json`);
