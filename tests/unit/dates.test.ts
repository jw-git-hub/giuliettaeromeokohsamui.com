import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatEnglishDate, formatLocalDate, listBookingDates, todayInTimeZone, type DateRules } from '../../src/scripts/booking/dates.ts';

const RULES: DateRules = {
  timeZone: 'Asia/Bangkok',
  firstDate: '2026-10-07',
  optionsCount: 10,
  closedWeekdays: [1, 2],
};

test('сегодня считается по времени Самуи, а не по UTC', () => {
  assert.equal(todayInTimeZone(new Date('2026-10-06T18:30:00Z'), RULES.timeZone), '2026-10-07');
  assert.equal(todayInTimeZone(new Date('2026-10-06T16:59:00Z'), RULES.timeZone), '2026-10-06');
});

test('список начинается с завтра и пропускает понедельник и вторник', () => {
  const dates = listBookingDates(new Date('2026-10-06T03:00:00Z'), RULES);
  assert.deepEqual(dates, [
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-10',
    '2026-10-11',
    '2026-10-14',
    '2026-10-15',
    '2026-10-16',
    '2026-10-17',
    '2026-10-18',
  ]);
});

test('раньше первой даты бронь не предлагается', () => {
  const dates = listBookingDates(new Date('2026-09-01T03:00:00Z'), RULES);
  assert.equal(dates[0], '2026-10-07');
});

test('бронь на сегодня не предлагается', () => {
  const dates = listBookingDates(new Date('2026-10-10T05:00:00Z'), RULES);
  assert.equal(dates[0], '2026-10-11');
  assert.equal(dates[1], '2026-10-14');
});

test('в списке всегда десять дат', () => {
  assert.equal(listBookingDates(new Date('2027-02-27T12:00:00Z'), RULES).length, RULES.optionsCount);
});

test('дата для сообщения — по-английски, как в texts.md', () => {
  assert.equal(formatEnglishDate('2026-10-07'), 'Wednesday, 7 October 2026');
  assert.equal(formatEnglishDate('2026-12-31'), 'Thursday, 31 December 2026');
});

test('тайская дата — с григорианским годом, а не 2569', () => {
  const thaiDate = formatLocalDate('2026-10-07', 'th-TH-u-ca-gregory');
  assert.match(thaiDate, /2026/);
  assert.doesNotMatch(thaiDate, /2569/);
});

test('русская и итальянская даты — на своих языках', () => {
  assert.match(formatLocalDate('2026-10-07', 'ru-RU'), /среда, 7 октября 2026/);
  assert.match(formatLocalDate('2026-10-07', 'it-IT'), /mercoledì 7 ottobre 2026/);
});
