// Чтение цветов из src/styles/tokens.css: картинки для мессенджеров и иконка берут те же значения, что сайт.
import { readFileSync } from 'node:fs';

const TOKENS_PATH = 'src/styles/tokens.css';

export function readColorToken(name) {
  const css = readFileSync(TOKENS_PATH, 'utf8');
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{3,8})`));
  if (!match) throw new Error(`В ${TOKENS_PATH} нет цвета --${name}`);
  return match[1];
}
