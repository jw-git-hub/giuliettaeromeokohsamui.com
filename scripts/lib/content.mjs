// Общие помощники скриптов проверки: чтение исходников, развёртка словарей в список строк.
import { readFileSync } from 'node:fs';

const MARKER_PATTERN = /\{\/?\w+\}/g;

export function readText(path) {
  return readFileSync(path, 'utf8').normalize('NFC');
}

export function readJson(path) {
  return JSON.parse(readText(path));
}

/** Убирает метки {cite}…{/cite} и подобные, оставляя текст. */
export function stripMarkers(value) {
  return value.replace(MARKER_PATTERN, '');
}

export function collapseSpaces(value) {
  return value.replace(/\s+/g, ' ').trim();
}

/** Все строки вложенного объекта вместе с путём ключа: [{ path: 'hero.label', value: '…' }]. */
export function flattenStrings(node, path = '') {
  if (typeof node === 'string') return [{ path, value: node }];
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, child]) => flattenStrings(child, path ? `${path}.${key}` : key));
}

/** Строки без повторов, длинные первыми: так при вычёркивании фраза не съедается своей частью. */
export function longestFirst(values) {
  return [...new Set(values)].filter(Boolean).sort((first, second) => second.length - first.length);
}

/** Вычёркивает из текста все известные строки и возвращает остаток. */
export function removeKnown(text, knownValues) {
  return longestFirst(knownValues).reduce((rest, known) => rest.split(known).join(' '), text);
}

export function menuItems(menu) {
  return menu.sections.flatMap((section) => section.groups.flatMap((group) => group.items));
}

export function menuGroups(menu) {
  return menu.sections.flatMap((section) => section.groups);
}

export function fail(title, problems) {
  console.error(`\n✗ ${title}`);
  problems.forEach((problem) => console.error(`  — ${problem}`));
  process.exit(1);
}

export function pass(message) {
  console.log(`✓ ${message}`);
}
