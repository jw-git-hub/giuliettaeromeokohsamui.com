// Текст файла llms.txt — короткая карта сайта для ИИ-ассистентов: кто это, где, когда открыто,
// как забронировать, что в меню. Собирается из английского словаря, меню и ссылок ресторана:
// ни одной фразы, которой нет на странице (это проверяет сборка). Цены — со знаком бата, как на странице.
// Буквы «V» здесь нет: на странице она стоит без расшифровки, а ИИ-ассистент додумал бы её смысл сам.
// Вернуть её можно, когда владелица ответит, что значит «V».
import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  LA_DOLCE_VITA_URL,
  LA_PASTA_URL,
  MAPS_URL,
  PHONE_HREF,
  TRIPADVISOR_URL,
  WHATSAPP_URL,
} from '@/config/restaurant';
import { formatPrice, getMenu, type MenuGroup, type MenuItem, type MenuSection } from '@/data/menu';
import { RESTAURANT_NAME } from '@/data/restaurant-name';
import { BUILD_LOCALES, DEFAULT_LOCALE, getDictionary, getLocaleInfo, type Dictionary } from '@/i18n';
import shared from '@/i18n/shared.json';
import { canonicalUrl } from '@/i18n/urls';

const MARKER_PATTERN = /\{\/?\w+\}/g;
const BLOCK_SEPARATOR = '\n\n';

type FamilyCard = Dictionary['family']['dolce'];

function link(label: string, url: string): string {
  return `- [${label}](${url})`;
}

function plain(richText: string): string {
  return richText.replace(MARKER_PATTERN, '');
}

function contactLines(t: Dictionary): string[] {
  const { reservations, reviews, bar } = t;
  return [
    `- ${reservations.addressLabel}: ${reservations.address}`,
    ...reservations.hours.map((row) => `- ${reservations.hoursLabel}: ${row.days}, ${row.time}`),
    `- ${reservations.note}`,
    link(reservations.call, PHONE_HREF),
    link(bar.whatsapp, WHATSAPP_URL),
    link(reservations.maps, MAPS_URL),
    link(reviews.tripadvisor.link, TRIPADVISOR_URL),
    link(shared.social.instagram, INSTAGRAM_URL),
    link(shared.social.facebook, FACEBOOK_URL),
  ];
}

function menuItemLine(item: MenuItem): string {
  return `- ${item.name}, ${formatPrice(item.price)}: ${item.description}`;
}

function menuGroupBlock(group: MenuGroup): string {
  const items = group.items.map(menuItemLine).join('\n');
  return group.title === null ? items : `#### ${group.title}\n\n${items}`;
}

function menuSectionBlock(section: MenuSection): string {
  return [`### ${section.title}`, ...section.groups.map(menuGroupBlock)].join(BLOCK_SEPARATOR);
}

function familyBlock(card: FamilyCard, url: string): string {
  return [`### ${card.title}`, '', `${card.tagline}. ${card.hours}.`, '', card.text, '', link(card.button, url)].join('\n');
}

function introBlocks(t: Dictionary): string[] {
  return [`# ${RESTAURANT_NAME}`, `> ${t.meta.description}`, t.footer.tagline];
}

function reservationBlocks(t: Dictionary): string[] {
  return [`## ${t.reservations.label}`, [t.reservations.howTo, '', ...contactLines(t)].join('\n')];
}

function storyBlocks(t: Dictionary): string[] {
  return [`## ${t.story.label}`, ...[...t.story.paragraphs, t.story.chef].map(plain)];
}

function menuBlocks(t: Dictionary): string[] {
  return [`## ${t.menu.fullTitle}`, ...getMenu(DEFAULT_LOCALE).map(menuSectionBlock)];
}

function familyBlocks(t: Dictionary): string[] {
  return [`## ${t.family.label}`, familyBlock(t.family.dolce, LA_DOLCE_VITA_URL), familyBlock(t.family.pasta, LA_PASTA_URL)];
}

function languageBlocks(t: Dictionary): string[] {
  const links = BUILD_LOCALES.map((locale) => link(getLocaleInfo(locale).label, canonicalUrl(locale)));
  return [`## ${t.a11y.language}`, links.join('\n')];
}

export function buildLlmsText(): string {
  const t = getDictionary(DEFAULT_LOCALE);
  const sections = [introBlocks, reservationBlocks, storyBlocks, menuBlocks, familyBlocks, languageBlocks];
  return `${sections.flatMap((toBlocks) => toBlocks(t)).join(BLOCK_SEPARATOR)}\n`;
}
