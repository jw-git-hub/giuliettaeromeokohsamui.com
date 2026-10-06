import type { APIRoute } from 'astro';
import { IS_DEMO } from '@/config/env';
import { PRODUCTION_SITE } from '@/config/site.mjs';

// Демо-сборка закрыта от поиска целиком: иначе в поиске появится копия сайта владелицы.
const DEMO_RULES = ['User-agent: *', 'Disallow: /'];

// Роботы ИИ-ассистентов и ИИ-поиска названы по именам: сайт открыт им намеренно, чтобы ресторан
// попадал в их ответы. Общее правило это и так разрешает; отдельная запись — чтобы решение
// не потерялось, если общее правило когда-нибудь ужесточат.
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'Google-Extended', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot'];

const PUBLIC_RULES = [
  'User-agent: *',
  'Allow: /',
  '',
  ...AI_CRAWLERS.map((crawler) => `User-agent: ${crawler}`),
  'Allow: /',
  '',
  `Sitemap: ${PRODUCTION_SITE}/sitemap.xml`,
];

export const GET: APIRoute = () => {
  const rules = IS_DEMO ? DEMO_RULES : PUBLIC_RULES;
  return new Response(`${rules.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
