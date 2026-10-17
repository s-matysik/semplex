/* Projekt: wczytanie pliku, przykład, zapis i odczyt .sxp (JSON z danymi źródłowymi). */
import { engine, getState, setState, toast, logDecision, newId } from '../store.js';
import { download } from './model.js';

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

/* Krok 1 importu: rozpoznanie pliku (kodowanie, separator, typy, dane osobowe). */
export async function sniffFile(name, bytes, opts) {
  const res = await engine.uploadFile(name, bytes, opts || {});
  setState({ importDraft: Object.assign({}, res, { opts: opts || {} }), rawFile: { name, b64: toB64(bytes) } });
  return res;
}

export async function resniff(opts) {
  const s = getState();
  const res = await engine.call('sniff', Object.assign({ filename: s.rawFile.name }, opts));
  setState({ importDraft: Object.assign({}, res, { opts }) });
  return res;
}

/* Krok 2: import z ustawieniami kolumn. */
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
  logDecision({ module: 'Dane', moduleIcon: 'data', kind: 'run', origin: 'auto', action: `Wczytano ${st.rawFile.name}: N = ${summary.n_total}, ${summary.k} zmiennych`,
    reason: skipped.length ? `Pominięto ${skipped.length} kolumn: ${skipped.map((c) => c.source + (c.pii ? ' (' + c.pii + ')' : '')).join(', ')}.` : 'Wszystkie kolumny zaimportowane.' });
  return summary;
}

export async function loadSample() {
  const base = new URL('samples/', document.baseURI).href;
  const [csv, meta] = await Promise.all([
    fetch(base + 'lojalnosc_2026.csv').then((r) => { if (!r.ok) throw new Error('Nie znaleziono przykładowych danych.'); return r.arrayBuffer(); }),
    fetch(base + 'lojalnosc_2026.meta.json').then((r) => r.json()),
  ]);
  setState({ pendingSampleMeta: meta });
  return sniffFile('lojalnosc_2026.csv', csv);
}

export function saveProject() {
  const s = getState();
  if (!s.rawFile || !s.data) { toast('Wczytaj dane, aby zapisać projekt.', { icon: 'info' }); return; }
  const payload = {
    format: 'semplex-project', version: 1, savedAt: new Date().toISOString(),
    project: s.project, rawFile: s.rawFile, importConfig: s.importConfig, sampleMeta: s.sampleMeta,
    changes: s.changes, decisions: s.decisions, syntax: s.syntax, efaSkip: s.efaSkip, split: Object.assign({}, s.split, { info: null }),
    estimator: s.estimator, models: s.models, layout: s.layout, results: s.results, scales: s.data.scales.map((x) => ({ id: x.id, name: x.name, items: x.items })),
  };
  const name = (s.project.name || 'projekt').replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.sxp';
  download(name, JSON.stringify(payload), 'application/json');
  setState({ project: Object.assign({}, s.project, { saved: true }) });
  toast(`Zapisano ${name}. Plik zawiera dane źródłowe — przechowuj go jak same dane.`, { icon: 'download' });
}

export function openProjectFile() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.sxp,application/json';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    try { await openProject(JSON.parse(await f.text())); } catch (e) { toast('Nie udało się otworzyć projektu: ' + e.message, { icon: 'poor' }); }
  };
  inp.click();
}

export async function openProject(p) {
  if (p.format !== 'semplex-project') throw new Error('to nie jest plik projektu SEMplex');
  const bytes = fromB64(p.rawFile.b64);
  await engine.uploadFile(p.rawFile.name, bytes, {});
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
  });
  toast(`Otwarto projekt „${p.project.name}”. Wyniki pochodzą z zapisu; przelicz je, jeśli zmieniasz ustawienia.`, { icon: 'folder' });
}

export { newId };
