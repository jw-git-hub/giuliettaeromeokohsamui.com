// Какие языки попадают в сборку. Общий модуль для astro.config.ts и скриптов проверки.
// Статусы в registry.json: published — в любой сборке; draft и trial — только по списку
// PREVIEW_LOCALES и только в dev или в демо. Так черновик нельзя опубликовать случайно.
import { readFileSync } from 'node:fs';

const REGISTRY_URL = new URL('./registry.json', import.meta.url);
const PUBLISHED_STATUS = 'published';

export function readRegistry() {
  return JSON.parse(readFileSync(REGISTRY_URL, 'utf8'));
}

function parsePreviewList(rawList) {
  return (rawList ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
}

function assertPreviewAllowed(previewCodes, canPreview) {
  if (previewCodes.length > 0 && !canPreview) {
    throw new Error('PREVIEW_LOCALES работает только в dev и в демо-сборке: черновики языков не публикуются.');
  }
}

function assertKnownLocales(previewCodes, registry) {
  const unknownCodes = previewCodes.filter((code) => !(code in registry.locales));
  if (unknownCodes.length > 0) {
    throw new Error(`PREVIEW_LOCALES: нет таких языков в registry.json — ${unknownCodes.join(', ')}`);
  }
}

export function resolveBuildLocales({ previewLocales, canPreview }) {
  const registry = readRegistry();
  const previewCodes = parsePreviewList(previewLocales);
  assertPreviewAllowed(previewCodes, canPreview);
  assertKnownLocales(previewCodes, registry);
  return Object.keys(registry.locales).filter(
    (code) => registry.locales[code].status === PUBLISHED_STATUS || previewCodes.includes(code),
  );
}
