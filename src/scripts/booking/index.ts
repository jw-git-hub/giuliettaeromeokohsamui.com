// Форма брони: сервера нет — собираем сообщение в браузере и открываем WhatsApp.
// Без скриптов форма остаётся обычной ссылкой на чат (action формы).
import { formatEnglishDate, formatLocalDate, listBookingDates, type DateRules } from './dates';
import { buildBookingMessage, buildWhatsAppUrl, type BookingRequest } from './message';

const FORM_SELECTOR = '[data-booking-form]';

type BookingField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function findField(form: HTMLFormElement, name: string): BookingField {
  return form.querySelector<BookingField>(`[data-booking-field="${name}"]`)!;
}

function readRules(form: HTMLFormElement): DateRules {
  const { timeZone = '', firstDate = '', optionsCount = '', closedWeekdays = '' } = form.dataset;
  return {
    timeZone,
    firstDate,
    optionsCount: Number(optionsCount),
    closedWeekdays: closedWeekdays.split(',').map(Number),
  };
}

function fillDateOptions(form: HTMLFormElement): void {
  const select = findField(form, 'date');
  const intlLocale = form.dataset.intlLocale ?? '';
  listBookingDates(new Date(), readRules(form)).forEach((isoDate) => {
    select.append(new Option(formatLocalDate(isoDate, intlLocale), formatEnglishDate(isoDate)));
  });
  form.querySelector<HTMLElement>('[data-booking-wrapper="date"]')!.hidden = false;
}

function enableRequiredFields(form: HTMLFormElement): void {
  form.querySelectorAll<BookingField>('[data-required]').forEach((field) => {
    field.required = true;
  });
}

function readRequest(form: HTMLFormElement): BookingRequest {
  return {
    name: findField(form, 'name').value.trim(),
    date: findField(form, 'date').value,
    time: findField(form, 'time').value,
    guests: findField(form, 'guests').value,
    requests: findField(form, 'requests').value.trim(),
  };
}

function openWhatsApp(form: HTMLFormElement, event: SubmitEvent): void {
  event.preventDefault();
  const message = buildBookingMessage(readRequest(form));
  const url = buildWhatsAppUrl(form.dataset.whatsappUrl ?? form.action, message);
  const openedWindow = window.open(url, '_blank', 'noopener');
  if (openedWindow === null) window.location.href = url;
}

function initBookingForm(): void {
  const form = document.querySelector<HTMLFormElement>(FORM_SELECTOR);
  if (!form) return;
  fillDateOptions(form);
  enableRequiredFields(form);
  form.addEventListener('submit', (event) => openWhatsApp(form, event));
}

initBookingForm();
