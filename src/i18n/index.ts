import english from './dictionaries/en.json';
import registry from './registry.json';
import { assertSameShape, mergeOverReference } from './shape';
import { typesetStrings } from './typography';

export type Dictionary = typeof english;
export type LocaleCode = keyof typeof registry.locales;
export type LocaleInfo = (typeof registry.locales)[LocaleCode];

const TRIAL_STATUS = 'trial';
const PUBLISHED_STATUS = 'published';

export const DEFAULT_LOCALE = registry.defaultLocale as LocaleCode;

/** Языки текущей сборки, в порядке реестра. Список приходит из astro.config.ts. */
export const BUILD_LOCALES = __BUILD_LOCALES__ as LocaleCode[];

/** Второй замок: черновик языка не может попасть в сборку, открытую для поиска,
    даже если astro.config.ts по какой-то причине его пропустил. */
function assertNoDraftsInPublicBuild(): void {
  const drafts = BUILD_LOCALES.filter((locale) => registry.locales[locale].status !== PUBLISHED_STATUS);
  if (import.meta.env.PROD && !__IS_DEMO__ && drafts.length > 0) {
    throw new Error(`Черновики языков в боевой сборке: ${drafts.join(', ')}. Нужен статус published или демо-сборка.`);
  }
}

assertNoDraftsInPublicBuild();

const dictionaryModules = import.meta.glob<unknown>('./dictionaries/*.json', {
  eager: true,
  import: 'default',
});

export function getLocaleInfo(locale: LocaleCode): LocaleInfo {
  return registry.locales[locale];
}

function loadRawDictionary(locale: LocaleCode): unknown {
  const rawDictionary = dictionaryModules[`./dictionaries/${locale}.json`];
  if (rawDictionary === undefined) throw new Error(`Нет словаря для языка «${locale}»`);
  return rawDictionary;
}

export function getDictionary(locale: LocaleCode): Dictionary {
  if (locale === DEFAULT_LOCALE) return english;
  return withTypography(locale, loadCheckedDictionary(locale));
}

function loadCheckedDictionary(locale: LocaleCode): Dictionary {
  const rawDictionary = loadRawDictionary(locale);
  if (getLocaleInfo(locale).status === TRIAL_STATUS) {
    return mergeOverReference(english, rawDictionary, locale);
  }
  assertSameShape(english, rawDictionary, locale);
  return rawDictionary as Dictionary;
}

/** Типографика языка — для текста страницы; заголовок и описание для поиска остаются как в файле. */
function withTypography(locale: LocaleCode, dictionary: Dictionary): Dictionary {
  return { ...typesetStrings(locale, dictionary), meta: dictionary.meta };
}
