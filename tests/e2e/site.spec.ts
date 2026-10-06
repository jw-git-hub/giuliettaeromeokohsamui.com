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

    test('область нажатия у кнопок и ссылок-действий не меньше 44 px', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await page.goto(pagePath(locale));
      const smallTargets = await page.evaluate((minSize) => {
        const selector = '.button, .lang-switcher__link, .site-footer__link, .form-field__control, .gallery__tile';
        return Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter((element) => element.offsetParent !== null)
          .map((element) => ({ text: element.textContent?.trim().slice(0, 30), box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.height < minSize)
          .map(({ text, box }) => `${text}: ${Math.round(box.height)}`);
      }, MIN_TAP_SIZE);
      expect(smallTargets).toEqual([]);
    });

    test('форма брони открывает WhatsApp с английским сообщением', async ({ page }) => {
      await page.goto(pagePath(locale));
      await page.evaluate(() => {
        window.open = (url) => {
          (window as unknown as { openedUrl: string }).openedUrl = String(url);
          return window;
        };
      });
      await page.fill('#booking-name', 'Anna Rossi');
      await page.selectOption('#booking-date', { index: 1 });
      await page.selectOption('#booking-time', '7:30 PM');
      await page.selectOption('#booking-guests', '3');
      await page.fill('#booking-requests', 'Window table');
      const chosenDate = await page.locator('#booking-date').inputValue();
      await page.locator('.reservation-form button[type="submit"]').click();
      const openedUrl = new URL(await page.evaluate(() => (window as unknown as { openedUrl: string }).openedUrl));
      expect(openedUrl.origin + openedUrl.pathname).toBe('https://wa.me/66611971080');
      expect(openedUrl.searchParams.get('text')).toBe(EXPECTED_MESSAGE(chosenDate));
      expect(chosenDate).toMatch(/^[A-Z][a-z]+day, \d{1,2} [A-Z][a-z]+ 20\d\d$/);
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

    test('фото галереи увеличивается по нажатию и закрывается', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(pagePath(locale));
      await page.locator('.gallery__tile').first().click();
      const dialog = page.locator('[data-lightbox]');
      await expect(dialog).toHaveAttribute('open', '');
      await expect(dialog.locator('img')).toHaveAttribute('src', /\.webp$/);
      await page.keyboard.press('ArrowRight');
      await expect(dialog.locator('figcaption')).not.toBeEmpty();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toHaveAttribute('open', '');
    });

    test('шапка на компьютере: якоря ведут к секциям, бронь помещается в один экран', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(pagePath(locale));
      await page.locator('.site-header__link[href="#reservations"]').click();
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
  await context.close();
});
