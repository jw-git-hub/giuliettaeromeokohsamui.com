import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { BUILT_LOCALES, VIEWPORTS, pagePath } from './locales';

// Доступность: контраст, подписи, роли, структура заголовков — правила WCAG 2.1 AA.
for (const locale of BUILT_LOCALES) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`доступность — ${locale}, ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(pagePath(locale));
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = results.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.html.slice(0, 120)}`);
      expect(summary).toEqual([]);
    });
  }
}

test('с клавиатуры: первая остановка — ссылка «к содержанию», фокус виден', async ({ page, browserName }) => {
  // Safari по клавише Tab ходит только по полям форм; по ссылкам — Option+Tab (настройка системы по умолчанию).
  const tabKey = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto('/');
  await page.keyboard.press(tabKey);
  const focused = page.locator(':focus');
  await expect(focused).toHaveClass(/skip-link/);
  await expect(focused).toBeInViewport();
  await page.keyboard.press(tabKey);
  const outline = await page.locator(':focus').evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).toBe('solid');
});
