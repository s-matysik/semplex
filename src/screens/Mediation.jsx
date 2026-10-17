import React, { useEffect, useState } from 'react';
import {
  Panel, ChoiceGroup, Field, Select, StatTile, PathDiagram, ConditionalEffectPlot, ResultTable, Interpretation, Badge, Button, Segmented, Switch, Progress, CodeExport,
} from 'semplex-ui';
import { useStore, engine, setResult, runEngineJob, logDecision } from '../store.js';
import { Head, Screen, NeedData, EngineErrorView, useRun, Loading, StaleNote, SeedBadge } from '../ui.jsx';
import { n2, n3, pTxt, int, ci } from '../lib/fit.js';

const TEMPLATES = [
  { value: '4', title: 'Szablon 4 · mediacja', desc: 'X → M → Y', meta: 'efekt pośredni a·b z bootstrapem' },
  { value: '1', title: 'Szablon 1 · moderacja', desc: 'W zmienia siłę X → Y', meta: 'efekt warunkowy, Johnson–Neyman' },
  { value: '7', title: 'Szablon 7 · moderowana mediacja', desc: 'W moderuje ścieżkę a', meta: 'indeks moderowanej mediacji' },
  { value: '14', title: 'Szablon 14 · moderowana mediacja', desc: 'W moderuje ścieżkę b', meta: 'moderacja drugiego etapu' },
  { value: '58', title: 'Szablon 58', desc: 'W moderuje a i b', meta: 'wydanie v1', release: 'v1', disabled: true },
];

function med4Diagram(x, m, y, p) {
  const e = (k) => p[k] || {};
  return { nodes: [{ id: x, kind: 'latent', x: 70, y: 170, rx: 38, ry: 21 }, { id: m, kind: 'latent', x: 250, y: 50, rx: 38, ry: 21 }, { id: y, kind: 'latent', x: 430, y: 170, rx: 38, ry: 21 }],
    edges: [{ from: x, to: m, kind: 'path', est: e('a').std, p: e('a').p, label: 'a' }, { from: m, to: y, kind: 'path', est: e('b').std, p: e('b').p, label: 'b' }, { from: x, to: y, kind: 'path', est: e('c').std, p: e('c').p, label: "c'" }] };
}

