// Разметка внутри строк словаря: {метка}текст{/метка}. HTML в словарях не храним.

export interface RichTextSegment {
  text: string;
  /** Имя метки; у обычного текста его нет. */
  tag?: string;
}

const MARKER_PATTERN = /\{(\w+)\}(.*?)\{\/\1\}/g;

export function parseRichText(source: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let cursor = 0;
  for (const match of source.matchAll(MARKER_PATTERN)) {
    if (match.index > cursor) segments.push({ text: source.slice(cursor, match.index) });
    segments.push({ text: match[2], tag: match[1] });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor) });
  return segments;
}

export function stripRichText(source: string): string {
  return source.replace(MARKER_PATTERN, '$2');
}
