/* Stan aplikacji: jeden magazyn z subskrypcją (useSyncExternalStore). */
import { useSyncExternalStore, useRef } from 'react';
import { createEngine } from './engine/client.js';

const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';

const SETTINGS_KEY = 'sx-settings';
function loadSettings() {
  try { return Object.assign({ seed: 1, bootR: 500, compareR: 200, stabilityB: 100, ciLevel: 0.95, lang: 'pl' }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch (e) { return { seed: 1, bootR: 500, compareR: 200, stabilityB: 100, ciLevel: 0.95, lang: 'pl' }; }
}

const initial = {
  engine: { status: 'loading', progress: 0, text: 'Uruchamianie silnika' },
  theme: initialTheme,
  mode: 'adv',
  module: 'data',
  palette: false,
  help: false,
  settingsOpen: false,
  project: { name: 'Nowy projekt', saved: true },
  importDraft: null,      // wynik sniff + edytowane kolumny przed importem
  data: null,             // podsumowanie danych z silnika
  sampleMeta: null,
  changes: [],            // zmiany danych: {id, kind: 'reverse'|'exclude', ...}
  split: { use: true, seed: 1, strata: '', frac: 0.5, info: null },
  estimator: 'MLM',
  results: {},            // module -> { value, at, stale }
  syntax: { cfa: '', sem: '' },
  efaSkip: [],            // pozycje pominięte w CFA
  models: [],             // zapisane modele do porównania
  layout: {},             // pozycje węzłów edytora SEM
  decisions: [],
  jobs: [],
  toast: null,
  settings: loadSettings(),
};

let state = initial;
const listeners = new Set();

export function getState() { return state; }
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = Object.assign({}, state, next);
  listeners.forEach((l) => l());
}
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }

export function useStore(selector) {
  const sel = selector || ((s) => s);
  return useSyncExternalStore(subscribe, () => sel(state));
}

/* Hook z płytkim porównaniem dla selektorów zwracających obiekty. */
export function useShallow(selector) {
  const prev = useRef(null);
  return useSyncExternalStore(subscribe, () => {
    const v = selector(state);
    const p = prev.current;
    if (p && Object.keys(v).length === Object.keys(p).length && Object.keys(v).every((k) => v[k] === p[k])) return p;
    prev.current = v;
    return v;
  });
}

/* ---------- silnik ---------- */
export const engine = createEngine((st) => setState((s) => ({ engine: Object.assign({}, s.engine, st) })));

/* ---------- pomocnicze ---------- */
export function now() {
  const d = new Date();
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}
let uid = 0;
export function newId(prefix) { uid += 1; return `${prefix || 'id'}-${Date.now().toString(36)}-${uid}`; }

export function toast(message, opts) {
  setState({ toast: Object.assign({ message, key: newId('t') }, opts || {}) });
}

export function setResult(module, value) {
  setState((s) => ({ results: Object.assign({}, s.results, { [module]: { value, at: now(), stale: false } }), project: Object.assign({}, s.project, { saved: false }) }));
}

export function markStale(modules) {
  setState((s) => {
    const r = Object.assign({}, s.results);
    (modules || Object.keys(r)).forEach((m) => { if (r[m]) r[m] = Object.assign({}, r[m], { stale: true }); });
    return { results: r };
  });
}

/* Zależności wyników: zmiana modułu unieważnia też jego bootstrap i moduły, które z niego korzystają. */
const DEPENDENTS = {
  stats: [], rel: ['relBoot'], efa: ['efaStab'], cfa: ['cfaBoot', 'compare', 'sem', 'semBoot'], sem: ['semBoot'],
  med: [], bridge: [], compare: [],
};
export function withDependents(mods) {
  const out = new Set();
  const add = (m) => { if (out.has(m)) return; out.add(m); (DEPENDENTS[m] || []).forEach(add); };
  mods.forEach(add);
  return Array.from(out);
}
export const DOWNSTREAM = withDependents(['stats', 'rel', 'efa', 'cfa', 'sem', 'med', 'bridge', 'compare']);

/* ---------- dziennik decyzji ---------- */
export function logDecision(entry) {
  const e = Object.assign({ id: newId('d'), time: now(), origin: 'manual', kind: 'change', reverted: false, stale: false, at: Date.now() }, entry);
  setState((s) => ({ decisions: s.decisions.concat([e]), project: Object.assign({}, s.project, { saved: false }) }));
  return e;
}

export function markDecisionsStaleAfter(at) {
  setState((s) => ({ decisions: s.decisions.map((d) => (d.at > at && !d.reverted ? Object.assign({}, d, { stale: true }) : d)) }));
}

