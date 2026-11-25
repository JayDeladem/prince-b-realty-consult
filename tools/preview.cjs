// Development-only static preview with the same project subpath as GitHub Pages.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const prefix = '/prince-b-realty-consult/';
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.avif':'image/avif', '.webp':'image/webp', '.ico':'image/x-icon' };
http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch (_) { res.writeHead(400).end(); return; }
  if(pathname === '/') { res.writeHead(302, {Location:prefix}); res.end(); return; }
  if(!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
  let relative = pathname.slice(prefix.length);
  if(!relative || relative.endsWith('/')) relative += 'index.html';
  const target = path.resolve(root, relative);
  if(!target.startsWith(root + path.sep) || !/^(?:admin[\\/]|css[\\/]|js[\\/]|images[\\/]|[^\\/]+\.html$)/.test(relative) || /(^|[\\/])\./.test(relative)) { res.writeHead(404).end(); return; }
  fs.readFile(target, (error,body) => {
    if(error) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store'}); res.end(body);
  });
}).listen(8765, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:8765/prince-b-realty-consult/'));
