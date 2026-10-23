import React, { useState } from 'react';
import { Panel, ForestPlot, WaterfallChart, ResultTable, Interpretation, StatTile, Field, Select, Button, Badge, Progress, Segmented, Verdict, CodeExport, Term, format } from 'semplex-ui';
import { useStore, runEngineJob, setResult, logDecision, toast } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, useRun, Loading, StaleNote, SeedBadge } from '../ui.jsx';
import { n2, n3, int, ci, pct } from '../lib/fit.js';
import { copyText } from '../lib/model.js';
import { t } from '../i18n/index.js';

const n2pl = (v) => (v == null || Number.isNaN(v) ? '-' : format.num(v, 2, { decimal: ',' }));
const listJoin = (a, w) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' ' + w + ' ' + a[a.length - 1] : a.join(''));
const EN_LABEL = {
  sum: 'regression on item means', fscore: 'factor-score regression', croon: "Croon's correction",
  single: 'single indicators with reliability-fixed error variances', sam: 'local structural-after-measurement (SAM)',
  esem: 'an ESEM approximation based on target-rotated ML factor analysis', sem: 'jointly estimated SEM',
};
const PL_LABEL = {
  sum: 'regresja na średnich pozycji', fscore: 'regresja na wynikach czynnikowych', croon: 'korekta Croona',
  single: 'pojedyncze wskaźniki z wariancją błędu ustaloną z α', sam: 'lokalny SAM',
  esem: 'przybliżenie ESEM (rotacja target rozwiązania ML)', sem: 'SEM łączny',
};

/* Comparison with the combined SEM described neutrally: higher / lower value, opposite sign, or no reference. */
function contrast(sum, sem, lang) {
  const f = (v) => (lang === 'en' ? v.toFixed(2) : n2pl(v));
  if (!Number.isFinite(sem.est) || Math.abs(sem.est) < 0.05) {
    return lang === 'en' ? `the jointly estimated SEM coefficient was close to zero (β = ${f(sem.est)}), so relative differences are not reported`
      : `współczynnik SEM łącznego był bliski zeru (β = ${f(sem.est)}), więc nie podano różnic względnych`;
  }
  if (Math.sign(sum.est) !== Math.sign(sem.est)) {
    return lang === 'en' ? `the item-mean estimate (β = ${f(sum.est)}) and the jointly estimated SEM estimate (β = ${f(sem.est)}) had opposite signs`
      : `oszacowanie z regresji na średnich (β = ${f(sum.est)}) i z SEM łącznego (β = ${f(sem.est)}) miały przeciwne znaki`;
  }
  const d = Math.round(100 * Math.abs(sum.delta));
  const lower = Math.abs(sum.est) < Math.abs(sem.est);
  return lang === 'en'
    ? `the item-mean estimate (β = ${f(sum.est)}) was ${d}% ${lower ? 'smaller' : 'larger'} in absolute value than the jointly estimated SEM estimate (β = ${f(sem.est)})`
    : `oszacowanie z regresji na średnich (β = ${f(sum.est)}) było co do wartości bezwzględnej o ${d}% ${lower ? 'mniejsze' : 'większe'} niż z SEM łącznego (β = ${f(sem.est)})`;
}