/* ---------- zmiany danych ---------- */
export async function applyChanges(changes) {
  const summary = await engine.call('set_changes', { changes: changes.map(stripChange) });
  setState((s) => ({ changes, data: summary, split: Object.assign({}, s.split, { info: null }) }));
  markStale(DOWNSTREAM);
  return summary;
}
function stripChange(c) { const o = Object.assign({}, c); delete o.id; return o; }

export async function addChange(change, decision) {
  const c = Object.assign({ id: newId('c') }, change);
  const before = getState().changes;
  await applyChanges(before.concat([c]));
  const d = logDecision(Object.assign({ undo: { type: 'change', id: c.id } }, decision));
  toast(decision.toast || decision.actionText || 'Zapisano zmianę', { actionLabel: 'Cofnij', onAction: () => revertDecision(d.id) });
  return d;
}

export async function revertDecision(id) {
  const d = getState().decisions.find((x) => x.id === id);
  if (!d || d.reverted) return;
  const u = d.undo || {};
  if (u.type === 'change') {
    await applyChanges(getState().changes.filter((c) => c.id !== u.id));
  } else if (u.type === 'syntax') {
    setState((s) => ({ syntax: Object.assign({}, s.syntax, { [u.target]: u.before }) }));
    markStale(withDependents([u.target]));
  } else if (u.type === 'efaSkip') {
    setState((s) => ({ efaSkip: u.before }));
  } else if (u.type === 'estimator') {
    setState({ estimator: u.before });
    markStale(withDependents(['cfa', 'sem']));
  } else if (u.type === 'scales') {
    const sc = {}, names = {};
    u.before.forEach((x) => { sc[x.id] = x.items; names[x.id] = x.name; });
    setState({ data: await engine.call('set_scales', { scales: sc, names }) });
    markStale(DOWNSTREAM);
  } else if (u.type === 'split') {
    setState((s) => ({ split: Object.assign({}, s.split, u.before, { info: null }) }));
    markStale(DOWNSTREAM);
  }
  setState((s) => ({ decisions: s.decisions.map((x) => (x.id === id ? Object.assign({}, x, { reverted: true }) : x)) }));
  markDecisionsStaleAfter(d.at);
  toast('Decyzję cofnięto. Wyniki zależne czekają na przeliczenie.', { icon: 'undo' });
}

/* ---------- zadania w tle ---------- */
export function startJob(job) {
  const j = Object.assign({ id: newId('job'), status: 'running', progress: 0, signal: { cancelled: false } }, job);
  setState((s) => ({ jobs: [j].concat(s.jobs).slice(0, 12) }));
  return j;
}
export function updateJob(id, patch) {
  setState((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? Object.assign({}, j, patch) : j)) }));
}
export function cancelJob(id) {
  const j = getState().jobs.find((x) => x.id === id);
  if (j) { j.signal.cancelled = true; updateJob(id, { status: 'cancelled' }); }
}

/* Uruchamia zadanie silnika z paskiem w JobTray. */
export async function runEngineJob({ label, module, icon, kind, params, chunk, previewEvery, onPreview, resultArgs }) {
  const j = startJob({ label, module, icon: icon || 'shuffle' });
  const t0 = performance.now();
  try {
    const out = await engine.runJob(kind, params, {
      chunk, previewEvery, resultArgs, signal: j.signal,
      onProgress: (done, total, preview) => {
        const frac = total ? done / total : 1;
        const el = (performance.now() - t0) / 1000;
        const eta = frac > 0.02 ? Math.max(0, el / frac - el) : null;
        updateJob(j.id, { progress: frac, eta: eta == null ? undefined : `ok. ${eta < 60 ? Math.ceil(eta) + ' s' : Math.ceil(eta / 60) + ' min'}`, detail: `${done} / ${total}` });
        if (preview && onPreview) onPreview(preview);
      },
    });
    updateJob(j.id, { status: out.cancelled ? 'cancelled' : 'done', progress: 1, eta: undefined });
    return out;
  } catch (e) {
    updateJob(j.id, { status: 'error', detail: e.message });
    throw e;
  }
}

/* ---------- ustawienia i motyw ---------- */
export function setSettings(patch) {
  setState((s) => {
    const settings = Object.assign({}, s.settings, patch);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
    return { settings };
  });
}
export function toggleTheme() {
  const t = getState().theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('sx-theme', t); } catch (e) {}
  setState({ theme: t });
}
export function go(module) { setState({ module, palette: false }); window.scrollTo && window.scrollTo(0, 0); }

/* Uchwyt diagnostyczny (tylko odczyt i nawigacja) — używany przez test interfejsu tools/ui-test.mjs. */
if (typeof window !== 'undefined') window.__semplex = { getState, go, setState, revertDecision };
