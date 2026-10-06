import shared from '@/i18n/shared.json';

const { first, conjunction, last } = shared.name;

/** Название ресторана одной строкой — для заголовка вкладки, карточки ссылки и разметки поиска. */
export const RESTAURANT_NAME = `${first} ${conjunction} ${last}`;
