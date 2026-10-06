// Роли фото: какие ширины отдаём и где их показываем. Пределы показа — DESIGN.md, раздел 7.
import heroLantern from '@/assets/img/hero-lantern.jpg';
import type { PictureVariant } from './picture';

const DESKTOP_MEDIA = '(min-width: 1024px)';
const SQUARE = { width: 1, height: 1 };

/** Телефон и планшет: квадрат, круглое окно с фонарём видно целиком. */
const heroSquare: PictureVariant = {
  src: heroLantern,
  widths: [360, 540, 720, 1030],
  sizes: 'min(100vw - 40px, 520px)',
  aspect: SQUARE,
};

/** Компьютер: фото целиком, вертикально, не шире 560 px. */
const heroPortrait: PictureVariant = {
  src: heroLantern,
  widths: [560, 840, 1030],
  sizes: '(min-width: 1280px) 560px, 42vw',
  media: DESKTOP_MEDIA,
};

/** Порядок важен: варианты с условием — первыми, основной — последним. */
export const heroVariants: PictureVariant[] = [heroPortrait, heroSquare];
