import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBookingMessage, buildWhatsAppUrl } from '../../src/scripts/booking/message.ts';

const REQUEST = {
  name: 'Anna',
  date: 'Wednesday, 7 October 2026',
  time: '7:30 PM',
  guests: '2',
  requests: 'Anniversary',
};

test('сообщение собрано по шаблону из texts.md', () => {
  const expected = [
    'Ciao Giulietta e Romeo,',
    '',
    'I would like to book a table.',
    '',
    'Name: Anna',
    'Date: Wednesday, 7 October 2026',
    'Time: 7:30 PM',
    'Number of Guests: 2',
    'Special Requests: Anniversary',
    '',
    'Thank you.',
  ].join('\n');
  assert.equal(buildBookingMessage(REQUEST), expected);
});

test('ссылка на WhatsApp несёт сообщение целиком', () => {
  const url = new URL(buildWhatsAppUrl('https://wa.me/66611971080', buildBookingMessage(REQUEST)));
  assert.equal(url.origin + url.pathname, 'https://wa.me/66611971080');
  assert.equal(url.searchParams.get('text'), buildBookingMessage(REQUEST));
});
