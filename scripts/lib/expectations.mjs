// Что и где должно стоять на собранной странице: селектор → ожидаемые тексты по порядку.
// Так проверяется не только «строка есть», но и «строка на своём месте».
import { stripMarkers } from './content.mjs';

/** Одна привязка: элементы по селектору (их текст или атрибут) должны совпасть со списком по порядку. */
function binding(what, selector, expected, attribute = null) {
  return { what, selector, expected, attribute };
}

function headingBindings(t, name) {
  // Порядок секций на странице и разделов в шапке — см. src/components/HomePage.astro.
  const sections = [t.reviews, t.menu, t.story, t.gallery, { label: t.menu.fullLabel, title: t.menu.fullTitle }, t.reservations, t.family];
  const navLabels = [t.reviews, t.menu, t.story, t.gallery, t.reservations].map((section) => section.label);
  return [
    binding('разделы в шапке', '.site-header__links-link', navLabels),
    binding('разделы в меню телефона', '.mobile-menu__links-link', navLabels),
    binding('разделы в подвале', '.site-footer__sections-link', navLabels),
    binding('кнопка меню', '.site-header__menu span', [t.menu.label]),
    binding('главный заголовок', 'h1', [name]),
    binding('заголовки секций', 'h2', sections.map((section) => section.title)),
    binding('надписи секций', '.section-heading > .label', sections.map((section) => section.label)),
  ];
}

function heroBindings(t, shared, info) {
  return [
    binding('надпись первого экрана', '.hero__intro .label', [t.hero.label]),
    binding('итальянская цитата', '.hero__quote-italian', [shared.quoteItalian]),
    binding('перевод цитаты', '.hero__quote-translation', info.showsQuoteTranslation ? [t.hero.quoteTranslation] : []),
    binding('кнопки первого экрана', '.hero__actions .button__label', [t.hero.bookNow, t.hero.viewMenu]),
    binding('подпись главного фото', '.hero__photo img', [t.hero.imageAlt], 'alt'),
    binding('нижняя панель', '.bottom-bar .button__label', [t.bar.whatsapp, t.bar.call]),
  ];
}

function storyBindings(t) {
  const paragraphs = [...t.story.paragraphs, t.story.chef].map(stripMarkers);
  return [binding('абзацы истории', '.story__paragraph', paragraphs)];
}

function categoryBindings(t, shared, categoryNames) {
  const keys = Object.keys(shared.categories);
  return [
    binding('названия категорий', '.menu-categories__name', keys.map((key) => categoryNames[key])),
    binding('тексты категорий', '.menu-categories__text', keys.map((key) => t.menu.categories[key].text)),
    binding('подписи фото категорий', '.menu-categories__photo img', keys.map((key) => t.menu.categories[key].alt), 'alt'),
  ];
}

function reviewBindings(t, shared) {
  const platforms = ['google', 'tripadvisor'];
  return [
    binding('текст отзывов', '.reviews .prose', [t.reviews.text]),
    binding('площадки', '.rating__platform', platforms.map((key) => shared.reviews[key].platform)),
    binding('оценки', '.rating__score', platforms.map((key) => shared.reviews[key].score)),
    binding('число отзывов', '.rating__count', platforms.map((key) => t.reviews[key].count)),
    binding('ссылки на отзывы', '.rating__link .button__label', platforms.map((key) => t.reviews[key].link)),
  ];
}

function galleryBindings(t) {
  return [
    binding('текст галереи', '.gallery .prose', [t.gallery.text]),
    binding('подписи фото галереи', '.gallery__tile img', t.gallery.alts, 'alt'),
    binding('подписи увеличенных фото', '.lightbox__caption', t.gallery.alts),
    binding('подписи увеличенных фото для экранных читалок', '.lightbox__image', t.gallery.alts, 'alt'),
  ];
}

/** Списки формы: первой строкой подсказка, дальше варианты. Список дат строит скрипт в браузере. */
function formOptionBindings(form, timeLabels, guestCounts) {
  return [
    binding('подсказки полей', '.form-field__control[placeholder]', [form.name.placeholder, form.requests.placeholder], 'placeholder'),
    binding('список дат', '#booking-date option', [form.date.placeholder]),
    binding('список времени', '#booking-time option', [form.time.placeholder, ...timeLabels]),
    binding('список гостей', '#booking-guests option', [form.guests.placeholder, ...guestCounts]),
  ];
}

