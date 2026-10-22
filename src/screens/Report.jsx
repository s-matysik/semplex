import React, { useMemo, useRef, useState } from 'react';
import { Panel, Button, Segmented, Checkbox, Interpretation, Badge, EmptyState, format } from 'semplex-ui';
import { useStore, go, toast } from '../store.js';
import { Head, Screen, NeedData } from '../ui.jsx';
import { fitSentence } from '../lib/fit.js';
import { download, copyText } from '../lib/model.js';
import { methodsParagraph } from './Bridge.jsx';

const T = {
  pl: { title: 'Wyniki', sample: 'Próba', meas: 'Model pomiarowy', rel: 'Rzetelność i trafność', efa: 'Eksploracyjna analiza czynnikowa', struct: 'Model strukturalny', med: 'Mediacja', bridge: 'Porównanie podejść', log: 'Decyzje analityczne', soft: 'Oprogramowanie',
    tabRel: 'Tabela 1. Rzetelność i trafność zbieżna skal', tabLoad: 'Tabela 2. Standaryzowane ładunki czynnikowe (CFA)', tabPath: 'Tabela 3. Standaryzowane współczynniki ścieżek', factor: 'Czynnik', item: 'Pozycja', path: 'Ścieżka' },
  en: { title: 'Results', sample: 'Sample', meas: 'Measurement model', rel: 'Reliability and validity', efa: 'Exploratory factor analysis', struct: 'Structural model', med: 'Mediation', bridge: 'Comparison of approaches', log: 'Analytic decisions', soft: 'Software',
    tabRel: 'Table 1. Reliability and convergent validity', tabLoad: 'Table 2. Standardized factor loadings (CFA)', tabPath: 'Table 3. Standardized path coefficients', factor: 'Factor', item: 'Item', path: 'Path' },
};

function useFmt(lang) {
  const o = lang === 'en' ? { decimal: '.' } : {};
  const lz = lang === 'en' ? { decimal: '.', leadingZero: false } : {};
  return {
    d2: (v) => (v == null ? '-' : format.num(v, 2, o)), d3: (v) => (v == null ? '-' : format.num(v, 3, o)),
    b2: (v) => (v == null ? '-' : format.num(v, 2, lz)), b3: (v) => (v == null ? '-' : format.num(v, 3, lz)),
    p: (v) => { const s = format.p(v, lz); return s.startsWith('<') ? `p ${s}` : `p = ${s}`; }, sep: lang === 'en' ? ', ' : '; ',
  };
}

