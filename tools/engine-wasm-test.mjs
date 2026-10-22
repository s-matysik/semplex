/* Test silnika w WebAssembly: uruchamia prawdziwy public/engine/worker.js z Pyodide w Node
   i porównuje wyniki z nagraniem z CPython (tests/fixtures/engine.json).
   Wymaga lokalnej kopii Pyodide:  node tools/engine-wasm-test.mjs <folder_pyodide>
   (folder z pyodide.mjs, pyodide.asm.wasm, python_stdlib.zip, pyodide-lock.json i kołami numpy/scipy/pandas). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PYO = path.resolve(process.argv[2] || path.join(ROOT, '.tmp', 'pyodide'));
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'engine.json'), 'utf8'));

const origFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const s = String(u);
  if (s.startsWith('file:')) {
    const f = fileURLToPath(s.split('?')[0]);
    if (!fs.existsSync(f)) return { ok: false, status: 404, text: async () => '' };
    const buf = fs.readFileSync(f);
    return { ok: true, status: 200, text: async () => buf.toString('utf8'), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  }
  return origFetch(u, o);
};

const waiters = new Map();
let readyResolve; const ready = new Promise((r) => { readyResolve = r; });
const statuses = [];
globalThis.self = globalThis;
globalThis.postMessage = (m) => {
  if (m.type === 'status') statuses.push(m.text);
  else if (m.type === 'ready') readyResolve(m.versions);
  else if (m.type === 'fatal') { console.error('BŁĄD startu:', m.message); process.exit(2); }
  else if (m.type === 'result') { const w = waiters.get(m.id); waiters.delete(m.id); w(m); }
};
await import(pathToFileURL(path.join(ROOT, 'public', 'engine', 'worker.js')).href);
let seq = 0;
function send(msg) { const id = ++seq; return new Promise((res) => { waiters.set(id, res); self.onmessage({ data: Object.assign({ id }, msg) }); }); }
async function call(fn, args) { const r = await send({ type: 'call', fn, args }); if (!r.ok) throw new Error(`${fn}: ${r.message}\n${r.trace || ''}`); return r.result; }
async function job(kind, params, chunk = 50, xis) {
  const j = await call('job_start', { kind, params });
  while (!(await call('job_step', { id: j.id, chunk })).finished) {}
  const out = xis ? await Promise.all(xis.map((xi) => call('job_result', { id: j.id, xi }))) : await call('job_result', { id: j.id });
  await call('job_drop', { id: j.id });
  return out;
}

const results = [];
const close = (a, b, tol) => Math.abs(a - b) <= tol;
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); }

const t0 = Date.now();
self.onmessage({ data: { type: 'init', engineUrl: pathToFileURL(path.join(ROOT, 'public', 'engine')).href + '/', version: 'test', indexURL: pathToFileURL(PYO).href + '/', indexPath: PYO + path.sep } });
const versions = await ready;
const tReady = (Date.now() - t0) / 1000;
check('start silnika', true, JSON.stringify(versions));

const csv = fs.readFileSync(path.join(ROOT, 'public', 'samples', 'lojalnosc_2026.csv'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'samples', 'lojalnosc_2026.meta.json'), 'utf8'));
const t1 = Date.now();
const sn = await send({ type: 'file', name: 'lojalnosc_2026.csv', bytes: csv.buffer.slice(csv.byteOffset, csv.byteOffset + csv.byteLength) });
check('sniff', sn.ok && sn.result.n_rows === FIX.sniff.n_rows && sn.result.info.sep === FIX.sniff.info.sep, sn.message);
await call('import_data', { columns: sn.result.columns, missing_codes: sn.result.missing_codes, sample_meta: meta });
const cl = await call('careless', { time_var: 'czas_s' });
check('nieuważni', cl.n_both === FIX.careless.n_both, `${cl.n_both} vs ${FIX.careless.n_both}`);
const flag = cl.rows.filter((r) => r.both).map((r) => r.row);
const sm = await call('set_changes', { changes: [{ kind: 'reverse', var: 'Q6', lo: 1, hi: 5 }, { kind: 'exclude', rows: flag }] });
check('zmiany danych', sm.n === FIX.set_changes.n, `${sm.n}`);
const mi = await call('missing', {});
check('MCAR Little', mi.little && close(mi.little.chi2, FIX.missing.little.chi2, 1e-4), JSON.stringify(mi.little));
const ds = await call('descriptives', { group: 'plec' });
check('Mardia', close(ds.mardia.kurt_z, FIX.descriptives.mardia.kurt_z, 1e-6));
await call('split', { seed: 1, strata: 'plec' });
const rel = await call('reliability', { part: 'all' });
check('ω skal', rel.scales.every((s, i) => close(s.omega, FIX.reliability.scales[i].omega, 1e-4)), rel.scales.map((s) => s.omega.toFixed(4)).join(' '));
const te = Date.now();
const efa = await call('efa_run', { items: Array.from({ length: 18 }, (_, i) => 'Q' + (i + 1)), part: 'efa' });
const tEfa = (Date.now() - te) / 1000;
check('EFA liczba czynników', efa.k === FIX.efa_run.k && efa.nf.consensus === FIX.efa_run.nf.consensus, `${efa.k}`);
check('EFA ładunki', efa.loadings.every((row, i) => row.every((v, j) => close(Math.abs(v), Math.abs(FIX.efa_run.loadings[i][j]), 2e-3))));
const cfa = 'SAT =~ Q1 + Q2 + Q3\nLOY =~ Q4 + Q5 + Q6\nTRU =~ Q7 + Q8 + Q9\nVAL =~ Q10 + Q11 + Q12';
const tc = Date.now();
const fc = await call('fit', { syntax: cfa, estimator: 'MLM', part: 'cfa' });
const tCfa = (Date.now() - tc) / 1000;
check('CFA χ² i CFI', close(fc.fit.chi2, FIX.fit_cfa.fit.chi2, 1e-3) && close(fc.fit.cfi, FIX.fit_cfa.fit.cfi, 1e-5) && close(fc.fit.chi2_scaled, FIX.fit_cfa.fit.chi2_scaled, 1e-3), `${fc.fit.chi2} ${fc.fit.cfi}`);
const fs2 = await call('fit', { syntax: cfa + '\nLOY ~ SAT + TRU + VAL', estimator: 'MLM', part: 'cfa' });
check('SEM ścieżki', fs2.params.filter((p) => p.op === '~').every((p) => close(p.std, FIX.fit_sem.params.find((q) => q.lhs === p.lhs && q.op === p.op && q.rhs === p.rhs).std, 1e-4)));
const mo = await call('moderation', { x: 'SAT', w: 'VAL', y: 'LOY' });
check('moderacja', close(mo.coefs[2].b, FIX.moderation.coefs[2].b, 1e-8));
const tb = Date.now();
const bt = await job('boot', { syntax: cfa, part: 'cfa', R: 30, seed: 1 }, 30);
const tBoot = (Date.now() - tb) / 1000;
check('bootstrap CFA (to samo ziarno)', bt.ok === FIX['job:boot'].ok && close(bt.std_lo[0], FIX['job:boot'].std_lo[0], 1e-4), `${bt.ok}`);
const m4 = await job('med4', { x: 'SAT', m: 'TRU', y: 'LOY', R: 40, seed: 1 }, 40);
check('mediacja 4', close(m4.defined.ind.std, FIX['job:med4'].defined.ind.std, 1e-4));
const m14 = await job('med14', { x: 'SAT', m: 'TRU', y: 'LOY', w: 'VAL', R: 200, seed: 1 }, 200);
check('mediacja 14', close(m14.point.index, FIX['job:med14'].point.index, 1e-8));
const tcm = Date.now();
const cmp = await job('compare', { y: 'LOY', xs: ['SAT', 'TRU'], R: 20 }, 10, [0, 1]);
const tCmp = (Date.now() - tcm) / 1000;
check('porównanie podejść', cmp[0].rows.every((r, i) => close(r.est, FIX['job:compare'][0].rows[i].est, 1e-3)), cmp[0].rows.map((r) => r.id + '=' + r.est.toFixed(3)).join(' '));
const tAll = (Date.now() - t1) / 1000;

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'BŁĄD'} ${r.name}${r.ok ? '' : '  - ' + (r.detail || '')}`);
console.log(`\nPyodide ${versions.pyodide} · numpy ${versions.numpy} · scipy ${versions.scipy} · pandas ${versions.pandas}`);
console.log(`Czasy [s]: start ${tReady.toFixed(1)} · EFA ${tEfa.toFixed(1)} · CFA ${tCfa.toFixed(2)} · bootstrap 30 ${tBoot.toFixed(1)} · porównanie 20×7 ${tCmp.toFixed(1)} · cała ścieżka ${tAll.toFixed(1)}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} kontroli przeszło.`);
process.exit(failed ? 1 : 0);
