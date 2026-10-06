import { expect, test, type Page } from '@playwright/test';
import { BUILT_LOCALES, VIEWPORTS, htmlLang, pagePath } from './locales';

// Приёмка из DESIGN.md, раздел 9 — то, что можно проверить автоматически.

const MIN_TAP_SIZE = 44;
const SCROLL_SETTLE_MS = 500;
const EXPECTED_MESSAGE = (date: string) =>
  [
    'Ciao Giulietta e Romeo,',
    '',
    'I would like to book a table.',
    '',
    'Name: Anna Rossi',
    `Date: ${date}`,
    'Time: 7:30 PM',
    'Number of Guests: 3',
    'Special Requests: Window table',
    '',
    'Thank you.',
  ].join('\n');

async function jumpTo(page: Page, selector: string): Promise<void> {
  await page.locator(selector).evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.waitForTimeout(SCROLL_SETTLE_MS);
}

for (const locale of BUILT_LOCALES) {
  test.describe(`язык ${locale}`, () => {
    test('один h1 — название ресторана; у страницы свой lang', async ({ page }) => {
      await page.goto(pagePath(locale));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Giulietta e Romeo');
      await expect(page.locator('html')).toHaveAttribute('lang', htmlLang(locale));
    });

    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`нет горизонтальной прокрутки и обрезанных кнопок — ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(pagePath(locale));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const clippedButtons = await page.evaluate(() =>
          Array.from(document.querySelectorAll<HTMLElement>('.button'))
            .filter((button) => button.offsetParent !== null && button.scrollWidth > button.clientWidth + 1)
            .map((button) => button.textContent?.trim()),
        );
        expect(clippedButtons).toEqual([]);
      });
    }

    test('на самом узком экране текст не выходит за свой блок и не наезжает на соседний', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.small);
      await page.goto(pagePath(locale));
      const overflowing = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('main :is(p, h1, h2, h3, h4, li, dt, dd), footer :is(p, li, dt, dd)'))
          .filter((element) => element.offsetParent !== null && element.scrollWidth > element.clientWidth + 1)
          .map((element) => `${element.className || element.tagName}: ${element.textContent?.trim().slice(0, 40)}`),
      );
      expect(overflowing).toEqual([]);
    });

    test('область нажатия у кнопок и ссылок-действий не меньше 44 px', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await page.goto(pagePath(locale));
      const smallTargets = await page.evaluate((minSize) => {
        const selector =
          '.button, .lang-switcher__link, .site-footer__link, .site-footer__sections-link, .site-header__menu, .form-field__control, .gallery__tile';
        return Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter((element) => element.offsetParent !== null)
          .map((element) => ({ text: element.textContent?.trim().slice(0, 30), box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.height < minSize)
          .map(({ text, box }) => `${text}: ${Math.round(box.height)}`);
      }, MIN_TAP_SIZE);
      expect(smallTargets).toEqual([]);
    });

    test('форма брони открывает WhatsApp один раз, с английским сообщением; сайт остаётся открытым', async ({ page, context }) => {
      await context.route('https://wa.me/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title>' }));
      await page.goto(pagePath(locale));
      await page.fill('#booking-name', 'Anna Rossi');
      await page.selectOption('#booking-date', { index: 1 });
      await page.selectOption('#booking-time', '7:30 PM');
      await page.selectOption('#booking-guests', '3');
      await page.fill('#booking-requests', 'Window table');
      const chosenDate = await page.locator('#booking-date').inputValue();
      const whatsappTab = context.waitForEvent('page');
      await page.locator('.reservation-form button[type="submit"]').click();
      const openedUrl = new URL((await whatsappTab).url());
      expect(openedUrl.origin + openedUrl.pathname).toBe('https://wa.me/66611971080');
      expect(openedUrl.searchParams.get('text')).toBe(EXPECTED_MESSAGE(chosenDate));
      expect(chosenDate).toMatch(/^[A-Z][a-z]+day, \d{1,2} [A-Z][a-z]+ 20\d\d$/);
      await page.waitForTimeout(SCROLL_SETTLE_MS);
      expect(context.pages()).toHaveLength(2);
      expect(new URL(page.url()).pathname).toBe(pagePath(locale));
    });

    test('жирности текста — только те, что есть в файлах шрифтов (scripts/make-fonts.mjs)', async ({ page }) => {
      await page.goto(pagePath(locale));
      const unexpected = await page.evaluate(
        ({ displayFamily, displayWeights, textWeights }) => {
          const withText = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((element) =>
            Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
          );
          const used = withText.map((element) => {
            const style = getComputedStyle(element);
            return { isDisplay: style.fontFamily.startsWith(`"${displayFamily}"`), weight: style.fontWeight, tag: element.className || element.tagName };
          });
          return used
            .filter(({ isDisplay, weight }) => !(isDisplay ? displayWeights : textWeights).includes(weight))
            .map(({ tag, weight }) => `${tag}: ${weight}`);
        },
        { displayFamily: 'Bodoni Moda Variable', displayWeights: ['400'], textWeights: ['400', '600'] },
      );
      expect([...new Set(unexpected)]).toEqual([]);
    });

    test('гостей можно выбрать от 1 до 8; год в списке дат — григорианский', async ({ page }) => {
      await page.goto(pagePath(locale));
      const guests = await page.locator('#booking-guests option:not([value=""])').allTextContents();
      expect(guests).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
      const dateLabels = await page.locator('#booking-date option:not([value=""])').allTextContents();
      expect(dateLabels).toHaveLength(10);
      dateLabels.forEach((label) => expect(label).toMatch(/20\d\d/));
    });

    test('нижняя панель: видна в тексте, прячется у формы, не закрывает подвал', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await page.goto(pagePath(locale));
      const bar = page.locator('[data-bottom-bar]');
      await jumpTo(page, '#story');
      await expect(bar).toHaveAttribute('data-visible', '');
      await jumpTo(page, '.reservation-form');
      await expect(bar).not.toHaveAttribute('data-visible', '');
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(SCROLL_SETTLE_MS);
      const footerBottom = await page.locator('.site-footer').evaluate((footer) => footer.getBoundingClientRect().bottom);
      const barTop = await bar.evaluate((element) => element.getBoundingClientRect().top);
      expect(footerBottom).toBeLessThanOrEqual(barTop + 1);
    });

    test('меню на телефоне: открывается, показывает разделы и языки, ведёт к разделу и закрывается', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(pagePath(locale));
      const menu = page.locator('[data-mobile-menu]');
      await page.locator('.site-header__menu').click();
      await expect(menu).toHaveAttribute('open', '');
      await expect(menu.locator('.mobile-menu__links-link')).toHaveCount(5);
      await expect(menu.locator('.lang-switcher__link')).toHaveCount(BUILT_LOCALES.length);
      await menu.locator('a[href="#gallery"]').click();
      await expect(menu).not.toHaveAttribute('open', '');
      await page.waitForTimeout(SCROLL_SETTLE_MS);
      await expect(page.locator('#gallery h2')).toBeInViewport();
    });

    test('на компьютере кнопки «Menu» нет, разделы стоят в шапке', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(pagePath(locale));
      await expect(page.locator('.site-header__menu')).toBeHidden();
      await expect(page.locator('.site-header__links-link').first()).toBeVisible();
    });

    test('фото галереи увеличивается по нажатию, листается стрелками и закрывается', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(pagePath(locale));
      await page.locator('.gallery__tile').first().click();
      const dialog = page.locator('[data-lightbox]');
      await expect(dialog).toHaveAttribute('open', '');
      await expect(dialog.locator('img').first()).toHaveAttribute('src', /\.webp$/);
      await expect(dialog.locator('[data-lightbox-dot]').nth(0)).toHaveAttribute('data-current', '');
      await expect(dialog.locator('[data-lightbox-previous]')).toBeHidden();
      await page.keyboard.press('ArrowRight');
      await expect(dialog.locator('[data-lightbox-dot]').nth(1)).toHaveAttribute('data-current', '');
      await dialog.locator('[data-lightbox-next]').click();
      await expect(dialog.locator('[data-lightbox-dot]').nth(2)).toHaveAttribute('data-current', '');
      await expect(dialog.locator('figcaption').nth(2)).toBeInViewport();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toHaveAttribute('open', '');
    });

    test('на телефоне фото листаются пальцем: точка следует за фото, подпись и точки не прыгают', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await page.goto(pagePath(locale));
      await page.locator('.gallery__tile').nth(4).click();
      const dialog = page.locator('[data-lightbox]');
      const dots = dialog.locator('[data-lightbox-dot]');
      await expect(dots.nth(4)).toHaveAttribute('data-current', '');
      await expect(dialog.locator('[data-lightbox-next]')).toBeHidden();
      // Сдвиг ленты на одно фото — то же, что делает палец.
      await dialog.locator('[data-lightbox-track]').evaluate((track) => track.scrollBy({ left: track.clientWidth, behavior: 'instant' }));
      await expect(dots.nth(5)).toHaveAttribute('data-current', '');
      const layout = await dialog.evaluate((element) => {
        const tops = (selector: string) =>
          Array.from(element.querySelectorAll(selector), (node) => Math.round(node.getBoundingClientRect().top));
        return { captions: [...new Set(tops('figcaption'))], images: [...new Set(tops('img'))] };
      });
      expect(layout.captions).toHaveLength(1);
      expect(layout.images).toHaveLength(1);
    });

    test('шапка на компьютере: якоря ведут к секциям, бронь помещается в один экран', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(pagePath(locale));
      await page.locator('.site-header__links-link[href="#reservations"]').click();
      await page.waitForTimeout(SCROLL_SETTLE_MS);
      const box = await page.locator('.reservations__inner').boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(72);
      expect(box!.y + box!.height).toBeLessThanOrEqual(VIEWPORTS.desktop.height);
    });
  });
}

test('без скриптов страница читается, форма ведёт в WhatsApp', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: VIEWPORTS.phone });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.menu-item')).toHaveCount(41);
  await expect(page.locator('.reservation-form')).toHaveAttribute('action', 'https://wa.me/66611971080');
  await expect(page.locator('[data-bottom-bar]')).toBeVisible();
  await expect(page.locator('#booking-date')).toBeHidden();
  // Кнопка «Menu» без скриптов ведёт к списку разделов в подвале.
  await expect(page.locator('.site-header__menu')).toHaveAttribute('href', '#site-nav');
  await expect(page.locator('#site-nav a')).toHaveCount(5);
  await context.close();
});
