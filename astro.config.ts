import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { PRODUCTION_SITE } from './src/config/site.mjs';
import { readRegistry, resolveBuildLocales } from './src/i18n/build-locales.mjs';

const ALL_PREFIXES = '';
const MODE_FLAG = '--mode';
const isBuild = process.argv.includes('build');
const defaultMode = isBuild ? 'production' : 'development';

/** Режим из командной строки: и «--mode demo», и «--mode=demo». */
function readMode(argv: string[]): string {
  const inlineFlag = argv.find((argument) => argument.startsWith(`${MODE_FLAG}=`));
  if (inlineFlag) return inlineFlag.slice(MODE_FLAG.length + 1);
  const flagIndex = argv.indexOf(MODE_FLAG);
  return flagIndex === -1 ? defaultMode : (argv[flagIndex + 1] ?? defaultMode);
}

const mode = readMode(process.argv);

// Astro не читает .env в конфиге сам — берём через Vite.
const env = loadEnv(mode, process.cwd(), ALL_PREFIXES);
const isDemo = env.PUBLIC_DEMO === 'true';

// У демо свой адрес: по нему строятся картинка и адрес для мессенджеров.
// Без него карточка ссылки ушла бы на боевой домен, где нового сайта ещё нет.
if (isBuild && isDemo && !env.SITE_URL) {
  throw new Error('Демо-сборке нужен SITE_URL — адрес, где будет жить демо (см. .env.demo).');
}

const registry = readRegistry();
const buildLocales = resolveBuildLocales({
  previewLocales: env.PREVIEW_LOCALES,
  canPreview: !isBuild || isDemo,
});

export default defineConfig({
  output: 'static',
  site: env.SITE_URL || PRODUCTION_SITE,
  base: env.BASE_PATH || '/',
  trailingSlash: 'always',
  // В Astro 7 по умолчанию 'jsx': пробелы между строчными элементами вырезаются,
  // и «Giulietta <em>e</em> Romeo» склеивается. true сжимает, но пробелы сохраняет.
  compressHTML: true,
  devToolbar: { enabled: false },
  i18n: {
    locales: buildLocales,
    defaultLocale: registry.defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    // Старые Safari (до 16.4) не понимают запись @media (width >= …): сборка переводит её в min-width.
    build: {
      cssTarget: ['chrome100', 'firefox100', 'safari14', 'ios14'],
      // Мелкие файлы не встраиваются в страницу: шрифт со знаком бата (1 КБ) иначе попадал бы
      // в начало каждой страницы перед стилями, хотя нужен только в меню.
      assetsInlineLimit: 0,
    },
    define: {
      __BUILD_LOCALES__: JSON.stringify(buildLocales),
      __IS_DEMO__: JSON.stringify(isDemo),
    },
  },
});
