import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A dependency-free local server. Modules and textures stay on this computer.
const root = fileURLToPath(new URL('../', import.meta.url));
const preview = process.argv.includes('--preview');
const siteRoot = preview ? path.join(root, 'dist') : root;
const port = preview ? 4173 : 5173;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function resolveFile(urlPath) {
  // Allow only the published application paths, never .git or other local files.
  const routes = preview ? [
    ['/', siteRoot],
  ] : [
    ['/vendor/three/addons/', path.join(root, 'node_modules/three/examples/jsm')],
    ['/vendor/three/', path.join(root, 'node_modules/three/build')],
    ['/src/', path.join(root, 'src')],
  ];
  if (!preview && (urlPath === '/' || urlPath === '/index.html')) return path.join(root, 'index.html');
  if (!preview && urlPath === '/favicon.svg') return path.join(root, 'public/favicon.svg');
  for (const [prefix, directory] of routes) {
    if (!urlPath.startsWith(prefix)) continue;
    const suffix = urlPath.slice(prefix.length) || 'index.html';
    const resolved = path.resolve(directory, suffix);
    const relative = path.relative(directory, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some((part) => part.startsWith('.'))) return null;
    return resolved;
  }
  return null;
}

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolveFile(pathname);
    if (!file || !(await stat(file)).isFile()) throw new Error('Not found');
    const content = await readFile(file);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bestand niet gevonden.');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Poort ${port} is al in gebruik. Stop de vorige Noordpool-server en probeer opnieuw.`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`\n  noordpool ${preview ? '— productiepreview' : '— lokale scène'}\n  http://127.0.0.1:${port}\n\n  Stoppen: Ctrl+C\n`);
});