export default function MedScreen() {
  const data = useStore((s) => s.data);
  const res = useStore((s) => s.results.med);
  const settings = useStore((s) => s.settings);
  const mode = useStore((s) => s.mode);
  const scales = data ? data.scales.map((s) => s.id) : [];
  const numeric = data ? data.variables.filter((v) => v.type === 'continuous' || v.type === 'binary').map((v) => v.name) : [];
  const options = scales.map((s) => ({ value: s, label: `${s} (skala)` })).concat(numeric.map((v) => ({ value: v, label: v })));
  const prev = res && res.value ? res.value.spec : null;
  const [tpl, setTpl] = useState(prev ? prev.tpl : '4');
  const [x, setX] = useState(prev ? prev.x : scales[0] || '');
  const [m, setM] = useState(prev ? prev.m : scales[2] || scales[1] || '');
  const [y, setY] = useState(prev ? prev.y : scales.includes('LOY') ? 'LOY' : scales[1] || '');
  const [w, setW] = useState(prev ? prev.w : scales[3] || numeric[0] || '');
  const [latent, setLatent] = useState(true);
  const [progress, setProgress] = useState(null);
  const { running, error, setError, run } = useRun();

  if (!data) return <Screen><NeedData /></Screen>;
  if (scales.length < 2) return <Screen><Interpretation tone="warn" title="Potrzebne są co najmniej dwie skale">Zdefiniuj skale w module Dane → Skale.</Interpretation></Screen>;
  const v = res && res.value;
  const roles = tpl === '4' ? [x, m, y] : tpl === '1' ? [x, w, y] : [x, m, y, w];
  const dup = new Set(roles).size !== roles.length;

  async function compute() {
    await run(async () => {
      const spec = { tpl, x, m, y, w, latent };
      const R = settings.bootR;
      if (tpl === '1') {
        const r = await engine.call('moderation', { x, w, y });
        setResult('med', { spec, mod: r });
      } else if (tpl === '4') {
        setProgress({ done: 0, total: R });
        const out = await runEngineJob({ label: `Mediacja ${x} → ${m} → ${y} (${R})`, module: 'Mediacja', icon: 'mediation', kind: 'med4', params: { x, m, y, R, seed: settings.seed, latent, part: 'all' }, chunk: 25 });
        setProgress(null);
        if (!out.cancelled) setResult('med', { spec, med: out.result });
      } else {
        const kind = tpl === '14' ? 'med14' : 'med7';
        const out = await runEngineJob({ label: `Moderowana mediacja, szablon ${tpl} (${Math.max(R, 1000)})`, module: 'Mediacja', icon: 'mediation', kind, params: { x, m, y, w, R: Math.max(R, 1000), seed: settings.seed }, chunk: 200 });
        if (!out.cancelled) setResult('med', { spec, med7: out.result });
      }
      logDecision({ module: 'Mediacja', moduleIcon: 'mediation', kind: 'run', origin: 'manual', action: `Szablon ${tpl}: ${tpl === '1' ? `${x} × ${w} → ${y}` : `${x} → ${m} → ${y}${tpl === '7' || tpl === '14' ? `, W = ${w}` : ''}`}`, reason: tpl === '1' ? 'Moderacja na średnich skal.' : `Bootstrap ${R} prób, ziarno ${settings.seed}.` });
    });
  }

  let body = null;
  if (v && v.med) {
    const r = v.med, d = r.defined, b = r.boot || {};
    const indSig = b.ind_std && (b.ind_std[0] > 0 || b.ind_std[1] < 0);
    const cSig = r.paths.c && r.paths.c.p < 0.05;
    const type = indSig ? (cSig ? 'mediacja częściowa' : 'mediacja pełna') : 'brak mediacji';
    const diag = med4Diagram(v.spec.x, v.spec.m, v.spec.y, r.paths);
    body = (
      <>
        <div className="tiles">
          <StatTile label="Efekt pośredni a·b" value={n3(d.ind.std)} icon="mediation" tone={indSig ? 'good' : 'ok'} note={b.ind_std ? `95% CI ${ci(b.ind_std[0], b.ind_std[1], 3)} · bootstrap` : 'czekaj na bootstrap'} />
          <StatTile label="Efekt bezpośredni c′" value={n3(r.paths.c.std)} icon="path" note={`${pTxt(r.paths.c.p)}`} />
          <StatTile label="Efekt całkowity" value={n3(d.total.std)} icon="arrow-right" note={b.total_std ? `95% CI ${ci(b.total_std[0], b.total_std[1], 3)}` : ''} />
          <StatTile label="Proporcja zapośredniczona" value={r.prop_mediated != null ? `${Math.round(100 * r.prop_mediated)}%` : '—'} icon="layers" note="a·b / c (miara opisowa)" />
        </div>
        <Interpretation tone={indSig ? 'good' : 'info'} title={`${v.spec.m} pośredniczy w związku ${v.spec.x} z ${v.spec.y}: ${type}`} source="Bootstrap percentylowy: Preacher i Hayes (2008); typy mediacji: Zhao, Lynch i Chen (2010)">
          Efekt pośredni wynosi β = <b>{n3(d.ind.std)}</b>{b.ind_std ? <>, 95% CI [{n3(b.ind_std[0])}; {n3(b.ind_std[1])}] — przedział {indSig ? 'nie obejmuje' : 'obejmuje'} zera</> : ''}. Efekt bezpośredni c′ = {n3(r.paths.c.std)} ({pTxt(r.paths.c.p)}). {r.latent ? 'Model na zmiennych latentnych — ścieżki są wolne od błędu pomiaru.' : 'Model na średnich skal — ścieżki są zaniżone przez błąd pomiaru.'}
        </Interpretation>
        <div className="cols">
          <Panel title="Diagram statystyczny" subtitle="Współczynniki standaryzowane">
            <PathDiagram {...diag} width={500} height={230} legend label="Diagram mediacji" />
          </Panel>
          <Panel flush title="Ścieżki">
            <div className="pad-x"><ResultTable dense columns={[{ key: 'k', label: 'Ścieżka', type: 'text' }, { key: 'b', label: 'β', type: 'est' }, { key: 'ci', label: '95% CI', type: 'ci' }, { key: 'raw', label: 'B', type: 'num', digits: 3 }, { key: 'p', label: 'p', type: 'p' }]}
              rows={[['a', `${v.spec.x} → ${v.spec.m}`, 'a_std'], ['b', `${v.spec.m} → ${v.spec.y}`, 'b_std'], ['c', `${v.spec.x} → ${v.spec.y} (c′)`, 'c_std']].map(([k, lab, bk]) => ({ k: `${k}: ${lab}`, b: r.paths[k].std, ci: b[bk] || [r.paths[k].std_lo, r.paths[k].std_hi], raw: r.paths[k].est, p: r.paths[k].p }))}
              note={`n = ${int(r.n)} · bootstrap ${r.R_ok} z ${r.R} prób · ziarno ${r.seed}`} /></div>
          </Panel>
        </div>
        {mode !== 'simple' ? <CodeExport snippets={{ lavaan: `library(lavaan)\nmodel <- '\n${r.syntax}\n'\nset.seed(${r.seed})\nfit <- sem(model, data = dane, se = "bootstrap", bootstrap = ${r.R})\nparameterEstimates(fit, boot.ci.type = "perc", standardized = TRUE)`, python: `from semplex.mediation import Model4Job\njob = Model4Job(dane, skale, "${v.spec.x}", "${v.spec.m}", "${v.spec.y}", R=${r.R}, seed=${r.seed})\nwhile not job.step(50): pass\nprint(job.result()["boot"])` }} defaultLang="lavaan" meta={`ziarno ${r.seed}`} /> : null}
      </>
    );
  } else if (v && v.mod) {
    const r = v.mod;
    const inter = r.coefs[2];
    const jnTxt = r.jn.length ? r.jn.map((j) => n2(j)).join(' i ') : null;
    body = (
      <>
        <div className="tiles">
          <StatTile label={`Interakcja ${v.spec.x} × ${v.spec.w}`} value={n3(inter.b)} icon="interaction" tone={inter.p < 0.05 ? 'good' : 'ok'} note={`${pTxt(inter.p)} · 95% CI ${ci(inter.lo, inter.hi, 3)}`} />
          <StatTile label="R² modelu" value={n2(r.r2)} icon="layers" meter={r.r2} note={`n = ${int(r.n)}`} />
          <StatTile label="Obszar Johnsona–Neymana" value={jnTxt || 'brak granicy'} icon="split" note={`efekt istotny dla ${Math.round(100 * r.sig_share)}% próby`} />
          <StatTile label="Skośność W" value={n2(r.skew_w)} icon="stats" note={Math.abs(r.skew_w) > 1 ? 'sondy percentylowe bezpieczniejsze' : 'sondy M ± 1 SD'} />
        </div>
        <Interpretation tone={inter.p < 0.05 ? 'good' : 'info'} title={inter.p < 0.05 ? `${v.spec.w} zmienia siłę związku ${v.spec.x} z ${v.spec.y}` : `Brak dowodu, że ${v.spec.w} moderuje związek ${v.spec.x} z ${v.spec.y}`} source="Hayes (2022); Johnson i Neyman (1936)">
          Współczynnik interakcji B = {n3(inter.b)} ({pTxt(inter.p)}). {jnTxt ? `Efekt ${v.spec.x} jest istotny po ${r.jn.length === 1 ? 'jednej stronie' : 'zewnętrznych stronach'} wartości ${jnTxt} moderatora.` : `Efekt warunkowy ma ten sam status istotności w całym zakresie ${v.spec.w}.`} Predyktory wycentrowano (średnie skal).
        </Interpretation>
        <div className="cols">
          <Panel title="Efekt warunkowy" subtitle={`Efekt ${v.spec.x} na ${v.spec.y} w zależności od ${v.spec.w}, z 95% CI`}>
            <ConditionalEffectPlot points={r.points} jn={r.jn} marks={r.probes.map((p) => ({ w: p.w, label: p.label }))} dist={r.dist} wLabel={v.spec.w} wShort="W" yLabel={`Efekt ${v.spec.x}`} effectShort="θ"
              legend fluid height={300} label="Efekt warunkowy z obszarem Johnsona-Neymana" />
          </Panel>
          <Panel flush title="Sondy efektu prostego">
            <div className="pad-x"><ResultTable dense columns={[{ key: 'label', label: v.spec.w, type: 'text' }, { key: 'w', label: 'Wartość', type: 'num', digits: 2 }, { key: 'est', label: 'Efekt', type: 'est' }, { key: 'ci', label: '95% CI', type: 'ci' }, { key: 'p', label: 'p', type: 'p' }]}
              rows={r.probes.map((p) => ({ label: p.label, w: p.w, est: p.est, ci: [p.lo, p.hi], p: p.p }))} /></div>
            <div className="pad-x"><ResultTable dense columns={[{ key: 'term', label: 'Predyktor', type: 'text' }, { key: 'b', label: 'B', type: 'est' }, { key: 'ci', label: '95% CI', type: 'ci' }, { key: 'p', label: 'p', type: 'p' }]} rows={r.coefs.map((c) => ({ term: c.term, b: c.b, ci: [c.lo, c.hi], p: c.p }))} note="Regresja MNK na średnich skal; predyktory wycentrowane." /></div>
          </Panel>
        </div>
      </>
    );
  } else if (v && v.med7) {
    const r = v.med7, c = r.ci || {};
    const sig = c.index && (c.index[0] > 0 || c.index[1] < 0);
    body = (
      <>
        <div className="tiles">
          <StatTile label="Indeks moderowanej mediacji" value={n3(r.point.index)} icon="interaction" tone={sig ? 'good' : 'ok'} note={c.index ? `95% CI ${ci(c.index[0], c.index[1], 3)}` : ''} />
          <StatTile label={`Efekt pośredni, ${v.spec.w} −1 SD`} value={n3(r.point.ind_lo)} icon="mediation" note={c.ind_lo ? ci(c.ind_lo[0], c.ind_lo[1], 3) : ''} />
          <StatTile label={`Efekt pośredni, ${v.spec.w} = M`} value={n3(r.point.ind_m)} icon="mediation" note={c.ind_m ? ci(c.ind_m[0], c.ind_m[1], 3) : ''} />
          <StatTile label={`Efekt pośredni, ${v.spec.w} +1 SD`} value={n3(r.point.ind_hi)} icon="mediation" note={c.ind_hi ? ci(c.ind_hi[0], c.ind_hi[1], 3) : ''} />
        </div>
        <Interpretation tone={sig ? 'good' : 'info'} title={sig ? `Efekt pośredni zależy od ${v.spec.w}` : `Brak dowodu, że ${v.spec.w} zmienia efekt pośredni`} source="Hayes (2015)">
          {v.spec.tpl === '14' ? `${v.spec.w} moderuje ścieżkę ${v.spec.m} → ${v.spec.y} (drugi etap). ` : `${v.spec.w} moderuje ścieżkę ${v.spec.x} → ${v.spec.m} (pierwszy etap). `}Indeks moderowanej mediacji = {n3(r.point.index)}{c.index ? `, 95% CI [${n3(c.index[0])}; ${n3(c.index[1])}]` : ''}. Efekty niestandaryzowane na średnich skal; bootstrap {r.R} prób, ziarno {r.seed}.
        </Interpretation>
      </>
    );
  }

  return (
    <Screen>
      <Head eyebrow="Mediacja i moderacja" title="Szablony PROCESS na Twoich skalach" meta={v ? [<SeedBadge key="s" seed={settings.seed} R={tpl === '1' ? undefined : settings.bootR} />] : []} />
      <ChoiceGroup options={TEMPLATES} value={tpl} onChange={setTpl} columns={5} label="Szablon modelu" />
      <Panel title="Zmienne">
        <div className="form">
          <Field label="X — predyktor"><Select value={x} onChange={(e) => setX(e.target.value)} options={options} /></Field>
          {tpl !== '1' ? <Field label="M — mediator"><Select value={m} onChange={(e) => setM(e.target.value)} options={options} /></Field> : null}
          {tpl !== '4' ? <Field label="W — moderator"><Select value={w} onChange={(e) => setW(e.target.value)} options={options} /></Field> : null}
          <Field label="Y — zmienna zależna"><Select value={y} onChange={(e) => setY(e.target.value)} options={options} /></Field>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {tpl === '4' ? <Switch label="Zmienne latentne (SEM)" hint="Wyłącz, aby liczyć na średnich skal jak PROCESS" checked={latent} onChange={setLatent} /> : null}
          <div style={{ flex: 1 }} />
          <Button variant="primary" icon="play" loading={running} disabled={dup || roles.some((r) => !r)} onClick={compute}>Uruchom szablon {tpl}</Button>
        </div>
        {dup ? <p className="subtle">Każda rola musi mieć inną zmienną.</p> : null}
      </Panel>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      {progress ? <Progress indeterminate label="Bootstrap efektu pośredniego" detail={`${settings.bootR} prób · ziarno ${settings.seed} · postęp w zadaniach w tle`} /> : null}
      <StaleNote stale={res && res.stale} onRun={compute} running={running} />
      {running && !v ? <Loading /> : body}
    </Screen>
  );
}
