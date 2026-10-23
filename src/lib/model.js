/* Model: syntax ↔ nodes and edges, automatic diagram layout, code export. */
import { lavaan } from 'semplex-ui';
import { t } from '../i18n/index.js';

export function parseModel(text) {
  try { return lavaan.parse(text || ''); } catch (e) { return { nodes: [], edges: [], defined: [], errors: [{ line: 1, message: String(e.message || e) }] }; }
}

/* Variable levels by structural paths (longest path from exogenous variables). */
function levels(nodes, edges) {
  const paths = edges.filter((e) => e.kind === 'path');
  const lvl = {};
  nodes.forEach((n) => { lvl[n.id] = 0; });
  for (let it = 0; it < nodes.length; it++) {
    let changed = false;
    paths.forEach((e) => { if (lvl[e.to] < lvl[e.from] + 1) { lvl[e.to] = lvl[e.from] + 1; changed = true; } });
    if (!changed) break;
  }
  return lvl;
}

/* Layout for ModelCanvas / PathDiagram. Returns {id: {x, y}} (node centers). */
export function autoLayout(model, opts = {}) {
  const { nodes, edges } = model;
  const latent = nodes.filter((n) => n.kind === 'latent').map((n) => n.id);
  const indicatorsOf = {};
  edges.filter((e) => e.kind === 'loading').forEach((e) => { (indicatorsOf[e.from] = indicatorsOf[e.from] || []).push(e.to); });
  const isIndicator = new Set(Object.values(indicatorsOf).flat());
  const structural = nodes.filter((n) => !isIndicator.has(n.id)).map((n) => n.id);
  const lvl = levels(nodes.filter((n) => structural.includes(n.id)), edges.filter((e) => structural.includes(e.from) && structural.includes(e.to)));
  const maxL = Math.max(0, ...structural.map((id) => lvl[id] || 0));
  const colW = opts.colW || 260, itemGap = opts.itemGap || 40, blockGap = opts.blockGap || 34;
  const pos = {};
  const cols = {};
  structural.forEach((id) => { const l = lvl[id] || 0; (cols[l] = cols[l] || []).push(id); });
  const heights = {};
  Object.keys(cols).forEach((l) => {
    let y = 40;
    cols[l].forEach((id) => {
      const k = (indicatorsOf[id] || []).length;
      const h = Math.max(1, k) * itemGap;
      pos[id] = { x: 0, y: y + h / 2 - itemGap / 2 + 12 };
      y += h + blockGap;
    });
    heights[l] = y;
  });
  const H = Math.max(...Object.values(heights), 120);
  Object.keys(cols).forEach((l) => {
    const off = (H - heights[l]) / 2;
    cols[l].forEach((id) => { pos[id].y += off; });
  });
  Object.keys(cols).forEach((l) => {
    const L = Number(l);
    const left = L === 0 && maxL > 0;
    cols[l].forEach((id) => {
      const base = 120 + L * colW + (maxL === 0 ? 0 : 0);
      const isLat = latent.includes(id);
      pos[id].x = left ? base + 70 : base + (maxL === 0 ? 70 : 0);
      const its = indicatorsOf[id] || [];
      const x = left || maxL === 0 ? pos[id].x - 108 : pos[id].x + 108;
      its.forEach((it, i) => { pos[it] = { x, y: pos[id].y + (i - (its.length - 1) / 2) * itemGap }; });
      if (!isLat && !its.length) pos[id].x = pos[id].x;
    });
  });
  // offset so that everything is in positive coordinates
  const minX = Math.min(...Object.values(pos).map((p) => p.x), 0);
  if (minX < 30) Object.values(pos).forEach((p) => { p.x += 30 - minX; });
  return pos;
}

/* Data for PathDiagram from the engine result. */
export function pathDiagramFromFit(res, opts = {}) {
  const model = parseModel(res.syntax);
  const pos = autoLayout(model, opts);
  const std = {};
  res.params.forEach((p) => { std[p.lhs + p.op + p.rhs] = p; });
  const nodes = model.nodes.map((n) => {
    const p = pos[n.id] || { x: 40, y: 40 };
    const base = { id: n.id, label: n.id, kind: n.kind, x: p.x, y: p.y };
    if (n.kind === 'latent') Object.assign(base, { rx: 38, ry: 21 }); else Object.assign(base, { w: 44, h: 24 });
    if (res.r2 && res.r2[n.id] != null && n.kind === 'latent' && model.edges.some((e) => e.kind === 'path' && e.to === n.id)) base.r2 = res.r2[n.id];
    return base;
  });
  const edges = [];
  model.edges.forEach((e) => {
    let prm;
    if (e.kind === 'loading') prm = std[e.from + '=~' + e.to];
    else if (e.kind === 'path') prm = std[e.to + '~' + e.from];
    else prm = std[e.from + '~~' + e.to] || std[e.to + '~~' + e.from];
    edges.push({ from: e.from, to: e.to, kind: e.kind, est: prm ? prm.std : undefined, p: prm && prm.free ? prm.p : undefined, bend: e.kind === 'cov' ? -26 : undefined });
  });
  // covariances of exogenous factors (added automatically by the engine)
  res.params.filter((p) => p.op === '~~' && p.lhs !== p.rhs && res.latent.includes(p.lhs) && res.latent.includes(p.rhs)).forEach((p) => {
    if (!edges.some((e) => e.kind === 'cov' && ((e.from === p.lhs && e.to === p.rhs) || (e.from === p.rhs && e.to === p.lhs)))) {
      edges.push({ from: p.lhs, to: p.rhs, kind: 'cov', est: p.std, p: p.p, bend: -26 });
    }
  });
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const width = Math.max(320, Math.max(...xs) + 70), height = Math.max(220, Math.max(...ys) + 50);
  return { nodes, edges, width, height };
}

