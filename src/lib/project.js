/* Project: file loading, example, saving and reading .sxp (JSON with source data). */
import { engine, getState, setState, toast, logDecision, newId } from '../store.js';
import { download } from './model.js';
import { ENGINE_VERSION } from '../engine/client.js';
import { t } from '../i18n/index.js';

function toB64(bytes) {
  let s = '';
  const u = new Uint8Array(bytes);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64) {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u.buffer;
}

/* Import step 1: file recognition (encoding, separator, types, personal data). */
export async function sniffFile(name, bytes, opts) {
  const res = await engine.uploadFile(name, bytes, opts || {});
  setState({ importDraft: Object.assign({}, res, { opts: opts || {} }), rawFile: { name, b64: toB64(bytes), opts: opts || {} } });
  return res;
}

export async function resniff(opts) {
  const s = getState();
  const res = await engine.call('sniff', Object.assign({ filename: s.rawFile.name }, opts));
  setState({ importDraft: Object.assign({}, res, { opts }), rawFile: Object.assign({}, s.rawFile, { opts: opts || {} }) });
  return res;
}

/* Step 2: import with column settings. */
export async function commitImport(columns, missingCodes, sampleMeta) {
  const summary = await engine.call('import_data', { columns, missing_codes: missingCodes, sample_meta: sampleMeta || null });
  const st = getState();
  const scales = {};
  summary.scales.forEach((x) => { scales[x.id] = x.items; });
  setState({
    data: summary, importDraft: null, importConfig: { columns, missingCodes }, sampleMeta: sampleMeta || null,
    changes: [], results: {}, decisions: [], efaSkip: [], models: [], layout: {},
    syntax: { cfa: '', sem: '' }, split: Object.assign({}, st.split, { info: null }),
    project: { name: (sampleMeta && sampleMeta.title) || st.rawFile.name.replace(/\.[^.]+$/, ''), saved: false },
  });
  const skipped = columns.filter((c) => c.type === 'skip');
  logDecision({ module: 'Dane', moduleIcon: 'data', kind: 'run', origin: 'auto', action: t("Wczytano {0}: N = {1}, {2} zmiennych", { 0: st.rawFile.name, 1: summary.n_total, 2: summary.k }),
    reason: skipped.length ? t("Pominięto {0} kolumn: {1}.", { 0: skipped.length, 1: skipped.map((c) => c.source + (c.pii ? ' (' + c.pii + ')' : '')).join(', ') }) : t("Wszystkie kolumny zaimportowane.") });
  return summary;
}

export async function loadSample() {
  const base = new URL('samples/', document.baseURI).href;
  const [csv, meta] = await Promise.all([
    fetch(base + 'lojalnosc_2026.csv').then((r) => { if (!r.ok) throw new Error(t("Nie znaleziono przykładowych danych.")); return r.arrayBuffer(); }),
    fetch(base + 'lojalnosc_2026.meta.json').then((r) => r.json()),
  ]);
  setState({ pendingSampleMeta: meta });
  return sniffFile('lojalnosc_2026.csv', csv);
}

function utf8B64(text) { return toB64(new TextEncoder().encode(text)); }

/* Saving the project. mode 'clean' (default): source file without columns skipped during import, including columns
   with personal data. mode 'full': the original file in full (Base64 is not encryption). */
export async function saveProject(mode = 'clean') {
  const s = getState();
  if (!s.rawFile || !s.data) { toast(t("Wczytaj dane, aby zapisać projekt."), { icon: 'info' }); return; }
  let rawFile = s.rawFile;
  let importConfig = s.importConfig;
  let dropped = [];
  if (mode === 'clean') {
    const cl = await engine.call('clean_source', { columns: s.importConfig.columns });
    dropped = cl.dropped;
    rawFile = { name: s.rawFile.name.replace(/\.[^.]+$/, '') + '_bez_pominietych.csv', b64: utf8B64(cl.csv), opts: cl.opts, cleaned: true, original: s.rawFile.name };
    importConfig = Object.assign({}, s.importConfig, { columns: s.importConfig.columns.filter((c) => c.type !== 'skip') });
  }
  const payload = {
    format: 'semplex-project', version: 2, app: 'SEMplex ' + ENGINE_VERSION, savedAt: new Date().toISOString(), sourceMode: mode,
    project: s.project, rawFile, importConfig, sampleMeta: s.sampleMeta, settings: s.settings,
    changes: s.changes, decisions: s.decisions, syntax: s.syntax, efaSkip: s.efaSkip, split: Object.assign({}, s.split, { info: null }),
    estimator: s.estimator, models: s.models, layout: s.layout, results: s.results, scales: s.data.scales.map((x) => ({ id: x.id, name: x.name, items: x.items })),
  };
  const name = (s.project.name || t("projekt")).replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.sxp';
  download(name, JSON.stringify(payload), 'application/json');
  setState({ project: Object.assign({}, s.project, { saved: true }) });
  toast(mode === 'clean'
    ? t("Zapisano {0}. Plik zawiera dane analizowanych kolumn{1}. Przechowuj go jak same dane.", { 0: name, 1: dropped.length ? t("; usunięto {0} kolumn pominiętych przy imporcie", { 0: dropped.length }) : '' })
    : t("Zapisano {0} z pełnym plikiem źródłowym, także z kolumnami pominiętymi przy imporcie (np. danymi osobowymi). Nie udostępniaj go bez sprawdzenia zawartości.", { 0: name }), { icon: 'download' });
}

export function openProjectFile() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.sxp,application/json';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    try { await openProject(JSON.parse(await f.text())); } catch (e) { toast(t("Nie udało się otworzyć projektu: ") + e.message, { icon: 'poor' }); }
  };
  inp.click();
}

export async function openProject(p) {
  if (p.format !== 'semplex-project') throw new Error(t("to nie jest plik projektu SEMplex"));
  const bytes = fromB64(p.rawFile.b64);
  await engine.uploadFile(p.rawFile.name, bytes, p.rawFile.opts || {});
  await engine.call('import_data', { columns: p.importConfig.columns, missing_codes: p.importConfig.missingCodes, sample_meta: p.sampleMeta || null });
  if (p.scales) {
    const sc = {}, names = {};
    p.scales.forEach((x) => { sc[x.id] = x.items; names[x.id] = x.name; });
    await engine.call('set_scales', { scales: sc, names });
  }
  const strip = (c) => { const o = Object.assign({}, c); delete o.id; return o; };
  const summary = await engine.call('set_changes', { changes: (p.changes || []).map(strip) });
  setState({
    rawFile: p.rawFile, importConfig: p.importConfig, sampleMeta: p.sampleMeta, data: summary, changes: p.changes || [],
    decisions: p.decisions || [], syntax: p.syntax || { cfa: '', sem: '' }, efaSkip: p.efaSkip || [], split: p.split || getState().split,
    estimator: p.estimator || 'MLM', models: p.models || [], layout: p.layout || {}, results: p.results || {}, importDraft: null,
    project: Object.assign({}, p.project, { saved: true }), module: 'data',
    settings: p.settings ? Object.assign({}, getState().settings, p.settings) : getState().settings,
  });
  toast(t("Otwarto projekt „{0}”. Wyniki pochodzą z zapisu; przelicz je, jeśli zmieniasz ustawienia.", { 0: p.project.name }), { icon: 'folder' });
}

export { newId };
