/* Test dymny interfejsu: wczytuje zbudowaną aplikację (dist/) w happy-dom, zastępuje wątek Pyodide
   odtwarzaniem prawdziwych odpowiedzi silnika (tests/fixtures/engine.json) i przechodzi przez wszystkie moduły.
   Uruchom po zbudowaniu:  node tools/ui-test.mjs  */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'engine.json'), 'utf8'));

const win = new Window({ url: 'https://example.org/semplex/', width: 1440, height: 900 });
win.document.write('<!doctype html><html lang="pl" data-theme="light"><head></head><body><div id="root"></div></body></html>');
for (const k of Object.getOwnPropertyNames(win)) { if (!(k in globalThis)) { try { globalThis[k] = win[k]; } catch (e) {} } }
globalThis.window = win; globalThis.document = win.document; globalThis.navigator = win.navigator; globalThis.localStorage = win.localStorage;
globalThis.self = win;
for (const k of ['React', 'ReactDOM', 'SEMplex']) Object.defineProperty(win, k, { configurable: true, get: () => globalThis[k], set: (v) => { globalThis[k] = v; } });
win.matchMedia = win.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.matchMedia = win.matchMedia;
win.scrollTo = () => {}; globalThis.scrollTo = () => {};
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
win.ResizeObserver = globalThis.ResizeObserver;
URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {};

const errors = [];
const calls = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map((x) => (x && x.stack) || String(x)).join(' ')); };
win.addEventListener('error', (e) => errors.push('window.error: ' + (e.error && e.error.stack || e.message)));
process.on('unhandledRejection', (e) => errors.push('unhandledRejection: ' + (e && e.stack || e)));

/* Atrapa wątku silnika */
function answer(fn, args) {
  if (fn === 'fit') return /(^|\n)\s*\w+\s*~[^~=]/.test(args.syntax) ? FIX.fit_sem : FIX.fit_cfa;
  if (fn === 'job_start') { const k = args.kind; const r = FIX['job:' + k]; return { id: k, total: 1, preview: Array.isArray(r) ? r[0] : r }; }
  if (fn === 'job_step') return { id: args.id, done: 1, total: 1, finished: true, elapsed: 0.1 };
  if (fn === 'job_result') { const r = FIX['job:' + args.id]; return Array.isArray(r) ? r[Math.min(args.xi || 0, r.length - 1)] : r; }
  if (fn === 'job_drop') return { dropped: args.id };
  if (fn === 'set_scales') return FIX.set_changes;
  if (!(fn in FIX)) throw new Error('brak nagrania dla ' + fn);
  return FIX[fn];
}
class FakeWorker {
  constructor(url) { this.url = String(url); setTimeout(() => this.onmessage && this.onmessage({ data: { type: 'ready', versions: Object.assign({ pyodide: 'test' }, FIX.version) } }), 5); }
  postMessage(m) {
    setTimeout(() => {
      let res;
      try {
        const fn = m.type === 'file' ? 'sniff' : m.fn;
        calls.push(fn);
        res = { type: 'result', id: m.id, ok: true, result: answer(fn, m.args || {}) };
      } catch (e) { res = { type: 'result', id: m.id, ok: false, kind: 'engine', message: e.message }; }
      this.onmessage && this.onmessage({ data: res });
    }, 2);
  }
  terminate() {}
}
globalThis.Worker = FakeWorker; win.Worker = FakeWorker;
globalThis.fetch = async (u) => {
  const p = new URL(String(u), 'https://example.org/semplex/').pathname.replace(/^\/semplex\//, '');
  const f = path.join(DIST, ...p.split('/'));
  if (!fs.existsSync(f)) return { ok: false, status: 404, text: async () => '', json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  const buf = fs.readFileSync(f);
  return { ok: true, status: 200, text: async () => buf.toString('utf8'), json: async () => JSON.parse(buf.toString('utf8')), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
};
win.fetch = globalThis.fetch;
win.confirm = () => true; globalThis.confirm = win.confirm;
win.prompt = () => 'Model testowy'; globalThis.prompt = win.prompt;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const text = () => document.querySelector('main') ? document.querySelector('main').textContent : '';
function click(label, scope) {
  const all = (scope ? $$(scope + ' button, ' + scope + ' [role=tab], ' + scope + ' [role=radio]') : $$('button, [role=tab], [role=radio]')).filter((b) => !b.disabled);
  const el = all.find((b) => (b.textContent || '').trim() === label) || all.find((b) => (b.textContent || '').trim().includes(label));
  if (!el) return false;
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  return true;
}
const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail }); }
async function until(fn, ms = 3000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(25); } return false; }

const asset = fs.readdirSync(path.join(DIST, 'assets')).find((f) => f.endsWith('.js'));
await import(pathToFileURL(path.join(DIST, 'assets', asset)).href);
const S = () => win.__semplex.getState();
check('rama aplikacji', await until(() => document.querySelector('.sx-sidebar') && document.querySelector('main')));
check('silnik gotowy', await until(() => S().engine.status === 'ready'));

