import { ENGINE_VERSION } from '../engine/client.js';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Panel, FitIndex, Interpretation, ResultTable, PathDiagram, Tabs, Badge, Button, SyntaxEditor, CodeExport, Field, Select, Diagnosis, Verdict, Progress, lavaan, format,
} from 'semplex-ui';
import { useStore, setState, getState, engine, setResult, runEngineJob, logDecision, toast, markStale, revertDecision, withDependents } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, useRun, Loading, StaleNote, SeedBadge } from '../ui.jsx';
import { fitIndices, overallFit, fitSentence, n2, n3, pTxt, int, grade, RULES, ESTIMATORS } from '../lib/fit.js';
import { ensureSplit, scaleMap } from '../lib/analysis.js';
import { cfaSyntaxFromScales, pathDiagramFromFit, codeSnippets, copyText, download, ANALYSIS_FILE } from '../lib/model.js';

/* Wspólny widok wyników modelu (CFA i SEM). */
export function useModelRunner(module) {
  const { running, error, setError, run } = useRun();
  async function fit(syntax, { part, missing } = {}) {
    return run(async () => {
      const p = part || (getState().split.use ? 'cfa' : 'all');
      if (p !== 'all') await ensureSplit();
      const res = await engine.call('fit', { syntax, estimator: getState().estimator, part: p, missing: missing || 'listwise', mi: true });
      setResult(module, res);
      setState((s) => ({ results: Object.assign({}, s.results, { [module + 'Boot']: s.results[module + 'Boot'] ? Object.assign({}, s.results[module + 'Boot'], { stale: true }) : undefined }) }));
      return res;
    });
  }
  return { fit, running, error, setError, run };
}

