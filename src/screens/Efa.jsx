import React, { useEffect, useState } from 'react';
import {
  Panel, ScreePlot, FactorConsensus, LoadingHeatmap, SampleSplit, Interpretation, Badge, Button, Field, Select, Switch, Diagnosis, StatTile, Term, CodeExport, Checkbox, Verdict, Progress, Input,
} from 'semplex-ui';
import { useStore, engine, setResult, setState, getState, runEngineJob, logDecision, toast, go, markStale, revertDecision, withDependents } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, useRun, Loading, StaleNote, SeedBadge } from '../ui.jsx';
import { n2, n3, pTxt, int, grade, RULES, pct } from '../lib/fit.js';
import { ensureSplit } from '../lib/analysis.js';
import { codeSnippets } from '../lib/model.js';

const ROT = [{ value: 'oblimin', label: 'oblimin (ukośna)' }, { value: 'geomin', label: 'geomin (ukośna)' }, { value: 'promax', label: 'promax (ukośna)' }, { value: 'varimax', label: 'varimax (ortogonalna)' }, { value: 'quartimax', label: 'quartimax (ortogonalna)' }];
const EXT = [{ value: 'minres', label: 'minres (ULS)' }, { value: 'ml', label: 'największa wiarygodność' }, { value: 'paf', label: 'osie główne (PAF)' }];

