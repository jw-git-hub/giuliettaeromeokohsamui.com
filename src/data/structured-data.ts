// Разметка для поиска и ИИ-ассистентов (JSON-LD): сайт, страница и ресторан одним связным графом.
// Только то, что есть в content/texts.md и меню: без оценок, координат, страны и цен
// (валюта цен в оригинале не указана).
import {
  ADDRESS_PARTS,
  ANCHORS,
  FACEBOOK_URL,
  INSTAGRAM_URL,
  LA_DOLCE_VITA_HOURS,
  LA_DOLCE_VITA_URL,
  LA_PASTA_URL,
  MAPS_URL,
  OPENING_HOURS,
  PHONE_E164,
  TRIPADVISOR_URL,
  type OpeningHours,
} from '@/config/restaurant';
import { PRODUCTION_SITE } from '@/config/site.mjs';
import { getMenu, type MenuSection } from '@/data/menu';
import { RESTAURANT_NAME } from '@/data/restaurant-name';
import { BUILD_LOCALES, DEFAULT_LOCALE, getLocaleInfo, type Dictionary, type LocaleCode } from '@/i18n';
import { canonicalUrl } from '@/i18n/urls';

const SCHEMA_CONTEXT = 'https://schema.org';
const WEBSITE_ID = `${PRODUCTION_SITE}/#website`;
const RESTAURANT_ID = `${PRODUCTION_SITE}/#restaurant`;
const CUISINE = 'Italian';

type FamilyCard = Dictionary['family']['dolce'];

function reference(id: string) {
  return { '@id': id };
}

function pageId(locale: LocaleCode): string {
  return `${canonicalUrl(locale)}#webpage`;
}

function toMenuSection(section: MenuSection) {
  const items = section.groups.flatMap((group) => group.items);
  return {
    '@type': 'MenuSection',
    name: section.title,
    hasMenuItem: items.map((item) => ({ '@type': 'MenuItem', name: item.name, description: item.description })),
  };
}

function buildMenu(locale: LocaleCode) {
  return {
    '@type': 'Menu',
    url: `${canonicalUrl(locale)}#${ANCHORS.fullMenu}`,
    inLanguage: getLocaleInfo(locale).htmlLang,
    hasMenuSection: getMenu(locale).map(toMenuSection),
  };
}

function buildOpeningHours(hours: OpeningHours) {
  return { '@type': 'OpeningHoursSpecification', dayOfWeek: hours.days, opens: hours.opens, closes: hours.closes };
}

/** La Dolce Vita и La Pasta — проекты того же ресторана по тому же адресу. */
function buildDepartment(locale: LocaleCode, card: FamilyCard, anchor: string, profileUrl: string, hours?: OpeningHours) {
  return {
    '@type': 'FoodEstablishment',
    name: card.title,
    description: card.text,
    url: `${canonicalUrl(locale)}#${anchor}`,
    sameAs: [profileUrl],
    ...(hours && { openingHoursSpecification: [buildOpeningHours(hours)] }),
  };
}

function buildDepartments(locale: LocaleCode, t: Dictionary) {
  return [
    buildDepartment(locale, t.family.dolce, ANCHORS.dolce, LA_DOLCE_VITA_URL, LA_DOLCE_VITA_HOURS),
    buildDepartment(locale, t.family.pasta, ANCHORS.pasta, LA_PASTA_URL),
  ];
}

function buildWebSite() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: canonicalUrl(DEFAULT_LOCALE),
    name: RESTAURANT_NAME,
    inLanguage: BUILD_LOCALES.map((code) => getLocaleInfo(code).htmlLang),
    publisher: reference(RESTAURANT_ID),
  };
}

function buildWebPage(locale: LocaleCode, t: Dictionary) {
  return {
    '@type': 'WebPage',
    '@id': pageId(locale),
    url: canonicalUrl(locale),
    name: t.meta.title,
    description: t.meta.description,
    inLanguage: getLocaleInfo(locale).htmlLang,
    isPartOf: reference(WEBSITE_ID),
    about: reference(RESTAURANT_ID),
  };
}

function buildRestaurant(locale: LocaleCode, t: Dictionary, imageUrls: string[]) {
  return {
    '@type': 'Restaurant',
    '@id': RESTAURANT_ID,
    name: RESTAURANT_NAME,
    description: t.meta.description,
    url: canonicalUrl(locale),
    mainEntityOfPage: reference(pageId(locale)),
    image: imageUrls,
    telephone: PHONE_E164,
    servesCuisine: CUISINE,
    address: { '@type': 'PostalAddress', ...ADDRESS_PARTS },
    hasMap: MAPS_URL,
    openingHoursSpecification: [buildOpeningHours(OPENING_HOURS)],
    acceptsReservations: true,
    sameAs: [INSTAGRAM_URL, FACEBOOK_URL, TRIPADVISOR_URL],
    hasMenu: buildMenu(locale),
    department: buildDepartments(locale, t),
  };
}

/** @param imageUrls полные адреса своих фото ресторана и картинки для мессенджеров. */
export function buildSiteSchema(locale: LocaleCode, t: Dictionary, imageUrls: string[]) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@graph': [buildWebSite(), buildWebPage(locale, t), buildRestaurant(locale, t, imageUrls)],
  };
}
