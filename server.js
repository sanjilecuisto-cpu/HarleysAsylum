import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/': ['index.html', 'text/html'], '/src/style.css': ['src/style.css', 'text/css'], '/src/app.js': ['src/app.js', 'text/javascript'], '/src/library.js': ['src/library.js', 'text/javascript'] };
http.createServer(async (req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  try { res.setHeader('Content-Type', file[1]); res.end(await readFile(new URL(file[0], import.meta.url))); }
  catch { res.writeHead(500); res.end('Unable to load app'); }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Harley’s Asylum running on port ' + (process.env.PORT || 3000)));
