import { existsSync } from 'node:fs';
import registry from '../../src/i18n/registry.json' with { type: 'json' };

export type LocaleCode = keyof typeof registry.locales;

export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  laptop: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
} as const;

export function pagePath(locale: LocaleCode): string {
  return locale === registry.defaultLocale ? '/' : `/${locale}/`;
}

/** Языки, которые есть в текущей сборке dist/. */
export const BUILT_LOCALES = (Object.keys(registry.locales) as LocaleCode[]).filter((locale) =>
  existsSync(`dist${pagePath(locale)}index.html`),
);

export function htmlLang(locale: LocaleCode): string {
  return registry.locales[locale].htmlLang;
}
