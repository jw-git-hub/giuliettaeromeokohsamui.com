import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { PRODUCTION_SITE } from './src/config/site.mjs';
import { readRegistry, resolveBuildLocales } from './src/i18n/build-locales.mjs';

const ALL_PREFIXES = '';
const isBuild = process.argv.includes('build');
const modeFlagIndex = process.argv.indexOf('--mode');
const defaultMode = isBuild ? 'production' : 'development';
const mode = modeFlagIndex === -1 ? defaultMode : process.argv[modeFlagIndex + 1];

// Astro не читает .env в конфиге сам — берём через Vite.
const env = loadEnv(mode, process.cwd(), ALL_PREFIXES);
const isDemo = env.PUBLIC_DEMO === 'true';

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
    define: {
      __BUILD_LOCALES__: JSON.stringify(buildLocales),
      __IS_DEMO__: JSON.stringify(isDemo),
    },
  },
});
