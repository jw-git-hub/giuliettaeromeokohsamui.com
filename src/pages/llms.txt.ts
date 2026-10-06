import type { APIRoute } from 'astro';
import { buildLlmsText } from '@/data/llms-text';

// Карта сайта для ИИ-ассистентов (llms.txt). Содержание — src/data/llms-text.ts.
export const GET: APIRoute = () =>
  new Response(buildLlmsText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
