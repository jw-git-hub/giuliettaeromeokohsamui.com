// Меню для страницы: названия и цены — всегда из content/menu.json,
// описания и заголовки разделов — из перевода языка.
import menuSource from '@content/menu.json';
import { DEFAULT_LOCALE, getLocaleInfo, type LocaleCode } from '@/i18n';
import { typesetStrings } from '@/i18n/typography';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  /** На картинке меню у позиции стоит буква V. */
  hasVMark: boolean;
}

export interface MenuGroup {
  id: string;
  title: string | null;
  items: MenuItem[];
}

export interface MenuSection {
  id: string;
  title: string;
  groups: MenuGroup[];
}

export interface MenuTranslation {
  sections: Record<string, { title: string; navLabel: string }>;
  groups: Record<string, string>;
  items: Record<string, string>;
}

type SourceSection = (typeof menuSource.sections)[number];
type SourceGroup = SourceSection['groups'][number];

const TRIAL_STATUS = 'trial';

const translationModules = import.meta.glob<MenuTranslation>('../i18n/menu/*.json', {
  eager: true,
  import: 'default',
});

function assertSameKeys(expectedKeys: string[], actualKeys: string[], what: string): void {
  const missingKeys = expectedKeys.filter((key) => !actualKeys.includes(key));
  const extraKeys = actualKeys.filter((key) => !expectedKeys.includes(key));
  if (missingKeys.length > 0) throw new Error(`Перевод меню: нет ${what} — ${missingKeys.join(', ')}`);
  if (extraKeys.length > 0) throw new Error(`Перевод меню: лишние ${what} — ${extraKeys.join(', ')}`);
}

function assertCompleteTranslation(translation: MenuTranslation): void {
  const groups = menuSource.sections.flatMap((section) => section.groups);
  const titledGroupIds = groups.filter((group) => group.title !== null).map((group) => group.id);
  const itemIds = groups.flatMap((group) => group.items.map((item) => item.id));
  const sectionIds = menuSource.sections.map((section) => section.id);
  assertSameKeys(sectionIds, Object.keys(translation.sections), 'разделов');
  assertSameKeys(titledGroupIds, Object.keys(translation.groups), 'групп');
  assertSameKeys(itemIds, Object.keys(translation.items), 'позиций');
}

function loadTranslation(locale: LocaleCode): MenuTranslation | undefined {
  if (locale === DEFAULT_LOCALE) return undefined;
  const translation = translationModules[`../i18n/menu/${locale}.json`];
  const isTrial = getLocaleInfo(locale).status === TRIAL_STATUS;
  if (translation === undefined && isTrial) return undefined;
  if (translation === undefined) throw new Error(`Нет перевода меню для языка «${locale}»`);
  assertCompleteTranslation(translation);
  return typesetStrings(locale, translation);
}

function toGroup(group: SourceGroup, translation?: MenuTranslation): MenuGroup {
  return {
    id: group.id,
    title: group.title === null ? null : (translation?.groups[group.id] ?? group.title),
    items: group.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: translation?.items[item.id] ?? item.description,
      price: item.price,
      hasVMark: item.v,
    })),
  };
}

function toSection(section: SourceSection, translation?: MenuTranslation): MenuSection {
  return {
    id: section.id,
    title: translation?.sections[section.id].title ?? section.title,
    groups: section.groups.map((group) => toGroup(group, translation)),
  };
}

export function getMenu(locale: LocaleCode): MenuSection[] {
  const translation = loadTranslation(locale);
  return menuSource.sections.map((section) => toSection(section, translation));
}

/** Куда ведёт плитка категории: ключ — название категории строчными. */
export function getCategoryTarget(categoryKey: string): string {
  const link = menuSource.categoryLinks.find((candidate) => candidate.category.toLowerCase() === categoryKey);
  if (!link) throw new Error(`В menu.json нет ссылки для категории «${categoryKey}»`);
  return link.target;
}
