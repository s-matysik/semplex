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
import { t } from '../i18n/index.js';

/* Shared view of model results (CFA and SEM). */
export function useModelRunner(module) {
  const { running, error, setError, run } = useRun();
  async function fit(syntax, { part, missing } = {}) {
    return run(async () => {
      const p = part || (getState().split.use ? 'cfa' : 'all');
      if (p !== 'all') await ensureSplit();
      const res = await engine.call('fit', { syntax, estimator: getState().estimator, part: p, missing: missing || 'listwise', mi: true });
      setResult(module, res);
      setState((s) => ({ results: Object.assign({}, s.results, { [module + t("Boot")]: s.results[module + t("Boot")] ? Object.assign({}, s.results[module + t("Boot")], { stale: true }) : undefined }) }));
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
    diags.push({ line: ln + 1 || 1, message: t("Zmienna „{0}” nie występuje w danych.", { 0: n.id }) });
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
    ...rs.map((x) => t("korelacja czynników {0} i {1} = {2}", { 0: x.a, 1: x.b, 2: n2(x.r) })),
    ...paths.map((x) => `β ${x.rhs} → ${x.lhs} = ${n2(x.value)}${x.partner ? t(" (predyktor skorelowany z {0}: r = {1})", { 0: x.partner, 1: n2(x.r) }) : ''}`),
  ].join('; ');
  return (
    <Diagnosis level={paths.length ? 'poor' : 'warn'} title={paths.length ? t("Współliniowość czynników: współczynniki standaryzowane powyżej 1") : t("Bardzo silnie skorelowane czynniki")}
      what={what}
      effect={paths.length ? t("Ścieżki z |β| > 1 i przeciwnymi znakami są artefaktem współliniowości (supresji); nie interpretuj ich osobno.") : t("Czynniki mogą mierzyć ten sam konstrukt - trafność różnicowa jest wątpliwa.")}
      fixes={[{ title: t("Sprawdź HTMT w module Rzetelność i trafność"), recommended: true }, { title: t("Połącz czynniki albo usuń jedną ze ścieżek") }, { title: t("Sprawdź, czy pary pozycji nie mają wspólnego sformułowania (kowariancja reszt)") }]}
      source={t("Henseler i in. (2015); Grewal i in. (2004)")} />
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
  const title = tone === 'good' ? t("Model dobrze pasuje do danych") : tone === 'ok' ? t("Dopasowanie jest dopuszczalne") : t("Model słabo pasuje do danych");
  const parts = [];
  if (grade(cfi, RULES.cfi) !== 'good') parts.push(t("CFI = {0} poniżej 0,95", { 0: n3(cfi) }));
  if (grade(rmsea, RULES.rmsea) !== 'good') parts.push(t("RMSEA = {0} powyżej 0,06", { 0: n3(rmsea) }));
  if (grade(f.srmr, RULES.srmr) !== 'good') parts.push(t("SRMR = {0} powyżej 0,08", { 0: n3(f.srmr) }));
  return { tone: tone === 'ok' ? 'warn' : tone, title, text: `${fitSentence(f, scaled)}.${parts.length ? ' ' + parts.join('; ') + t(". Sprawdź indeksy modyfikacji, ale dodawaj tylko zmiany uzasadnione treścią pozycji.") : ''}` };
}

function addLine(syntax, line) { return syntax.replace(/\s*$/, '') + '\n' + line; }

export function MiTable({ res, module, onApply }) {
  const mi = res.mi || [];
  if (!mi.length) return <Interpretation tone="good" title={t("Brak istotnych indeksów modyfikacji")}>Żadna dodatkowa relacja nie poprawiłaby χ² o więcej niż 3,84 (p &lt; 0,05).</Interpretation>;
  return (
    <ResultTable dense
      columns={[{ key: 'rel', label: t("Relacja"), type: 'text', render: (v) => <span className="mono">{v}</span> }, { key: 'mi', label: 'MI', type: 'num', digits: 1 }, { key: 'epc', label: 'EPC', type: 'num', digits: 2 }, { key: 'sepc', label: 'sEPC', type: 'num', digits: 2 },
        { key: 'act', label: '', type: 'text', render: (v, row) => <Button size="sm" variant="ghost" icon="plus" onClick={() => onApply(row.raw)}>{t("Dodaj")}</Button> }]}
      rows={mi.slice(0, 12).map((m) => ({ rel: `${m.lhs} ${m.op} ${m.rhs}`, mi: m.mi, epc: m.epc, sepc: m.sepc, raw: m, flag: m.op === '=~' ? 'poor' : undefined }))}
      note="MI ≥ 3,84 ≈ p < 0,05 przy 1 df. Ładunki krzyżowe (=~) zmieniają strukturę skali - rozważ je tylko z mocnym uzasadnieniem (MacCallum i in., 1992)." />
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
    const d = logDecision({ module: module.toUpperCase(), moduleIcon: module, kind: 'add', origin: 'proposal', action: t("Dodano {0}", { 0: line }),
      reason: t("Indeks modyfikacji MI = {0}, sEPC = {1}. {2}", { 0: format.num(m.mi, 1), 1: n2(m.sepc), 2: m.op === '~~' ? t("Uzasadnij podobieństwem treści pozycji.") : t("Ładunek krzyżowy - wymaga uzasadnienia teoretycznego.") }),
      effects: prev && res ? [{ label: 'CFI', from: n3(prev.fit.cfi), to: n3(res.fit.cfi), tone: 'good' }, { label: 'RMSEA', from: n3(prev.fit.rmsea), to: n3(res.fit.rmsea) }] : undefined,
      undo: { type: 'syntax', target: module, before } });
    toast(t("Dodano {0}. Decyzja jest w dzienniku.", { 0: line }), { actionLabel: t("Cofnij"), onAction: async () => { await revertDecision(d.id); refit(before); } });
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
      logDecision({ module: 'CFA', moduleIcon: 'cfa', kind: 'change', action: t("Zmieniono specyfikację modelu CFA"), reason: t("Edycja składni."), undo: { type: 'syntax', target: 'cfa', before } });
    }
    await fit(text, { missing });
  }
  async function runBoot() {
    const R = settings.bootR;
    const out = await runEngineJob({ label: t("Bootstrap CFA ({0})", { 0: R }), module: 'CFA', icon: 'cfa', kind: 'boot', params: { syntax: r.syntax, part: r.part, R, seed: settings.seed }, chunk: 20 });
    if (!out.cancelled) setResult('cfaBoot', out.result);
  }
  const applyMi = useMiApply('cfa', () => getState().syntax.cfa, (t) => { commit(t); setText(t); }, (t) => fit(t, { missing }));

  function saveModel() {
    const name = window.prompt(t("Nazwa modelu do porównania"), `CFA ${models.filter((m) => m.kind === 'cfa').length + 1}`);
    if (!name) return;
    setState((s) => ({ models: s.models.concat([{ id: 'm' + (s.models.length + 1), name, syntax: r.syntax, kind: 'cfa' }]) }));
    toast(t("Zapisano model „{0}” do porównania.", { 0: name }));
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
    rows.push({ group: t("{0} · CR = {1} · AVE = {2}", { 0: f, 1: n2(cr), 2: n2(ave) }) });
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
      <Head eyebrow={t("Konfirmacyjna analiza czynnikowa")} title={r ? t("Model {0}-czynnikowy", { 0: Object.keys(scales).length }) : t("Potwierdź strukturę czynnikową")}
        meta={r ? [<Badge key="n">n = {int(r.n)} ({r.part === 'cfa' ? t("część CFA") : t("cała próba")})</Badge>, <Badge key="e">{r.estimator}{r.missing_mode === 'em' ? t(" · EM") : t(" · listwise")}</Badge>,
          bootOk ? <SeedBadge key="s" seed={boot.value.seed} R={boot.value.ok} /> : null,
          <Badge key="i" tone={r.converged ? 'good' : 'poor'} icon={r.converged ? 'good' : 'poor'}>{r.converged ? t("zbieżny · df = {0}", { 0: r.df }) : t("brak zbieżności")}</Badge>].filter(Boolean) : []}>
        <Button variant="secondary" icon="shuffle" disabled={!r} onClick={() => run(runBoot)}>{t("Bootstrap CI")}</Button>
        <Button variant="secondary" icon="pin" disabled={!r} onClick={saveModel}>{t("Zapisz do porównania")}</Button>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <StaleNote stale={res && res.stale} onRun={runNow} running={running} />
      {r && r.part === 'all' && split.use === false ? <Interpretation tone="warn" title={t("CFA na tej samej próbie co EFA")}>{t("Dopasowanie może być zawyżone. Włącz podział próby w module EFA.")}</Interpretation> : null}
      {r && r.heywood.length ? (
        <Diagnosis level="poor" title={t("Rozwiązanie niedopuszczalne (przypadek Heywooda)")} what={r.heywood.map((h) => h.kind === 'negative_variance' ? t("Ujemna wariancja {0} = {1}", { 0: h.var, 1: n3(h.value) }) : t("Ładunek standaryzowany {0} = {1} > 1", { 0: h.var, 1: n2(h.value) })).join('; ')}
          effect={t("Oszacowania i dopasowanie nie nadają się do interpretacji.")} fixes={[{ title: t("Sprawdź czynnik z dwiema pozycjami albo bardzo silnie skorelowane czynniki"), recommended: true }, { title: t("Połącz czynniki albo dodaj pozycje") }]} source={t("Kolenikov i Bollen (2012)")} />
      ) : null}
      <CollinearityNote res={r} />
      <div className="editor">
        <Panel title={t("Model")} subtitle={t("Składnia lavaan · Ctrl Enter uruchamia")} actions={<Button size="sm" variant="ghost" icon="refresh" onClick={() => setText(cfaSyntaxFromScales(scaleMap(), getState().efaSkip))}>{t("Ze skal")}</Button>}>
          <SyntaxEditor value={text} onChange={setText} diagnostics={diags} height={220} label={t("Składnia modelu CFA")}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runNow(); } }} />
          <div className="row" style={{ marginTop: 12 }}>
            <Button variant="primary" icon="play" loading={running} disabled={diags.length > 0 || !text.trim()} onClick={runNow}>{t("Uruchom CFA")}</Button>
            {ident ? <Verdict level={ident.ok ? 'good' : 'poor'}>{ident.ok ? t("wstępnie: {0} parametrów, df = {1} (df ≥ 0 to warunek konieczny, nie wystarczający)", { 0: ident.params, 1: ident.df }) : (ident.issues[0] && ident.issues[0].message) || t("model nieidentyfikowalny")}</Verdict> : null}
          </div>
        </Panel>
        <Panel title={t("Ustawienia")}>
          <div className="stack">
            <Field label={t("Estymator")} hint={(ESTIMATORS.find((e) => e.value === estimator) || {}).hint}>
              <Select value={estimator} onChange={(e) => { const before = estimator; setState({ estimator: e.target.value }); markStale(withDependents(['cfa', 'sem'])); logDecision({ module: 'CFA', moduleIcon: 'cfa', kind: 'change', action: t("Estymator {0} → {1}", { 0: before, 1: e.target.value }), undo: { type: 'estimator', before } }); }} options={ESTIMATORS} />
            </Field>
            <Field label={t("Braki danych")} hint={missing === 'em' ? t("Kowariancja z algorytmu EM, estymator ML, N = osoby z co najmniej jedną odpowiedzią. To nie jest FIML: błędy standardowe i testy w tym trybie nie są zwalidowane - traktuj je ostrożnie.") : t("Usuwa respondentów z jakimkolwiek brakiem w pozycjach modelu.")}>
              <Select value={missing} onChange={(e) => { const before = missing, to = e.target.value; setMissing(to); logDecision({ module: 'CFA', moduleIcon: 'cfa', kind: 'change', action: t("Braki danych: {0} → {1}", { 0: before === 'em' ? 'EM' : 'listwise', 1: to === 'em' ? 'EM' : 'listwise' }), reason: to === 'em' ? t("Kowariancja z algorytmu EM; tryb niezwalidowany.") : t("Tylko kompletne przypadki.") }); fit(text, { missing: to }); }} options={[{ value: 'listwise', label: t("tylko kompletne (listwise)") }, { value: 'em', label: t("EM (kowariancja)") }]} />
            </Field>
          </div>
        </Panel>
      </div>
      {running && !r ? <Loading /> : null}
      {r ? (
        <>
          <FitBlock res={r} />
          <Interpretation tone={interp.tone} title={interp.title} source={t("Progi: Hu i Bentler (1999)")}
            actions={<Button size="sm" variant="ghost" icon="copy" onClick={() => copyText(fitSentence(r.fit, r.estimator === 'MLM', 'en')).then(() => toast(t("Skopiowano zdanie APA.")))}>{t("Kopiuj APA")}</Button>}>
            {interp.text} {t("Ładunki standaryzowane: od")} <b>{n2(Math.min(...lams))}</b> do <b>{n2(Math.max(...lams))}</b>.{highPhi.length ? t(" Korelacja czynników {0} przekracza 0,85 - skale mogą mierzyć to samo.", { 0: highPhi.map((x) => x.rel.replace(' ~~ ', '–') + ' = ' + n2(x.r)).join(', ') }) : ''}
          </Interpretation>
          <div className="cols">
            <Panel flush title={t("Wyniki")} subtitle={bootOk ? t("95% CI z bootstrapu ({0} prób)", { 0: boot.value.ok }) : t("95% CI metodą delta")}>
              <div className="pad-x"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'load', label: t("Ładunki") }, { id: 'cov', label: t("Korelacje") }, { id: 'res', label: t("Reszty i R²") }, { id: 'mi', label: t("Indeksy modyfikacji"), count: r.mi.length || undefined }, { id: 'cmp', label: t("Porównanie modeli"), count: models.filter((m) => m.kind === 'cfa').length || undefined }]} /></div>
              <div className="pad scroll-x">
                {tab === 'load' ? <ResultTable dense columns={[{ key: 'item', label: t("Pozycja"), type: 'var' }, { key: 'text', label: t("Treść"), type: 'text' }, { key: 'b', label: 'λ', type: 'est', weakBelow: 0.4 }, { key: 'se', label: 'SE', type: 'num', digits: 3 }, { key: 'ci', label: t("95% CI"), type: 'ci' }, { key: 'raw', label: 'B', type: 'num', digits: 2 }]}
                  rows={rows} note={t("λ - ładunek standaryzowany, B - niestandaryzowany (pierwsza pozycja ustalona na 1). *** p < 0,001.")} /> : null}
                {tab === 'cov' ? <ResultTable dense columns={[{ key: 'rel', label: t("Relacja"), type: 'text' }, { key: 'r', label: 'r', type: 'est' }, { key: 'ci', label: t("95% CI"), type: 'ci' }, { key: 'p', label: 'p', type: 'p' }]} rows={covRows} note={t("Korelacje > 0,85 sugerują brak trafności różnicowej (Brown, 2015).")} /> : null}
                {tab === 'res' ? <ResultTable dense columns={[{ key: 'v', label: t("Pozycja"), type: 'var' }, { key: 'est', label: t("Wariancja reszt"), type: 'num', digits: 3 }, { key: 'std', label: t("Standaryzowana"), type: 'num', digits: 2 }, { key: 'r2', label: 'R²', type: 'num', digits: 2 }]} rows={resid} /> : null}
                {tab === 'mi' ? <MiTable res={r} module="cfa" onApply={(m) => run(() => applyMi(m))} /> : null}
                {tab === 'cmp' ? (
                  <div className="stack">
                    <p className="subtle">Zapisz kolejne wersje modelu przyciskiem „Zapisz do porównania”, a potem porównaj je testem różnicy χ² (modele zagnieżdżone) i kryteriami informacyjnymi.</p>
                    <div className="row"><Button size="sm" variant="secondary" icon="bridge" disabled={models.filter((m) => m.kind === 'cfa').length < 2} onClick={compareModels}>{t("Porównaj zapisane modele")}</Button>
                      {models.length ? <Button size="sm" variant="ghost" icon="trash" onClick={() => { setState({ models: [] }); setCmp(null); }}>{t("Wyczyść listę")}</Button> : null}</div>
                    {cmp ? <>
                      <ResultTable dense columns={[{ key: 'name', label: t("Model"), type: 'text' }, { key: 'df', label: 'df', type: 'num', digits: 0 }, { key: 'chi2', label: 'χ²', type: 'num', digits: 2 }, { key: 'cfi', label: 'CFI', type: 'num', digits: 3 }, { key: 'rmsea', label: 'RMSEA', type: 'num', digits: 3 }, { key: 'aic', label: 'AIC', type: 'num', digits: 1 }, { key: 'bic', label: 'BIC', type: 'num', digits: 1 }]}
                        rows={cmp.models.filter((m) => m.ok).map((m) => ({ name: m.name, df: m.df, chi2: m.fit.chi2, cfi: m.fit.cfi, rmsea: m.fit.rmsea, aic: m.fit.aic, bic: m.fit.bic }))} note={t("Niższe AIC i BIC - lepszy kompromis dopasowania i złożoności.")} />
                      {cmp.tests.length ? <ResultTable dense columns={[{ key: 't', label: t("Porównanie"), type: 'text' }, { key: 'd', label: 'Δχ²', type: 'num', digits: 2 }, { key: 'ddf', label: 'Δdf', type: 'num', digits: 0 }, { key: 'p', label: 'p', type: 'p' }, { key: 'dcfi', label: 'ΔCFI', type: 'num', digits: 3 }]}
                        rows={cmp.tests.map((t) => ({ t: `${(cmp.models.find((m) => m.id === t.restricted) || {}).name} vs ${(cmp.models.find((m) => m.id === t.general) || {}).name}${t.nesting === 'unverified' ? t(" (zagnieżdżenie niepotwierdzone)") : ''}`, d: t.invalid ? NaN : t.dchi2, ddf: t.ddf, p: t.p, dcfi: t.dcfi }))}
                        note={(cmp.tests.some((t) => t.scaled) ? t("Δχ² skalowane metodą Satorry–Bentlera (2001) dla estymatora MLM. ") : "") + t("Test liczy się tylko dla modeli na tych samych zmiennych i wierszach, ze zbieżnym i dopuszczalnym rozwiązaniem; poprawny jest wyłącznie dla modeli zagnieżdżonych. ΔCFI podano opisowo - próg −0,01 Cheunga i Rensvolda (2002) zaproponowano dla testów niezmienniczości pomiarowej.")} /> : null}
                      {[...cmp.tests.flatMap((t) => t.warnings || []), ...(cmp.skipped || []).map((s) => t("Pominięto parę {0} – {1}: {2}.", { 0: s.restricted, 1: s.general, 2: s.reasons.join(', ') }))].map((w, i) => <Interpretation key={i} tone="warn" title={t("Uwaga do porównania modeli")}>{w}</Interpretation>)}
                    </> : null}
                  </div>
                ) : null}
              </div>
            </Panel>
            <div className="stack">
              <Panel title={t("Diagram ścieżek")} subtitle={t("Ładunki i korelacje standaryzowane")} actions={<Button size="sm" variant="ghost" icon="download" onClick={() => { const svg = document.querySelector('.cfa-diagram svg'); if (svg) download('cfa_diagram.svg', new XMLSerializer().serializeToString(svg), 'image/svg+xml'); }}>SVG</Button>}>
                <div className="cfa-diagram scroll-x"><PathDiagram nodes={diag.nodes} edges={diag.edges} width={diag.width} height={diag.height} legend label={t("Diagram ścieżek modelu CFA")} /></div>
              </Panel>
              {mode !== 'simple' ? <div className="row"><Button size="sm" variant="secondary" icon="download" onClick={async () => { const a = await engine.call('analysis_csv', { syntax: r.syntax, part: r.part, missing: r.missing_mode }); download(ANALYSIS_FILE, a.csv, 'text/csv;charset=utf-8'); toast(t("Pobrano dane analityczne: N = {0}, {1} zmiennych{2}{3}.", { 0: a.n, 1: a.vars.length, 2: a.missing === 'em' ? t(" (z brakami - tryb EM)") : '', 3: a.steps.length ? t("; przygotowanie: ") + a.steps.join(', ') : '' })); }}>Dane analityczne (CSV) do kodu</Button></div> : null}
              {mode !== 'simple' ? <CodeExport snippets={codeSnippets(r.syntax, { estimator: r.estimator, part: r.part === 'all' ? undefined : r.part, seed: r.split_seed != null ? r.split_seed : settings.seed, kind: 'cfa', missing: r.missing_mode, bootstrap: bootOk ? boot.value.R : undefined, version: ENGINE_VERSION })} defaultLang={mode === 'code' ? 'lavaan' : 'python'} meta={t("SEMplex {0} · {1}", { 0: ENGINE_VERSION, 1: r.estimator })} /> : null}
            </div>
          </div>
        </>
      ) : null}
    </Screen>
  );
}
