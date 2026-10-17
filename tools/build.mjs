/* Budowanie aplikacji SEMplex do folderu dist/ (statyczny hosting: GitHub Pages, Netlify, dowolny serwer).
   Używa esbuild-wasm w tym samym procesie Node — bez procesów potomnych i bez binariów zależnych od systemu,
   więc działa identycznie lokalnie i w GitHub Actions.
   Uruchom:  node tools/build.mjs        (albo npm run build) */
globalThis.self = globalThis;
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild-wasm/esm/browser.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const EXT = ['.jsx', '.js', '.mjs', '.cjs', '.json', '.css'];

function isFile(p) { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } }

function asFile(p) {
  if (isFile(p)) return p;
  for (const e of EXT) if (isFile(p + e)) return p + e;
  if (isDir(p)) {
    const pj = path.join(p, 'package.json');
    if (isFile(pj)) { const m = JSON.parse(fs.readFileSync(pj, 'utf8')); const main = m.module || m.main; if (main) { const r = asFile(path.join(p, main)); if (r) return r; } }
    for (const e of EXT) if (isFile(path.join(p, 'index' + e))) return path.join(p, 'index' + e);
  }
  return null;
}

function pickExport(target) {
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) { for (const t of target) { const r = pickExport(t); if (r) return r; } return null; }
  if (target && typeof target === 'object') {
    for (const cond of ['browser', 'import', 'module', 'default', 'require']) if (cond in target) { const r = pickExport(target[cond]); if (r) return r; }
  }
  return null;
}

function resolveBare(spec, fromDir) {
  const parts = spec.split('/');
  const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const sub = parts.slice(spec.startsWith('@') ? 2 : 1).join('/');
  let dir = fromDir;
  while (true) {
    const pkgDir = path.join(dir, 'node_modules', name);
    if (isDir(pkgDir)) {
      const pj = path.join(pkgDir, 'package.json');
      const meta = isFile(pj) ? JSON.parse(fs.readFileSync(pj, 'utf8')) : {};
      if (meta.exports) {
        const key = sub ? './' + sub : '.';
        const ex = typeof meta.exports === 'string' || Array.isArray(meta.exports) || !Object.keys(meta.exports).some((k) => k.startsWith('.')) ? (key === '.' ? meta.exports : null) : meta.exports[key];
        const t = pickExport(ex);
        if (t) { const r = asFile(path.join(pkgDir, t)); if (r) return r; }
      }
      const r = asFile(sub ? path.join(pkgDir, sub) : pkgDir);
      if (r) return r;
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

const LOADER = { '.jsx': 'jsx', '.js': 'jsx', '.mjs': 'js', '.cjs': 'js', '.json': 'json', '.css': 'css', '.svg': 'dataurl', '.png': 'dataurl', '.woff2': 'dataurl' };

const fsPlugin = {
  name: 'node-fs',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (/^(https?:)?\/\//.test(args.path) || args.path.startsWith('data:')) return { path: args.path, external: true };
      const base = args.kind === 'entry-point' ? ROOT : (args.pluginData && args.pluginData.dir) || (args.importer && args.namespace === 'nfs' ? path.dirname(args.importer) : ROOT);
      let p = null;
      if (args.path.startsWith('.') || path.isAbsolute(args.path)) p = asFile(path.resolve(base, args.path));
      else p = resolveBare(args.path, base);
      if (!p) return { errors: [{ text: `Nie znaleziono modułu „${args.path}” (z ${path.relative(ROOT, args.importer || base) || '.'})` }] };
      return { path: p, namespace: 'nfs' };
    });
    build.onLoad({ filter: /.*/, namespace: 'nfs' }, (args) => {
      const ext = path.extname(args.path).toLowerCase();
      const loader = LOADER[ext] || 'text';
      const contents = loader === 'dataurl' ? fs.readFileSync(args.path) : fs.readFileSync(args.path, 'utf8');
      return { contents, loader, pluginData: { dir: path.dirname(args.path) } };
    });
  },
};

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === '__pycache__' || e.name.endsWith('.pyc')) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

const t0 = Date.now();
const wasmModule = await WebAssembly.compile(fs.readFileSync(path.join(ROOT, 'node_modules', 'esbuild-wasm', 'esbuild.wasm')));
await esbuild.initialize({ wasmModule, worker: false });

const result = await esbuild.build({
  entryPoints: ['./src/main.jsx'], absWorkingDir: '/',
  bundle: true, format: 'esm', target: 'es2022', platform: 'browser', minify: true, sourcemap: false,
  jsx: 'automatic', write: false, outdir: '/out', entryNames: 'app', logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'none',
  plugins: [fsPlugin],
}).catch((e) => {
  for (const m of e.errors || []) console.error(`Błąd: ${m.text}${m.location ? `\n  ${m.location.file}:${m.location.line}:${m.location.column}  ${m.location.lineText}` : ''}`);
  process.exit(1);
});
for (const w of result.warnings) console.warn(`Ostrzeżenie: ${w.text}${w.location ? ` (${path.basename(w.location.file)}:${w.location.line})` : ''}`);

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, 'public'), OUT);
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
const names = {};
for (const f of result.outputFiles) {
  const ext = path.extname(f.path);
  const hash = crypto.createHash('sha256').update(f.contents).digest('hex').slice(0, 10);
  const name = `app-${hash}${ext}`;
  fs.writeFileSync(path.join(OUT, 'assets', name), f.contents);
  names[ext] = name;
}
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/\s*<script type="module" src="\/src\/main\.jsx"><\/script>/,
  (names['.css'] ? `\n    <link rel="stylesheet" href="./assets/${names['.css']}">` : '') + `\n    <script type="module" src="./assets/${names['.js']}"></script>`);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, '404.html'), html);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const size = (n) => (fs.statSync(path.join(OUT, 'assets', n)).size / 1024).toFixed(0) + ' KB';
console.log(`Gotowe w ${((Date.now() - t0) / 1000).toFixed(1)} s → dist/  (JS ${size(names['.js'])}${names['.css'] ? ', CSS ' + size(names['.css']) : ''})`);
