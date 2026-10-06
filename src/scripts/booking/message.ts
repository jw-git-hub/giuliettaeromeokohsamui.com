// Сообщение в WhatsApp. Всегда на английском: его читает персонал ресторана.
// Шаблон — content/texts.md, «Как работает форма брони»; сверяется скриптом check-content.

export interface BookingRequest {
  name: string;
  date: string;
  time: string;
  guests: string;
  requests: string;
}

export function buildBookingMessage(request: BookingRequest): string {
  return [
    'Ciao Giulietta e Romeo,',
    '',
    'I would like to book a table.',
    '',
    `Name: ${request.name}`,
    `Date: ${request.date}`,
    `Time: ${request.time}`,
    `Number of Guests: ${request.guests}`,
    `Special Requests: ${request.requests}`,
    '',
    'Thank you.',
  ].join('\n');
}

export function buildWhatsAppUrl(whatsappUrl: string, message: string): string {
  return `${whatsappUrl}?text=${encodeURIComponent(message)}`;
}