export default function ReportScreen() {
  const s = useStore();
  const [lang, setLang] = useState(s.settings.lang || 'pl');
  const [inc, setInc] = useState({ efa: true, rel: true, cfa: true, sem: true, med: true, bridge: true, log: true });
  const ref = useRef(null);
  const F = useFmt(lang);
  const t = T[lang];
  if (!s.data) return <Screen><NeedData what="Raport składa się z wyników modułów." /></Screen>;
  const R = (k) => (s.results[k] && s.results[k].value ? s.results[k].value : null);
  const efa = R('efa'), rel = R('rel'), cfa = R('cfa'), sem = R('sem'), med = R('med'), bridge = R('bridge');
  const stale = Object.entries(s.results).filter(([, v]) => v && v.stale).map(([k]) => k);
  const v = s.engine.versions || {};
  const d = s.data;
  const pl = lang === 'pl';

  const sections = [];
  sections.push(<section key="sample"><h2>{t.sample}</h2><p>{pl
    ? `Analizowano odpowiedzi ${d.n} respondentów${d.n_excluded ? ` (z ${d.n_total}; wykluczono ${d.n_excluded} osób odpowiadających nieuważnie)` : ''}. Braki danych stanowiły ${format.num(100 * d.missing_pct, 1)}% odpowiedzi; ${cfa && cfa.missing_mode === 'em' ? 'CFA oszacowano z macierzy kowariancji z algorytmu EM (tryb niezwalidowany), pozostałe analizy modeli wykorzystywały przypadki kompletne' : 'analizy modeli wykorzystywały przypadki kompletne'}.${s.split.use && s.split.info ? ` Próbę losowo podzielono (ziarno ${s.split.info.seed}${s.split.info.strata ? `, warstwami według zmiennej ${s.split.info.strata}` : ''}) na część eksploracyjną (n = ${s.split.info.n_efa}) i walidacyjną (n = ${s.split.info.n_cfa}).` : ''}`
    : `Responses of ${d.n} participants were analyzed${d.n_excluded ? ` (of ${d.n_total}; ${d.n_excluded} careless respondents were excluded)` : ''}. Missing data accounted for ${format.num(100 * d.missing_pct, 1, { decimal: '.' })}% of responses; ${cfa && cfa.missing_mode === 'em' ? 'the CFA was estimated from an EM covariance matrix (unvalidated option); other model-based analyses used complete cases' : 'model-based analyses used complete cases'}.${s.split.use && s.split.info ? ` The sample was randomly split (seed ${s.split.info.seed}${s.split.info.strata ? `, stratified by ${s.split.info.strata}` : ''}) into an exploratory (n = ${s.split.info.n_efa}) and a validation half (n = ${s.split.info.n_cfa}).` : ''}`}</p></section>);

  if (inc.efa && efa) sections.push(<section key="efa"><h2>{t.efa}</h2><p>{pl
    ? `EFA (${efa.extraction}, rotacja ${efa.rotation}, korelacje ${efa.corr === 'polychoric' ? 'polichoryczne' : 'Pearsona'}) przeprowadzono na ${efa.n} obserwacjach; KMO = ${F.d2(efa.kmo)}, test Bartletta χ²(${efa.bartlett.df}) = ${F.d2(efa.bartlett.chi2)}, ${F.p(efa.bartlett.p)}. ${efa.nf.agree} z ${efa.nf.criteria.length} kryteriów liczby czynników (w tym analiza równoległa) wskazało rozwiązanie ${efa.nf.consensus}-czynnikowe; przyjęto ${efa.k} czynniki wyjaśniające ${format.num(100 * efa.total_explained, 1)}% wariancji.${efa.proposals.length ? ` Pozycje ${efa.proposals.map((p) => p.item).join(', ')} miały ${efa.proposals.some((p) => p.kind === 'cross') ? 'ładunki krzyżowe' : 'słabe ładunki'}${s.efaSkip.length ? `; w CFA pominięto: ${s.efaSkip.join(', ')}` : ''}.` : ''}`
    : `EFA (${efa.extraction}, ${efa.rotation} rotation, ${efa.corr} correlations) was conducted on ${efa.n} observations; KMO = ${F.b2(efa.kmo)}, Bartlett's χ²(${efa.bartlett.df}) = ${F.d2(efa.bartlett.chi2)}, ${F.p(efa.bartlett.p)}. ${efa.nf.agree} of ${efa.nf.criteria.length} retention criteria (including parallel analysis) suggested ${efa.nf.consensus} factors; a ${efa.k}-factor solution explaining ${format.num(100 * efa.total_explained, 1, { decimal: '.' })}% of variance was retained.${s.efaSkip.length ? ` Items ${s.efaSkip.join(', ')} were omitted from the CFA.` : ''}`}</p></section>);

  if (inc.cfa && cfa) {
    const sc = cfa.estimator === 'MLM';
    const idx = {}; cfa.params.forEach((p) => { idx[p.lhs + p.op + p.rhs] = p; });
    sections.push(<section key="cfa"><h2>{t.meas}</h2><p>{pl
      ? `Model pomiarowy (${Object.keys(cfa.scales_used).length} czynniki, estymator ${cfa.estimator}${sc ? ' z poprawką Satorry–Bentlera' : ''}, n = ${cfa.n}) dopasowano${s.split.use ? ' w części walidacyjnej' : ''}: ${fitSentence(cfa.fit, sc, 'pl')}. Standaryzowane ładunki wyniosły od ${F.d2(Math.min(...cfa.params.filter((p) => p.op === '=~').map((p) => p.std)))} do ${F.d2(Math.max(...cfa.params.filter((p) => p.op === '=~').map((p) => p.std)))} (Tabela 2).`
      : `The measurement model (${Object.keys(cfa.scales_used).length} factors, ${cfa.estimator} estimator${sc ? ' with Satorra–Bentler correction' : ''}, n = ${cfa.n}) had the following fit: ${fitSentence(cfa.fit, sc, 'en')}. Standardized loadings ranged from ${F.b2(Math.min(...cfa.params.filter((p) => p.op === '=~').map((p) => p.std)))} to ${F.b2(Math.max(...cfa.params.filter((p) => p.op === '=~').map((p) => p.std)))} (Table 2).`}</p>
      <table><caption>{t.tabLoad}</caption><thead><tr><th>{t.factor}</th><th>{t.item}</th><th>λ</th><th>SE</th></tr></thead>
        <tbody>{Object.entries(cfa.scales_used).flatMap(([f, its]) => its.map((it, i) => { const p = idx[f + '=~' + it]; return <tr key={f + it}><td>{i === 0 ? f : ''}</td><td>{it}</td><td>{F.b2(p.std)}</td><td>{F.b3(p.std_se)}</td></tr>; }))}</tbody></table></section>);
  }
  if (inc.rel && rel && rel.validity && rel.validity.rows) sections.push(<section key="rel"><h2>{t.rel}</h2><p>{pl
    ? `Rzetelność oceniono współczynnikiem ω McDonalda (wartości od ${F.d2(Math.min(...rel.scales.map((x) => x.omega)))} do ${F.d2(Math.max(...rel.scales.map((x) => x.omega)))}) oraz α Cronbacha. Trafność zbieżną oceniono rzetelnością złożoną (CR) i AVE (Fornell i Larcker, 1981), a różnicową - wskaźnikiem HTMT (Henseler i in., 2015); największy HTMT = ${F.d2(Math.max(...rel.validity.htmt.flatMap((r, i) => r.filter((_, j) => j > i))))}.`
    : `Reliability was assessed with McDonald's ω (range ${F.b2(Math.min(...rel.scales.map((x) => x.omega)))}–${F.b2(Math.max(...rel.scales.map((x) => x.omega)))}) and Cronbach's α. Convergent validity was evaluated with composite reliability (CR) and AVE (Fornell & Larcker, 1981) and discriminant validity with HTMT (Henseler et al., 2015); the largest HTMT was ${F.b2(Math.max(...rel.validity.htmt.flatMap((r, i) => r.filter((_, j) => j > i))))}.`}</p>
    <table><caption>{t.tabRel}</caption><thead><tr><th>{t.factor}</th><th>k</th><th>α</th><th>ω</th><th>CR</th><th>AVE</th><th>MSV</th></tr></thead>
      <tbody>{rel.scales.map((x) => { const vr = rel.validity.rows.find((y) => y.factor === x.id) || {}; return <tr key={x.id}><td>{x.id}</td><td>{x.k}</td><td>{F.b2(x.alpha)}</td><td>{F.b2(x.omega)}</td><td>{F.b2(vr.cr)}</td><td>{F.b2(vr.ave)}</td><td>{F.b2(vr.msv)}</td></tr>; })}</tbody></table></section>);

  if (inc.sem && sem) {
    const paths = sem.params.filter((p) => p.op === '~');
    const r2 = Object.entries(sem.r2).filter(([k]) => sem.latent.includes(k) && paths.some((p) => p.lhs === k));
    sections.push(<section key="sem"><h2>{t.struct}</h2><p>{pl
      ? `Dopasowanie modelu strukturalnego: ${fitSentence(sem.fit, sem.estimator === 'MLM', 'pl')}. ${paths.map((p) => `Ścieżka ${p.rhs} → ${p.lhs}: β = ${F.d2(p.std)}, ${F.p(p.p)}`).join('; ')}. ${r2.map(([k, x]) => `Model wyjaśnił ${format.num(100 * x, 0)}% wariancji ${k}`).join(', ')}.`
      : `Structural model fit: ${fitSentence(sem.fit, sem.estimator === 'MLM', 'en')}. ${paths.map((p) => `${p.rhs} → ${p.lhs}: β = ${F.b2(p.std)}, ${F.p(p.p)}`).join('; ')}. ${r2.map(([k, x]) => `The model explained ${format.num(100 * x, 0)}% of variance in ${k}`).join(', ')}.`}</p>
      <table><caption>{t.tabPath}</caption><thead><tr><th>{t.path}</th><th>β</th><th>B</th><th>SE</th><th>p</th></tr></thead>
        <tbody>{paths.map((p) => <tr key={p.lhs + p.rhs}><td>{p.rhs} → {p.lhs}</td><td>{F.b2(p.std)}</td><td>{F.d3(p.est)}</td><td>{F.d3(p.se)}</td><td>{F.p(p.p).replace(/^p\s=?\s?/, '')}</td></tr>)}</tbody></table></section>);
  }
  if (inc.med && med && med.med) {
    const m = med.med, sp = med.spec, b = m.boot || {};
    sections.push(<section key="med"><h2>{t.med}</h2><p>{pl
      ? `Efekt pośredni ${sp.x} → ${sp.m} → ${sp.y} oszacowano ${m.latent ? 'na zmiennych latentnych' : 'na średnich skal'} z percentylowym bootstrapem (${m.R_ok} prób, ziarno ${m.seed}): β = ${F.d3(m.defined.ind.std)}${b.ind_std ? `, 95% CI [${F.d3(b.ind_std[0])}; ${F.d3(b.ind_std[1])}]` : ''}; efekt bezpośredni β = ${F.d3(m.paths.c.std)}, ${F.p(m.paths.c.p)}.`
      : `The indirect effect ${sp.x} → ${sp.m} → ${sp.y} was estimated ${m.latent ? 'with latent variables' : 'on scale means'} using percentile bootstrap (${m.R_ok} resamples, seed ${m.seed}): β = ${F.b3(m.defined.ind.std)}${b.ind_std ? `, 95% CI [${F.b3(b.ind_std[0])}, ${F.b3(b.ind_std[1])}]` : ''}; direct effect β = ${F.b3(m.paths.c.std)}, ${F.p(m.paths.c.p)}.`}</p></section>);
  }
  if (inc.bridge && bridge) sections.push(<section key="bridge"><h2>{t.bridge}</h2><p>{methodsParagraph(bridge, lang)}</p></section>);
  if (inc.log && s.decisions.filter((x) => !x.reverted && x.kind !== 'run').length) sections.push(<section key="log"><h2>{t.log}</h2><ol>{s.decisions.filter((x) => !x.reverted && x.kind !== 'run').map((x) => <li key={x.id}>{x.action}{x.reason ? ` - ${x.reason}` : ''}</li>)}</ol></section>);
  sections.push(<section key="soft"><h2>{t.soft}</h2><p>{pl
    ? `Obliczenia wykonano w SEMplex ${v.semplex || '1.0'} (Python w przeglądarce przez Pyodide ${v.pyodide || ''}; numpy ${v.numpy || ''}, scipy ${v.scipy || ''}). Estymacja ML/MLM zgodna z konwencjami lavaan (Rosseel, 2012).`
    : `Analyses were run in SEMplex ${v.semplex || '1.0'} (Python in the browser via Pyodide ${v.pyodide || ''}; numpy ${v.numpy || ''}, scipy ${v.scipy || ''}). ML/MLM estimation follows lavaan conventions (Rosseel, 2012).`}</p></section>);

  function html() {
    const body = ref.current ? ref.current.innerHTML : '';
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${s.project.name} - ${t.title}</title><style>body{font-family:'Times New Roman',serif;max-width:800px;margin:40px auto;line-height:1.6;color:#111}h1,h2{font-family:Arial,sans-serif}h2{font-size:16px;margin-top:28px}table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin:8px 0 20px}th,td{padding:3px 10px;text-align:right;border-bottom:1px solid #ccc}th:first-child,td:first-child{text-align:left}thead th{border-top:2px solid #111;border-bottom:1px solid #111}caption{text-align:left;font-style:italic;padding-bottom:4px}</style></head><body><h1>${t.title}</h1>${body}</body></html>`;
  }
  const base = (s.project.name || 'raport').replace(/[^\p{L}\p{N}_-]+/gu, '_');
  const empty = !efa && !cfa && !sem && !rel;

  return (
    <Screen>
      <Head eyebrow="Raport" title={pl ? 'Sekcja Wyniki gotowa do artykułu' : 'Results section (APA)'} meta={[<Badge key="l">{pl ? 'polski' : 'English · APA 7'}</Badge>, stale.length ? <Badge key="s" tone="ok" icon="refresh">nieaktualne: {stale.join(', ')}</Badge> : null].filter(Boolean)}>
        <Segmented label="Język raportu" value={lang} onChange={setLang} options={[{ value: 'pl', label: 'PL' }, { value: 'en', label: 'EN' }]} />
        <Button variant="secondary" icon="copy" onClick={() => copyText(ref.current ? ref.current.innerText : '').then(() => toast('Skopiowano tekst raportu.'))}>Kopiuj tekst</Button>
        <Button variant="secondary" icon="download" onClick={() => download(base + '.html', html(), 'text/html;charset=utf-8')}>HTML</Button>
        <Button variant="secondary" icon="file" onClick={() => download(base + '.doc', html(), 'application/msword')}>Word</Button>
        <Button variant="primary" icon="print" onClick={() => window.print()}>Drukuj / PDF</Button>
      </Head>
      {stale.length ? <Interpretation tone="warn" title="Część wyników jest nieaktualna">Moduły {stale.join(', ')} czekają na przeliczenie po zmianach w danych lub modelu. Przelicz je przed eksportem raportu.</Interpretation> : null}
      <div className="row no-print">{[['efa', 'EFA'], ['rel', 'Rzetelność'], ['cfa', 'CFA'], ['sem', 'SEM'], ['med', 'Mediacja'], ['bridge', 'Porównanie podejść'], ['log', 'Dziennik decyzji']].map(([k, l]) =>
        <Checkbox key={k} label={l} checked={inc[k]} onChange={(c) => setInc(Object.assign({}, inc, { [k]: c }))} />)}</div>
      {empty ? <EmptyState icon="report" title="Raport jest jeszcze pusty" actions={<Button variant="primary" onClick={() => go('cfa')}>Przejdź do CFA</Button>}>Uruchom co najmniej EFA, CFA albo rzetelność - ich wyniki trafią tu automatycznie z tabelami APA.</EmptyState> :
        <article className="report" ref={ref}>{sections}</article>}
    </Screen>
  );
}
