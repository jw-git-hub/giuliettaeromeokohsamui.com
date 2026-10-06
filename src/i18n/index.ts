import english from './dictionaries/en.json';
import registry from './registry.json';
import { assertSameShape, mergeOverReference } from './shape';

export type Dictionary = typeof english;
export type LocaleCode = keyof typeof registry.locales;
export type LocaleInfo = (typeof registry.locales)[LocaleCode];

const TRIAL_STATUS = 'trial';

export const DEFAULT_LOCALE = registry.defaultLocale as LocaleCode;

/** Языки текущей сборки, в порядке реестра. Список приходит из astro.config.ts. */
export const BUILD_LOCALES = __BUILD_LOCALES__ as LocaleCode[];

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
  const rawDictionary = loadRawDictionary(locale);
  if (getLocaleInfo(locale).status === TRIAL_STATUS) {
    return mergeOverReference(english, rawDictionary, locale);
  }
  assertSameShape(english, rawDictionary, locale);
  return rawDictionary as Dictionary;
}
