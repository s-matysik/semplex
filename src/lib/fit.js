/* Oceny wskaźników z progami i źródłami (słowo + ikona + kolor przez Verdict/FitIndex). */
import { format } from 'semplex-ui';

export const n2 = (v) => (v == null || Number.isNaN(v) ? '—' : format.num(v, 2));
export const n3 = (v) => (v == null || Number.isNaN(v) ? '—' : format.num(v, 3));
export const n1 = (v) => (v == null || Number.isNaN(v) ? '—' : format.num(v, 1));
export const n0 = (v) => (v == null || Number.isNaN(v) ? '—' : format.num(v, 0));
export const pv = (v) => (v == null || Number.isNaN(v) ? '—' : format.p(v));
export const pct = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : format.num(100 * v, d) + '%');
export const int = (v) => (v == null ? '—' : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'));
export const pTxt = (v) => {
  if (v == null || Number.isNaN(v)) return 'p = —';
  const s = format.p(v);
  return s.startsWith('<') ? 'p ' + s : 'p = ' + s;
};
export const ci = (lo, hi, d = 2) => `[${format.num(lo, d)}; ${format.num(hi, d)}]`;

export const TONE_WORD = { good: 'dobre', ok: 'dopuszczalne', poor: 'słabe' };

export function grade(value, rule) {
  if (value == null || Number.isNaN(value)) return undefined;
  if (rule.dir === 'min') return value >= rule.good ? 'good' : value >= rule.ok ? 'ok' : 'poor';
  return value <= rule.good ? 'good' : value <= rule.ok ? 'ok' : 'poor';
}

export const RULES = {
  cfi: { dir: 'min', good: 0.95, ok: 0.90, label: '≥ 0,95', source: 'Hu i Bentler (1999)', scale: [0.8, 1], cut: 0.95,
    term: 'Comparative Fit Index: o ile model jest lepszy od modelu niezależności (0–1).' },
  tli: { dir: 'min', good: 0.95, ok: 0.90, label: '≥ 0,95', source: 'Hu i Bentler (1999)', scale: [0.8, 1], cut: 0.95,
    term: 'Tucker–Lewis Index: jak CFI, z karą za złożoność modelu.' },
  rmsea: { dir: 'max', good: 0.06, ok: 0.08, label: '≤ 0,06', source: 'Hu i Bentler (1999); Browne i Cudeck (1993)', scale: [0, 0.12], cut: 0.06,
    term: 'Root Mean Square Error of Approximation: błąd przybliżenia na stopień swobody; przedział 90%.' },
  srmr: { dir: 'max', good: 0.08, ok: 0.10, label: '≤ 0,08', source: 'Hu i Bentler (1999)', scale: [0, 0.15], cut: 0.08,
    term: 'Standardized Root Mean Square Residual: średnia reszta korelacji.' },
  omega: { dir: 'min', good: 0.70, ok: 0.60, label: '≥ 0,70', source: 'Nunnally (1978); McDonald (1999)' },
  alpha: { dir: 'min', good: 0.70, ok: 0.60, label: '≥ 0,70', source: 'Nunnally (1978)' },
  cr: { dir: 'min', good: 0.70, ok: 0.60, label: '≥ 0,70', source: 'Hair i in. (2019)' },
  ave: { dir: 'min', good: 0.50, ok: 0.40, label: '≥ 0,50', source: 'Fornell i Larcker (1981)' },
  htmt: { dir: 'max', good: 0.85, ok: 0.90, label: '< 0,85', source: 'Henseler, Ringle i Sarstedt (2015)' },
  kmo: { dir: 'min', good: 0.80, ok: 0.60, label: '≥ 0,60', source: 'Kaiser (1974)' },
  loading: { dir: 'min', good: 0.50, ok: 0.40, label: '≥ 0,40', source: 'Stevens (2002)' },
};

/* Zestaw FitIndex dla wyniku CFA/SEM; estymator MLM → wartości skalowane. */
export function fitIndices(fit, scaled) {
  const s = scaled && fit.chi2_scaled != null;
  const v = (k) => (s && fit[k + '_scaled'] != null ? fit[k + '_scaled'] : fit[k]);
  const chi = s ? fit.chi2_scaled : fit.chi2;
  const p = s ? fit.pvalue_scaled : fit.pvalue;
  const ratio = fit.df > 0 ? chi / fit.df : null;
  const out = [
    { key: 'chi', label: 'χ²/df', value: ratio == null ? '—' : format.num(ratio, 2), verdict: ratio == null ? undefined : ratio <= 3 ? 'good' : ratio <= 5 ? 'ok' : 'poor',
      threshold: '≤ 3', source: `χ²(${fit.df}) = ${format.num(chi, 2)}; ${pTxt(p)}${s ? ' · Satorra–Bentler' : ''}` },
  ];
  ['cfi', 'tli', 'rmsea', 'srmr'].forEach((k) => {
    if (k === 'tli') return;
    const r = RULES[k];
    const value = k === 'srmr' ? fit.srmr : v(k);
    const item = { key: k, label: k.toUpperCase(), value, verdict: grade(value, r), threshold: r.label, source: r.source, scale: r.scale, cut: r.cut, term: r.term };
    if (k === 'rmsea') item.ci = [v('rmsea_lo'), v('rmsea_hi')].map((x) => (x == null ? 0 : x));
    out.push(item);
  });
  return out;
}

export function overallFit(fit, scaled) {
  const s = scaled && fit.cfi_scaled != null;
  const cfi = s ? fit.cfi_scaled : fit.cfi, rmsea = s ? fit.rmsea_scaled : fit.rmsea;
  const g = [grade(cfi, RULES.cfi), grade(rmsea, RULES.rmsea), grade(fit.srmr, RULES.srmr)];
  if (g.every((x) => x === 'good')) return 'good';
  if (g.includes('poor')) return 'poor';
  return 'ok';
}

export function fitSentence(fit, scaled, lang = 'pl') {
  const s = scaled && fit.cfi_scaled != null;
  const cfi = s ? fit.cfi_scaled : fit.cfi, rmsea = s ? fit.rmsea_scaled : fit.rmsea;
  const lo = s ? fit.rmsea_lo_scaled : fit.rmsea_lo, hi = s ? fit.rmsea_hi_scaled : fit.rmsea_hi;
  const chi = s ? fit.chi2_scaled : fit.chi2, p = s ? fit.pvalue_scaled : fit.pvalue;
  if (lang === 'en') {
    const o = { decimal: '.', leadingZero: false };
    const f = (x, d) => format.num(x, d, o);
    const pp = format.p(p, o);
    return `χ²(${fit.df}) = ${format.num(chi, 2, { decimal: '.' })}, p ${pp.startsWith('<') ? pp : '= ' + pp}, CFI = ${f(cfi, 3)}, TLI = ${f(s ? fit.tli_scaled : fit.tli, 3)}, RMSEA = ${f(rmsea, 3)}, 90% CI [${f(lo, 3)}, ${f(hi, 3)}], SRMR = ${f(fit.srmr, 3)}`;
  }
  return `χ²(${fit.df}) = ${format.num(chi, 2)}; ${pTxt(p)}; CFI = ${n3(cfi)}; TLI = ${n3(s ? fit.tli_scaled : fit.tli)}; RMSEA = ${n3(rmsea)} [${n3(lo)}; ${n3(hi)}]; SRMR = ${n3(fit.srmr)}`;
}

export const ESTIMATORS = [
  { value: 'ML', label: 'ML', hint: 'Największa wiarygodność; zakłada normalność wielowymiarową.' },
  { value: 'MLM', label: 'MLM (Satorra–Bentler)', hint: 'Odporne błędy i skalowane χ²; zalecane przy skośnych pozycjach Likerta.' },
];
