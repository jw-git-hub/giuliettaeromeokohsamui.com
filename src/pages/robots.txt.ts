import type { APIRoute } from 'astro';
import { IS_DEMO } from '@/config/env';
import { PRODUCTION_SITE } from '@/config/site.mjs';

// Демо-сборка закрыта от поиска целиком: иначе в поиске появится копия сайта владелицы.
const DEMO_RULES = ['User-agent: *', 'Disallow: /'];
const PUBLIC_RULES = ['User-agent: *', 'Allow: /', '', `Sitemap: ${PRODUCTION_SITE}/sitemap.xml`];

export const GET: APIRoute = () => {
  const rules = IS_DEMO ? DEMO_RULES : PUBLIC_RULES;
  return new Response(`${rules.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
