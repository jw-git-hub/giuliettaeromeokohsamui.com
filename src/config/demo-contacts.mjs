// Заглушки телефона и WhatsApp для демо-сборки (решение John от 11.10.2026).
// Пробная версия открыта всем, и бронь или звонок с неё не должны уходить в ресторан.
// Боевая сборка на домене ресторана берёт настоящий номер и WhatsApp из restaurant.ts.
// Модуль на обычном JS: его читают и сайт, и проверка сборки (scripts/check-dist.mjs), и тесты.

/** Номер ресторана так, как он стоит в подписях словарей. Тексты словарей не меняются. */
export const RESTAURANT_PHONE_LABEL = '+66 (0) 61 197 1080';

export const DEMO_CONTACTS = {
  /** Номера с нулём сразу после кода Таиланда не бывает: звонок никуда не уйдёт. */
  phoneLabel: '+66 (0) 00 000 0000',
  phoneE164: '+66000000000',
  /** WhatsApp без номера: открывается готовое сообщение, получателя гость выбирает сам. */
  whatsappUrl: 'https://wa.me/',
};

/** В демо номер ресторана в строках словаря меняется на заглушку — до типографики языка. */
export function withDemoPhone(value) {
  if (typeof value === 'string') return value.replaceAll(RESTAURANT_PHONE_LABEL, DEMO_CONTACTS.phoneLabel);
  if (Array.isArray(value)) return value.map(withDemoPhone);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withDemoPhone(item)]));
  }
  return value;
}
