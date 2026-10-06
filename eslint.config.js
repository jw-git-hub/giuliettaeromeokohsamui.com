import tseslint from 'typescript-eslint';

// Правила чистого кода проекта: короткие функции, неглубокая вложенность, без магических чисел.
const MAX_FUNCTION_LINES = 20;
const MAX_DEPTH = 3;

const cleanCodeRules = {
  'max-lines-per-function': ['error', { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true }],
  'max-depth': ['error', MAX_DEPTH],
  'no-magic-numbers': ['error', { ignore: [-1, 0, 1], ignoreArrayIndexes: true, ignoreDefaultValues: true }],
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': 'error',
};

export default tseslint.config(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'test-results/', 'original/'] },
  {
    files: ['src/**/*.ts', 'scripts/**/*.mjs', 'src/**/*.mjs', 'astro.config.ts'],
    extends: [tseslint.configs.recommended],
    rules: cleanCodeRules,
  },
  {
    // Файлы данных и конфигурации — это и есть место, где числа получают имена.
    files: ['src/data/images.ts', 'src/config/**'],
    rules: { 'no-magic-numbers': 'off' },
  },
  {
    // В тестах длинные сценарии и числа-ожидания — норма.
    files: ['tests/**/*.ts', 'playwright.config.ts'],
    extends: [tseslint.configs.recommended],
  },
);
