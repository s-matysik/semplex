import React, { useEffect, useState } from 'react';
import { Panel, ThresholdPlot, ValidityMatrix, ResultTable, Interpretation, Badge, Verdict, Term, Button, Checkbox, StatTile, Progress, Segmented, Dialog } from 'semplex-ui';
import { useStore, engine, setResult, runEngineJob, getState, setState, logDecision, markStale, toast, DOWNSTREAM, revertDecision } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, useRun, Loading, StaleNote, SeedBadge } from '../ui.jsx';
import { n2, n3, grade, RULES, int } from '../lib/fit.js';
import { ensureSplit } from '../lib/analysis.js';
import { t } from '../i18n/index.js';

export default function RelScreen() {
  const data = useStore((s) => s.data);
  const res = useStore((s) => s.results.rel);
  const boot = useStore((s) => s.results.relBoot);
  const settings = useStore((s) => s.settings);
  const [sel, setSel] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [part, setPart] = useState('all');
  const [sim, setSim] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [bootRun, setBootRun] = useState(null);
  const { running, error, setError, run } = useRun();

  async function compute(p = part) {
    await run(async () => {
      if (p !== 'all') await ensureSplit();
      setResult('rel', await engine.call('reliability', { part: p }));
    });
  }
  useEffect(() => { if (data && data.scales.length && (!res || res.stale)) compute(); }, [data]);

  if (!data) return <Screen><NeedData /></Screen>;
  if (!data.scales.length) return <Screen><Interpretation tone="warn" title={t("Brak zdefiniowanych skal")}>Zdefiniuj skale w module Dane → Skale, np. „SAT (Satysfakcja): Q1, Q2, Q3”.</Interpretation></Screen>;
  const r = res && res.value;
  const ci = boot && boot.value && !boot.stale ? boot.value.ci : {};

  async function runBoot() {
    const R = Math.min(settings.bootR, 1000);
    setBootRun({ done: 0, total: R });
    const out = await runEngineJob({ label: t("Bootstrap ω i α ({0})", { 0: R }), module: 'Rzetelność', icon: 'reliability', kind: 'omega', params: { part, R, seed: settings.seed }, chunk: 10 });
    setBootRun(null);
    if (!out.cancelled) setResult('relBoot', out.result);
  }

  const rows = r ? r.scales.map((s) => ({ id: s.id, label: s.id, sub: t("{0} · {1} poz.", { 0: s.name, 1: s.k }), values: {
    omega: Object.assign({ est: s.omega }, ci[s.id] ? { lo: ci[s.id].omega_lo, hi: ci[s.id].omega_hi } : {}),
    alpha: Object.assign({ est: s.alpha }, ci[s.id] ? { lo: ci[s.id].alpha_lo, hi: ci[s.id].alpha_hi } : { lo: s.alpha_lo, hi: s.alpha_hi }),
  } })) : [];
  const cur = r && (r.scales.find((s) => s.id === sel) || r.scales[0]);
  const v = r && r.validity && !r.validity.error ? r.validity : null;
  const weak = r ? r.scales.filter((s) => s.omega < 0.7) : [];
  const badHtmt = [];
  if (v) v.factors.forEach((a, i) => v.factors.forEach((b, j) => { if (j > i && v.htmt[i][j] >= 0.85) badHtmt.push(`${a}–${b} (${n2(v.htmt[i][j])})`); }));
  const badAve = v ? v.rows.filter((x) => x.ave < 0.5) : [];

  async function dropItem(scale, item) {
    const s = r.scales.find((x) => x.id === scale);
    const row = s.item_rows.find((x) => x.item === item);
    const before = getState().data.scales.map((x) => ({ id: x.id, name: x.name, items: x.items }));
    const sc = {}, names = {};
    before.forEach((x) => { sc[x.id] = x.id === scale ? x.items.filter((i) => i !== item) : x.items; names[x.id] = x.name; });
    const summary = await engine.call('set_scales', { scales: sc, names });
    setState({ data: summary });
    markStale(DOWNSTREAM);
    const d = logDecision({ module: 'Rzetelność', moduleIcon: 'reliability', kind: 'remove', origin: 'proposal', action: t("Usunięto {0} ze skali {1}", { 0: item, 1: scale }),
      reason: t("Bez pozycji ω rośnie z {0} do {1}.", { 0: n2(s.omega), 1: n2(row.omega_del) }), effects: [{ label: `ω ${scale}`, from: n2(s.omega), to: n2(row.omega_del), tone: 'good' }],
      undo: { type: 'scales', before } });
    toast(t("Usunięto {0} ze skali {1}. CFA i SEM czekają na przeliczenie.", { 0: item, 1: scale }), { actionLabel: t("Cofnij"), onAction: async () => { await revertDecision(d.id); compute(); } });
    setConfirm(null);
    compute();
  }

  const insp = cur ? (
    <>
      <div className="eyebrow">{t("Analiza pozycji")}</div>
      <h2 className="sub">{cur.id} - {cur.name}</h2>
      <div className="row tight"><Verdict level={grade(cur.omega, RULES.omega)}>ω = {n2(cur.omega)}</Verdict><span className="subtle">α = {n2(cur.alpha)}</span></div>
      <p className="subtle">{t("Odznacz pozycję, aby zobaczyć ω po jej usunięciu. To symulacja - dane i skala się nie zmieniają.")}</p>
      {cur.item_rows.map((it) => {
        const off = !!sim[cur.id + ':' + it.item];
        const gain = it.omega_del != null ? it.omega_del - cur.omega : null;
        return (
          <div key={it.item} className="stack" style={{ gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
            <div className="row tight">
              <Checkbox checked={!off} onChange={(c) => setSim(Object.assign({}, sim, { [cur.id + ':' + it.item]: !c }))} label={<><span className="mono">{it.item}</span> <span className="muted">{it.label}</span></>} ariaLabel={t("Uwzględnij pozycję {0}", { 0: it.item })} />
            </div>
            <div className="subtle">λ = {n2(it.loading)} · r(pozycja–reszta) = {n2(it.r_ir)} · ω bez pozycji = {it.omega_del == null ? '-' : n2(it.omega_del)}
              {gain != null && gain > 0.005 ? <> <Badge tone="ok" icon="ok">ω +{n2(gain)}</Badge></> : null}</div>
            {off ? (
              <Interpretation tone={gain > 0.005 ? 'warn' : 'info'} title={it.omega_del == null ? t("Skala nie może mieć mniej niż dwóch pozycji") : t("Bez {0}: ω = {1} ({2}{3})", { 0: it.item, 1: n2(it.omega_del), 2: gain >= 0 ? '+' : '−', 3: n2(Math.abs(gain)) })}
                actions={it.omega_del != null && cur.k > 2 ? <Button size="sm" variant="secondary" icon="trash" onClick={() => setConfirm({ scale: cur.id, item: it.item, gain })}>{t("Usuń ze skali")}</Button> : null}>
                {it.omega_del == null ? t("Zostaw pozycję w skali.") : gain > 0.005 ? t("Zysk {0} warto zestawić z utratą treści: skala zostanie z {1} pozycjami.", { 0: n2(gain), 1: cur.k - 1 }) : t("Usunięcie nie poprawia rzetelności - zostaw pozycję.")}
              </Interpretation>
            ) : null}
          </div>
        );
      })}
    </>
  ) : null;

  return (
    <Screen inspector={insp} inspectorTitle={cur ? t("Skala {0}", { 0: cur.id }) : t("Skala")} inspectorOpen={drawer} onInspectorClose={() => setDrawer(false)}>
      <Head eyebrow={t("Rzetelność i trafność")} title={t("Czy skale mierzą rzetelnie i różnią się od siebie")} meta={r ? [<Badge key="n">n = {int(r.n)}</Badge>, <Badge key="m">{t("ω z jednoczynnikowej CFA")}</Badge>, ci && Object.keys(ci).length ? <SeedBadge key="s" seed={boot.value.seed} R={boot.value.R} /> : null].filter(Boolean) : []}>
        <Segmented size="sm" label={t("Próba")} value={part} onChange={(p) => { setPart(p); compute(p); }} options={[{ value: 'all', label: t("Cała próba") }, { value: 'cfa', label: t("Część CFA") }]} />
        <Button variant="secondary" icon="shuffle" onClick={() => run(runBoot)} disabled={!!bootRun || !r}>{t("Policz CI bootstrap")}</Button>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <StaleNote stale={res && res.stale} onRun={() => compute()} running={running} />
      {bootRun ? <Progress indeterminate label={t("Bootstrap ω i α")} detail={t("ziarno {0} · postęp w zadaniach w tle", { 0: settings.seed })} /> : null}
      {!r ? <Loading /> : (
        <>
          <div className="tiles">
            {r.scales.slice(0, 4).map((s) => <StatTile key={s.id} label={`${s.id} - ${s.name}`} value={n2(s.omega)} unit="ω" icon="reliability" tone={grade(s.omega, RULES.omega)} meter={s.omega} note={t("α = {0} [{1}; {2}] · {3} poz.", { 0: n2(s.alpha), 1: n2(s.alpha_lo), 2: n2(s.alpha_hi), 3: s.k })} />)}
          </div>
          <Interpretation tone={weak.length ? 'warn' : 'good'} title={weak.length ? t("Rzetelność poniżej 0,70: {0}", { 0: weak.map((s) => s.id).join(', ') }) : t("Wszystkie skale są rzetelne")} source={t("ω: McDonald (1999); progi: Nunnally (1978)")}
            actions={<Term term={t("Dlaczego ω, a nie α?")} definition={t("α zakłada równe ładunki wszystkich pozycji (tau-równoważność); ω liczy rzetelność z ładunków modelu i nie zaniża jej przy nierównych ładunkach.")} source={t("McNeish (2018)")} />}>
            {weak.length ? t("Sprawdź analizę pozycji w inspektorze: usuń pozycję tylko wtedy, gdy treść skali na to pozwala.") : t("ω wynosi od {0} do {1}.", { 0: n2(Math.min(...r.scales.map((s) => s.omega))), 1: n2(Math.max(...r.scales.map((s) => s.omega))) })}
          </Interpretation>
          <div className="cols">
            <Panel title={t("Rzetelność skal")} subtitle={Object.keys(ci).length ? t("Przedziały 95% z bootstrapu") : t("Przedziały α metodą Feldta; uruchom bootstrap dla ω")}>
              <ThresholdPlot rows={rows} series={[{ key: 'omega', label: t("ω McDonalda"), short: 'ω', shape: 'circle', ci: true }, { key: 'alpha', label: t("α Cronbacha"), short: 'α', shape: 'square', ci: true }]}
                zones={[{ to: 0.6, level: 'poor', label: '< 0,60', legend: 'niedostateczna' }, { to: 0.7, level: 'ok', label: '0,60–0,70', legend: 'dopuszczalna' }, { level: 'good', label: '≥ 0,70', legend: 'dobra' }]}
                min={0.4} max={1} tickStep={0.1} axisLabel={t("Rzetelność")} selected={cur && cur.id} onSelect={(id) => { setSel(id); setDrawer(true); }} legend tooltip fluid label={t("Rzetelność skal na tle progów")} />
            </Panel>
            {v ? (
              <Panel title={<Term term={t("HTMT i √AVE")} definition={t("HTMT < 0,85 i √AVE większe od korelacji z innymi czynnikami świadczą o trafności różnicowej.")} source={t("Henseler i in. (2015); Fornell i Larcker (1981)")}>{t("Trafność różnicowa")}</Term>} subtitle={t("Pod przekątną korelacje czynników, nad - HTMT, na przekątnej √AVE")}>
                <ValidityMatrix factors={v.factors} ave={v.rows.map((x) => x.ave)} phi={v.phi} htmt={v.htmt} htmtCut={0.85} htmtNear={0.8} />
              </Panel>
            ) : <Panel title={t("Trafność różnicowa")}><span className="muted">{r.validity && r.validity.error ? r.validity.error : t("Potrzebne są co najmniej dwie skale.")}</span></Panel>}
          </div>
          {v ? (
            <>
              <Panel flush title={t("Trafność zbieżna")} subtitle={t("Z modelu pomiarowego wszystkich skal (CFA)")}>
                <div className="pad-x"><ResultTable dense onRowClick={(row) => { setSel(row.f); setDrawer(true); }}
                  columns={[{ key: 'f', label: t("Czynnik"), type: 'var' }, { key: 'cr', label: 'CR', type: 'num', digits: 2 }, { key: 'crv', label: '', type: 'verdict' },
                    { key: 'ave', label: 'AVE', type: 'num', digits: 2 }, { key: 'avev', label: '', type: 'verdict' }, { key: 'msv', label: 'MSV', type: 'num', digits: 2 }, { key: 'lam', label: t("λ (min–max)"), type: 'text' }]}
                  rows={v.rows.map((x) => ({ f: x.factor, cr: x.cr, crv: grade(x.cr, RULES.cr), ave: x.ave, avev: grade(x.ave, RULES.ave), msv: x.msv,
                    lam: `${n2(Math.min(...x.loadings))}–${n2(Math.max(...x.loadings))}`, selected: cur && cur.id === x.factor }))}
                  note={t("CR ≥ 0,70 (Hair i in., 2019); AVE ≥ 0,50 i AVE > MSV (Fornell i Larcker, 1981).")} /></div>
              </Panel>
              <Interpretation tone={badHtmt.length || badAve.length ? 'warn' : 'good'} title={badHtmt.length ? t("Część skal słabo się od siebie różni") : badAve.length ? t("Trafność zbieżna wymaga uwagi") : t("Trafność zbieżna i różnicowa są spełnione")} source={t("Henseler, Ringle i Sarstedt (2015)")}>
                {badHtmt.length ? t("HTMT ≥ 0,85: {0}. Rozważ połączenie skal albo sprawdź pozycje o podobnej treści. ", { 0: badHtmt.join(', ') }) : ''}
                {badAve.length ? t("AVE < 0,50: {0} - pozycje wyjaśniają mniej niż połowę wariancji czynnika. ", { 0: badAve.map((x) => x.factor + ' (' + n2(x.ave) + ')').join(', ') }) : ''}
                {!badHtmt.length && !badAve.length ? t("AVE od {0} do {1}; największy HTMT = {2}.", { 0: n2(Math.min(...v.rows.map((x) => x.ave))), 1: n2(Math.max(...v.rows.map((x) => x.ave))), 2: n2(Math.max(...v.htmt.flatMap((row, i) => row.filter((_, j) => j > i)))) }) : ''}
              </Interpretation>
            </>
          ) : null}
        </>
      )}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? t("Usunąć {0} ze skali {1}?", { 0: confirm.item, 1: confirm.scale }) : ''} icon="trash"
        subtitle={t("Pozycja zostanie w danych, ale nie trafi do CFA, SEM i raportu. Decyzję cofniesz w dzienniku.")}
        onConfirm={() => confirm && run(() => dropItem(confirm.scale, confirm.item))} confirmLabel={t("Usuń ze skali")} cancelLabel={t("Anuluj")}
        footNote={confirm ? t("Zysk ω: +{0}", { 0: n2(confirm.gain) }) : undefined} />
    </Screen>
  );
}
