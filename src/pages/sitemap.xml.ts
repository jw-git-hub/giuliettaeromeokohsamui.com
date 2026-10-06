import type { APIRoute } from 'astro';
import { BUILD_LOCALES } from '@/i18n';
import { alternateLinks, canonicalUrl } from '@/i18n/urls';

// Общая карта сайта: по записи на каждую опубликованную языковую версию, со ссылками на остальные.
// Дата изменения — день сборки: сайт статический, новая выкладка и есть изменение страниц.
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;
const buildDate = new Date().toISOString().slice(0, ISO_DATE_LENGTH);

function toAlternateTags(): string {
  return alternateLinks()
    .map((link) => `    <xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${link.href}"/>`)
    .join('\n');
}

function toUrlEntry(location: string): string {
  return ['  <url>', `    <loc>${location}</loc>`, `    <lastmod>${buildDate}</lastmod>`, toAlternateTags(), '  </url>'].join('\n');
}

export const GET: APIRoute = () => {
  const entries = BUILD_LOCALES.map((locale) => toUrlEntry(canonicalUrl(locale)));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
  ].join('\n');
  return new Response(`${xml}\n`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
