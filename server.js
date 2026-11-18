import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const root = fileURLToPath(new URL('.', import.meta.url));
const distDirectory = resolve(root, 'dist');
const apiPrefix = '/api/overdrive';
const mediaPathPattern = /^\/libraries\/[a-zA-Z0-9._~-]+\/media(?:\/bulk)?$/;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const sendText = (response, statusCode, message) => {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
};

const proxyOverDrive = async (request, response, url) => {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    sendText(response, 405, 'Method not allowed');
    return;
  }

  const overDrivePath = url.pathname.slice(apiPrefix.length);
  if (!mediaPathPattern.test(overDrivePath)) {
    sendText(response, 404, 'Not found');
    return;
  }

  try {
    const upstream = await fetch(
      `https://thunder.api.overdrive.com/v2${overDrivePath}${url.search}`
    );
    response.writeHead(upstream.status, {
      'Cache-Control': 'no-store',
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
    });

    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(response);
    } else {
      response.end();
    }
  } catch (error) {
    console.error('OverDrive proxy request failed:', error);
    if (!response.headersSent) {
      sendText(response, 502, 'OverDrive service is unavailable');
    } else {
      response.destroy(error);
    }
  }
};

const serveStatic = (request, response, url) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(response, 405, 'Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendText(response, 400, 'Invalid URL path');
    return;
  }

  const filePath = resolve(distDirectory, `.${pathname}`);
  if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${sep}`)) {
    sendText(response, 404, 'Not found');
    return;
  }

  const pathHasExtension = Boolean(extname(pathname));
  const resolvedPath =
    existsSync(filePath) && !pathname.endsWith('/')
      ? filePath
      : pathHasExtension
        ? null
        : resolve(distDirectory, 'index.html');

  if (!resolvedPath || !existsSync(resolvedPath)) {
    sendText(response, 404, 'Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': pathname === '/' ? 'no-cache' : 'public, max-age=3600',
    'Content-Type':
      contentTypes[extname(resolvedPath)] ?? 'application/octet-stream',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(resolvedPath)
    .on('error', (error) => {
      console.error('Unable to serve built app file:', error);
      if (!response.headersSent) sendText(response, 500, 'Unable to serve file');
      else response.destroy(error);
    })
    .pipe(response);
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith(apiPrefix)) {
    void proxyOverDrive(request, response, url);
    return;
  }
  serveStatic(request, response, url);
});

const port = Number(process.env.PORT) || 10000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Goodreads Library Recommendations listening on port ${port}`);
});