win.__semplex.setState({ wantSample: Date.now() });
check('podgląd importu', await until(() => text().includes('Importuj')), text().slice(0, 200));
check('dane osobowe wykryte', text().includes('dane osobowe') || text().includes('e-mail'));
click('Importuj');
check('import danych', await until(() => S().data && text().includes('Respondenci w analizie')), text().slice(0, 200));

for (const tab of ['Nieuważni respondenci', 'Braki danych', 'Skale', 'Przegląd']) {
  click(tab); await sleep(150);
  check('Dane · ' + tab, !text().includes('Ten ekran napotkał błąd') && text().length > 200, text().slice(0, 160));
}

const flow = [
  ['stats', 'Normalność wielowymiarowa', null],
  ['rel', 'Rzetelność skal', 'Policz CI bootstrap'],
  ['efa', 'Ładunki czynnikowe', 'Sprawdź stabilność'],
  ['cfa', 'Diagram ścieżek', 'Bootstrap CI'],
  ['sem', 'Wyniki strukturalne', null],
  ['med', 'Szablony PROCESS', 'Uruchom szablon 4'],
  ['bridge', 'Czy wynik zależy od metody', 'Porównaj 7 podejść'],
  ['report', 'Wyniki', null],
  ['log', 'Dziennik decyzji', null],
  ['groups', 'wydaniu v1', null],
  ['ml', 'wydaniu v2', null],
];
for (const [m, expect, action] of flow) {
  win.__semplex.go(m);
  await until(() => text().includes(expect), 2500);
  await sleep(300);
  let ok = text().includes(expect) && !text().includes('Ten ekran napotkał błąd');
  if (action) {
    const clicked = click(action);
    await sleep(600);
    ok = ok && clicked && !text().includes('Ten ekran napotkał błąd') && !text().includes('Obliczenia przerwał błąd');
  }
  check(`moduł ${m}`, ok, text().slice(0, 300));
}
// szablony mediacji
win.__semplex.go('med'); await sleep(300);
for (const tpl of [['Szablon 7', 'Indeks moderowanej mediacji'], ['Szablon 14', 'drugi etap'], ['Szablon 1 ', 'Obszar Johnsona']]) {
  click(tpl[0]); await sleep(100); click('Uruchom szablon'); await until(() => text().includes(tpl[1]), 2000);
  check('mediacja · ' + tpl[0].trim(), text().includes(tpl[1]) && !text().includes('Ten ekran napotkał błąd'), text().slice(0, 200));
}
// porównanie: przełączenie predyktora
win.__semplex.go('bridge'); await sleep(200); click('Dodaj predyktor'); await sleep(50); click('Porównaj 7 podejść'); await until(() => text().includes('TRU → LOY'), 2000);
check('porównanie · drugi predyktor', click('TRU → LOY') && (await until(() => text().includes('Efekt TRU → LOY'), 1500)), text().slice(0, 200));
// raport i dziennik z treścią
win.__semplex.go('report'); await sleep(300);
check('raport zawiera tabele', $$('.report table').length >= 2, String($$('.report table').length));
const enOk = click('EN'); await until(() => text().includes('Measurement model'), 1500);
check('raport EN', enOk && text().includes('Measurement model'), `klik=${enOk} cfa=${!!S().results.cfa} ` + text().slice(0, 200));
win.__semplex.go('log'); await sleep(200);
check('dziennik ma wpisy', S().decisions.length >= 3, String(S().decisions.length));
// decyzja z cofnięciem: model CFA z rozwiązania EFA, potem cofnięcie z dziennika
win.__semplex.go('efa'); await until(() => text().includes('Ładunki czynnikowe'), 2500);
const before = S().syntax.cfa;
click('Zbuduj model CFA'); await until(() => S().module === 'cfa', 1500);
const dec = S().decisions.slice().reverse().find((d) => d.undo && d.undo.type === 'syntax' && !d.reverted);
check('decyzja EFA → CFA w dzienniku', !!dec && S().syntax.cfa !== before);
if (dec) { await win.__semplex.revertDecision(dec.id); await sleep(100); }
check('cofnięcie decyzji przywraca model', dec && S().decisions.find((d) => d.id === dec.id).reverted && S().syntax.cfa === before);
// motyw i paleta poleceń
win.__semplex.setState({ palette: true }); await sleep(100);
check('paleta poleceń', !!document.querySelector('[role=dialog], .sx-cmd, .sx-palette') || document.body.textContent.includes('Polecenia'));
win.__semplex.setState({ palette: false });

console.error = origError;
const fatal = errors.filter((e) => !/Not implemented|happy-dom|getContext|scrollIntoView/i.test(e));
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'BŁĄD'} ${r.name}${r.ok ? '' : '  — ' + (r.detail || '').replace(/\s+/g, ' ').slice(0, 240)}`);
console.log(`\nWywołania silnika: ${calls.length} (${[...new Set(calls)].join(', ')})`);
if (fatal.length) { console.log(`\nBłędy w konsoli (${fatal.length}):`); fatal.slice(0, 12).forEach((e) => console.log(' • ' + e.slice(0, 900))); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} kontroli przeszło.`);
await win.happyDOM.abort().catch(() => {});
process.exit(failed || fatal.length ? 1 : 0);
