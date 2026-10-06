// Реестр шрифтов по языкам. Свои @font-face вместо CSS из пакетов fontsource:
// в пакетах нет файла «только латиница», а нам нужен ровно тот набор, что есть на странице.
import bodoniItalicUrl from '@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-italic.woff2?url';
import bodoniNormalUrl from '@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-normal.woff2?url';
import notoSerifThaiUrl from '@fontsource-variable/noto-serif-thai/files/noto-serif-thai-thai-wght-normal.woff2?url';
import sourceSerifCyrillicUrl from '@fontsource-variable/source-serif-4/files/source-serif-4-cyrillic-wght-normal.woff2?url';
import sourceSerifLatinUrl from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2?url';
import prataCyrillicUrl from '@fontsource/prata/files/prata-cyrillic-400-normal.woff2?url';
import type { LocaleCode } from '@/i18n';

export interface FontFace {
  family: string;
  style: 'normal' | 'italic';
  weight: string;
  url: string;
  unicodeRange: string;
  /** Нужен на первом экране — грузим заранее, чтобы текст не перерисовывался. */
  preload: boolean;
}

// Диапазоны — из CSS и unicode.json пакетов fontsource.
const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const CYRILLIC_RANGE = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const THAI_RANGE = 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC';

const BODONI = 'Bodoni Moda Variable';
const SOURCE_SERIF = 'Source Serif 4 Variable';

// Латиница нужна на всех страницах: название, блюда и итальянская цитата везде латиницей.
const LATIN_FACES: FontFace[] = [
  { family: BODONI, style: 'normal', weight: '400 900', url: bodoniNormalUrl, unicodeRange: LATIN_RANGE, preload: true },
  { family: BODONI, style: 'italic', weight: '400 900', url: bodoniItalicUrl, unicodeRange: LATIN_RANGE, preload: true },
  { family: SOURCE_SERIF, style: 'normal', weight: '200 900', url: sourceSerifLatinUrl, unicodeRange: LATIN_RANGE, preload: true },
];

const CYRILLIC_FACES: FontFace[] = [
  { family: SOURCE_SERIF, style: 'normal', weight: '200 900', url: sourceSerifCyrillicUrl, unicodeRange: CYRILLIC_RANGE, preload: true },
  { family: 'Prata', style: 'normal', weight: '400', url: prataCyrillicUrl, unicodeRange: CYRILLIC_RANGE, preload: false },
];

const THAI_FACES: FontFace[] = [
  { family: 'Noto Serif Thai Variable', style: 'normal', weight: '100 900', url: notoSerifThaiUrl, unicodeRange: THAI_RANGE, preload: true },
];

const EXTRA_FACES: Partial<Record<LocaleCode, FontFace[]>> = {
  ru: CYRILLIC_FACES,
  th: THAI_FACES,
};

export function getFontFaces(locale: LocaleCode): FontFace[] {
  return [...LATIN_FACES, ...(EXTRA_FACES[locale] ?? [])];
}

export function toFontFaceCss(face: FontFace): string {
  return [
    '@font-face{',
    `font-family:"${face.family}";`,
    `font-style:${face.style};`,
    `font-weight:${face.weight};`,
    'font-display:swap;',
    `src:url("${face.url}") format("woff2");`,
    `unicode-range:${face.unicodeRange}`,
    '}',
  ].join('');
}