export function methodsParagraph(r, lang = 'pl') {
  const sem = r.rows.find((x) => x.id === 'sem');
  const sum = r.rows.find((x) => x.id === 'sum');
  const f = (v) => (lang === 'en' ? v.toFixed(2) : n2pl(v));
  const lo = Math.min(...r.rows.map((x) => x.est));
  const hi = Math.max(...r.rows.map((x) => x.est));
  const minValid = Math.min(...r.rows.map((x) => x.n_valid != null ? x.n_valid : r.R_ok));
  const noCi = r.rows.filter((x) => x.ci_available === false).map((x) => (lang === 'en' ? EN_LABEL : PL_LABEL)[x.id]);
  if (lang === 'en') {
    return `To assess how the estimated relationship ${r.x} → ${r.y} depends on the representation of the constructs, seven approaches were compared on the same complete cases (N = ${r.n}) in a reduced model containing only ${[...r.xs, r.y].join(', ')}: ${listJoin(r.rows.map((x) => EN_LABEL[x.id]), 'and')}. `
      + `Confidence intervals are 95% percentile bootstrap intervals (${r.R} resamples, seed ${r.seed}); draws with non-converged or inadmissible solutions were excluded separately for each approach (at least ${minValid} admissible draws per approach)${noCi.length ? `; no interval is reported for ${noCi.join(', ')}` : ''}. `
      + `Standardized estimates ranged from ${f(lo)} to ${f(hi)}; ${contrast(sum, sem, 'en')}. These differences describe sensitivity to the modelling approach and are not a decomposition of bias.`;
  }
  return `Aby sprawdzić, jak zależność ${r.x} → ${r.y} zależy od sposobu reprezentacji konstruktów, porównano siedem podejść na tych samych kompletnych przypadkach (N = ${r.n}) w modelu zredukowanym, obejmującym tylko ${[...r.xs, r.y].join(', ')}: ${listJoin(r.rows.map((x) => PL_LABEL[x.id]), 'i')}. `
    + `Przedziały ufności to 95% percentylowe przedziały bootstrap (${r.R} prób, ziarno ${r.seed}); losowania z rozwiązaniem niezbieżnym lub niedopuszczalnym wykluczano osobno dla każdego podejścia (co najmniej ${minValid} dopuszczalnych losowań na podejście)${noCi.length ? `; nie podano przedziału dla: ${noCi.join(', ')}` : ''}. `
    + `Standaryzowane oszacowania wyniosły od ${n2pl(lo)} do ${n2pl(hi)}; ${contrast(sum, sem, 'pl')}. Różnice opisują wrażliwość wyniku na sposób modelowania i nie są rozkładem obciążenia.`;
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
  if (scales.length < 2) return <Screen><Interpretation tone="warn" title={t("Potrzebne są co najmniej dwie skale")}>{t("Zdefiniuj skale w module Dane → Skale.")}</Interpretation></Screen>;

  async function compute() {
    await run(async () => {
      const R = settings.compareR;
      setPreview(null);
      const out = await runEngineJob({ label: t("Porównanie podejść ({0} prób × 7)", { 0: R }), module: 'Porównanie podejść', icon: 'bridge', kind: 'compare',
        params: { y, xs, R, seed: settings.seed, part: 'all' }, chunk: 5, previewEvery: 4, onPreview: setPreview, resultArgs: xs.map((_, i) => ({ xi: i })) });
      if (!out.cancelled) {
        setXi(0);
        setResult('bridge', Object.assign({}, out.result[0], { byX: out.result }));
        logDecision({ module: 'Porównanie podejść', moduleIcon: 'bridge', kind: 'run', origin: 'manual', action: t("Porównano 7 podejść dla {0} → {1}", { 0: xs.join(', '), 1: y }), reason: t("Bootstrap {0} prób, ziarno {1}. Rekomendacja: {2}.", { 0: R, 1: settings.seed, 2: out.result[0].rows.find((x) => x.id === out.result[0].recommended).label }) });
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
      <Head eyebrow={t("Most EFA – regresja – SEM")} title={t("Czy wynik zależy od metody")} meta={r ? [<Badge key="n">N = {int(r.n)}</Badge>, <SeedBadge key="s" seed={r.seed} R={r.R_ok} />, partial ? <Badge key="p" tone="ok" icon="refresh">wynik częściowy</Badge> : null].filter(Boolean) : [<Badge key="new" tone="brand">{t("nowe")}</Badge>]}>
        <Field label={t("Zmienna zależna")}><Select value={y} onChange={(e) => { setY(e.target.value); setXs(xs.filter((x) => x !== e.target.value)); }} options={scales} /></Field>
        {(xs.length ? xs : ['']).map((xv, i) => (
          <Field key={'x' + i} label={i === 0 ? t("Predyktory") : t("Predyktor {0}", { 0: i + 1 })}>
            <Select value={xv || ''} aria-label={t("Predyktor {0}", { 0: i + 1 })}
              onChange={(e) => { const nx = (xs.length ? xs : ['']).slice(); nx[i] = e.target.value; setXs(nx.filter((v, k) => v && nx.indexOf(v) === k)); }}
              options={scales.filter((s) => s !== y && (s === xv || !xs.includes(s)))} />
          </Field>))}
        <Button variant="secondary" icon="plus" disabled={xs.length >= scales.length - 1} onClick={() => setXs(xs.concat(scales.filter((s) => s !== y && !xs.includes(s)).slice(0, 1)))}>{t("Dodaj predyktor")}</Button>
        <Button variant="primary" icon="play" loading={running} disabled={!xs.length} onClick={compute}>{t("Porównaj 7 podejść")}</Button>
      </Head>
      {xs.length > 1 ? <div className="row"><span className="subtle">{t("Model:")} {y} ~ {xs.join(' + ')}</span>{full && full.byX && full.byX.length > 1 ? <Segmented size="sm" label={t("Pokaż efekt")} value={String(xi)} onChange={(v) => setXi(Number(v))} options={full.byX.map((x, i) => ({ value: String(i), label: `${x.x} → ${x.y}` }))} /> : null}
        <Button size="sm" variant="ghost" icon="x" onClick={() => { setXs(xs.slice(0, 1)); setXi(0); }}>{t("Tylko pierwszy predyktor")}</Button></div> : null}
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <StaleNote stale={res && res.stale} onRun={compute} running={running} />
      {running && !preview ? <Progress indeterminate label={t("Estymacja punktowa i bootstrap")} detail={t("{0} prób, każda liczy 7 podejść · ziarno {1}", { 0: settings.compareR, 1: settings.seed })} /> : null}
      {!r ? (
        <Interpretation tone="brand" icon="bridge" title={t("Jedna zależność, siedem podejść")}>
          {t("Porównanie pokazuje, jak wynik zmienia się z reprezentacją konstruktów: średnie pozycji, wyniki czynnikowe, korekty błędu pomiaru, SAM, przybliżenie ESEM i SEM łączny. Wszystkie podejścia liczy się w modelu zredukowanym - tylko wybrana zmienna zależna i predyktory, bez pozostałych skal ani kowariancji reszt z modułu SEM. Wybierz zmienne i uruchom porównanie. Przy")} {settings.compareR} próbach bootstrap trwa to zwykle 1–3 minuty.
        </Interpretation>
      ) : (
        <>
          <div className="tiles">
            <StatTile label={t("Rozrzut między podejściami")} value={n2(r.spread)} icon="split" note={t("max − min β")} tone={r.spread > 0.15 ? 'ok' : 'good'} />
            <StatTile label={t("Średnie pozycji vs SEM łączny")} value={Number.isFinite(r.underestimate) ? pct(r.underestimate, 0) : '-'} icon="minus" tone={Math.abs(r.underestimate) > 0.15 ? 'ok' : 'good'} note={t("różnica względna oszacowań (opisowa)")} />
            <StatTile label={t("Dopuszczalne losowania")} value={`${r.R_ok} z ${r.R}`} icon="reliability" tone={r.R_ok < 0.95 * r.R ? 'ok' : 'good'} note={t("minimum po podejściach (bootstrap)")} />
            <StatTile label={t("W 95% CI SEM łącznego")} value={`${r.agree} z 7`} icon="check" note={t("opis zgodności, nie test")} />
          </div>
          <Interpretation tone="brand" title={t("Sugestia do dalszej inspekcji (reguła heurystyczna): {0}", { 0: recRow.label })} icon="info" source={t("SAM: Rosseel i Loh (2024); ESEM: Asparouhov i Muthén (2009); korekta Croona: Croon (2002). Progi reguły (N = 300, CFI = 0,90, różnica 0,05, ładunek krzyżowy 0,20) są umowne.")}
            actions={<><Button size="sm" variant="ghost" icon="copy" onClick={() => copyText(methodsParagraph(r, lang)).then(() => toast(t("Skopiowano akapit do Metod.")))}>{t("Kopiuj akapit")}</Button><Segmented size="sm" label={t("Język akapitu")} value={lang} onChange={setLang} options={[{ value: 'pl', label: 'PL' }, { value: 'en', label: 'EN' }]} /></>}>
            {r.reasons.join(' ')} β = <b>{n2(recRow.est)}</b>{Number.isFinite(recRow.lo) ? ` [${n2(recRow.lo)}; ${n2(recRow.hi)}]` : ''}.
          </Interpretation>
          <div className="cols">
            <Panel title={t("Efekt {0} → {1} w siedmiu podejściach", { 0: r.x, 1: r.y })} subtitle={t("Standaryzowane β z 95% CI bootstrap; pasmo = CI SEM łącznego")}>
              <ForestPlot rows={rows.map((x) => ({ label: x.label, sub: x.sub, est: x.est, lo: Number.isFinite(x.lo) ? x.lo : x.est, hi: Number.isFinite(x.hi) ? x.hi : x.est, highlight: x.id === r.recommended, muted: x.id === 'fscore' }))}
                reference={ref.est} referenceLabel={t("SEM łączny")} referenceShort="SEM" band={Number.isFinite(ref.lo) ? [ref.lo, ref.hi] : undefined} bandLabel={t("95% CI SEM łącznego")}
                highlightLabel="sugerowane" otherLabel={t("pozostałe")} selected={sel} onSelect={setSel} tooltip legend fluid axisLabel={t("β standaryzowane")} label={t("Wykres leśny efektu w siedmiu podejściach")} />
            </Panel>
            <Panel title={t("Kolejne różnice między podejściami")} subtitle={t("Różnice arytmetyczne oszacowań - opis, nie rozkład obciążenia na przyczyny")}>
              <WaterfallChart steps={r.waterfall.map((s) => ({ label: s.label, value: s.value, kind: s.kind }))} fluid height={300} axisLabel="β" startLabel="start" endLabel={t("wynik")} asideLabel="osobno" legend label={t("Kolejne różnice oszacowań między podejściami")} />
            </Panel>
          </div>
          <Panel flush title={t("Wszystkie podejścia")}>
            <div className="pad-x"><ResultTable dense onRowClick={(row, i) => setSel(i)}
              columns={[{ key: 'label', label: t("Podejście"), type: 'text' }, { key: 'sub', label: t("Rodzaj"), type: 'text' }, { key: 'est', label: 'β', type: 'num', digits: 2 }, { key: 'ci', label: t("95% CI"), type: 'ci' }, { key: 'se', label: t("SE (boot)"), type: 'num', digits: 3 }, { key: 'delta', label: t("Δ vs SEM"), type: 'text', align: 'num' },
                { key: 'nv', label: t("Losowania dopuszczalne"), type: 'text', align: 'num' }, { key: 'v', label: t("Modeluje błąd pomiaru"), type: 'verdict' }]}
              rows={rows.map((x, i) => ({ label: x.label, sub: x.sub, est: x.est, ci: Number.isFinite(x.lo) ? [x.lo, x.hi] : undefined, se: x.se, delta: x.id === 'sem' || !Number.isFinite(x.delta) ? '-' : pct(x.delta, 0), nv: x.n_valid != null ? `${x.n_valid}/${r.R_done}` : '-', v: x.corrects_error ? 'good' : 'poor', selected: sel === i }))}
              note={t("Wyniki czynnikowe (regresyjne) są obciążone, gdy służą jako predyktory i zmienna zależna jednocześnie (Skrondal i Laake, 2001). Kolumna „modeluje błąd pomiaru” opisuje założenie podejścia, a nie trafność wyniku. Losowania z rozwiązaniem niezbieżnym lub niedopuszczalnym (przypadek Heywooda) są wykluczane osobno dla każdego podejścia; przedział podaje się przy co najmniej 50 dopuszczalnych losowaniach i 80% udziale.")} /></div>
          </Panel>
          {mode !== 'simple' ? <CodeExport snippets={{ lavaan: `library(lavaan)\nmodel <- '\n${r.syntax}\n'\nfit_sem <- sem(model, data = dane)\nfit_sam <- sam(model, data = dane, sam.method = "local")\nstandardizedSolution(fit_sem); standardizedSolution(fit_sam)`, python: `from semplex.bridge import CompareJob\njob = CompareJob(dane, skale, "${r.y}", ${JSON.stringify(r.xs)}, R=${r.R}, seed=${r.seed})\nwhile not job.step(10): pass\nprint(job.result()["rows"])`, metody: methodsParagraph(r, lang) }} defaultLang="metody" meta={t("ziarno {0}", { 0: r.seed })} /> : null}
        </>
      )}
    </Screen>
  );
}
