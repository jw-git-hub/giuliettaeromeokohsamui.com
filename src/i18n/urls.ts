import { PRODUCTION_SITE } from '@/config/site.mjs';
import { BUILD_LOCALES, DEFAULT_LOCALE, getLocaleInfo, type LocaleCode } from './index';

const X_DEFAULT = 'x-default';

function trimSlashes(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

function localePrefix(locale: LocaleCode): string {
  return locale === DEFAULT_LOCALE ? '' : `${locale}/`;
}

/** Адрес главной страницы языка с учётом базового пути (демо может жить в подпапке). */
export function localeUrl(locale: LocaleCode): string {
  const basePath = trimSlashes(import.meta.env.BASE_URL);
  const baseWithSlashes = basePath === '' ? '/' : `/${basePath}/`;
  return `${baseWithSlashes}${localePrefix(locale)}`;
}

/** Адрес файла из public/ с учётом базового пути. */
export function assetUrl(fileName: string): string {
  return `${localeUrl(DEFAULT_LOCALE)}${trimSlashes(fileName)}`;
}

/** Канонический адрес всегда боевой: демо не должно выглядеть самостоятельным сайтом. */
export function canonicalUrl(locale: LocaleCode): string {
  return `${PRODUCTION_SITE}/${localePrefix(locale)}`;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

export function alternateLinks(): AlternateLink[] {
  const localeLinks = BUILD_LOCALES.map((locale) => ({
    hreflang: getLocaleInfo(locale).htmlLang,
    href: canonicalUrl(locale),
  }));
  return [...localeLinks, { hreflang: X_DEFAULT, href: canonicalUrl(DEFAULT_LOCALE) }];
}
