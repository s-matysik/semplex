import React, { useState } from 'react';
import { Panel, ForestPlot, WaterfallChart, ResultTable, Interpretation, StatTile, Field, Select, Button, Badge, Progress, Segmented, Verdict, CodeExport, Term } from 'semplex-ui';
import { useStore, runEngineJob, setResult, logDecision, toast } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, useRun, Loading, StaleNote, SeedBadge } from '../ui.jsx';
import { n2, n3, int, ci, pct } from '../lib/fit.js';
import { copyText } from '../lib/model.js';

export function methodsParagraph(r, lang = 'pl') {
  const rec = r.rows.find((x) => x.id === r.recommended);
  const sem = r.rows.find((x) => x.id === 'sem');
  const sum = r.rows.find((x) => x.id === 'sum');
  const f = (v) => (lang === 'en' ? v.toFixed(2) : n2(v));
  if (lang === 'en') {
    return `To assess the sensitivity of the structural effect ${r.x} → ${r.y} to the estimation approach, we compared seven approaches on the same data (N = ${r.n}): regression on sum scores, factor-score regression, Croon's correction, single indicators corrected for reliability, local structural-after-measurement (SAM; Rosseel & Loh, 2024), exploratory SEM with target rotation and full SEM. Confidence intervals are percentile bootstrap intervals (${r.R_ok} resamples, seed ${r.seed}). Standardized estimates ranged from ${f(Math.min(...r.rows.map((x) => x.est)))} to ${f(Math.max(...r.rows.map((x) => x.est)))}; sum-score regression underestimated the full-SEM effect (β = ${f(sem.est)}) by ${Math.round(-100 * sum.delta)}%. We report ${rec.label.replace('Pełny SEM', 'full SEM')} (β = ${f(rec.est)}, 95% CI [${f(rec.lo)}, ${f(rec.hi)}]).`;
  }
  return `Aby sprawdzić, jak efekt ${r.x} → ${r.y} zależy od metody, porównano siedem podejść na tych samych danych (N = ${r.n}): regresję na sumach pozycji, regresję na wynikach czynnikowych, korektę Croona, pojedyncze wskaźniki z korektą rzetelności, lokalny SAM (Rosseel i Loh, 2024), ESEM z rotacją target i pełny SEM. Przedziały ufności to percentylowe przedziały bootstrap (${r.R_ok} prób, ziarno ${r.seed}). Standaryzowane oszacowania wyniosły od ${n2(Math.min(...r.rows.map((x) => x.est)))} do ${n2(Math.max(...r.rows.map((x) => x.est)))}; regresja na sumach zaniżyła efekt z pełnego SEM (β = ${n2(sem.est)}) o ${Math.round(-100 * sum.delta)}%. Raportowano ${rec.label.toLowerCase()} (β = ${n2(rec.est)}, 95% CI [${n2(rec.lo)}; ${n2(rec.hi)}]).`;
}

