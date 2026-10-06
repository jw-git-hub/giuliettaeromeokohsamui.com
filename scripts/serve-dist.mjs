// Простой сервер для dist/: отдаёт файлы как Apache на хостинге — текстовые со сжатием gzip.
// Нужен тестам и замеру веса: так цифры близки к тому, что получит гость.
// Запуск: node scripts/serve-dist.mjs [порт]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';

const DIST = 'dist';
const DEFAULT_PORT = 4322;
const NOT_FOUND = 404;
const OK = 200;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = ['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg'];

function resolveFile(urlPath) {
  const safePath = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(DIST, safePath);
  if (existsSync(candidate) && statSync(candidate).isDirectory()) return join(candidate, 'index.html');
  return candidate;
}

function sendFile(file, request, response) {
  const extension = extname(file);
  const headers = { 'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream' };
  const acceptsGzip = (request.headers['accept-encoding'] ?? '').includes('gzip');
  if (!COMPRESSIBLE.includes(extension) || !acceptsGzip) {
    response.writeHead(OK, headers);
    return createReadStream(file).pipe(response);
  }
  response.writeHead(OK, { ...headers, 'Content-Encoding': 'gzip' });
  return createReadStream(file).pipe(createGzip()).pipe(response);
}

function handleRequest(request, response) {
  const file = resolveFile(new URL(request.url, 'http://localhost').pathname);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(NOT_FOUND);
    return response.end('Not found');
  }
  return sendFile(file, request, response);
}

const port = Number(process.argv[2] ?? DEFAULT_PORT);
createServer(handleRequest).listen(port, () => console.log(`dist/ → http://localhost:${port}/`));