/* Estimates in ModelCanvas format (edgeKey key). */
export function canvasEstimates(res) {
  const est = {};
  res.params.forEach((p) => {
    let e;
    if (p.op === '=~') e = { from: p.lhs, to: p.rhs, kind: 'loading' };
    else if (p.op === '~') e = { from: p.rhs, to: p.lhs, kind: 'path' };
    else if (p.lhs !== p.rhs) e = { from: p.lhs, to: p.rhs, kind: 'cov' };
    if (e) est[lavaan.edgeKey(e)] = { est: p.std, p: p.free ? p.p : undefined };
  });
  return est;
}

export function cfaSyntaxFromScales(scales, skip = []) {
  return Object.entries(scales)
    .map(([f, items]) => [f, items.filter((i) => !skip.includes(i))])
    .filter(([, items]) => items.length > 0)
    .map(([f, items]) => (items.length === 1 ? `# ${f} =~ ${items[0]}  (czynnik z jedną pozycją - pominięty)` : `${f} =~ ${items.join(' + ')}`))
    .join('\n');
}

/* ---------- code export ---------- */
/* Code to reproduce the model. Reads the analytical data file downloaded via the "Analytical data (CSV)" button:
   it contains exactly the rows and variables on which the model was computed (after recoding, reversing, exclusions
   and sample subset selection), so the code does not need to repeat data preparation. */
export const ANALYSIS_FILE = 'semplex_dane_analityczne.csv';
export function codeSnippets(syntax, { estimator = 'ML', part, seed = 1, kind = 'cfa', bootstrap, version = '', missing = 'listwise' } = {}) {
  const est = estimator === 'MLM' ? 'MLM' : 'ML';
  const fn = kind === 'sem' ? 'sem' : 'cfa';
  const em = missing === 'em';
  const head = t("SEMplex {0}; dane: {1}{2}", { 0: version, 1: ANALYSIS_FILE, 2: part ? t(" (część próby „{0}”, podział losowy z ziarnem {1})", { 0: part, 1: seed }) : '' })
    + (em ? `\n# Uwaga: w SEMplex użyto kowariancji z algorytmu EM (dwuetapowo). Plik zawiera dane z brakami;\n# missing = "fiml" w lavaan to inna metoda (pełna informacja) i da nieco inne wyniki.` : '');
  const py = `# ${head}
# Silnik SEMplex: folder public/engine/semplex z repozytorium (ten sam kod, który liczy w przeglądarce)
import pandas as pd
from semplex.sem import fit_model, param_table

dane = pd.read_csv("${ANALYSIS_FILE}").drop(columns=["row_id"])${em ? t("\n# fit_model liczy na kompletnych przypadkach; tryb EM interfejsu odpowiada semplex.api.fit(..., missing=\"em\")") : ''}
model = """
${syntax.trim()}
"""
fit = fit_model(model, data=dane, estimator="${est}", mi=True)
print(fit.fit)                      # χ², CFI, TLI, RMSEA [90% CI], SRMR
for r in param_table(fit):
    print(r["lhs"], r["op"], r["rhs"], round(r["est"], 3), round(r["std"], 3))${bootstrap ? `\n# bootstrap: semplex.sem.bootstrap(model, dane, R=${bootstrap}, seed=${seed})` : ''}
`;
  const lav = `# ${head}
library(lavaan)

dane <- read.csv("${ANALYSIS_FILE}")
dane$row_id <- NULL
model <- '
${syntax.trim()}
'
fit <- ${fn}(model, data = dane, estimator = "${est}"${em ? t(", missing = \"fiml\"") : ''})
summary(fit, fit.measures = TRUE, standardized = TRUE, rsquare = TRUE)
modindices(fit, sort. = TRUE, maximum.number = 10)${bootstrap ? `\n# bootstrap (inny generator liczb losowych niż w SEMplex): set.seed(${seed}); fit_b <- ${fn}(model, data = dane, se = "bootstrap", bootstrap = ${bootstrap})` : ''}
`;
  return { python: py, lavaan: lav };
}

export function download(name, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}
