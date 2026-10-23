import { ENGINE_VERSION } from '../engine/client.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Panel, ModelCanvas, Toolbar, SyntaxEditor, Interpretation, ResultTable, Badge, Button, Tabs, Verdict, VariableChip, CodeExport, StatTile, Input, Field, Diagnosis, lavaan, format,
} from 'semplex-ui';
import { useStore, setState, getState, setResult, runEngineJob, logDecision, toast, markStale, go, engine } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, Loading, StaleNote, SeedBadge } from '../ui.jsx';
import { n2, n3, pTxt, int, ci } from '../lib/fit.js';
import { autoLayout, canvasEstimates, codeSnippets, cfaSyntaxFromScales, download, ANALYSIS_FILE } from '../lib/model.js';
import { scaleMap } from '../lib/analysis.js';
import { useModelRunner, syntaxDiagnostics, FitBlock, fitInterpretation, MiTable, useMiApply, CollinearityNote } from './Cfa.jsx';
import { t } from '../i18n/index.js';

function defaultSem() {
  const s = getState();
  const base = s.syntax.cfa || cfaSyntaxFromScales(scaleMap(), s.efaSkip);
  const lv = base.split('\n').filter((l) => /=~/.test(l) && !l.trim().startsWith('#')).map((l) => l.split('=~')[0].trim());
  if (lv.length < 2) return base;
  const y = lv.includes('LOY') ? 'LOY' : lv[lv.length - 1];
  return base + `\n${y} ~ ${lv.filter((x) => x !== y).join(' + ')}`;
}

function modelFrom(text) {
  try { return lavaan.parse(text || ''); } catch (e) { return { nodes: [], edges: [], defined: [], errors: [{ line: 1, message: String(e) }] }; }
}

