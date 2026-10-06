// Сборка <picture>: AVIF и WebP с запасным JPEG, несколько ширин. Своя сборка вместо <Picture>
// из astro:assets нужна ради двух вещей: разное качество у форматов и разная обрезка
// одного фото для телефона и компьютера (главное фото).
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

type OutputFormat = 'avif' | 'webp' | 'jpg';

const MODERN_FORMATS: OutputFormat[] = ['avif', 'webp'];
const FALLBACK_FORMAT: OutputFormat = 'jpg';
const QUALITY: Record<OutputFormat, number> = { avif: 50, webp: 72, jpg: 78 };
const MIME_TYPE: Record<OutputFormat, string> = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg' };

export interface AspectRatio {
  width: number;
  height: number;
}

export interface PictureVariant {
  src: ImageMetadata;
  /** Ширины файлов в srcset. Шире исходника Astro не делает. */
  widths: number[];
  sizes: string;
  /** Обрезка под соотношение сторон; без неё — исходные пропорции. */
  aspect?: AspectRatio;
  /** Точка обрезки, как object-position. */
  position?: string;
  /** Условие показа варианта; у основного варианта его нет. */
  media?: string;
}

export interface PictureSource {
  type: string;
  srcset: string;
  sizes: string;
  media?: string;
  width: number;
  height: number;
}

export interface PictureFallback {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
}

/** Размеры исходника — с его копии. Astro считает оригинал нужным на сайте, как только у импорта
    прочитали любое свойство, и кладёт его в dist целиком; копия этого учёта не ведёт. */
export function sourceSize(src: ImageMetadata): AspectRatio {
  const { width, height } = (src as ImageMetadata & { clone?: ImageMetadata }).clone ?? src;
  return { width, height };
}

function largestWidth(variant: PictureVariant): number {
  return Math.min(Math.max(...variant.widths), sourceSize(variant.src).width);
}

function variantHeight(variant: PictureVariant, width: number): number {
  const ratio = variant.aspect ?? sourceSize(variant.src);
  return Math.round((width * ratio.height) / ratio.width);
}

async function renderVariant(variant: PictureVariant, format: OutputFormat) {
  const width = largestWidth(variant);
  return getImage({
    src: variant.src,
    format,
    quality: QUALITY[format],
    width,
    height: variantHeight(variant, width),
    widths: variant.widths.filter((candidate) => candidate <= sourceSize(variant.src).width),
    fit: 'cover',
    position: variant.position ?? 'center',
  });
}

async function toSource(variant: PictureVariant, format: OutputFormat): Promise<PictureSource> {
  const image = await renderVariant(variant, format);
  const width = largestWidth(variant);
  return {
    type: MIME_TYPE[format],
    srcset: image.srcSet.attribute,
    sizes: variant.sizes,
    media: variant.media,
    width,
    height: variantHeight(variant, width),
  };
}

/** Источники в порядке выбора браузером: сначала варианты с условием, внутри — AVIF, затем WebP. */
export async function buildSources(variants: PictureVariant[]): Promise<PictureSource[]> {
  const jobs = variants.flatMap((variant) => MODERN_FORMATS.map((format) => toSource(variant, format)));
  return Promise.all(jobs);
}

export async function buildFallback(variant: PictureVariant): Promise<PictureFallback> {
  const image = await renderVariant(variant, FALLBACK_FORMAT);
  const width = largestWidth(variant);
  return {
    src: image.src,
    srcset: image.srcSet.attribute,
    sizes: variant.sizes,
    width,
    height: variantHeight(variant, width),
  };
}