export default function EfaScreen() {
  const data = useStore((s) => s.data);
  const res = useStore((s) => s.results.efa);
  const stab = useStore((s) => s.results.efaStab);
  const split = useStore((s) => s.split);
  const skip = useStore((s) => s.efaSkip);
  const settings = useStore((s) => s.settings);
  const mode = useStore((s) => s.mode);
  const allItems = data ? data.variables.filter((v) => v.type === 'ordinal' || v.type === 'continuous').map((v) => v.name) : [];
  const scaleItems = data ? data.scales.flatMap((s) => s.items) : [];
  const defaultItems = allItems.filter((v) => /^[A-Za-z]+_?\d+$/.test(v) && !/wiek|czas|age|time/i.test(v));
  const [items, setItems] = useState(() => (res && res.value ? res.value.items : defaultItems.length >= 3 ? defaultItems : scaleItems));
  const [opt, setOpt] = useState(() => (res && res.value ? { extraction: res.value.extraction, rotation: res.value.rotation, corr: 'auto' } : { extraction: 'minres', rotation: 'oblimin', corr: 'auto' }));
  const [k, setK] = useState(res && res.value ? res.value.k : null);
  const [hover, setHover] = useState(null);
  const [selItem, setSelItem] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const { running, error, setError, run } = useRun();

  async function compute(kk = k, o = opt, its = items) {
    await run(async () => {
      if (split.use) await ensureSplit();
      const r = await engine.call('efa_run', { items: its, corr: o.corr, extraction: o.extraction, rotation: o.rotation, k: kk, part: split.use ? 'efa' : 'all', seed: settings.seed, iters: 100 });
      setResult('efa', r);
      setK(r.k);
      logDecision({ module: 'EFA', moduleIcon: 'efa', kind: 'run', origin: 'auto',
        action: `Uruchomiono EFA: k = ${r.k}, korelacje ${o.corr}, ekstrakcja ${o.extraction}, rotacja ${o.rotation}`,
        reason: `${its.length} pozycji; ${split.use ? `część EFA (podział losowy 50/50${split.strata ? ', warstwami: ' + split.strata : ''}, ziarno ${split.seed || settings.seed})` : 'cała próba, bez podziału'}; N = ${r.n}.` });
      setState((s) => ({ results: Object.assign({}, s.results, { efaStab: s.results.efaStab ? Object.assign({}, s.results.efaStab, { stale: true }) : undefined }) }));
    });
  }
  useEffect(() => { if (data && items.length >= 3 && (!res || res.stale)) compute(res && res.value ? res.value.k : null); }, [data]);

  if (!data) return <Screen><NeedData /></Screen>;
  const r = res && res.value;
  const info = split.info;

  async function runStability() {
    const B = settings.stabilityB;
    const out = await runEngineJob({ label: `Stabilność ładunków EFA (${B})`, module: 'EFA', icon: 'efa', kind: 'stability',
      params: { items: r.items, k: r.k, corr: r.corr, extraction: r.extraction, rotation: r.rotation, part: r.part, B, seed: settings.seed }, chunk: 5 });
    if (!out.cancelled) setResult('efaStab', out.result);
  }

  function toggleSkip(item, on) {
    const before = getState().efaSkip;
    const next = on ? before.concat([item]) : before.filter((x) => x !== item);
    setState({ efaSkip: next });
    const p = r.proposals.find((x) => x.item === item);
    const d = logDecision({ module: 'EFA', moduleIcon: 'efa', kind: on ? 'remove' : 'add', origin: p ? 'proposal' : 'manual',
      action: on ? `Pominięto ${item} w CFA` : `Przywrócono ${item} do CFA`,
      reason: p ? (p.kind === 'cross' ? `Ładunek krzyżowy: ${p.factor} ${n2(p.top)}, ${p.factor2} ${n2(p.second)}.` : `Słaby ładunek ${n2(p.top)} (< 0,40).`) : 'Decyzja badacza.',
      undo: { type: 'efaSkip', before } });
    markStale(withDependents(['cfa']));
    toast(on ? `Pozycja ${item} nie trafi do CFA. Dane i EFA bez zmian.` : `Pozycja ${item} wraca do CFA.`, { actionLabel: 'Cofnij', onAction: () => revertDecision(d.id) });
  }

  function cfaSyntax() {
    const L = r.loadings;
    const groups = {};
    r.items.forEach((it, i) => {
      if (skip.includes(it)) return;
      let best = 0;
      L[i].forEach((v, j) => { if (Math.abs(v) > Math.abs(L[i][best])) best = j; });
      (groups[r.factor_names[best]] = groups[r.factor_names[best]] || []).push(it);
    });
    return Object.entries(groups).map(([f, its]) => (its.length === 1 ? `# ${f} =~ ${its[0]}   (czynnik z jedną pozycją — uzupełnij albo pomiń)` : `${f} =~ ${its.join(' + ')}`)).join('\n');
  }
  function toCfa() {
    const syn = cfaSyntax();
    const before = getState().syntax.cfa;
    setState((s) => ({ syntax: Object.assign({}, s.syntax, { cfa: syn }) }));
    markStale(withDependents(['cfa']));
    logDecision({ module: 'EFA', moduleIcon: 'efa', kind: 'run', origin: 'proposal', action: `Model CFA z rozwiązania EFA (${r.k} czynniki)`,
      reason: `Pozycja → czynnik o najwyższym ładunku${skip.length ? '; pominięte: ' + skip.join(', ') : ''}. ${info ? 'CFA na części walidacyjnej.' : ''}`, undo: { type: 'syntax', target: 'cfa', before } });
    go('cfa');
  }

  const parts = info ? [
    { label: 'Eksploracyjna (EFA)', n: info.n_efa, tone: 'observed', icon: 'efa', active: true },
    { label: 'Walidacyjna (CFA)', n: info.n_cfa, tone: 'brand', icon: 'cfa', dim: true },
  ] : [{ label: 'Cała próba (EFA i CFA)', n: data.n, tone: 'neutral', icon: 'data', active: true }];
  const stability = stab && stab.value && !stab.stale && r ? stab.value.stability : undefined;
  const props = r ? r.proposals : [];
  const selRow = r && selItem ? r.items.indexOf(selItem) : -1;

  const insp = r ? (
    <>
      <div className="eyebrow">Propozycje</div>
      <h2 className="sub">{props.length ? `${props.length} pozycji do decyzji` : 'Struktura bez zastrzeżeń'}</h2>
      {props.length ? props.map((p) => (
        <Diagnosis key={p.item} compact level="warn" eyebrow={p.kind === 'cross' ? 'Ładunek krzyżowy' : 'Słaby ładunek'} title={`${p.item}${p.label ? ' — ' + p.label : ''}`}
          what={p.kind === 'cross' ? `${p.factor}: ${n2(p.top)}, ${p.factor2}: ${n2(p.second)} (różnica ${n2(Math.abs(p.top) - Math.abs(p.second))} < 0,20).` : `Najwyższy ładunek ${n2(p.top)} na ${p.factor}; h² = ${n2(p.h2)}.`}
          effect={(() => { const left = r.items.filter((it, i) => !skip.includes(it) && it !== p.item && r.factor_names[r.loadings[i].reduce((b, v, j, a) => (Math.abs(v) > Math.abs(a[b]) ? j : b), 0)] === p.factor).length; return `Bez ${p.item} czynnik ${p.factor} ma ${left} ${left === 1 ? 'pozycję' : left < 5 ? 'pozycje' : 'pozycji'}.`; })()}
          source="Kryteria: Howard (2016); Costello i Osborne (2005)"
          aside={<Switch label="Pomiń w CFA" checked={skip.includes(p.item)} onChange={(c) => toggleSkip(p.item, c)} />} />
      )) : <Interpretation tone="good" title="Każda pozycja ładuje jeden czynnik">Brak ładunków krzyżowych (drugi ≥ 0,30 przy różnicy &lt; 0,20) i słabych (&lt; 0,40).</Interpretation>}
      <div className="divider" />
      <div className="eyebrow">Pozycje w analizie</div>
      <div className="stack" style={{ gap: 4 }}>
        {allItems.map((it) => <Checkbox key={it} label={<span className="mono">{it}</span>} checked={items.includes(it)} onChange={(c) => setItems(c ? allItems.filter((x) => x === it || items.includes(x)) : items.filter((x) => x !== it))} />)}
      </div>
      <Button variant="secondary" icon="refresh" disabled={items.length < 3} onClick={() => compute(null, opt, items)}>Przelicz dla wybranych pozycji</Button>
    </>
  ) : null;

  return (
    <Screen inspector={insp} inspectorTitle="Propozycje i pozycje" inspectorOpen={drawer} onInspectorClose={() => setDrawer(false)}>
      <Head eyebrow="Eksploracyjna analiza czynnikowa" title={r ? `${r.k} ${r.k === 1 ? 'czynnik' : r.k < 5 ? 'czynniki' : 'czynników'} z ${r.items.length} pozycji` : 'Ile czynników kryje się w pozycjach'}
        meta={r ? [<Badge key="n">n = {int(r.n)} ({r.part === 'efa' ? 'część EFA' : 'cała próba'})</Badge>, <Badge key="c">{r.corr === 'polychoric' ? 'korelacje polichoryczne' : 'korelacje Pearsona'}</Badge>, <Badge key="r">{r.extraction} · {r.rotation}</Badge>, <SeedBadge key="s" seed={r.nf.seed} />] : []}>
        <Button variant="secondary" icon="shuffle" disabled={!r} onClick={() => run(runStability)}>Sprawdź stabilność</Button>
        <Button variant="primary" iconRight="arrow-right" disabled={!r} onClick={toCfa}>Zbuduj model CFA</Button>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <StaleNote stale={res && res.stale} onRun={() => compute(k)} running={running} />
      <Panel title="Podział próby" subtitle="Strukturę z EFA potwierdzasz w CFA na innych respondentach">
        <div className="cols even">
          <SampleSplit parts={parts} n={data.n} method={split.use ? `losowo 50/50${split.strata ? ', warstwami: ' + split.strata : ''}` : 'bez podziału'} seed={split.use ? (split.seed || settings.seed) : undefined} />
          <div className="stack">
            <Switch label="Podziel próbę na część EFA i CFA" hint="Zalecane. Bez podziału dopasowanie CFA jest zawyżone." checked={split.use}
              onChange={(c) => { const before = { use: split.use }; setState((s) => ({ split: Object.assign({}, s.split, { use: c, info: null }) })); markStale(withDependents(['efa', 'cfa', 'sem']));
                logDecision({ module: 'EFA', moduleIcon: 'efa', kind: 'split', action: c ? 'Włączono podział próby 50/50' : 'Wyłączono podział próby', reason: c ? 'EFA i CFA na rozłącznych częściach.' : 'Cała próba w EFA i CFA — dopasowanie CFA będzie zawyżone.', undo: { type: 'split', before } }); }} />
            {split.use ? <div className="form">
              <Field label="Warstwy (opcjonalnie)"><Select value={split.strata || ''} onChange={(e) => { setState((s) => ({ split: Object.assign({}, s.split, { strata: e.target.value, info: null }) })); markStale(withDependents(['efa', 'cfa', 'sem'])); }}
                options={[{ value: '', label: 'bez warstwowania' }].concat(data.variables.filter((v) => v.type === 'binary' || v.type === 'nominal').map((v) => ({ value: v.name, label: v.name })))} /></Field>
              <Field label="Ziarno podziału"><Input type="number" min={1} value={split.seed || settings.seed} onChange={(e) => { setState((s) => ({ split: Object.assign({}, s.split, { seed: Math.max(1, parseInt(e.target.value || '1', 10)), info: null }) })); markStale(withDependents(['efa', 'cfa', 'sem'])); }} /></Field>
            </div> : <Interpretation tone="warn" title="Ta sama próba w EFA i CFA">CFA potwierdzi strukturę, którą sama wybrała — opisz to w ograniczeniach.</Interpretation>}
          </div>
        </div>
      </Panel>
      {mode !== 'simple' ? (
        <div className="form">
          <Field label="Korelacje"><Select value={opt.corr} onChange={(e) => { const o = Object.assign({}, opt, { corr: e.target.value }); setOpt(o); compute(k, o); }} options={[{ value: 'auto', label: 'automatycznie' }, { value: 'polychoric', label: 'polichoryczne' }, { value: 'pearson', label: 'Pearsona' }]} /></Field>
          <Field label="Ekstrakcja"><Select value={opt.extraction} onChange={(e) => { const o = Object.assign({}, opt, { extraction: e.target.value }); setOpt(o); compute(k, o); }} options={EXT} /></Field>
          <Field label="Rotacja"><Select value={opt.rotation} onChange={(e) => { const o = Object.assign({}, opt, { rotation: e.target.value }); setOpt(o); compute(k, o); }} options={ROT} /></Field>
        </div>
      ) : null}
      {!r ? <Loading /> : (
        <>
          <div className="tiles">
            <StatTile label={<Term term="KMO" definition="Adekwatność doboru próby: czy korelacje cząstkowe są małe względem zwykłych." source="Kaiser (1974)" />} value={n2(r.kmo)} icon="efa" tone={grade(r.kmo, RULES.kmo)} meter={r.kmo} note={r.kmo >= 0.8 ? 'dobra adekwatność' : r.kmo >= 0.6 ? 'wystarczająca' : 'za niska do EFA'} />
            <StatTile label="Test Bartletta" value={pTxt(r.bartlett.p)} icon="stats" note={`χ²(${r.bartlett.df}) = ${n2(r.bartlett.chi2)}`} tone={r.bartlett.p < 0.05 ? 'good' : 'poor'} />
            <StatTile label="Wyjaśniona wariancja" value={pct(r.total_explained, 0)} icon="layers" note={`${r.k} czynniki`} />
            <StatTile label={<Term term="RMSR" definition="Średnia reszta korelacji po wyodrębnieniu czynników." source="Harman (1976)" />} value={n3(r.rmsr)} icon="fit" tone={r.rmsr <= 0.05 ? 'good' : r.rmsr <= 0.08 ? 'ok' : 'poor'} note="≤ 0,05 dobrze" />
          </div>
          {r.smoothed ? <Interpretation tone="warn" title="Macierz korelacji wygładzono">Macierz polichoryczna nie była dodatnio określona; zastosowano najbliższą dodatnio określoną (Higham, 2002).</Interpretation> : null}
          <div className="cols even">
            <Panel title="Wykres osypiska z analizą równoległą" subtitle="Wybierz liczbę czynników na wykresie albo na liście kryteriów">
              <ScreePlot eigenvalues={r.nf.eigenvalues} parallel={r.nf.parallel} suggested={r.nf.consensus} suggestedLabel="konsensus" selected={r.k}
                onSelect={(kk) => compute(kk)} hovered={hover} onHover={setHover} tooltip kaiser fluid height={300} />
            </Panel>
            <Panel title="Konsensus kryteriów" subtitle={`Zalecane: ${r.nf.agree_rec} z ${r.nf.n_rec} · wszystkie: ${r.nf.agree} z ${r.nf.criteria.length} wskazują ${r.nf.consensus}`}>
              <FactorConsensus criteria={r.nf.criteria} max={Math.max(6, ...r.nf.criteria.map((c) => c.k))} value={r.k} onChange={(kk) => compute(kk)} consensus={r.nf.consensus} hovered={hover} onHover={setHover}
                caption="Wagi: zalecane ×2, standardowe ×1, pomocnicze ×0,5. Kryterium Kaisera zawyża liczbę czynników (Zwick i Velicer, 1986)." />
            </Panel>
          </div>
          <Interpretation tone={r.k === r.nf.consensus ? 'good' : 'warn'} title={r.k === r.nf.consensus ? `Kryteria zgodnie wskazują ${r.k} czynniki` : `Wybrano ${r.k} czynniki, konsensus wskazuje ${r.nf.consensus}`} source="Analiza równoległa: Horn (1965); Hull: Lorenzo-Seva i in. (2011)"
            actions={r.k !== r.nf.consensus ? <Button size="sm" variant="secondary" onClick={() => compute(r.nf.consensus)}>Wróć do konsensusu</Button> : null}>
            {r.k === r.nf.consensus ? `Rozwiązanie wyjaśnia ${pct(r.total_explained, 0)} wariancji. Uzasadnienie wyboru trafi do akapitu Metody.` : 'Wybór inny niż konsensus uzasadnij teorią — trafi do dziennika decyzji.'}
          </Interpretation>
          <Panel flush title="Ładunki czynnikowe" subtitle={`Macierz wzorca · ${r.rotation}${stability ? ` · stabilność z ${stab.value.ok} prób bootstrap` : ''}`}
            actions={props.length ? <Button size="sm" variant="ghost" icon="eye" onClick={() => setDrawer(true)}>Propozycje · {props.length}</Button> : null}>
            <div className="pad">
              <LoadingHeatmap items={r.items} factors={r.factor_names} loadings={r.loadings} cutoff={0.3} communality={r.h2} stability={stability} stabilityCutoff={0.8}
                explained={r.var_explained} explainedLabel="% wariancji" crossRule={{ min: 0.3, gap: 0.2 }} removed={skip} labels={r.labels} selected={selItem || undefined}
                onRowClick={(it) => { setSelItem(it); setDrawer(true); }} legend />
            </div>
          </Panel>
          {r.k > 1 && !['varimax', 'quartimax'].includes(r.rotation) ? (
            <Panel title="Korelacje czynników (Φ)" subtitle="Rotacja ukośna dopuszcza korelacje">
              <table className="tbl"><thead><tr><th></th>{r.factor_names.map((f) => <th key={f} className="num">{f}</th>)}</tr></thead>
                <tbody>{r.phi.map((row, i) => <tr key={i}><td className="mono">{r.factor_names[i]}</td>{row.map((v, j) => <td key={j} className="num">{j <= i ? n2(v) : ''}</td>)}</tr>)}</tbody></table>
            </Panel>
          ) : null}
          {mode === 'code' ? <CodeExport snippets={{ lavaan: `library(psych)\nfa(dane[, c(${r.items.map((i) => `"${i}"`).join(', ')})], nfactors = ${r.k}, fm = "${r.extraction === 'paf' ? 'pa' : r.extraction}", rotate = "${r.rotation}", cor = "${r.corr === 'polychoric' ? 'poly' : 'cor'}")\nfa.parallel(dane[, c(${r.items.map((i) => `"${i}"`).join(', ')})], fa = "fa")`,
            python: `from semplex.efa import correlation, efa, n_factors\nR, _ = correlation(X, "${r.corr}")\nprint(n_factors(R, n=${r.n}, seed=${r.nf.seed})["consensus"])\nsol = efa(R, ${r.k}, "${r.extraction}", "${r.rotation}")`,
            'model CFA': cfaSyntax() }} defaultLang="model CFA" meta={`ziarno ${r.nf.seed}`} /> : null}
        </>
      )}
    </Screen>
  );
}
