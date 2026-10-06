// Разбор content/texts.md: это markdown с русскими пояснениями, а не чистый список строк.
// Отсюда берутся английские фрагменты оригинала и таблицы, по которым сверяется словарь.
import { readText } from './content.mjs';

const TEXTS_PATH = 'content/texts.md';
const CODE_BLOCK = /```[\s\S]*?```/g;
const CODE_SPAN = /`[^`]*`/g;
const CYRILLIC_RUN = /[А-Яа-яЁё][А-Яа-яЁё\s,.«»()—:№-]*/g;
const HEADING_PREFIX = /^#+\s*(\d+\.)?\s*/;
const QUOTE_MARKS = /[«»]/;
const EDGE_NOISE = /^[\s|:;,()«»→—–-]+|[\s|:;,()«»→—–-]+$/g;
// «- Текст 1: …», «- Кнопка: …» — русская подпись пункта списка вместе с её номером.
const BULLET_LABEL = /^-\s*[А-Яа-яЁё][^:`]*:\s*/;
const FILE_NAME = /^[\w.-]+\.(jpg|png|json|md|html)$/;
const TABLE_SEPARATOR = /^\|[\s|:-]+\|$/;
const TRAILING_PERIOD = /\.$/;
const LIST_SEPARATOR = ';';
const PART_SEPARATORS = [' | ', ' — '];

export const texts = readText(TEXTS_PATH);

/** Текст раздела: от заголовка, начинающегося с heading, до следующего заголовка второго уровня. */
export function sectionOf(heading) {
  const start = texts.indexOf(heading);
  if (start === -1) throw new Error(`В texts.md нет раздела «${heading}»`);
  const next = texts.indexOf('\n## ', start + heading.length);
  return texts.slice(start, next === -1 ? undefined : next);
}

/** Строки таблиц раздела без шапки: массив массивов ячеек. */
export function tableRows(sectionText) {
  const rows = sectionText.split('\n').filter((line) => line.startsWith('|') && !TABLE_SEPARATOR.test(line.trim()));
  const toCells = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  return rows.slice(1).map(toCells);
}

function trimNoise(fragment) {
  return fragment.replace(EDGE_NOISE, '');
}

/** Перечисление через «;» — это несколько фраз; точка в конце принадлежит предложению, а не фразе. */
function splitList(fragment) {
  const parts = fragment.split(LIST_SEPARATOR);
  if (parts.length === 1) return parts;
  return parts.map((part) => trimNoise(part).replace(TRAILING_PERIOD, ''));
}

function splitLine(line) {
  const isTableRow = line.trimStart().startsWith('|');
  const cells = isTableRow ? line.split('|') : [line.replace(HEADING_PREFIX, '').replace(BULLET_LABEL, '')];
  return cells
    .flatMap((cell) => cell.replace(CODE_SPAN, ' ').split(CYRILLIC_RUN))
    .flatMap((fragment) => fragment.split(QUOTE_MARKS))
    .flatMap(splitList);
}

/** Все фрагменты оригинала без русских пояснений, имён файлов и адресов. */
export function extractFragments() {
  return texts
    .replace(CODE_BLOCK, '')
    .split('\n')
    .flatMap(splitLine)
    .map(trimNoise)
    .filter((fragment) => fragment !== '' && !FILE_NAME.test(fragment) && !fragment.startsWith('http'));
}

/** Фрагменты и их части: «WhatsApp | Call Now» — это две кнопки, «Select a time — 6:00 PM, …» —
    подсказка и её варианты. */
export function withParts(fragments) {
  const parts = PART_SEPARATORS.flatMap((separator) => fragments.flatMap((fragment) => fragment.split(separator)));
  return [...fragments, ...parts];
}

/** Шаблон сообщения в WhatsApp — единственный блок кода, начинающийся с «Ciao». */
export function messageTemplate() {
  return texts.match(/```\n(Ciao[\s\S]*?)\n```/)?.[1];
}
