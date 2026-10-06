// Сверка английских текстов с оригиналом, до сборки.
// 1. Каждая строка английского словаря дословно есть в content/texts.md.
// 2. Каждый английский фрагмент content/texts.md есть в словаре (или в списке исключений с причиной).
// 3. Шаблон сообщения в WhatsApp совпадает с texts.md посимвольно.
// 4. Ссылки и время брони в конфиге совпадают с texts.md.
import { buildBookingMessage } from '../src/scripts/booking/message.ts';
import { collapseSpaces, fail, flattenStrings, pass, readJson, readText, removeKnown, stripMarkers } from './lib/content.mjs';

const TEXTS_PATH = 'content/texts.md';
const texts = readText(TEXTS_PATH);
const dictionary = readJson('src/i18n/dictionaries/en.json');
const shared = readJson('src/i18n/shared.json');
const exceptions = readJson('scripts/verbatim-exceptions.json');
const restaurantConfig = readText('src/config/restaurant.ts');

const CODE_BLOCK = /```[\s\S]*?```/g;
const CODE_SPAN = /`[^`]*`/g;
const CYRILLIC_RUN = /[А-Яа-яЁё][А-Яа-яЁё\s,.«»()—:№-]*/g;
const HAS_LATIN = /[A-Za-z]/;
const HEADING_PREFIX = /^#+\s*(\d+\.)?\s*/;
const QUOTE_MARKS = /[«»]/;
const FILE_NAME = /^[\w.-]+\.(jpg|png|json|md|html)$/;
const EDGE_NOISE = /^[\s|:;,()«»→—–-]+|[\s|:;,(«»→—–-]+$/g;
const TRACKING_TAIL = /\?(igsh|mibextid)=[^`|\s]*/;

const newPhraseKeys = exceptions.newPhrases.map((phrase) => phrase.key);
const dictionaryStrings = flattenStrings(dictionary).map(({ path, value }) => ({ path, value: stripMarkers(value) }));
const sharedStrings = flattenStrings(shared).map(({ value }) => value);
const restaurantName = `${shared.name.first} ${shared.name.conjunction} ${shared.name.last}`;
const timeSlots = [...restaurantConfig.matchAll(/value: '([^']+)'/g)].map((match) => match[1]);

function findMissingInTexts() {
  const flatTexts = collapseSpaces(texts);
  return dictionaryStrings
    .filter(({ path }) => !newPhraseKeys.includes(path))
    .filter(({ value }) => !flatTexts.includes(collapseSpaces(value)))
    .map(({ path, value }) => `${path}: «${value}» — нет в texts.md`);
}

function splitLine(line) {
  const isTableRow = line.trimStart().startsWith('|');
  const cells = isTableRow ? line.split('|') : [line.replace(HEADING_PREFIX, '')];
  return cells
    .flatMap((cell) => cell.replace(CODE_SPAN, ' ').split(CYRILLIC_RUN))
    .flatMap((fragment) => fragment.split(QUOTE_MARKS));
}

function extractFragments() {
  const lines = texts.replace(CODE_BLOCK, '').split('\n');
  return lines
    .flatMap(splitLine)
    .flatMap((fragment) => fragment.split(';'))
    .map((fragment) => fragment.replace(EDGE_NOISE, ''))
    .filter((fragment) => HAS_LATIN.test(fragment))
    .filter((fragment) => !FILE_NAME.test(fragment) && !fragment.startsWith('http'));
}

function findMissingInDictionary() {
  const known = [...dictionaryStrings.map(({ value }) => value), ...sharedStrings, restaurantName, ...timeSlots];
  const knownText = known.join('\n');
  const skipped = exceptions.notOnPage.map((entry) => entry.text);
  return extractFragments()
    .filter((fragment) => !skipped.includes(fragment))
    .filter((fragment) => !knownText.includes(fragment))
    .filter((fragment) => HAS_LATIN.test(removeKnown(fragment, known)))
    .map((fragment) => `«${fragment}» из texts.md нет в словаре`);
}

function findMessageMismatch() {
  const template = texts.match(/```\n(Ciao[\s\S]*?)\n```/)?.[1];
  const message = buildBookingMessage({
    name: '<имя>',
    date: '<дата как в списке>',
    time: '<время>',
    guests: '<число>',
    requests: '<пожелания>',
  });
  return message === template ? [] : ['шаблон сообщения в WhatsApp отличается от texts.md'];
}

function findMissingLinks() {
  const linksTable = texts.slice(texts.indexOf('## Ссылки'), texts.indexOf('## Как работает форма брони'));
  const urls = [...linksTable.matchAll(/`([a-z]+:[^`]+)`/g)].map((match) => match[1].replace(TRACKING_TAIL, ''));
  return urls.filter((url) => !restaurantConfig.includes(url)).map((url) => `ссылки ${url} нет в restaurant.ts`);
}

const problems = [...findMissingInTexts(), ...findMissingInDictionary(), ...findMessageMismatch(), ...findMissingLinks()];
if (problems.length > 0) fail('Английские тексты расходятся с content/texts.md', problems);
pass(`английские тексты совпадают с texts.md: ${dictionaryStrings.length} строк словаря, ${extractFragments().length} фрагментов оригинала`);
