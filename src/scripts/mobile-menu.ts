// Меню на весь экран для телефона и планшета. Кнопка «Menu» в шапке — обычная ссылка
// на список разделов в подвале; скрипт перехватывает нажатие и открывает <dialog>.
// Нажатие на раздел закрывает меню, и страница переходит к разделу.

const MENU_SELECTOR = '[data-mobile-menu]';
const OPEN_SELECTOR = '[data-mobile-menu-open]';
const CLOSE_SELECTOR = '[data-mobile-menu-close]';
const LINK_SELECTOR = 'a[href^="#"]';

function openMenu(menu: HTMLDialogElement, event: Event): void {
  event.preventDefault();
  menu.showModal();
}

function initMobileMenu(): void {
  const menu = document.querySelector<HTMLDialogElement>(MENU_SELECTOR);
  const opener = document.querySelector<HTMLElement>(OPEN_SELECTOR);
  if (!menu || !opener || typeof menu.showModal !== 'function') return;
  opener.addEventListener('click', (event) => openMenu(menu, event));
  menu.querySelector(CLOSE_SELECTOR)?.addEventListener('click', () => menu.close());
  menu.querySelectorAll(LINK_SELECTOR).forEach((link) => link.addEventListener('click', () => menu.close()));
}

initMobileMenu();
