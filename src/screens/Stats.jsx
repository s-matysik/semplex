import React, { useEffect, useState } from 'react';
import { Panel, ResultTable, CorrMatrix, Interpretation, Field, Select, RadioGroup, Badge, Distribution, Verdict, Term, Button, format } from 'semplex-ui';
import { useStore, engine, setResult, setState, logDecision, markStale, toast, withDependents } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, useRun, Loading, StaleNote } from '../ui.jsx';
import { n2, n3, pTxt, pct, int } from '../lib/fit.js';
import { t } from '../i18n/index.js';

export default function StatsScreen() {
  const data = useStore((s) => s.data);
  const res = useStore((s) => s.results.stats);
  const estimator = useStore((s) => s.estimator);
  const [method, setMethod] = useState('pearson');
  const [group, setGroup] = useState('');
  const [hl, setHl] = useState(null);
  const { running, error, setError, run } = useRun();
  const groupVars = data ? data.variables.filter((v) => v.type === 'binary' || (v.type === 'nominal' && v.hist.length <= 6)).map((v) => v.name) : [];

  async function compute(m = method, g = group) {
    await run(async () => setResult('stats', await engine.call('descriptives', { method: m, group: g || null })));
  }
  useEffect(() => {
    if (!data) return;
    if (!group && groupVars.length) setGroup(groupVars[0]);
    if (!res || res.stale) compute(method, group || groupVars[0] || '');
  }, [data]);

  if (!data) return <Screen><NeedData /></Screen>;
  const r = res && res.value;
  const mar = r && r.mardia;
  const nonNormal = mar && (mar.skew_p < 0.05 || mar.kurt_p < 0.05);
  const recommended = nonNormal ? 'MLM' : 'ML';

  function chooseEstimator(v) {
    if (v === estimator) return;
    const before = estimator;
    setState({ estimator: v });
    markStale(withDependents(['cfa', 'sem']));
    const d = logDecision({ module: 'Opisowe i testy', moduleIcon: 'stats', kind: 'change', origin: v === recommended ? 'proposal' : 'manual', action: t("Estymator {0} → {1}", { 0: before, 1: v }),
      reason: mar ? t("Test Mardii: kurtoza z = {0}, {1}.", { 0: n2(mar.kurt_z), 1: pTxt(mar.kurt_p) }) : t("Wybór badacza."), undo: { type: 'estimator', before } });
    toast(t("Estymator: {0}. CFA i SEM czekają na przeliczenie.", { 0: v }), { actionLabel: t("Cofnij"), onAction: () => import('../store.js').then((m) => m.revertDecision(d.id)) });
  }

  return (
    <Screen>
      <Head eyebrow={t("Opisowe i testy")} title={t("Pierwszy rzut oka na pozycje")} meta={r ? [<Badge key="n">n = {int(r.n)}</Badge>, <Badge key="v">{r.vars.length} {t("pozycji")}</Badge>] : []}>
        <Field label={t("Korelacje")}><Select value={method} onChange={(e) => { setMethod(e.target.value); compute(e.target.value, group); }} options={[{ value: 'pearson', label: t("Pearsona") }, { value: 'spearman', label: t("Spearmana") }]} /></Field>
        <Field label={t("Porównaj grupy według")}><Select value={group} onChange={(e) => { setGroup(e.target.value); compute(method, e.target.value); }} options={[{ value: '', label: t("bez porównań") }].concat(groupVars.map((g) => ({ value: g, label: g })))} /></Field>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <StaleNote stale={res && res.stale} onRun={() => compute()} running={running} />
      {!r ? <Loading variant="table" /> : (
        <>
          <div className="cols">
            <Panel flush title={t("Pozycje")} subtitle={t("Kliknij wiersz, aby wskazać zmienną w macierzy korelacji")}>
              <div className="pad-x scroll-x">
                <ResultTable dense onRowClick={(row) => setHl(row.var)}
                  columns={[{ key: 'var', label: t("Pozycja"), type: 'var' }, { key: 'dist', label: t("Rozkład"), type: 'text', render: (v) => v },
                    { key: 'mean', label: 'M', type: 'num', digits: 2 }, { key: 'sd', label: 'SD', type: 'num', digits: 2 },
                    { key: 'skew', label: t("Skośność"), type: 'num', digits: 2 }, { key: 'kurt', label: t("Kurtoza"), type: 'num', digits: 2 }, { key: 'miss', label: t("Braki"), type: 'text', align: 'num' }]}
                  rows={r.rows.map((x) => ({ var: x.var, dist: <Distribution mini counts={x.hist} label={t("Rozkład {0}", { 0: x.var })} width={72} height={22} />, mean: x.mean, sd: x.sd, skew: x.skew, kurt: x.kurt, miss: pct(x.missing_pct), selected: hl === x.var,
                    flag: Math.abs(x.skew) > 2 || Math.abs(x.kurt) > 7 ? 'poor' : undefined }))}
                  note={t("Skośność |> 2| lub kurtoza |> 7| oznacza silne odchylenie od normalności (Curran, West i Finch, 1996).")} />
              </div>
            </Panel>
            <div className="stack">
              <Panel title={<Term term={t("Test Mardii")} definition={t("Wielowymiarowa skośność i kurtoza; odrzucenie normalności przemawia za odpornym estymatorem.")} source={t("Mardia (1970)")}>{t("Normalność wielowymiarowa")}</Term>} subtitle={t("Decyduje o wyborze estymatora w CFA i SEM")}>
                {mar ? (
                  <div className="stack">
                    <table className="tbl"><tbody>
                      <tr><td>{t("Skośność b₁")}</td><td className="num">{n2(mar.b1)}</td><td className="num">χ²({int(mar.skew_df)}) = {format.num(mar.skew_chi2, 1)}; {pTxt(mar.skew_p)}</td></tr>
                      <tr><td>{t("Kurtoza b₂")}</td><td className="num">{n2(mar.b2)}</td><td className="num">z = {n2(mar.kurt_z)}; {pTxt(mar.kurt_p)}</td></tr>
                    </tbody></table>
                    <Verdict level={nonNormal ? 'ok' : 'good'}>{nonNormal ? t("normalność odrzucona") : t("brak podstaw do odrzucenia normalności")}</Verdict>
                    <RadioGroup label={t("Estymator dla CFA i SEM")} value={estimator} onChange={chooseEstimator} options={[
                      { value: 'MLM', label: t("MLM (Satorra–Bentler)"), hint: t("Odporne błędy standardowe i skalowane χ². Wyniki punktowe jak w ML."), badge: recommended === 'MLM' ? <Badge tone="brand">{t("zalecany")}</Badge> : undefined },
                      { value: 'ML', label: 'ML', hint: t("Zakłada normalność wielowymiarową; przy jej braku zaniża błędy i zawyża χ²."), badge: recommended === 'ML' ? <Badge tone="brand">{t("zalecany")}</Badge> : undefined },
                    ]} />
                  </div>
                ) : <span className="muted">{t("Za mało kompletnych przypadków.")}</span>}
              </Panel>
              {r.compare.length ? (
                <Panel flush title={t("Szybkie porównanie: {0}", { 0: r.group })} subtitle={t("Średnie skal (sumy pozycji / k)")}>
                  <div className="pad-x"><ResultTable dense
                    columns={[{ key: 'name', label: t("Skala"), type: 'text' }, { key: 'm', label: t("M (SD) w grupach"), type: 'text' }, { key: 'test', label: t("Test"), type: 'text' }, { key: 'p', label: 'p', type: 'p' }, { key: 'es', label: t("Efekt"), type: 'text' }]}
                    rows={r.compare.map((c) => ({ name: c.name, m: c.groups.map((g) => `${g.group}: ${n2(g.mean)} (${n2(g.sd)})`).join(' · '),
                      test: c.test === 'welch' ? `t(${format.num(c.df, 1)}) = ${n2(c.t)}` : `F(${c.df1}, ${c.df2}) = ${n2(c.F)}`, p: c.p,
                      es: c.test === 'welch' ? `g = ${n2(c.g)} [${n2(c.g_lo)}; ${n2(c.g_hi)}]` : `η² = ${n3(c.eta2)}` }))}
                    note={t("Test t Welcha (bez założenia równych wariancji), g Hedgesa. Różnice w konstruktach latentnych liczy moduł Porównanie grup (v1).")} /></div>
                </Panel>
              ) : null}
            </div>
          </div>
          <Panel title={t("Macierz korelacji")} subtitle={t("{0} · granice skal zaznaczone", { 0: method === 'pearson' ? t("Pearsona") : t("Spearmana") })}>
            <CorrMatrix vars={r.vars} r={r.r} p={r.p} n={r.n} groups={r.groups} highlight={hl || undefined} hint={t("Najedź na komórkę, aby zobaczyć r, p i n.")} />
          </Panel>
          <Interpretation tone="info" title={t("Co dalej")}>
            {t("Sprawdź, czy pozycje tej samej skali korelują ze sobą wyraźniej niż z innymi. Rzetelność i trafność policzysz w następnym module, a strukturę czynnikową - w EFA.")}
          </Interpretation>
        </>
      )}
    </Screen>
  );
}
