// Разметка Restaurant (JSON-LD) для поиска. Только то, что есть в content/texts.md и меню:
// без оценок, координат, страны и цен (валюта цен в оригинале не указана).
import {
  ANCHORS,
  FACEBOOK_URL,
  INSTAGRAM_URL,
  OPENING_HOURS,
  PHONE_E164,
} from '@/config/restaurant';
import { PRODUCTION_SITE } from '@/config/site.mjs';
import { getMenu, type MenuSection } from '@/data/menu';
import type { Dictionary, LocaleCode } from '@/i18n';
import shared from '@/i18n/shared.json';
import { canonicalUrl } from '@/i18n/urls';

const SCHEMA_CONTEXT = 'https://schema.org';
const RESTAURANT_ID = `${PRODUCTION_SITE}/#restaurant`;
const CUISINE = 'Italian';

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
    hasMenuSection: getMenu(locale).map(toMenuSection),
  };
}

function buildOpeningHours() {
  return {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: OPENING_HOURS.days,
    opens: OPENING_HOURS.opens,
    closes: OPENING_HOURS.closes,
  };
}

export function buildRestaurantSchema(locale: LocaleCode, t: Dictionary, imageUrl: string) {
  const { first, conjunction, last } = shared.name;
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Restaurant',
    '@id': RESTAURANT_ID,
    name: `${first} ${conjunction} ${last}`,
    description: t.meta.description,
    url: canonicalUrl(locale),
    image: imageUrl,
    telephone: PHONE_E164,
    servesCuisine: CUISINE,
    address: { '@type': 'PostalAddress', streetAddress: t.reservations.address },
    openingHoursSpecification: [buildOpeningHours()],
    acceptsReservations: true,
    sameAs: [INSTAGRAM_URL, FACEBOOK_URL],
    hasMenu: buildMenu(locale),
  };
}
