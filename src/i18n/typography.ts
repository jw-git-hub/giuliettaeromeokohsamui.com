// Типографика переводов. Русский: короткие предлоги и союзы не остаются в конце строки, тире
// не начинает строку, число не отрывается от слова. Неразрывные пробелы ставятся при загрузке —
// в файлах переводов остаются обычные, чтобы тексты было удобно читать и править.
// Заголовок и описание страницы (meta) не трогаем: поиску неразрывные пробелы ни к чему.
import type { LocaleCode } from './index';

const NBSP = ' ';
const RUSSIAN_SHORT_WORDS = ['в', 'во', 'на', 'с', 'со', 'к', 'ко', 'о', 'об', 'у', 'и', 'а', 'но', 'за', 'из', 'от', 'до', 'по', 'не', 'ни', 'для', 'без', 'при', 'или'];
const AFTER_SHORT_WORD = new RegExp(`(?<![\\p{L}\\p{N}])(${RUSSIAN_SHORT_WORDS.join('|')}) `, 'giu');
const BEFORE_DASH = / (?=[—–])/g;
// Только перед русским словом: «72 часа», но не английский адрес «46 Moo 2» внутри русской страницы.
const BETWEEN_NUMBER_AND_WORD = /(?<=\d) (?=\p{Script=Cyrillic})/gu;

function typesetRussian(text: string): string {
  return text.replace(AFTER_SHORT_WORD, `$1${NBSP}`).replace(BEFORE_DASH, NBSP).replace(BETWEEN_NUMBER_AND_WORD, NBSP);
}

const TYPESETTERS: Partial<Record<LocaleCode, (text: string) => string>> = {
  ru: typesetRussian,
};

/** Применяет правила языка к одной строке; у языка без правил строка не меняется. */
export function typesetText(locale: LocaleCode, text: string): string {
  return TYPESETTERS[locale]?.(text) ?? text;
}

/** То же для всех строк вложенного объекта (словарь, перевод меню). */
export function typesetStrings<T>(locale: LocaleCode, node: T): T {
  if (typeof node === 'string') return typesetText(locale, node) as T;
  if (Array.isArray(node)) return node.map((child) => typesetStrings(locale, child)) as T;
  if (node === null || typeof node !== 'object') return node;
  return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, typesetStrings(locale, child)])) as T;
}
