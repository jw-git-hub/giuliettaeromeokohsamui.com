// Роли фото: какие ширины отдаём и где их показываем. Пределы показа — DESIGN.md, раздел 7.
import type { ImageMetadata } from 'astro';
import categoryAntipasti from '@/assets/img/category-antipasti.jpg';
import categoryDessert from '@/assets/img/category-dessert.jpg';
import categoryGrill from '@/assets/img/category-grill.jpg';
import categoryPasta from '@/assets/img/category-pasta.jpg';
import categoryPizza from '@/assets/img/category-pizza.jpg';
import categorySeafood from '@/assets/img/category-seafood.jpg';
import facadeSign from '@/assets/img/facade-sign.jpg';
import gallery01 from '@/assets/img/gallery-01-crostini.jpg';
import gallery02 from '@/assets/img/gallery-02-seafood-starter.jpg';
import gallery03 from '@/assets/img/gallery-03-pasta.jpg';
import gallery04 from '@/assets/img/gallery-04-poached-pear.jpg';
import gallery05 from '@/assets/img/gallery-05-bruschetta-board.jpg';
import gallery06 from '@/assets/img/gallery-06-seafood-dish.jpg';
import gallery07 from '@/assets/img/gallery-07-spaghetti-vongole.jpg';
import gallery08 from '@/assets/img/gallery-08-fish-grilled-vegetables.jpg';
import gallery09 from '@/assets/img/gallery-09-sharing-starter.jpg';
import gallery10 from '@/assets/img/gallery-10-ravioli.jpg';
import gallery11 from '@/assets/img/gallery-11-pasta-truffle.jpg';
import gallery12 from '@/assets/img/gallery-12-gourmet-pizza.jpg';
import heroLantern from '@/assets/img/hero-lantern.jpg';
import logoLaDolceVita from '@/assets/img/logo-la-dolce-vita.jpg';
import logoLaPasta from '@/assets/img/logo-la-pasta.jpg';
import whatsappQr from '@/assets/img/whatsapp-qr.png';
import type { PictureVariant } from './picture';

const DESKTOP_MEDIA = '(min-width: 1024px)';
const SQUARE = { width: 1, height: 1 };
const TILE_ASPECT = { width: 4, height: 5 };
const TILE_WIDTHS = [240, 360, 480, 600];
const LOGO_WIDTHS = [128, 192, 256, 384];

// На телефоне плитка занимает около 46vw; заявляем 40vw, чтобы экраны с тройной плотностью
// брали файл 480 px, а не 600: разницы на глаз нет, а весит на треть меньше.
const CATEGORY_SIZES = '(min-width: 1200px) 190px, (min-width: 768px) 31vw, 40vw';
const GALLERY_SIZES = '(min-width: 1024px) 290px, (min-width: 768px) 31vw, 40vw';
const LOGO_SIZES = '(min-width: 1024px) 128px, 96px';

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

/** Фасад: до 600 px на компьютере, до 700 px на планшете. */
export const facadeVariants: PictureVariant[] = [
  {
    src: facadeSign,
    widths: [400, 600, 800, 1200],
    // На телефоне заявляем 66vw по той же причине: 800 px вместо 1200.
    sizes: '(min-width: 1024px) 600px, (min-width: 768px) 700px, 66vw',
  },
];

function toTile(src: ImageMetadata, sizes: string, position?: string): PictureVariant[] {
  return [{ src, widths: TILE_WIDTHS, sizes, aspect: TILE_ASPECT, position }];
}

function toLogo(src: ImageMetadata): PictureVariant[] {
  return [{ src, widths: LOGO_WIDTHS, sizes: LOGO_SIZES, aspect: SQUARE }];
}

/** Плитки категорий 4:5; ключи совпадают с categories в словарях. */
export const categoryTiles: Record<string, PictureVariant[]> = {
  antipasti: toTile(categoryAntipasti, CATEGORY_SIZES),
  pasta: toTile(categoryPasta, CATEGORY_SIZES),
  seafood: toTile(categorySeafood, CATEGORY_SIZES),
  grill: toTile(categoryGrill, CATEGORY_SIZES),
  pizza: toTile(categoryPizza, CATEGORY_SIZES),
  dessert: toTile(categoryDessert, CATEGORY_SIZES),
};

/** Фото галереи по порядку подписей в словаре. */
export const gallerySources: ImageMetadata[] = [
  gallery01,
  gallery02,
  gallery03,
  gallery04,
  gallery05,
  gallery06,
  gallery07,
  gallery08,
  gallery09,
  gallery10,
  gallery11,
  gallery12,
];

export function toGalleryTile(src: ImageMetadata): PictureVariant[] {
  return toTile(src, GALLERY_SIZES);
}

/** Увеличенное фото галереи: исходные пропорции, не больше исходника. */
export const GALLERY_ZOOM = { maxWidth: 1200, quality: 80 } as const;

export const familyLogos = {
  dolce: toLogo(logoLaDolceVita),
  pasta: toLogo(logoLaPasta),
};

/** QR не пережимаем: это чёрно-белая сетка, от сжатия он перестанет читаться. */
export const whatsappQrImage = whatsappQr;