export function syntaxDiagnostics(text, vars) {
  const parsed = lavaan.parse(text || '');
  const diags = (parsed.errors || []).map((e) => ({ line: e.line, message: e.message }));
  const lat = new Set(parsed.nodes.filter((n) => n.kind === 'latent').map((n) => n.id));
  const lines = (text || '').split('\n');
  parsed.nodes.filter((n) => n.kind === 'observed' && !vars.has(n.id)).forEach((n) => {
    const ln = lines.findIndex((l) => new RegExp(`(^|[^A-Za-z0-9_.])${n.id.replace('.', '\\.')}([^A-Za-z0-9_.]|$)`).test(l.replace(/#.*/, '')));
    diags.push({ line: ln + 1 || 1, message: `Zmienna „${n.id}” nie występuje w danych.` });
  });
  let ident = null;
  try { ident = lavaan.identification({ nodes: parsed.nodes, edges: parsed.edges }); } catch (e) { ident = null; }
  return { parsed, diags, ident, lat };
}

export function CollinearityNote({ res }) {
  const c = (res && res.collinearity) || [];
  if (!c.length) return null;
  const paths = c.filter((x) => x.kind === 'std_path');
  const rs = c.filter((x) => x.kind === 'latent_r');
  const what = [
    ...rs.map((x) => `korelacja czynników ${x.a} i ${x.b} = ${n2(x.r)}`),
    ...paths.map((x) => `β ${x.rhs} → ${x.lhs} = ${n2(x.value)}${x.partner ? ` (predyktor skorelowany z ${x.partner}: r = ${n2(x.r)})` : ''}`),
  ].join('; ');
  return (
    <Diagnosis level={paths.length ? 'poor' : 'warn'} title={paths.length ? 'Współliniowość czynników: współczynniki standaryzowane powyżej 1' : 'Bardzo silnie skorelowane czynniki'}
      what={what}
      effect={paths.length ? 'Ścieżki z |β| > 1 i przeciwnymi znakami są artefaktem współliniowości (supresji); nie interpretuj ich osobno.' : 'Czynniki mogą mierzyć ten sam konstrukt — trafność różnicowa jest wątpliwa.'}
      fixes={[{ title: 'Sprawdź HTMT w module Rzetelność i trafność', recommended: true }, { title: 'Połącz czynniki albo usuń jedną ze ścieżek' }, { title: 'Sprawdź, czy pary pozycji nie mają wspólnego sformułowania (kowariancja reszt)' }]}
      source="Henseler i in. (2015); Grewal i in. (2004)" />
  );
}

export function FitBlock({ res }) {
  const scaled = res.estimator === 'MLM';
  const fits = fitIndices(res.fit, scaled);
  return <div className="fits">{fits.map(({ key, ...f }) => <FitIndex key={key} {...f} digits={3} />)}</div>;
}

export function fitInterpretation(res) {
  const scaled = res.estimator === 'MLM';
  const tone = overallFit(res.fit, scaled);
  const f = res.fit;
  const cfi = scaled && f.cfi_scaled != null ? f.cfi_scaled : f.cfi, rmsea = scaled && f.rmsea_scaled != null ? f.rmsea_scaled : f.rmsea;
  const title = tone === 'good' ? 'Model dobrze pasuje do danych' : tone === 'ok' ? 'Dopasowanie jest dopuszczalne' : 'Model słabo pasuje do danych';
  const parts = [];
  if (grade(cfi, RULES.cfi) !== 'good') parts.push(`CFI = ${n3(cfi)} poniżej 0,95`);
  if (grade(rmsea, RULES.rmsea) !== 'good') parts.push(`RMSEA = ${n3(rmsea)} powyżej 0,06`);
  if (grade(f.srmr, RULES.srmr) !== 'good') parts.push(`SRMR = ${n3(f.srmr)} powyżej 0,08`);
  return { tone: tone === 'ok' ? 'warn' : tone, title, text: `${fitSentence(f, scaled)}.${parts.length ? ' ' + parts.join('; ') + '. Sprawdź indeksy modyfikacji, ale dodawaj tylko zmiany uzasadnione treścią pozycji.' : ''}` };
}

function addLine(syntax, line) { return syntax.replace(/\s*$/, '') + '\n' + line; }

export function MiTable({ res, module, onApply }) {
  const mi = res.mi || [];
  if (!mi.length) return <Interpretation tone="good" title="Brak istotnych indeksów modyfikacji">Żadna dodatkowa relacja nie poprawiłaby χ² o więcej niż 3,84 (p &lt; 0,05).</Interpretation>;
  return (
    <ResultTable dense
      columns={[{ key: 'rel', label: 'Relacja', type: 'text', render: (v) => <span className="mono">{v}</span> }, { key: 'mi', label: 'MI', type: 'num', digits: 1 }, { key: 'epc', label: 'EPC', type: 'num', digits: 2 }, { key: 'sepc', label: 'sEPC', type: 'num', digits: 2 },
        { key: 'act', label: '', type: 'text', render: (v, row) => <Button size="sm" variant="ghost" icon="plus" onClick={() => onApply(row.raw)}>Dodaj</Button> }]}
      rows={mi.slice(0, 12).map((m) => ({ rel: `${m.lhs} ${m.op} ${m.rhs}`, mi: m.mi, epc: m.epc, sepc: m.sepc, raw: m, flag: m.op === '=~' ? 'poor' : undefined }))}
      note="MI ≥ 3,84 ≈ p < 0,05 przy 1 df. Ładunki krzyżowe (=~) zmieniają strukturę skali — rozważ je tylko z mocnym uzasadnieniem (MacCallum i in., 1992)." />
  );
}

export function useMiApply(module, getSyntax, setSyntax, refit) {
  return async function apply(m) {
    const line = `${m.lhs} ${m.op} ${m.rhs}`;
    const before = getSyntax();
    const after = addLine(before, line);
    setSyntax(after);
    const prev = getState().results[module] && getState().results[module].value;
    const res = await refit(after);
    const d = logDecision({ module: module.toUpperCase(), moduleIcon: module, kind: 'add', origin: 'proposal', action: `Dodano ${line}`,
      reason: `Indeks modyfikacji MI = ${format.num(m.mi, 1)}, sEPC = ${n2(m.sepc)}. ${m.op === '~~' ? 'Uzasadnij podobieństwem treści pozycji.' : 'Ładunek krzyżowy — wymaga uzasadnienia teoretycznego.'}`,
      effects: prev && res ? [{ label: 'CFI', from: n3(prev.fit.cfi), to: n3(res.fit.cfi), tone: 'good' }, { label: 'RMSEA', from: n3(prev.fit.rmsea), to: n3(res.fit.rmsea) }] : undefined,
      undo: { type: 'syntax', target: module, before } });
    toast(`Dodano ${line}. Decyzja jest w dzienniku.`, { actionLabel: 'Cofnij', onAction: async () => { await revertDecision(d.id); refit(before); } });
  };
}

export default function CfaScreen() {
  const data = useStore((s) => s.data);
  const res = useStore((s) => s.results.cfa);
  const boot = useStore((s) => s.results.cfaBoot);
  const syntax = useStore((s) => s.syntax.cfa);
  const estimator = useStore((s) => s.estimator);
  const split = useStore((s) => s.split);
  const settings = useStore((s) => s.settings);
  const models = useStore((s) => s.models);
  const mode = useStore((s) => s.mode);
  const [text, setText] = useState(syntax);
  const [tab, setTab] = useState('load');
  const [missing, setMissing] = useState('listwise');
  const [cmp, setCmp] = useState(null);
  const { fit, running, error, setError, run } = useModelRunner('cfa');

  useEffect(() => {
    if (!data) return;
    let t = syntax;
    if (!t) { t = cfaSyntaxFromScales(scaleMap(), getState().efaSkip); setState((s) => ({ syntax: Object.assign({}, s.syntax, { cfa: t }) })); }
    setText(t);
    if (t && (!res || res.stale)) fit(t, { missing });
  }, [data, syntax]);

  const vars = useMemo(() => new Set(data ? data.variables.map((v) => v.name) : []), [data]);
  const { diags, ident } = useMemo(() => syntaxDiagnostics(text, vars), [text, vars]);
  if (!data) return <Screen><NeedData /></Screen>;
  const r = res && res.value;
  const bootOk = boot && boot.value && !boot.stale && boot.value.std_lo;

  function commit(t) { setState((s) => ({ syntax: Object.assign({}, s.syntax, { cfa: t }) })); }
  async function runNow() {
    const before = getState().syntax.cfa;
    if (text !== before) {
      commit(text);
      logDecision({ module: 'CFA', moduleIcon: 'cfa', kind: 'change', action: 'Zmieniono specyfikację modelu CFA', reason: 'Edycja składni.', undo: { type: 'syntax', target: 'cfa', before } });
    }
    await fit(text, { missing });
  }
  async function runBoot() {
    const R = settings.bootR;
    const out = await runEngineJob({ label: `Bootstrap CFA (${R})`, module: 'CFA', icon: 'cfa', kind: 'boot', params: { syntax: r.syntax, part: r.part, R, seed: settings.seed }, chunk: 20 });
    if (!out.cancelled) setResult('cfaBoot', out.result);
  }
  const applyMi = useMiApply('cfa', () => getState().syntax.cfa, (t) => { commit(t); setText(t); }, (t) => fit(t, { missing }));

  function saveModel() {
    const name = window.prompt('Nazwa modelu do porównania', `CFA ${models.filter((m) => m.kind === 'cfa').length + 1}`);
    if (!name) return;
    setState((s) => ({ models: s.models.concat([{ id: 'm' + (s.models.length + 1), name, syntax: r.syntax, kind: 'cfa' }]) }));
    toast(`Zapisano model „${name}” do porównania.`);
  }
  async function compareModels() {
    await run(async () => setCmp(await engine.call('compare_models', { models: models.filter((m) => m.kind === 'cfa'), part: r.part, estimator })));
  }

  const scales = r ? r.scales_used : {};
  const idx = {};
  if (r) r.params.forEach((p, i) => { idx[p.lhs + p.op + p.rhs] = i; });
  const rows = [];
  if (r) Object.entries(scales).forEach(([f, its]) => {
    const ls = its.map((it) => r.params[idx[f + '=~' + it]].std);
    const cr = Math.pow(ls.reduce((a, b) => a + b, 0), 2) / (Math.pow(ls.reduce((a, b) => a + b, 0), 2) + ls.reduce((a, b) => a + (1 - b * b), 0));
    const ave = ls.reduce((a, b) => a + b * b, 0) / ls.length;
    rows.push({ group: `${f} · CR = ${n2(cr)} · AVE = ${n2(ave)}` });
    its.forEach((it) => {
      const i = idx[f + '=~' + it];
      const p = r.params[i];
      const ci = bootOk ? [boot.value.std_lo[i], boot.value.std_hi[i]] : [p.std_lo, p.std_hi];
      rows.push({ item: it, text: p.label_text || '', b: p.std, se: p.std_se, ci, p: p.free ? p.p : undefined, raw: p.est, flag: p.std < 0.4 ? 'poor' : undefined });
    });
  });
  const covRows = r ? r.params.filter((p) => p.op === '~~' && p.lhs !== p.rhs).map((p) => ({ rel: `${p.lhs} ~~ ${p.rhs}`, r: p.std, ci: [p.std_lo, p.std_hi], p: p.p, flag: r.latent.includes(p.lhs) && Math.abs(p.std) > 0.85 ? 'poor' : undefined })) : [];
  const resid = r ? r.params.filter((p) => p.op === '~~' && p.lhs === p.rhs && r.observed.includes(p.lhs)).map((p) => ({ v: p.lhs, est: p.est, std: p.std, r2: r.r2[p.lhs] })) : [];
  const interp = r ? fitInterpretation(r) : null;
  const diag = r ? pathDiagramFromFit(r) : null;
  const lams = rows.filter((x) => x.item).map((x) => x.b);
  const highPhi = covRows.filter((x) => x.flag);

  return (
    <Screen>
      <Head eyebrow="Konfirmacyjna analiza czynnikowa" title={r ? `Model ${Object.keys(scales).length}-czynnikowy` : 'Potwierdź strukturę czynnikową'}
        meta={r ? [<Badge key="n">n = {int(r.n)} ({r.part === 'cfa' ? 'część CFA' : 'cała próba'})</Badge>, <Badge key="e">{r.estimator}{r.missing === 'em' ? ' · EM' : ' · listwise'}</Badge>,
          bootOk ? <SeedBadge key="s" seed={boot.value.seed} R={boot.value.ok} /> : null,
          <Badge key="i" tone={r.converged ? 'good' : 'poor'} icon={r.converged ? 'good' : 'poor'}>{r.converged ? `zbieżny · df = ${r.df}` : 'brak zbieżności'}</Badge>].filter(Boolean) : []}>
        <Button variant="secondary" icon="shuffle" disabled={!r} onClick={() => run(runBoot)}>Bootstrap CI</Button>
        <Button variant="secondary" icon="pin" disabled={!r} onClick={saveModel}>Zapisz do porównania</Button>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <StaleNote stale={res && res.stale} onRun={runNow} running={running} />
      {r && r.part === 'all' && split.use === false ? <Interpretation tone="warn" title="CFA na tej samej próbie co EFA">Dopasowanie może być zawyżone. Włącz podział próby w module EFA.</Interpretation> : null}
      {r && r.heywood.length ? (
        <Diagnosis level="poor" title="Rozwiązanie niedopuszczalne (przypadek Heywooda)" what={r.heywood.map((h) => h.kind === 'negative_variance' ? `Ujemna wariancja ${h.var} = ${n3(h.value)}` : `Ładunek standaryzowany ${h.var} = ${n2(h.value)} > 1`).join('; ')}
          effect="Oszacowania i dopasowanie nie nadają się do interpretacji." fixes={[{ title: 'Sprawdź czynnik z dwiema pozycjami albo bardzo silnie skorelowane czynniki', recommended: true }, { title: 'Połącz czynniki albo dodaj pozycje' }]} source="Kolenikov i Bollen (2012)" />
      ) : null}
      <CollinearityNote res={r} />
      <div className="editor">
        <Panel title="Model" subtitle="Składnia lavaan · Ctrl Enter uruchamia" actions={<Button size="sm" variant="ghost" icon="refresh" onClick={() => setText(cfaSyntaxFromScales(scaleMap(), getState().efaSkip))}>Ze skal</Button>}>
          <SyntaxEditor value={text} onChange={setText} diagnostics={diags} height={220} label="Składnia modelu CFA"
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runNow(); } }} />
          <div className="row" style={{ marginTop: 12 }}>
            <Button variant="primary" icon="play" loading={running} disabled={diags.length > 0 || !text.trim()} onClick={runNow}>Uruchom CFA</Button>
            {ident ? <Verdict level={ident.ok ? 'good' : 'poor'}>{ident.ok ? `wstępnie: ${ident.params} parametrów, df = ${ident.df} (df ≥ 0 to warunek konieczny, nie wystarczający)` : (ident.issues[0] && ident.issues[0].message) || 'model nieidentyfikowalny'}</Verdict> : null}
          </div>
        </Panel>
        <Panel title="Ustawienia">
          <div className="stack">
            <Field label="Estymator" hint={(ESTIMATORS.find((e) => e.value === estimator) || {}).hint}>
              <Select value={estimator} onChange={(e) => { const before = estimator; setState({ estimator: e.target.value }); markStale(withDependents(['cfa', 'sem'])); logDecision({ module: 'CFA', moduleIcon: 'cfa', kind: 'change', action: `Estymator ${before} → ${e.target.value}`, undo: { type: 'estimator', before } }); }} options={ESTIMATORS} />
            </Field>
            <Field label="Braki danych" hint={missing === 'em' ? 'Kowariancja z algorytmu EM, estymator ML, N = osoby z co najmniej jedną odpowiedzią. To nie jest FIML: błędy standardowe i testy w tym trybie nie są zwalidowane — traktuj je ostrożnie.' : 'Usuwa respondentów z jakimkolwiek brakiem w pozycjach modelu.'}>
              <Select value={missing} onChange={(e) => { setMissing(e.target.value); fit(text, { missing: e.target.value }); }} options={[{ value: 'listwise', label: 'tylko kompletne (listwise)' }, { value: 'em', label: 'EM (kowariancja)' }]} />
            </Field>
          </div>
        </Panel>
      </div>
      {running && !r ? <Loading /> : null}
      {r ? (
        <>
          <FitBlock res={r} />
          <Interpretation tone={interp.tone} title={interp.title} source="Progi: Hu i Bentler (1999)"
            actions={<Button size="sm" variant="ghost" icon="copy" onClick={() => copyText(fitSentence(r.fit, r.estimator === 'MLM', 'en')).then(() => toast('Skopiowano zdanie APA.'))}>Kopiuj APA</Button>}>
            {interp.text} Ładunki standaryzowane: od <b>{n2(Math.min(...lams))}</b> do <b>{n2(Math.max(...lams))}</b>.{highPhi.length ? ` Korelacja czynników ${highPhi.map((x) => x.rel.replace(' ~~ ', '–') + ' = ' + n2(x.r)).join(', ')} przekracza 0,85 — skale mogą mierzyć to samo.` : ''}
          </Interpretation>
          <div className="cols">
            <Panel flush title="Wyniki" subtitle={bootOk ? `95% CI z bootstrapu (${boot.value.ok} prób)` : '95% CI metodą delta'}>
              <div className="pad-x"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'load', label: 'Ładunki' }, { id: 'cov', label: 'Korelacje' }, { id: 'res', label: 'Reszty i R²' }, { id: 'mi', label: 'Indeksy modyfikacji', count: r.mi.length || undefined }, { id: 'cmp', label: 'Porównanie modeli', count: models.filter((m) => m.kind === 'cfa').length || undefined }]} /></div>
              <div className="pad scroll-x">
                {tab === 'load' ? <ResultTable dense columns={[{ key: 'item', label: 'Pozycja', type: 'var' }, { key: 'text', label: 'Treść', type: 'text' }, { key: 'b', label: 'λ', type: 'est', weakBelow: 0.4 }, { key: 'se', label: 'SE', type: 'num', digits: 3 }, { key: 'ci', label: '95% CI', type: 'ci' }, { key: 'raw', label: 'B', type: 'num', digits: 2 }]}
                  rows={rows} note="λ — ładunek standaryzowany, B — niestandaryzowany (pierwsza pozycja ustalona na 1). *** p < 0,001." /> : null}
                {tab === 'cov' ? <ResultTable dense columns={[{ key: 'rel', label: 'Relacja', type: 'text' }, { key: 'r', label: 'r', type: 'est' }, { key: 'ci', label: '95% CI', type: 'ci' }, { key: 'p', label: 'p', type: 'p' }]} rows={covRows} note="Korelacje > 0,85 sugerują brak trafności różnicowej (Brown, 2015)." /> : null}
                {tab === 'res' ? <ResultTable dense columns={[{ key: 'v', label: 'Pozycja', type: 'var' }, { key: 'est', label: 'Wariancja reszt', type: 'num', digits: 3 }, { key: 'std', label: 'Standaryzowana', type: 'num', digits: 2 }, { key: 'r2', label: 'R²', type: 'num', digits: 2 }]} rows={resid} /> : null}
                {tab === 'mi' ? <MiTable res={r} module="cfa" onApply={(m) => run(() => applyMi(m))} /> : null}
                {tab === 'cmp' ? (
                  <div className="stack">
                    <p className="subtle">Zapisz kolejne wersje modelu przyciskiem „Zapisz do porównania”, a potem porównaj je testem różnicy χ² (modele zagnieżdżone) i kryteriami informacyjnymi.</p>
                    <div className="row"><Button size="sm" variant="secondary" icon="bridge" disabled={models.filter((m) => m.kind === 'cfa').length < 2} onClick={compareModels}>Porównaj zapisane modele</Button>
                      {models.length ? <Button size="sm" variant="ghost" icon="trash" onClick={() => { setState({ models: [] }); setCmp(null); }}>Wyczyść listę</Button> : null}</div>
                    {cmp ? <>
                      <ResultTable dense columns={[{ key: 'name', label: 'Model', type: 'text' }, { key: 'df', label: 'df', type: 'num', digits: 0 }, { key: 'chi2', label: 'χ²', type: 'num', digits: 2 }, { key: 'cfi', label: 'CFI', type: 'num', digits: 3 }, { key: 'rmsea', label: 'RMSEA', type: 'num', digits: 3 }, { key: 'aic', label: 'AIC', type: 'num', digits: 1 }, { key: 'bic', label: 'BIC', type: 'num', digits: 1 }]}
                        rows={cmp.models.filter((m) => m.ok).map((m) => ({ name: m.name, df: m.df, chi2: m.fit.chi2, cfi: m.fit.cfi, rmsea: m.fit.rmsea, aic: m.fit.aic, bic: m.fit.bic }))} note="Niższe AIC i BIC — lepszy kompromis dopasowania i złożoności." />
                      {cmp.tests.length ? <ResultTable dense columns={[{ key: 't', label: 'Porównanie', type: 'text' }, { key: 'd', label: 'Δχ²', type: 'num', digits: 2 }, { key: 'ddf', label: 'Δdf', type: 'num', digits: 0 }, { key: 'p', label: 'p', type: 'p' }, { key: 'dcfi', label: 'ΔCFI', type: 'num', digits: 3 }]}
                        rows={cmp.tests.map((t) => ({ t: `${(cmp.models.find((m) => m.id === t.restricted) || {}).name} vs ${(cmp.models.find((m) => m.id === t.general) || {}).name}${t.nesting === 'unverified' ? ' (zagnieżdżenie niepotwierdzone)' : ''}`, d: t.invalid ? NaN : t.dchi2, ddf: t.ddf, p: t.p, dcfi: t.dcfi }))}
                        note={(cmp.tests.some((t) => t.scaled) ? "Δχ² skalowane metodą Satorry–Bentlera (2001) dla estymatora MLM. " : "") + "Test liczy się tylko dla modeli na tych samych zmiennych i wierszach, ze zbieżnym i dopuszczalnym rozwiązaniem; poprawny jest wyłącznie dla modeli zagnieżdżonych. ΔCFI podano opisowo — próg −0,01 Cheunga i Rensvolda (2002) zaproponowano dla testów niezmienniczości pomiarowej."} /> : null}
                      {[...cmp.tests.flatMap((t) => t.warnings || []), ...(cmp.skipped || []).map((s) => `Pominięto parę ${s.restricted} – ${s.general}: ${s.reasons.join(', ')}.`)].map((w, i) => <Interpretation key={i} tone="warn" title="Uwaga do porównania modeli">{w}</Interpretation>)}
                    </> : null}
                  </div>
                ) : null}
              </div>
            </Panel>
            <div className="stack">
              <Panel title="Diagram ścieżek" subtitle="Ładunki i korelacje standaryzowane" actions={<Button size="sm" variant="ghost" icon="download" onClick={() => { const svg = document.querySelector('.cfa-diagram svg'); if (svg) download('cfa_diagram.svg', new XMLSerializer().serializeToString(svg), 'image/svg+xml'); }}>SVG</Button>}>
                <div className="cfa-diagram scroll-x"><PathDiagram nodes={diag.nodes} edges={diag.edges} width={diag.width} height={diag.height} legend label="Diagram ścieżek modelu CFA" /></div>
              </Panel>
              {mode !== 'simple' ? <div className="row"><Button size="sm" variant="secondary" icon="download" onClick={async () => { const a = await engine.call('analysis_csv', { syntax: r.syntax, part: r.part }); download(ANALYSIS_FILE, a.csv, 'text/csv;charset=utf-8'); toast(`Pobrano dane analityczne: N = ${a.n}, ${a.vars.length} zmiennych${a.steps.length ? '; przygotowanie: ' + a.steps.join(', ') : ''}.`); }}>Dane analityczne (CSV) do kodu</Button></div> : null}
              {mode !== 'simple' ? <CodeExport snippets={codeSnippets(r.syntax, { estimator: r.estimator, part: r.part === 'all' ? undefined : r.part, seed: r.split_seed != null ? r.split_seed : settings.seed, kind: 'cfa', bootstrap: bootOk ? boot.value.R : undefined, version: ENGINE_VERSION })} defaultLang={mode === 'code' ? 'lavaan' : 'python'} meta={`SEMplex ${ENGINE_VERSION} · ${r.estimator}`} /> : null}
            </div>
          </div>
        </>
      ) : null}
    </Screen>
  );
}
