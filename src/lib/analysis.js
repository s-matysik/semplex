/* Wywołania analiz wspólne dla ekranów. */
import { engine, getState, setState, setResult } from '../store.js';

export async function ensureSplit() {
  const s = getState();
  if (!s.split.use) return null;
  const want = { seed: s.split.seed || s.settings.seed, strata: s.split.strata || null, frac: s.split.frac || 0.5 };
  const info = s.split.info;
  if (info && info.seed === want.seed && (info.strata || null) === want.strata && info.n === s.data.n) return info;
  const res = await engine.call('split', want);
  setState((st) => ({ split: Object.assign({}, st.split, { info: res }) }));
  return res;
}

export function partFor(stage) {
  const s = getState();
  if (!s.split.use) return 'all';
  return stage === 'efa' ? 'efa' : stage === 'cfa' ? 'cfa' : 'all';
}

export function partLabel(part, info) {
  if (part === 'efa') return `część eksploracyjna${info ? ' · n = ' + info.n_efa : ''}`;
  if (part === 'cfa') return `część walidacyjna${info ? ' · n = ' + info.n_cfa : ''}`;
  return 'cała próba';
}

export async function runFit(module, syntax, { part, estimator, mi = true } = {}) {
  const s = getState();
  if (part !== 'all') await ensureSplit();
  const res = await engine.call('fit', { syntax, estimator: estimator || s.estimator, part: part || partFor('cfa'), mi });
  setResult(module, res);
  return res;
}

export function scaleList() {
  const d = getState().data;
  return d ? d.scales : [];
}

export function scaleMap() {
  const out = {};
  scaleList().forEach((x) => { out[x.id] = x.items; });
  return out;
}

export function labelOf(name) {
  const d = getState().data;
  const v = d && d.variables.find((x) => x.name === name);
  return (v && v.label) || '';
}
