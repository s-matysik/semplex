// Runs the unmodified codeSnippets() template from src/lib/model.js (the code the app uses for export).
// Only the translation helper t() is replaced by a Polish pass-through formatter, as in the Polish interface.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'model.js'), 'utf8');
const a = src.indexOf('export function codeSnippets');
let depth = 0, i = src.indexOf('{', src.indexOf(')', a)), j = i;
for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') { depth--; if (depth === 0) break; } }
const fnSrc = src.slice(a, j + 1).replace('export function', 'function');
const AF = /export const ANALYSIS_FILE = '([^']+)'/.exec(src)[1];
const t = (s, p) => (p ? s.replace(/\{(\d+)\}/g, (_, k) => String(p[k])) : s);
const codeSnippets = new Function('t', 'ANALYSIS_FILE', fnSrc + '\nreturn codeSnippets;')(t, AF);
const args = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write(JSON.stringify(Object.assign({ file: AF }, codeSnippets(args.syntax, args.opts))));