export default function SemScreen() {
  const data = useStore((s) => s.data);
  const res = useStore((s) => s.results.sem);
  const boot = useStore((s) => s.results.semBoot);
  const syntax = useStore((s) => s.syntax.sem);
  const layout = useStore((s) => s.layout);
  const settings = useStore((s) => s.settings);
  const mode = useStore((s) => s.mode);
  const [text, setText] = useState(syntax);
  const [tool, setTool] = useState('select');
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('paths');
  const [fitKey, setFitKey] = useState(1);
  const [hist, setHist] = useState({ past: [], future: [] });
  const [newLat, setNewLat] = useState(null);
  const { fit, running, error, setError, run } = useModelRunner('sem');
  const [pendingLat, setPendingLat] = useState([]);
  const [pendingObs, setPendingObs] = useState([]);

  useEffect(() => {
    if (!data) return;
    let t = syntax;
    if (!t) { t = defaultSem(); setState((s) => ({ syntax: Object.assign({}, s.syntax, { sem: t }) })); }
    setText(t);
    if (t && (!res || res.stale)) fit(t);
  }, [data]);

  const vars = useMemo(() => new Set(data ? data.variables.map((v) => v.name) : []), [data]);
  const model = useMemo(() => modelFrom(text), [text]);
  const { diags, ident } = useMemo(() => syntaxDiagnostics(text, vars), [text, vars]);
  const auto = useMemo(() => autoLayout(model, { colW: 280 }), [text]);
  if (!data) return <Screen><NeedData /></Screen>;

  const nodes = model.nodes.map((n) => { const p = layout[n.id] || auto[n.id] || { x: 80, y: 80 }; return { id: n.id, kind: n.kind, x: p.x, y: p.y, label: n.id }; });
  const edges = model.edges;
  const r = res && res.value;
  const stale = !r || r.syntax.trim() !== text.trim() || (res && res.stale);
  const est = r ? canvasEstimates(r) : {};

  function pushText(t, record = true) {
    if (record) setHist((h) => ({ past: h.past.concat([text]).slice(-50), future: [] }));
    setText(t);
  }
  function printModel(ns, es) {
    const out = lavaan.print({ nodes: ns, edges: es, defined: model.defined });
    return out;
  }
  function onMove(id, x, y, done) { setState((s) => ({ layout: Object.assign({}, s.layout, { [id]: { x, y } }) })); }
  function onCreateNode(kind, x, y) {
    setTool('select');
    if (kind === 'latent') { setNewLat({ x, y, name: '' }); return; }
    toast(t("Przeciągnij zmienną z listy po prawej, aby dodać zmienną obserwowalną."), { icon: 'info' });
  }
  function addLatent() {
    const name = newLat.name.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || vars.has(name) || model.nodes.some((n) => n.id === name)) { toast(t("Podaj nową nazwę: litery, cyfry i _, inna niż zmienne w danych."), { icon: 'poor' }); return; }
    setState((s) => ({ layout: Object.assign({}, s.layout, { [name]: { x: newLat.x, y: newLat.y } }) }));
    // a latent variable without indicators does not exist in the syntax - we save it as a comment until loadings are added
    pushText(text.replace(/\s*$/, '') + `\n# ${name} =~ (przeciągnij ścieżkę od ${name} do pozycji)`);
    setPendingLat((p) => p.concat([{ id: name, kind: 'latent' }]));
    setNewLat(null);
  }
  const allNodes = nodes.concat(pendingLat.filter((p) => !nodes.some((n) => n.id === p.id)).map((p) => { const q = layout[p.id] || { x: 120, y: 120 }; return { id: p.id, kind: 'latent', x: q.x, y: q.y, label: p.id }; }));
  const allNodes2 = allNodes.concat(pendingObs.filter((p) => !allNodes.some((n) => n.id === p)).map((p) => { const q = layout[p] || { x: 120, y: 200 }; return { id: p, kind: 'observed', x: q.x, y: q.y, label: p }; }));

  function onCreateEdge(from, to, kind) {
    setTool('select');
    if (from === to) return;
    const es = edges.concat([{ from, to, kind }]);
    const ns = allNodes2.filter((n) => es.some((e) => e.from === n.id || e.to === n.id));
    let t = printModel(ns, es);
    const comments = text.split('\n').filter((l) => l.trim().startsWith('#') && !/=~ \(przeciągnij/.test(l) && !/^# (model|kowariancje|efekty)/.test(l.trim()));
    if (comments.length) t = comments.join('\n') + '\n' + t;
    pushText(t);
    setPendingLat((p) => p.filter((x) => x.id !== from && x.id !== to));
    setPendingObs((p) => p.filter((x) => x !== from && x !== to));
  }
  function onDelete(s) {
    if (!s) return;
    let es = edges, ns = allNodes2;
    if (s.type === 'node') { es = edges.filter((e) => e.from !== s.id && e.to !== s.id); ns = allNodes2.filter((n) => n.id !== s.id); setPendingLat((p) => p.filter((x) => x.id !== s.id)); setPendingObs((p) => p.filter((x) => x !== s.id)); }
    else es = edges.filter((e) => lavaan.edgeKey(e) !== s.id);
    pushText(printModel(ns.filter((n) => es.some((e) => e.from === n.id || e.to === n.id)), es));
    setSel(null);
  }
  function onDrop(name, x, y) {
    if (!vars.has(name)) return;
    setState((s) => ({ layout: Object.assign({}, s.layout, { [name]: { x, y } }) }));
    if (!allNodes2.some((n) => n.id === name)) setPendingObs((p) => p.concat([name]));
  }
  function undo() { if (!hist.past.length) return; const prev = hist.past[hist.past.length - 1]; setHist({ past: hist.past.slice(0, -1), future: [text].concat(hist.future) }); setText(prev); }
  function redo() { if (!hist.future.length) return; const nx = hist.future[0]; setHist({ past: hist.past.concat([text]), future: hist.future.slice(1) }); setText(nx); }

  async function runNow() {
    const before = getState().syntax.sem;
    if (text !== before) {
      setState((s) => ({ syntax: Object.assign({}, s.syntax, { sem: text }) }));
      logDecision({ module: 'SEM', moduleIcon: 'sem', kind: 'change', action: t("Zmieniono specyfikację modelu SEM"), reason: t("Edycja modelu w edytorze."), undo: { type: 'syntax', target: 'sem', before } });
    }
    await fit(text);
  }
  async function runBoot() {
    const R = settings.bootR;
    const out = await runEngineJob({ label: t("Bootstrap SEM ({0})", { 0: R }), module: 'SEM', icon: 'sem', kind: 'boot', params: { syntax: r.syntax, part: r.part, R, seed: settings.seed }, chunk: 20 });
    if (!out.cancelled) setResult('semBoot', out.result);
  }
  const applyMi = useMiApply('sem', () => getState().syntax.sem, (t) => { setState((s) => ({ syntax: Object.assign({}, s.syntax, { sem: t }) })); setText(t); }, (t) => fit(t));

  const bootOk = boot && boot.value && !boot.stale && boot.value.std_lo;
  const pIdx = r ? r.params.map((p, i) => [p, i]) : [];
  const paths = pIdx.filter(([p]) => p.op === '~').map(([p, i]) => ({ path: `${p.rhs} → ${p.lhs}`, b: p.std, ci: bootOk ? [boot.value.std_lo[i], boot.value.std_hi[i]] : [p.std_lo, p.std_hi], p: p.p, raw: p.est, se: p.se, label: p.label || '' }));
  const defined = r ? r.defined.map((d) => { const b = bootOk && boot.value.defined ? boot.value.defined.find((x) => x.name === d.name) : null; return { name: d.name, expr: d.expr, b: d.std, ci: b ? [b.std_lo, b.std_hi] : [d.std - 1.96 * d.std_se, d.std + 1.96 * d.std_se], raw: d.est, method: b ? 'bootstrap' : 'delta' }; }) : [];
  const r2 = r ? Object.entries(r.r2).filter(([v]) => r.latent.includes(v) && r.params.some((p) => p.op === '~' && p.lhs === v)) : [];
  const interp = r ? fitInterpretation(r) : null;
  const sigPaths = paths.filter((p) => p.p < 0.05);
  const selEdge = sel && sel.type === 'edge' ? edges.find((e) => lavaan.edgeKey(e) === sel.id) : null;
  const selNode = sel && sel.type === 'node' ? allNodes2.find((n) => n.id === sel.id) : null;

  return (
    <Screen>
      <Head eyebrow={t("Modelowanie strukturalne")} title={t("Edytor modelu SEM")}
        meta={r ? [<Badge key="n">n = {int(r.n)} ({r.part === 'cfa' ? t("część walidacyjna") : t("cała próba")})</Badge>, <Badge key="e">{r.estimator}</Badge>, bootOk ? <SeedBadge key="s" seed={boot.value.seed} R={boot.value.ok} /> : null].filter(Boolean) : []}>
        <Button variant="ghost" icon="layout" onClick={() => { setState({ layout: {} }); setFitKey(fitKey + 1); }}>{t("Uporządkuj układ")}</Button>
        <Button variant="secondary" icon="shuffle" disabled={!r || stale} onClick={() => run(runBoot)}>{t("Bootstrap CI")}</Button>
        <Button variant="primary" icon="play" loading={running} disabled={diags.length > 0 || !text.trim()} onClick={runNow}>{t("Uruchom model")}</Button>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <div className="editor">
        <div className="canvas-wrap">
          <ModelCanvas nodes={allNodes2} edges={edges} selected={sel} tool={tool} estimates={stale ? {} : est} r2={r && !stale ? r.r2 : undefined} showEstimates={!!r} stale={!!r && stale}
            fitOnMount fitKey={fitKey} fitPad={{ top: 72, right: 40, bottom: 48, left: 40 }} minimap={allNodes2.length > 14} controls snap={8}
            emptyTitle={t("Model jest pusty")} emptyText={t("Wpisz składnię albo dodaj zmienne z listy po prawej.")} label={t("Płótno modelu SEM")}
            onSelect={setSel} onMoveNode={onMove} onCreateNode={onCreateNode} onCreateEdge={onCreateEdge} onDelete={onDelete} onDropItem={onDrop}>
            <div className="tb"><Toolbar value={tool} onChange={setTool} onAction={(id) => (id === 'undo' ? undo() : id === 'redo' ? redo() : null)} label={t("Narzędzia modelu")} items={[
              { id: 'select', icon: 'pointer', label: t("Zaznacz"), shortcut: 'V' }, { id: 'latent', icon: 'latent', label: t("Zmienna latentna"), shortcut: 'L' },
              { id: 'path', icon: 'path', label: t("Ścieżka / ładunek"), shortcut: 'P' }, { id: 'cov', icon: 'cov', label: t("Kowariancja"), shortcut: 'C' }, '|',
              { id: 'undo', icon: 'undo', label: t("Cofnij"), type: 'action', disabled: !hist.past.length }, { id: 'redo', icon: 'redo', label: t("Ponów"), type: 'action', disabled: !hist.future.length }]} /></div>
          </ModelCanvas>
        </div>
        <div className="stack">
          <Panel title={t("Składnia")} subtitle={t("Zmiany na płótnie i w składni synchronizują się")}>
            <SyntaxEditor value={text} onChange={(t) => setText(t)} diagnostics={diags} height={200} label={t("Składnia modelu SEM")}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runNow(); } }} />
            <div className="row" style={{ marginTop: 8 }}>
              {ident ? <Verdict level={ident.ok ? 'good' : 'poor'}>{ident.ok ? t("wstępnie: df = {0} (warunek konieczny, nie wystarczający)", { 0: ident.df }) : (ident.issues[0] && ident.issues[0].message) || 'nieidentyfikowalny'}</Verdict> : null}
              {r && stale ? <Badge tone="ok" icon="refresh">{t("wyniki nieaktualne")}</Badge> : null}
            </div>
          </Panel>
          {newLat ? (
            <Panel title={t("Nowa zmienna latentna")}>
              <div className="row"><Field label={t("Nazwa")}><Input autoFocus mono value={newLat.name} onChange={(e) => setNewLat(Object.assign({}, newLat, { name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && addLatent()} /></Field>
                <Button variant="primary" onClick={addLatent}>{t("Dodaj")}</Button><Button variant="ghost" onClick={() => setNewLat(null)}>{t("Anuluj")}</Button></div>
            </Panel>
          ) : null}
          <Panel title={selNode ? t("Zmienna {0}", { 0: selNode.id }) : selEdge ? t("Relacja {0} {1} {2}", { 0: selEdge.from, 1: selEdge.kind === 'cov' ? '↔' : '→', 2: selEdge.to }) : t("Zmienne z danych")} subtitle={selNode || selEdge ? undefined : t("Przeciągnij na płótno")}>
            {selEdge && r && !stale && est[sel.id] ? (
              <div className="stack"><StatTile label={selEdge.kind === 'loading' ? t("Ładunek λ") : selEdge.kind === 'path' ? t("Ścieżka β") : t("Korelacja r")} value={n2(est[sel.id].est)} icon={selEdge.kind === 'cov' ? 'cov' : 'path'} note={est[sel.id].p != null ? pTxt(est[sel.id].p) : t("parametr ustalony")} />
                <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(sel)}>{t("Usuń relację")}</Button></div>
            ) : selNode ? (
              <div className="stack">{data.variables.find((v) => v.name === selNode.id) ? <span className="muted">{data.variables.find((v) => v.name === selNode.id).label}</span> : null}
                {r && r.r2[selNode.id] != null && !stale ? <StatTile label="R²" value={n2(r.r2[selNode.id])} icon="layers" meter={r.r2[selNode.id]} /> : null}
                <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(sel)}>{t("Usuń zmienną")}</Button></div>
            ) : (
              <div className="chips" style={{ maxHeight: 180, overflow: 'auto' }}>
                {data.variables.filter((v) => v.type !== 'nominal').map((v) => (
                  <span key={v.name} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', v.name); e.dataTransfer.effectAllowed = 'copy'; }} title={v.label}>
                    <VariableChip name={v.name} type={v.type} label={v.label} reversed={v.reversed} selected={nodes.some((n) => n.id === v.name)} />
                  </span>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
      {running && !r ? <Loading /> : null}
      {r ? (
        <>
          <StaleNote stale={stale} onRun={runNow} running={running} />
          <FitBlock res={r} />
          <CollinearityNote res={r} />
          <Interpretation tone={interp.tone} title={interp.title} source={t("Progi: Hu i Bentler (1999)")}>
            {interp.text} {sigPaths.length ? t("Istotne ścieżki: {0}.", { 0: sigPaths.map((p) => `${p.path} (β = ${n2(p.b)}, ${pTxt(p.p)})`).join('; ') }) : t("Żadna ścieżka strukturalna nie jest istotna przy α = 0,05.")}
            {r2.length ? t(" Model wyjaśnia {0}.", { 0: r2.map(([v, x]) => t("{0}% wariancji {1}", { 0: format.num(100 * x, 0), 1: v })).join(', ') }) : ''}
          </Interpretation>
          <div className="cols">
            <Panel flush title={t("Wyniki strukturalne")} subtitle={bootOk ? t("95% CI z bootstrapu ({0} prób)", { 0: boot.value.ok }) : t("95% CI metodą delta - dla efektów pośrednich uruchom bootstrap")}>
              <div className="pad-x"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'paths', label: t("Ścieżki"), count: paths.length }, { id: 'def', label: t("Efekty zdefiniowane"), count: defined.length || undefined }, { id: 'meas', label: t("Pomiar") }, { id: 'mi', label: t("Indeksy modyfikacji"), count: r.mi.length || undefined }]} /></div>
              <div className="pad scroll-x">
                {tab === 'paths' ? <ResultTable dense columns={[{ key: 'path', label: t("Ścieżka"), type: 'text' }, { key: 'label', label: t("Etykieta"), type: 'text' }, { key: 'b', label: 'β', type: 'est' }, { key: 'ci', label: t("95% CI"), type: 'ci' }, { key: 'raw', label: 'B', type: 'num', digits: 3 }, { key: 'se', label: 'SE', type: 'num', digits: 3 }, { key: 'p', label: 'p', type: 'p' }]} rows={paths} note={t("β - współczynnik standaryzowany; B, SE - niestandaryzowane.")} /> : null}
                {tab === 'def' ? (defined.length ? <ResultTable dense columns={[{ key: 'name', label: t("Efekt"), type: 'var' }, { key: 'expr', label: t("Wyrażenie"), type: 'text' }, { key: 'b', label: t("Standaryzowany"), type: 'est' }, { key: 'ci', label: t("95% CI"), type: 'ci' }, { key: 'raw', label: 'B', type: 'num', digits: 3 }, { key: 'method', label: 'CI', type: 'text' }]} rows={defined}
                  note={t("Efekt pośredni oceniaj po przedziale bootstrap: istotny, gdy nie obejmuje zera (Preacher i Hayes, 2008).")} /> :
                  <Interpretation tone="info" title={t("Brak efektów zdefiniowanych")}>{t("Nadaj ścieżkom etykiety i zdefiniuj efekt, np.")} <span className="mono">M ~ a*X</span>, <span className="mono">Y ~ b*M</span>, <span className="mono">ind := a*b</span>{t(". Szablony mediacji są w module Mediacja i moderacja.")}</Interpretation>) : null}
                {tab === 'meas' ? <ResultTable dense columns={[{ key: 'rel', label: t("Ładunek"), type: 'text' }, { key: 'b', label: 'λ', type: 'est', weakBelow: 0.4 }, { key: 'ci', label: t("95% CI"), type: 'ci' }]} rows={r.params.filter((p) => p.op === '=~').map((p) => ({ rel: `${p.lhs} → ${p.rhs}`, b: p.std, ci: [p.std_lo, p.std_hi], p: p.free ? p.p : undefined }))} /> : null}
                {tab === 'mi' ? <MiTable res={r} module="sem" onApply={(m) => run(() => applyMi(m))} /> : null}
              </div>
            </Panel>
            <div className="stack">
              {r2.length ? <div className="tiles t3">{r2.map(([v, x]) => <StatTile key={v} label={`R² ${v}`} value={n2(x)} icon="layers" meter={x} note={x >= 0.26 ? t("duży (Cohen, 1988)") : x >= 0.13 ? t("średni") : t("mały")} />)}</div> : null}
              <Interpretation tone="brand" title={t("Porównaj ten efekt innymi podejściami")} icon="bridge" actions={<Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => go('bridge')}>{t("Porównanie podejść")}</Button>}>
                {t("Sprawdź, jak wybrana zależność zmienia się z reprezentacją konstruktów: średnie pozycji, SAM, przybliżenie ESEM i SEM łączny w modelu zredukowanym.")}
              </Interpretation>
              {mode !== 'simple' ? <div className="row"><Button size="sm" variant="secondary" icon="download" onClick={async () => { const a = await engine.call('analysis_csv', { syntax: r.syntax, part: r.part }); download(ANALYSIS_FILE, a.csv, 'text/csv;charset=utf-8'); toast(t("Pobrano dane analityczne: N = {0}, {1} zmiennych{2}.", { 0: a.n, 1: a.vars.length, 2: a.steps.length ? t("; przygotowanie: ") + a.steps.join(', ') : '' })); }}>Dane analityczne (CSV) do kodu</Button></div> : null}
              {mode !== 'simple' ? <CodeExport snippets={codeSnippets(r.syntax, { estimator: r.estimator, part: r.part === 'all' ? undefined : r.part, seed: r.split_seed != null ? r.split_seed : settings.seed, kind: 'sem', bootstrap: bootOk ? boot.value.R : undefined, version: ENGINE_VERSION })} defaultLang={mode === 'code' ? 'lavaan' : 'python'} meta={t("SEMplex {0} · {1}", { 0: ENGINE_VERSION, 1: r.estimator })} /> : null}
            </div>
          </div>
        </>
      ) : null}
    </Screen>
  );
}
