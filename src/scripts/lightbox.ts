// Увеличение фото галереи по нажатию. Плитка — обычная ссылка на большое фото;
// скрипт перехватывает нажатие и показывает фото в <dialog>: листание стрелками и кнопками.

const DIALOG_SELECTOR = '[data-lightbox]';
const ZOOM_LINK_SELECTOR = '[data-zoom]';
const PREVIOUS_STEP = -1;
const NEXT_STEP = 1;

interface LightboxParts {
  dialog: HTMLDialogElement;
  image: HTMLImageElement;
  caption: HTMLElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  links: HTMLAnchorElement[];
}

let currentIndex = 0;

function findParts(): LightboxParts | null {
  const dialog = document.querySelector<HTMLDialogElement>(DIALOG_SELECTOR);
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(ZOOM_LINK_SELECTOR));
  if (!dialog || links.length === 0 || typeof dialog.showModal !== 'function') return null;
  return {
    dialog,
    links,
    image: dialog.querySelector<HTMLImageElement>('[data-lightbox-image]')!,
    caption: dialog.querySelector<HTMLElement>('[data-lightbox-caption]')!,
    previousButton: dialog.querySelector<HTMLButtonElement>('[data-lightbox-previous]')!,
    nextButton: dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]')!,
    closeButton: dialog.querySelector<HTMLButtonElement>('[data-lightbox-close]')!,
  };
}

function wrapIndex(index: number, total: number): number {
  return (index + total) % total;
}

function captionOf(link: HTMLAnchorElement): string {
  return link.dataset.zoomCaption ?? '';
}

function showPhoto(parts: LightboxParts, index: number): void {
  const total = parts.links.length;
  currentIndex = wrapIndex(index, total);
  const link = parts.links[currentIndex];
  parts.image.src = link.href;
  parts.image.alt = captionOf(link);
  parts.caption.textContent = captionOf(link);
  // Подпись кнопки — подпись фото, к которому она ведёт. Атрибутом: свойство ariaLabel есть не везде.
  parts.previousButton.setAttribute('aria-label', captionOf(parts.links[wrapIndex(currentIndex + PREVIOUS_STEP, total)]));
  parts.nextButton.setAttribute('aria-label', captionOf(parts.links[wrapIndex(currentIndex + NEXT_STEP, total)]));
}

function openPhoto(parts: LightboxParts, index: number, event: Event): void {
  event.preventDefault();
  showPhoto(parts, index);
  parts.dialog.showModal();
}

function handleKey(parts: LightboxParts, event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') showPhoto(parts, currentIndex + PREVIOUS_STEP);
  if (event.key === 'ArrowRight') showPhoto(parts, currentIndex + NEXT_STEP);
}

function closeOnBackdrop(parts: LightboxParts, event: MouseEvent): void {
  if (event.target === parts.dialog) parts.dialog.close();
}

function initLightbox(): void {
  const parts = findParts();
  if (!parts) return;
  parts.links.forEach((link, index) => link.addEventListener('click', (event) => openPhoto(parts, index, event)));
  parts.previousButton.addEventListener('click', () => showPhoto(parts, currentIndex + PREVIOUS_STEP));
  parts.nextButton.addEventListener('click', () => showPhoto(parts, currentIndex + NEXT_STEP));
  parts.closeButton.addEventListener('click', () => parts.dialog.close());
  parts.dialog.addEventListener('keydown', (event) => handleKey(parts, event));
  parts.dialog.addEventListener('click', (event) => closeOnBackdrop(parts, event));
}

initLightbox();
