// Постоянные данные ресторана: ссылки, телефон, часы, правила брони.
// Источник — content/texts.md. Метки отслеживания у ссылок на соцсети убраны.

export const PHONE_HREF = 'tel:+66611971080';
export const PHONE_E164 = '+66611971080';
export const WHATSAPP_URL = 'https://wa.me/66611971080';
export const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Giulietta%20e%20Romeo%2C%2083%2F46%20Moo%202%2C%20Chaweng%20Beach%2C%20Bophut%2C%20Koh%20Samui%2C%20Surat%20Thani%2084320';
export const TRIPADVISOR_URL =
  'https://www.tripadvisor.com.au/Restaurant_Review-g676072-d8093590-Reviews-Giulietta_e_Romeo-Chaweng_Bophut_Ko_Samui_Surat_Thani_Province.html';
export const INSTAGRAM_URL = 'https://www.instagram.com/giuliettaeromeosamui';
export const FACEBOOK_URL = 'https://www.facebook.com/share/18aerxf18h/';
export const LA_DOLCE_VITA_URL = 'https://www.instagram.com/la.dolce.vita.samui/';
export const LA_PASTA_URL = 'https://www.instagram.com/la.pasta.samui/';

/** Якоря секций. Якоря la-dolce-vita и la-pasta — как в оригинале. */
export const ANCHORS = {
  main: 'main',
  story: 'story',
  menu: 'menu',
  fullMenu: 'full-menu',
  reviews: 'reviews',
  gallery: 'gallery',
  reservations: 'reservations',
  family: 'family',
  dolce: 'la-dolce-vita',
  pasta: 'la-pasta',
  footerNav: 'site-nav',
} as const;

export interface TimeSlot {
  /** Уходит в сообщение WhatsApp — всегда по-английски. */
  value: string;
  /** Показывается на языках с 24-часовым временем. */
  label24: string;
}

export const TIME_SLOTS: TimeSlot[] = [
  { value: '6:00 PM', label24: '18:00' },
  { value: '6:30 PM', label24: '18:30' },
  { value: '7:00 PM', label24: '19:00' },
  { value: '7:30 PM', label24: '19:30' },
  { value: '8:00 PM', label24: '20:00' },
  { value: '8:30 PM', label24: '20:30' },
  { value: '9:00 PM', label24: '21:00' },
  { value: '9:30 PM', label24: '21:30' },
];

export const GUESTS_MIN = 1;
export const GUESTS_MAX = 8;

/** Правила списка дат в форме брони — см. «Как работает форма брони» в texts.md. */
export const BOOKING_RULES = {
  timeZone: 'Asia/Bangkok',
  firstDate: '2026-10-07',
  optionsCount: 10,
  /** 1 — понедельник, 2 — вторник (нумерация Date.getUTCDay). */
  closedWeekdays: [1, 2],
} as const;

/** Часы для разметки поиска: среда–воскресенье, 18:00–22:00. */
export const OPENING_HOURS = {
  days: ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  opens: '18:00',
  closes: '22:00',
} as const;
