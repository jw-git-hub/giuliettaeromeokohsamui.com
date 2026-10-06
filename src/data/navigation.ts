import { ANCHORS } from '@/config/restaurant';
import type { Dictionary } from '@/i18n';

export interface SectionLink {
  href: string;
  label: string;
}

/** Разделы страницы для шапки, меню на телефоне и подвала. Подписи — существующие надписи секций. */
export function getSectionLinks(t: Dictionary): SectionLink[] {
  return [
    { href: `#${ANCHORS.story}`, label: t.story.label },
    { href: `#${ANCHORS.menu}`, label: t.menu.label },
    { href: `#${ANCHORS.reviews}`, label: t.reviews.label },
    { href: `#${ANCHORS.gallery}`, label: t.gallery.label },
    { href: `#${ANCHORS.reservations}`, label: t.reservations.label },
  ];
}