export default function BridgeScreen() {
  const data = useStore((s) => s.data);
  const res = useStore((s) => s.results.bridge);
  const settings = useStore((s) => s.settings);
  const mode = useStore((s) => s.mode);
  const scales = data ? data.scales.map((s) => s.id) : [];
  const prev = res && res.value;
  const [y, setY] = useState(prev ? prev.y : scales.includes('LOY') ? 'LOY' : scales[scales.length - 1]);
  const [xs, setXs] = useState(prev ? prev.xs : scales.filter((s) => s !== (scales.includes('LOY') ? 'LOY' : scales[scales.length - 1])).slice(0, 1));
  const [xi, setXi] = useState(0);
  const [sel, setSel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lang, setLang] = useState('pl');
  const { running, error, setError, run } = useRun();

  if (!data) return <Screen><NeedData /></Screen>;
  if (scales.length < 2) return <Screen><Interpretation tone="warn" title="Potrzebne są co najmniej dwie skale">Zdefiniuj skale w module Dane → Skale.</Interpretation></Screen>;

  async function compute() {
    await run(async () => {
      const R = settings.compareR;
      setPreview(null);
      const out = await runEngineJob({ label: `Porównanie podejść (${R} prób × 7)`, module: 'Porównanie podejść', icon: 'bridge', kind: 'compare',
        params: { y, xs, R, seed: settings.seed, part: 'all' }, chunk: 5, previewEvery: 4, onPreview: setPreview, resultArgs: xs.map((_, i) => ({ xi: i })) });
      if (!out.cancelled) {
        setXi(0);
        setResult('bridge', Object.assign({}, out.result[0], { byX: out.result }));
        logDecision({ module: 'Porównanie podejść', moduleIcon: 'bridge', kind: 'run', origin: 'manual', action: `Porównano 7 podejść dla ${xs.join(', ')} → ${y}`, reason: `Bootstrap ${R} prób, ziarno ${settings.seed}. Rekomendacja: ${out.result[0].rows.find((x) => x.id === out.result[0].recommended).label}.` });
      }
    });
  }

  const full = res && res.value;
  const r = (full && full.byX ? full.byX[Math.min(xi, full.byX.length - 1)] : full) || preview;
  const partial = !res || !res.value || (preview && running);
  const rows = r ? r.rows : [];
  const ref = rows.find((x) => x.id === 'sem');
  const recRow = r ? rows.find((x) => x.id === r.recommended) : null;

  return (
    <Screen>
      <Head eyebrow="Most EFA – regresja – SEM" title="Czy wynik zależy od metody" meta={r ? [<Badge key="n">N = {int(r.n)}</Badge>, <SeedBadge key="s" seed={r.seed} R={r.R_ok} />, partial ? <Badge key="p" tone="ok" icon="refresh">wynik częściowy</Badge> : null].filter(Boolean) : [<Badge key="new" tone="brand">nowe</Badge>]}>
        <Field label="Zmienna zależna"><Select value={y} onChange={(e) => { setY(e.target.value); setXs(xs.filter((x) => x !== e.target.value)); }} options={scales} /></Field>
        <Field label="Predyktory"><Select value={xs[0] || ''} onChange={(e) => setXs([e.target.value])} options={scales.filter((s) => s !== y)} /></Field>
        <Button variant="secondary" icon="plus" disabled={xs.length >= scales.length - 1} onClick={() => setXs(xs.concat(scales.filter((s) => s !== y && !xs.includes(s)).slice(0, 1)))}>Dodaj predyktor</Button>
        <Button variant="primary" icon="play" loading={running} disabled={!xs.length} onClick={compute}>Porównaj 7 podejść</Button>
      </Head>
      {xs.length > 1 ? <div className="row"><span className="subtle">Model: {y} ~ {xs.join(' + ')}</span>{full && full.byX && full.byX.length > 1 ? <Segmented size="sm" label="Pokaż efekt" value={String(xi)} onChange={(v) => setXi(Number(v))} options={full.byX.map((x, i) => ({ value: String(i), label: `${x.x} → ${x.y}` }))} /> : null}
        <Button size="sm" variant="ghost" icon="x" onClick={() => { setXs(xs.slice(0, 1)); setXi(0); }}>Tylko pierwszy predyktor</Button></div> : null}
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <StaleNote stale={res && res.stale} onRun={compute} running={running} />
      {running && !preview ? <Progress indeterminate label="Estymacja punktowa i bootstrap" detail={`${settings.compareR} prób, każda liczy 7 podejść · ziarno ${settings.seed}`} /> : null}
      {!r ? (
        <Interpretation tone="brand" icon="bridge" title="Ten sam efekt, siedem metod">
          Porównanie pokazuje, ile wyniku zależy od błędu pomiaru (sumy pozycji vs modele latentne), od ładunków krzyżowych (ESEM) i od sposobu estymacji (SAM vs pełny SEM). Wybierz zmienne i uruchom porównanie. Przy {settings.compareR} próbach bootstrap trwa to zwykle 1–3 minuty.
        </Interpretation>
      ) : (
        <>
          <div className="tiles">
            <StatTile label="Rozrzut między podejściami" value={n2(r.spread)} icon="split" note="max − min β" tone={r.spread > 0.15 ? 'ok' : 'good'} />
            <StatTile label="Sumy pozycji vs pełny SEM" value={pct(r.underestimate, 0)} icon="minus" tone={Math.abs(r.underestimate) > 0.15 ? 'ok' : 'good'} note="zaniżenie przez błąd pomiaru" />
            <StatTile label="Udział błędu pomiaru" value={r.share_measurement != null ? pct(r.share_measurement, 0) : '—'} icon="reliability" note={`średnia α = ${n2(r.mean_alpha)}`} />
            <StatTile label="Zgodne z pełnym SEM" value={`${r.agree} z 7`} icon="check" note="oszacowanie w 95% CI SEM" />
          </div>
          <Interpretation tone="brand" title={`Raportuj: ${recRow.label}`} icon="good" source="SAM: Rosseel i Loh (2024); ESEM: Asparouhov i Muthén (2009); korekta Croona: Croon (2002)"
            actions={<><Button size="sm" variant="ghost" icon="copy" onClick={() => copyText(methodsParagraph(r, lang)).then(() => toast('Skopiowano akapit do Metod.'))}>Kopiuj akapit</Button><Segmented size="sm" label="Język akapitu" value={lang} onChange={setLang} options={[{ value: 'pl', label: 'PL' }, { value: 'en', label: 'EN' }]} /></>}>
            {r.reasons.join(' ')} β = <b>{n2(recRow.est)}</b>{Number.isFinite(recRow.lo) ? ` [${n2(recRow.lo)}; ${n2(recRow.hi)}]` : ''}.
          </Interpretation>
          <div className="cols">
            <Panel title={`Efekt ${r.x} → ${r.y} w siedmiu podejściach`} subtitle="Standaryzowane β z 95% CI bootstrap; pasmo = CI pełnego SEM">
              <ForestPlot rows={rows.map((x) => ({ label: x.label, sub: x.sub, est: x.est, lo: Number.isFinite(x.lo) ? x.lo : x.est, hi: Number.isFinite(x.hi) ? x.hi : x.est, highlight: x.id === r.recommended, muted: x.id === 'fscore' }))}
                reference={ref.est} referenceLabel="pełny SEM" referenceShort="SEM" band={Number.isFinite(ref.lo) ? [ref.lo, ref.hi] : undefined} bandLabel="95% CI pełnego SEM"
                highlightLabel="rekomendowane" otherLabel="pozostałe" selected={sel} onSelect={setSel} tooltip legend fluid axisLabel="β standaryzowane" label="Wykres leśny efektu w siedmiu podejściach" />
            </Panel>
            <Panel title="Skąd bierze się różnica" subtitle="Od sum pozycji do pełnego SEM krok po kroku">
              <WaterfallChart steps={r.waterfall.map((s) => ({ label: s.label, value: s.value, kind: s.kind }))} fluid height={300} axisLabel="β" startLabel="start" endLabel="wynik" asideLabel="osobno" legend label="Rozkład różnicy między podejściami" />
            </Panel>
          </div>
          <Panel flush title="Wszystkie podejścia">
            <div className="pad-x"><ResultTable dense onRowClick={(row, i) => setSel(i)}
              columns={[{ key: 'label', label: 'Podejście', type: 'text' }, { key: 'sub', label: 'Rodzaj', type: 'text' }, { key: 'est', label: 'β', type: 'num', digits: 2 }, { key: 'ci', label: '95% CI', type: 'ci' }, { key: 'se', label: 'SE (boot)', type: 'num', digits: 3 }, { key: 'delta', label: 'Δ vs SEM', type: 'text', align: 'num' },
                { key: 'v', label: 'Błąd pomiaru', type: 'verdict' }]}
              rows={rows.map((x, i) => ({ label: x.label, sub: x.sub, est: x.est, ci: Number.isFinite(x.lo) ? [x.lo, x.hi] : undefined, se: x.se, delta: x.id === 'sem' ? '—' : pct(x.delta, 0), v: x.corrects_error ? 'good' : 'poor', selected: sel === i }))}
              note="Wyniki czynnikowe (regresyjne) są obciążone, gdy służą jako predyktory i zmienna zależna jednocześnie (Skrondal i Laake, 2001). Ocena „błąd pomiaru”: czy podejście koryguje błąd pomiaru." /></div>
          </Panel>
          {mode !== 'simple' ? <CodeExport snippets={{ lavaan: `library(lavaan)\nmodel <- '\n${r.syntax}\n'\nfit_sem <- sem(model, data = dane)\nfit_sam <- sam(model, data = dane, sam.method = "local")\nstandardizedSolution(fit_sem); standardizedSolution(fit_sam)`, python: `from semplex.bridge import CompareJob\njob = CompareJob(dane, skale, "${r.y}", ${JSON.stringify(r.xs)}, R=${r.R}, seed=${r.seed})\nwhile not job.step(10): pass\nprint(job.result()["rows"])`, metody: methodsParagraph(r, lang) }} defaultLang="metody" meta={`ziarno ${r.seed}`} /> : null}
        </>
      )}
    </Screen>
  );
}
