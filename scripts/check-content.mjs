// Сверка английских текстов с оригиналом, до сборки.
// 1. Каждая строка английского словаря — целая фраза из content/texts.md, не её обрезок.
// 2. Каждый английский фрагмент content/texts.md есть в словаре (или в списке исключений с причиной).
// 3. Тексты стоят на своих местах: категория — со своим описанием, площадка — со своим числом
//    отзывов, фото — со своей подписью, поле формы — со своей подсказкой.
// 4. Шаблон сообщения в WhatsApp совпадает с texts.md посимвольно; ссылки и время брони — тоже.
import { buildBookingMessage } from '../src/scripts/booking/message.ts';
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
import { extractFragments, messageTemplate, sectionOf, tableRows, texts, withParts } from './lib/texts-md.mjs';

const dictionary = readJson('src/i18n/dictionaries/en.json');
const shared = readJson('src/i18n/shared.json');
const exceptions = readJson('scripts/verbatim-exceptions.json');
const restaurantConfig = readText('src/config/restaurant.ts');

const HAS_LATIN = /[A-Za-z]/;
const TRACKING_TAIL = /\?(igsh|mibextid)=[^`|\s]*/;
const HINT_SEPARATOR = ' — ';
const FORM_FIELDS = ['name', 'date', 'time', 'guests', 'requests'];

const fragments = extractFragments();
const dictionaryStrings = flattenStrings(dictionary).map(({ path, value }) => ({ path, value: stripMarkers(value) }));
const sharedStrings = flattenStrings(shared).filter(({ path }) => !path.startsWith('name.'));
const timeSlots = [...restaurantConfig.matchAll(/value: '([^']+)'/g)].map((match) => match[1]);
const keysOf = (entries) => entries.map((entry) => entry.key);

/** Строки словаря, которых нет в оригинале целой фразой. */
function findNotVerbatim() {
  const candidates = new Set(withParts(fragments).map(collapseSpaces));
  const skippedKeys = [...keysOf(exceptions.newPhrases), ...keysOf(exceptions.partOfOriginal)];
  return [...dictionaryStrings, ...sharedStrings]
    .filter(({ path }) => !skippedKeys.includes(path))
    .filter(({ value }) => !candidates.has(collapseSpaces(value)))
    .map(({ path, value }) => `${path}: «${value}» — в texts.md нет такой целой фразы`);
}

/** Исключения «часть фразы оригинала» обязаны действительно быть частью оригинала. */
function findBrokenPartials() {
  const flatTexts = collapseSpaces(texts);
  return dictionaryStrings
    .filter(({ path }) => keysOf(exceptions.partOfOriginal).includes(path))
    .filter(({ value }) => !flatTexts.includes(collapseSpaces(value)))
    .map(({ path, value }) => `${path}: «${value}» — нет в texts.md даже частью фразы`);
}

/** Фрагменты оригинала, которых нет в словаре. */
function findMissingInDictionary() {
  const tagged = flattenStrings(dictionary).flatMap(({ value }) => taggedTexts(value));
  const known = [...dictionaryStrings, ...sharedStrings].map(({ value }) => value);
  const allKnown = [...known, ...tagged, ...timeSlots, restaurantName(shared)];
  const skipped = exceptions.notOnPage.map((entry) => entry.text);
  return fragments
    .filter((fragment) => HAS_LATIN.test(fragment) && !skipped.includes(fragment))
    .filter((fragment) => HAS_LATIN.test(removeKnown(fragment, allKnown)))
    .map((fragment) => `«${fragment}» из texts.md нет в словаре`);
}

function expectEqual(actual, expected, what) {
  return actual === expected ? [] : [`${what}: в словаре «${actual}», в texts.md «${expected}»`];
}

function findCategoryMismatch() {
  const rows = tableRows(sectionOf('## 3. '));
  const orderProblem = expectEqual(Object.values(shared.categories).join(', '), rows.map((row) => row[0]).join(', '), 'порядок категорий');
  const rowProblems = rows.flatMap(([name, text, , alt]) => {
    const category = dictionary.menu.categories[name.toLowerCase()];
    return [...expectEqual(category?.text, text, `текст категории ${name}`), ...expectEqual(category?.alt, alt, `подпись фото ${name}`)];
  });
  return [...orderProblem, ...rowProblems];
}

function findReviewMismatch() {
  return tableRows(sectionOf('## 5. ')).flatMap(([platform, score, , count, link]) => {
    const key = platform.toLowerCase();
    return [
      ...expectEqual(shared.reviews[key]?.platform, platform, `площадка ${platform}`),
      ...expectEqual(shared.reviews[key]?.score, score, `оценка ${platform}`),
      ...expectEqual(dictionary.reviews[key]?.count, count, `число отзывов ${platform}`),
      ...expectEqual(dictionary.reviews[key]?.link, link, `ссылка ${platform}`),
    ];
  });
}

function findGalleryMismatch() {
  const line = sectionOf('## 6. ').split('\n').find((candidate) => candidate.includes(';')) ?? '';
  const captions = line.slice(line.indexOf('):') + '):'.length).split(';').map((caption) => caption.trim().replace(/\.$/, ''));
  return expectEqual(dictionary.gallery.alts.join('; '), captions.join('; '), 'подписи галереи по порядку');
}

function findReservationMismatch() {
  const [hoursTable, formTable] = sectionOf('## 7. ').split('Форма:');
  const hours = dictionary.reservations.hours.map((row) => `${row.days} | ${row.time}`).join('; ');
  const expectedHours = tableRows(hoursTable).map((row) => row.join(' | ')).join('; ');
  const fieldProblems = tableRows(formTable).flatMap(([, label, hint], index) => {
    const field = dictionary.reservations.form[FORM_FIELDS[index]];
    const placeholder = hint.split(HINT_SEPARATOR)[0];
    return [...expectEqual(field.label, label, `подпись поля ${label}`), ...expectEqual(field.placeholder, placeholder, `подсказка поля ${label}`)];
  });
  return [...expectEqual(hours, expectedHours, 'часы работы'), ...fieldProblems];
}

function findMessageMismatch() {
  const message = buildBookingMessage({
    name: '<имя>',
    date: '<дата как в списке>',
    time: '<время>',
    guests: '<число>',
    requests: '<пожелания>',
  });
  return message === messageTemplate() ? [] : ['шаблон сообщения в WhatsApp отличается от texts.md'];
}

function findMissingLinks() {
  const urls = [...sectionOf('## Ссылки').matchAll(/`([a-z]+:[^`]+)`/g)].map((match) => match[1].replace(TRACKING_TAIL, ''));
  return urls.filter((url) => !restaurantConfig.includes(url)).map((url) => `ссылки ${url} нет в restaurant.ts`);
}

const problems = [
  ...findNotVerbatim(),
  ...findBrokenPartials(),
  ...findMissingInDictionary(),
  ...findCategoryMismatch(),
  ...findReviewMismatch(),
  ...findGalleryMismatch(),
  ...findReservationMismatch(),
  ...findMessageMismatch(),
  ...findMissingLinks(),
];
if (problems.length > 0) fail('Английские тексты расходятся с content/texts.md', problems);
pass(`английские тексты совпадают с texts.md: ${dictionaryStrings.length} строк словаря — целыми фразами и на своих местах`);
