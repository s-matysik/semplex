/* Interface translations (gettext style): the key is the Polish text, the dictionary converts it to English.
   No translation = Polish text, so the Polish version is always complete.
   Interface translations (gettext style): the Polish source text is the key; missing entries fall back to Polish. */
import ui from './en/ui.js';
import lib from './en/lib.js';

const KEY = 'sx-lang';
const EN = Object.assign({}, lib, ui);

function detect() {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'pl' || s === 'en') return s;
  } catch (e) { /* no localStorage */ }
  const n = (typeof navigator !== 'undefined' && (navigator.language || '')) || 'pl';
  return n.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

let lang = detect();

function publish() {
  // semplex-ui reads the language and dictionary from this object on every render
  if (typeof window !== 'undefined') window.__sxI18n = { lang, dict: EN };
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.lang = lang;
}
publish();

export const LANGS = [{ value: 'pl', label: 'PL' }, { value: 'en', label: 'EN' }];
export function getLang() { return lang; }
export function setLangRaw(l) {
  lang = l === 'en' ? 'en' : 'pl';
  try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
  publish();
}

/* t('Fetched {n} rows', { n: 5 }) */
export function t(pl, params) {
  let s = lang === 'en' && EN[pl] !== undefined ? EN[pl] : pl;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined && params[k] !== null ? String(params[k]) : m));
  return s;
}

/* Number with decimal separator dependent on language. */
export function dec() { return lang === 'en' ? '.' : ','; }
export function num(v, d = 2) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  const s = Math.abs(Number(v)).toFixed(d);
  return (Number(v) < 0 ? '−' : '') + (lang === 'en' ? s : s.replace('.', ','));
}
/* Numerals: plural(n, ['pozycja', 'pozycje', 'pozycji'], ['item', 'items']) */
export function plural(n, plForms, enForms) {
  if (lang === 'en') return Math.abs(n) === 1 ? enForms[0] : enForms[1];
  const a = Math.abs(n) % 100, b = a % 10;
  if (Math.abs(n) === 1) return plForms[0];
  if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return plForms[1];
  return plForms[2];
}

/* Module-level constant that should recompute after language change: lazy(() => ({ ... })).
   The proxy behaves like an object or array (field access, map, spread, Object.keys). */
export function lazy(factory) {
  let cache = null, cacheLang = null;
  const cur = () => { if (cacheLang !== lang) { cache = factory(); cacheLang = lang; } return cache; };
  const target = Array.isArray(factory()) ? [] : {};
  return new Proxy(target, {
    get: (_, k) => { const c = cur(); const v = c[k]; return typeof v === 'function' ? v.bind(c) : v; },
    has: (_, k) => k in cur(),
    ownKeys: () => Reflect.ownKeys(cur()),
    getOwnPropertyDescriptor: (tg, k) => {
      const d = Reflect.getOwnPropertyDescriptor(cur(), k);
      if (d) d.configurable = !(Array.isArray(tg) && k === 'length');
      return d;
    },
  });
}
