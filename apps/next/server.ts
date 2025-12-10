import type { IncomingMessage, ServerResponse } from 'http';
import { createServer } from 'http';
import { readFile } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
import { dirname } from 'path';
const __dirname = dirname(__filename);

// Configuration
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;
const staticDir = join(__dirname, 'out');

// MIME types mapping
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

// Helper function to send error responses
function sendError(res: ServerResponse, statusCode: number, message: string): void {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(`<h1>${statusCode} - ${message}</h1>`);
}

// Helper function to serve files
function serveFile(res: ServerResponse, filePath: string, mimeType: string): void {
  readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
    if (err) {
      sendError(res, 404, 'File Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

// Create the HTTP server
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Ensure we have the host header
  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url || '/', `http://${host}`);
  let pathname = parsedUrl.pathname;

  // Remove trailing slash for consistency (except for root)
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Decode URL-encoded characters (like %5Bid%5D -> [id])
  pathname = decodeURIComponent(pathname);

  // Check if it's a static file by extension
  const ext = extname(pathname);
  const mimeType = mimeTypes[ext];

  if (mimeType) {
    // Serve static file
    const filePath = join(staticDir, pathname);
    serveFile(res, filePath, mimeType);
  } else {
    // Check if there's a directory with index.html for this route (Next.js static export)
    const routeIndexPath = join(staticDir, pathname, 'index.html');

    readFile(routeIndexPath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
      if (!err) {
        // Serve the route-specific index.html
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
        return;
      }

      // If route-specific index.html doesn't exist, fall back to root index.html for client-side routing
      const rootIndexPath = join(staticDir, 'index.html');
      readFile(rootIndexPath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
        if (err) {
          sendError(res, 500, 'Server Error');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    });
  }
});

// Start the server
server.listen(port, () => {
  console.log(`🚀 Static server running on http://localhost:${port}`);
  console.log(`📁 Serving from: ${staticDir}`);
  console.log(`🔗 Client-side routing enabled`);
});