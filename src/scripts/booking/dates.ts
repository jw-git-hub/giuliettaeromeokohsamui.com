// Даты для формы брони. Чистые функции: «сейчас» приходит аргументом, чтобы их можно было проверять.
// Правила — content/texts.md, «Как работает форма брони».

export interface DateRules {
  /** Часовой пояс ресторана: «завтра» считается по нему, а не по часам гостя. */
  timeZone: string;
  /** Раньше этой даты (ГГГГ-ММ-ДД) бронь не предлагается. */
  firstDate: string;
  optionsCount: number;
  /** Дни недели, когда ресторан закрыт: 0 — воскресенье … 6 — суббота. */
  closedWeekdays: number[];
}

const MS_PER_DAY = 86_400_000;
const ENGLISH_LOCALE = 'en-GB';
const ISO_DATE_LOCALE = 'en-CA';
const UTC = 'UTC';
const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: UTC,
};

function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 'YYYY-MM-DD'.length);
}

function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(toUtcDate(isoDate).getTime() + days * MS_PER_DAY));
}

/** Сегодняшняя дата в часовом поясе ресторана, ГГГГ-ММ-ДД. */
export function todayInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(ISO_DATE_LOCALE, { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function isOpenOn(isoDate: string, closedWeekdays: number[]): boolean {
  return !closedWeekdays.includes(toUtcDate(isoDate).getUTCDay());
}

/** Ближайшие рабочие дни начиная с завтрашнего, но не раньше firstDate. */
export function listBookingDates(now: Date, rules: DateRules): string[] {
  const tomorrow = addDays(todayInTimeZone(now, rules.timeZone), 1);
  let candidate = tomorrow > rules.firstDate ? tomorrow : rules.firstDate;
  const dates: string[] = [];
  while (dates.length < rules.optionsCount) {
    if (isOpenOn(candidate, rules.closedWeekdays)) dates.push(candidate);
    candidate = addDays(candidate, 1);
  }
  return dates;
}

function partOf(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

/** Дата для сообщения в WhatsApp — всегда по-английски: «Wednesday, 7 October 2026».
    Собирается из частей: запятая у en-GB зависит от версии браузера. */
export function formatEnglishDate(isoDate: string): string {
  const parts = new Intl.DateTimeFormat(ENGLISH_LOCALE, LONG_DATE).formatToParts(toUtcDate(isoDate));
  return `${partOf(parts, 'weekday')}, ${partOf(parts, 'day')} ${partOf(parts, 'month')} ${partOf(parts, 'year')}`;
}

/** Дата для списка — на языке страницы. Для тайского в intlLocale задан григорианский календарь. */
export function formatLocalDate(isoDate: string, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, LONG_DATE).format(toUtcDate(isoDate));
}
