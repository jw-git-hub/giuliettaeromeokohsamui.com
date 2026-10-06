import { existsSync } from 'node:fs';
import registry from '../../src/i18n/registry.json' with { type: 'json' };

export type LocaleCode = keyof typeof registry.locales;

export const VIEWPORTS = {
  // Самый узкий экран в ходу: iPhone SE первого поколения и маленькие Android.
  small: { width: 320, height: 568 },
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  laptop: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
} as const;

/** Телефоны с открытыми панелями браузера: то, что гость видит, не прокручивая страницу. */
export const PHONE_FIRST_SCREENS = [
  { width: 360, height: 640 },
  // iPhone SE в Safari
  { width: 375, height: 553 },
  // iPhone 14 в Safari
  { width: 390, height: 664 },
] as const;

/** Низкий экран (телефон боком в узком окне): кнопка первого экрана остаётся ниже края. */
export const LOW_SCREEN = { width: 390, height: 320 } as const;

/** Обложка складного телефона — уже этого экранов в ходу нет. */
export const NARROWEST = { width: 280, height: 653 } as const;

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
