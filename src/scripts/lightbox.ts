// Увеличение фото галереи. Плитка — обычная ссылка на большое фото; скрипт перехватывает нажатие
// и открывает <dialog> с лентой всех фото. Листает сам браузер — пальцем, прокруткой с остановкой
// на каждом фото; скрипт только открывает ленту на нужном фото, отмечает текущую точку
// и листает по стрелкам на экране и на клавиатуре.

const DIALOG_SELECTOR = '[data-lightbox]';
const ZOOM_LINK_SELECTOR = '[data-zoom]';
const CURRENT_ATTRIBUTE = 'data-current';
const PREVIOUS_STEP = -1;
const NEXT_STEP = 1;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

interface LightboxParts {
  dialog: HTMLDialogElement;
  track: HTMLElement;
  captions: string[];
  dots: HTMLElement[];
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  links: HTMLAnchorElement[];
}

function findParts(): LightboxParts | null {
  const dialog = document.querySelector<HTMLDialogElement>(DIALOG_SELECTOR);
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(ZOOM_LINK_SELECTOR));
  if (!dialog || links.length === 0 || typeof dialog.showModal !== 'function') return null;
  return {
    dialog,
    links,
    track: dialog.querySelector<HTMLElement>('[data-lightbox-track]')!,
    captions: Array.from(dialog.querySelectorAll('figcaption'), (caption) => caption.textContent ?? ''),
    dots: Array.from(dialog.querySelectorAll<HTMLElement>('[data-lightbox-dot]')),
    previousButton: dialog.querySelector<HTMLButtonElement>('[data-lightbox-previous]')!,
    nextButton: dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]')!,
    closeButton: dialog.querySelector<HTMLButtonElement>('[data-lightbox-close]')!,
  };
}

/** Какое фото сейчас по центру ленты. */
function currentIndex(parts: LightboxParts): number {
  return Math.round(parts.track.scrollLeft / parts.track.clientWidth);
}

/** Стрелка ведёт к соседнему фото и называется его подписью; у крайнего фото лишней стрелки нет.
    Подпись — атрибутом: свойство ariaLabel есть не везде. */
function updateArrow(button: HTMLButtonElement, targetCaption: string | undefined): void {
  button.hidden = targetCaption === undefined;
  if (targetCaption !== undefined) button.setAttribute('aria-label', targetCaption);
}

function markCurrent(parts: LightboxParts): void {
  const index = currentIndex(parts);
  parts.dots.forEach((dot, dotIndex) => dot.toggleAttribute(CURRENT_ATTRIBUTE, dotIndex === index));
  updateArrow(parts.previousButton, parts.captions[index + PREVIOUS_STEP]);
  updateArrow(parts.nextButton, parts.captions[index + NEXT_STEP]);
}

function scrollToPhoto(parts: LightboxParts, index: number, behavior: ScrollBehavior): void {
  const lastIndex = parts.links.length - 1;
  const targetIndex = Math.min(Math.max(index, 0), lastIndex);
  parts.track.scrollTo({ left: targetIndex * parts.track.clientWidth, behavior });
}

function stepBy(parts: LightboxParts, step: number): void {
  const behavior = window.matchMedia(REDUCED_MOTION).matches ? 'instant' : 'smooth';
  scrollToPhoto(parts, currentIndex(parts) + step, behavior);
}

function openPhoto(parts: LightboxParts, index: number, event: Event): void {
  event.preventDefault();
  parts.dialog.showModal();
  scrollToPhoto(parts, index, 'instant');
  markCurrent(parts);
}

function handleKey(parts: LightboxParts, event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') stepBy(parts, PREVIOUS_STEP);
  if (event.key === 'ArrowRight') stepBy(parts, NEXT_STEP);
}

/** Нажатие мимо фото и кнопок закрывает окно. */
function closeOnBackdrop(parts: LightboxParts, event: MouseEvent): void {
  const target = event.target as Element;
  if (!target.closest('img, button')) parts.dialog.close();
}

/** Пока лента едет, точку обновляем не чаще одного раза на кадр. */
function watchScroll(parts: LightboxParts): void {
  let isScheduled = false;
  const update = (): void => {
    isScheduled = false;
    markCurrent(parts);
  };
  const schedule = (): void => {
    if (isScheduled) return;
    isScheduled = true;
    requestAnimationFrame(update);
  };
  parts.track.addEventListener('scroll', schedule, { passive: true });
}

function initLightbox(): void {
  const parts = findParts();
  if (!parts) return;
  parts.links.forEach((link, index) => link.addEventListener('click', (event) => openPhoto(parts, index, event)));
  parts.previousButton.addEventListener('click', () => stepBy(parts, PREVIOUS_STEP));
  parts.nextButton.addEventListener('click', () => stepBy(parts, NEXT_STEP));
  parts.closeButton.addEventListener('click', () => parts.dialog.close());
  parts.dialog.addEventListener('keydown', (event) => handleKey(parts, event));
  parts.dialog.addEventListener('click', (event) => closeOnBackdrop(parts, event));
  watchScroll(parts);
}

initLightbox();