function reservationBindings(t, shared) {
  const { reservations } = t;
  const fields = Object.values(reservations.form).filter((field) => typeof field === 'object');
  return [
    binding('тексты брони', '.reservations .prose > p', [reservations.intro, reservations.howTo]),
    binding('дни работы', '.reservations__hours .opening-hours__days', reservations.hours.map((row) => row.days)),
    binding('часы работы', '.reservations__hours .opening-hours__time', reservations.hours.map((row) => row.time)),
    binding('примечание о брони', '.reservations__note', [reservations.note]),
    binding('подписи полей', '.form-field__label', fields.map((field) => field.label)),
    binding('кнопка формы', '.reservation-form__submit .button__label', [reservations.form.submit]),
    binding('подсказка формы', '.reservation-form__hint', [reservations.form.hint]),
    binding('адрес', '.contact-list__address', [reservations.address]),
    binding('кнопки контактов', '.contact-list__buttons .button__label', [reservations.call, reservations.maps]),
    binding('соцсети', '.contact-list__social .button__label', [shared.social.instagram, shared.social.facebook]),
    binding('QR: заголовок', '.whatsapp-qr__title', [reservations.qr.title]),
    binding('QR: текст', '.whatsapp-qr__text', [reservations.qr.text]),
    binding('QR: подпись картинки', '.whatsapp-qr__image', [reservations.qr.alt], 'aria-label'),
  ];
}

function familyBindings(t) {
  const cards = [t.family.dolce, t.family.pasta];
  return [
    binding('текст Family', '.family .prose', [t.family.text]),
    binding('заголовки карточек', '.family-card h3', cards.map((card) => card.title)),
    binding('строки карточек', '.family-card__tagline', cards.map((card) => card.tagline)),
    binding('часы карточек', '.family-card__hours', cards.map((card) => card.hours)),
    binding('тексты карточек', '.family-card__body > p', cards.map((card) => card.text)),
    binding('кнопки карточек', '.family-card__button .button__label', cards.map((card) => card.button)),
    binding('подписи логотипов', '.family-card__logo img', cards.map((card) => card.logoAlt), 'alt'),
    binding('строка под карточками', '.family__closing', [t.family.closing]),
    binding('строка подвала', '.site-footer__tagline', [t.footer.tagline]),
  ];
}

export function pageBindings({ dictionary, shared, info, name, timeLabels, guestCounts, categoryNames }) {
  return [
    ...formOptionBindings(dictionary.reservations.form, timeLabels, guestCounts),
    ...headingBindings(dictionary, name),
    ...heroBindings(dictionary, shared, info),
    ...storyBindings(dictionary),
    ...categoryBindings(dictionary, shared, categoryNames),
    ...reviewBindings(dictionary, shared),
    ...galleryBindings(dictionary),
    ...reservationBindings(dictionary, shared),
    ...familyBindings(dictionary),
  ];
}

/** Что разрешено в разметке для поиска и в <head>: всё остальное — выдуманные или лишние данные. */
export const ALLOWED_SCHEMA_KEYS = [
  '@context',
  '@graph',
  '@type',
  '@id',
  'name',
  'description',
  'url',
  'inLanguage',
  'publisher',
  'isPartOf',
  'about',
  'mainEntityOfPage',
  'image',
  'telephone',
  'servesCuisine',
  'address',
  'streetAddress',
  'addressLocality',
  'addressRegion',
  'postalCode',
  'addressCountry',
  'hasMap',
  'openingHoursSpecification',
  'dayOfWeek',
  'opens',
  'closes',
  'acceptsReservations',
  'sameAs',
  'hasMenu',
  'hasMenuSection',
  'hasMenuItem',
  'offers',
  'price',
  'priceCurrency',
  'department',
];

export const ALLOWED_META = [
  'viewport',
  'description',
  'robots',
  'twitter:card',
  'theme-color',
  'og:type',
  'og:site_name',
  'og:title',
  'og:description',
  'og:url',
  'og:image',
  'og:image:width',
  'og:image:height',
  'og:image:alt',
  'og:locale',
  'og:locale:alternate',
];

export const ALLOWED_CSS_CONTENT = ['', '·'];
