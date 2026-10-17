import React, { useEffect, useMemo, useState } from 'react';
import {
  Dropzone, Button, Panel, Field, Select, Switch, TagInput, Badge, Interpretation, Tabs, DataGrid, StatTile, Distribution,
  ScatterPlot, MissingMap, ResultTable, VariableChip, Input, Diagnosis, Verdict, EmptyState, Term, format,
} from 'semplex-ui';
import { useStore, setState, getState, engine, addChange, toast, logDecision, markStale, DOWNSTREAM } from '../store.js';
import { sniffFile, resniff, commitImport, loadSample, openProjectFile } from '../lib/project.js';
import { Head, Screen, EngineBanner, EngineErrorView, useRun, Loading } from '../ui.jsx';
import { n2, n3, n1, pct, pTxt, int } from '../lib/fit.js';

const TYPE_OPTS = [
  { value: 'ordinal', label: 'porządkowa' }, { value: 'continuous', label: 'ciągła' }, { value: 'binary', label: 'dwuwartościowa' },
  { value: 'nominal', label: 'nominalna' }, { value: 'skip', label: 'pomiń' },
];
const TYPE_PL = { ordinal: 'porządkowa', continuous: 'ciągła', binary: 'dwuwartościowa', nominal: 'nominalna', text: 'tekst', date: 'data', id: 'identyfikator', skip: 'pominięta' };

/* ---------------------------------------------------------------- start */
function Start() {
  const { running, error, setError, run } = useRun();
  const eng = useStore((s) => s.engine);
  async function onFiles(files) {
    const f = files && files[0];
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { setError({ kind: 'model', message: 'Plik ma ponad 60 MB. Zapisz w CSV tylko potrzebne kolumny.' }); return; }
    if (/\.(sav|dta|sas7bdat|por)$/i.test(f.name)) { setError({ kind: 'model', message: 'Pliki SPSS, Stata i SAS obsłuży wydanie v1. Zapisz dane jako CSV albo XLSX (w SPSS: Plik → Eksportuj → CSV).' }); return; }
    setState({ pendingSampleMeta: null });
    await run(async () => sniffFile(f.name, await f.arrayBuffer()));
  }
  const wantSample = useStore((s) => s.wantSample);
  useEffect(() => {
    if (!wantSample || eng.status !== 'ready') return;
    setState({ wantSample: null });
    run(loadSample);
  }, [wantSample, eng.status]);
  return (
    <Screen>
      <Head eyebrow="Dane" title="Wczytaj dane z ankiety" meta={[<Badge key="a" icon="lock">dane zostają w tej przeglądarce</Badge>, <Badge key="b">CSV, TXT, TSV, XLSX</Badge>]}>
        <Button variant="secondary" icon="folder" onClick={openProjectFile} disabled={eng.status !== 'ready'}>Otwórz projekt</Button>
      </Head>
      <EngineBanner />
      <EngineErrorView error={error} onClose={() => setError(null)} />
      {running ? <Loading variant="table" label="Rozpoznawanie pliku" /> : (
        <Dropzone onFiles={onFiles} formats={['CSV', 'TXT', 'TSV', 'XLSX']} title="Upuść plik z danymi albo wybierz z dysku"
          subtitle="Jeden wiersz = jeden respondent, pierwszy wiersz = nazwy zmiennych. Kodowanie i separator rozpoznają się same."
          cta="Wybierz plik" onSample={() => run(loadSample)} sampleLabel="Otwórz przykład: Lojalność klientów 2026 (N = 524)"
          privacy="Dane nie opuszczają komputera — plik czyta przeglądarka, a liczy silnik uruchomiony lokalnie." />
      )}
      <div className="cols even">
        <Interpretation tone="info" title="Jak przygotować plik">
          Pozycje skal nazwij z przedrostkiem i numerem (SAT1, SAT2…), wtedy SEMplex sam zaproponuje skale. Kody braków (−99, „nie wiem”) wskażesz w następnym kroku. Odpowiedzi tekstowe w skali Likerta („raczej się zgadzam”) zamienią się na liczby 1–5.
        </Interpretation>
        <Interpretation tone="brand" title="Co dzieje się z danymi osobowymi" icon="lock">
          Kolumny z adresami e-mail, telefonami, imionami i nazwiskami są rozpoznawane przy imporcie i domyślnie pomijane. W podglądzie widać je tylko zamaskowane.
        </Interpretation>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- import */
function ImportStep() {
  const draft = useStore((s) => s.importDraft);
  const pendingMeta = useStore((s) => s.pendingSampleMeta);
  const [cols, setCols] = useState(draft.columns);
  const [codes, setCodes] = useState(draft.missing_codes.filter((c) => c !== ''));
  const { running, error, setError, run } = useRun();
  useEffect(() => { setCols(draft.columns); }, [draft]);
  const info = draft.info;
  const opts = draft.opts || {};
  const pii = cols.filter((c) => c.pii);
  const kept = cols.filter((c) => c.type !== 'skip');
  const names = new Set();
  const dup = kept.some((c) => { if (names.has(c.name)) return true; names.add(c.name); return false; });

  function upd(i, patch) { setCols(cols.map((c, j) => (j === i ? Object.assign({}, c, patch) : c))); }
  async function reopen(patch) { await run(() => resniff(Object.assign({}, opts, { missing_codes: [''].concat(codes) }, patch))); }

  return (
    <Screen>
      <Head eyebrow="Dane · import" title={draft.filename} meta={[
        <Badge key="n">{int(draft.n_rows)} wierszy · {draft.n_cols} kolumn</Badge>,
        info.kind === 'text' ? <Badge key="e" tone={info.replacement_chars ? 'ok' : 'good'} icon={info.replacement_chars ? 'ok' : 'good'}>kodowanie {info.encoding}</Badge> : <Badge key="x">arkusz Excel</Badge>,
        info.kind === 'text' ? <Badge key="s">separator „{info.sep === '\t' ? 'tab' : info.sep}” · dziesiętny „{info.decimal}”</Badge> : null,
      ].filter(Boolean)}>
        <Button variant="ghost" icon="x" onClick={() => setState({ importDraft: null })}>Anuluj</Button>
        <Button variant="primary" icon="check" loading={running} disabled={!kept.length || dup}
          onClick={() => run(async () => { await commitImport(cols, [''].concat(codes), pendingMeta); setState({ pendingSampleMeta: null }); })}>
          Importuj {kept.length} zmiennych
        </Button>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      {info.replacement_chars ? (
        <Diagnosis level="warn" compact title="Część znaków nie pasuje do kodowania" what={`${info.replacement_chars} znaków nie dało się odczytać jako ${info.encoding}.`}
          effect="Polskie litery w etykietach mogą być zniekształcone." fixes={[{ title: 'Wybierz kodowanie Windows-1250 (pliki z Excela i SPSS w Polsce)', recommended: true, actionLabel: 'Użyj Windows-1250', onAction: () => reopen({ encoding: 'cp1250' }) }]} />
      ) : null}
      {dup ? <Diagnosis level="poor" compact title="Dwie zmienne mają tę samą nazwę" what="Nazwy w kolumnie „Nazwa w analizie” muszą być unikalne." fixes={[{ title: 'Zmień jedną z nazw albo pomiń kolumnę' }]} /> : null}
      {info.kind === 'text' ? (
        <Panel title="Odczyt pliku" subtitle="Zmiana ustawień od razu odświeża podgląd">
          <div className="form">
            <Field label="Kodowanie"><Select value={opts.encoding || 'auto'} onChange={(e) => reopen({ encoding: e.target.value })}
              options={[{ value: 'auto', label: 'automatycznie' }, { value: 'utf-8', label: 'UTF-8' }, { value: 'cp1250', label: 'Windows-1250' }, { value: 'iso-8859-2', label: 'ISO 8859-2' }]} /></Field>
            <Field label="Separator"><Select value={opts.sep || 'auto'} onChange={(e) => reopen({ sep: e.target.value })}
              options={[{ value: 'auto', label: 'automatycznie' }, { value: ';', label: 'średnik ;' }, { value: ',', label: 'przecinek ,' }, { value: 'tab', label: 'tabulator' }, { value: '|', label: 'kreska |' }]} /></Field>
            <Field label="Znak dziesiętny"><Select value={opts.decimal || 'auto'} onChange={(e) => reopen({ decimal: e.target.value })}
              options={[{ value: 'auto', label: 'automatycznie' }, { value: ',', label: 'przecinek' }, { value: '.', label: 'kropka' }]} /></Field>
            <Field label="Kody braków danych" hint="Enter dodaje kod; puste komórki są brakami zawsze">
              <TagInput value={codes} onChange={setCodes} label="Kody braków danych" suggestions={['-99', '-9', '99', '999', 'NA', 'nie wiem', 'odmowa', 'brak']} />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <Button size="sm" variant="secondary" icon="refresh" onClick={() => reopen({})}>Zastosuj kody braków</Button>
            <span className="subtle">{Object.entries(draft.code_counts).filter(([, n]) => n > 0).map(([c, n]) => `„${c}”: ${n}`).join(' · ') || 'Żaden kod braku nie występuje w pliku.'}</span>
          </div>
        </Panel>
      ) : null}
      {pii.length ? (
        <Interpretation tone="brand" icon="lock" title={`${pii.length === 1 ? 'Jedna kolumna wygląda' : pii.length + ' kolumny wyglądają'} na dane osobowe i zostanie pominięta`}>
          {pii.map((c) => `${c.source} (${c.pii})`).join(', ')}. Możesz ją włączyć, zmieniając typ — wtedy trafi do pamięci tej karty przeglądarki i do zapisu projektu.
        </Interpretation>
      ) : null}
      <Panel flush title="Zmienne" subtitle="Sprawdź typy. Pozycje Likerta to zmienne porządkowe; identyfikatory i tekst są pomijane.">
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Kolumna w pliku</th><th>Nazwa w analizie</th><th>Typ</th><th>Wykryto</th><th className="num">Różnych</th><th className="num">Puste</th><th>Przykład</th></tr></thead>
            <tbody>
              {cols.map((c, i) => (
                <tr key={c.source} className={c.type === 'skip' ? 'is-muted' : ''}>
                  <td>{c.source}{c.pii ? <> <Badge tone="ok" icon="lock">{c.pii}</Badge></> : null}{c.scale ? <> <Badge tone="observed">skala tekstowa {c.scale.length}-st.</Badge></> : null}</td>
                  <td><Input mono value={c.name} aria-label={`Nazwa zmiennej ${c.source}`} onChange={(e) => upd(i, { name: e.target.value.replace(/[^A-Za-z0-9_]/g, '_') })} /></td>
                  <td><Select aria-label={`Typ zmiennej ${c.source}`} value={c.type} onChange={(e) => upd(i, { type: e.target.value })}
                    options={TYPE_OPTS.filter((o) => o.value === 'skip' || c.numeric || c.scale || o.value === 'nominal' || o.value === 'binary')} /></td>
                  <td className="muted">{TYPE_PL[c.detected] || c.detected}</td>
                  <td className="num">{c.unique}</td>
                  <td className="num">{c.empty_cells + c.missing_cells}</td>
                  <td className="muted mono">{c.example.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel flush title="Podgląd pierwszych wierszy" subtitle="Dane osobowe są zamaskowane">
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr>{draft.preview_header.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{draft.preview.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="mono">{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </Screen>
  );
}

/* ---------------------------------------------------------------- przegląd */
function Overview() {
  const data = useStore((s) => s.data);
  const changes = useStore((s) => s.changes);
  const [rows, setRows] = useState(null);
  const [sel, setSel] = useState(null);
  const [vinfo, setVinfo] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [limit, setLimit] = useState(200);
  const { running, run } = useRun();

  useEffect(() => { engine.call('rows', { offset: 0, limit }).then(setRows).catch(() => {}); }, [data, limit]);
  useEffect(() => {
    const first = sel || (data.variables.find((v) => v.type === 'ordinal') || data.variables[0] || {}).name;
    if (first) { setSel(first); engine.call('variable', { name: first }).then(setVinfo).catch(() => {}); }
  }, [sel, data]);

  const flagged = new Set(data.scales.flatMap((s) => s.flag));
  const columns = data.variables.map((v) => ({ key: v.name, type: v.type === 'nominal' ? 'nominal' : v.type, label: v.label || undefined, hist: v.hist, missing: v.missing, reversed: v.reversed, flag: flagged.has(v.name) ? 'ok' : undefined, digits: v.type === 'continuous' ? 1 : 0 }));
  const rowFlags = {};
  data.excluded.forEach((r) => { rowFlags[String(r + 1)] = 'excluded'; });

  async function reverse(v) {
    await run(() => addChange({ kind: 'reverse', var: v.name, lo: v.lo, hi: v.hi }, {
      module: 'Dane', moduleIcon: 'data', kind: 'change', origin: 'proposal', action: `Odwrócono pozycję ${v.name}`,
      reason: `Korelacja z resztą skali ${v.scale} była ujemna (r = ${n2(v.r_rest)}); treść pozycji jest sformułowana negatywnie.`,
      effects: [{ label: `α skali ${v.scale}`, from: n2(v.alpha), to: n2(v.alpha_reversed), tone: 'good' }],
      toast: `Odwrócono ${v.name}. Rzetelność, EFA, CFA i SEM czekają na przeliczenie.`,
    }));
  }

  const proposals = data.scales.flatMap((s) => s.flag.map((it) => ({ scale: s, item: it })));
  const insp = vinfo ? (
    <>
      <div className="eyebrow">Zmienna</div>
      <h2 className="sub mono">{vinfo.name}</h2>
      {vinfo.label ? <div className="muted">{vinfo.label}</div> : null}
      <div className="chips"><Badge>{TYPE_PL[vinfo.type]}</Badge>{vinfo.scale ? <Badge tone="brand">skala {vinfo.scale_name}</Badge> : null}
        {changes.some((c) => c.kind === 'reverse' && c.var === vinfo.name) ? <Badge tone="observed" icon="refresh">odwrócona</Badge> : null}</div>
      <Distribution counts={vinfo.hist} labels={vinfo.hist_labels} valueLabels={vinfo.value_labels.length ? vinfo.value_labels.map((x) => x.label) : undefined}
        mean={vinfo.stats.mean} showValues label={`Rozkład ${vinfo.name}`} width={340} height={170} />
      <table className="tbl"><tbody>
        <tr><td>n</td><td className="num">{int(vinfo.stats.n)}</td></tr>
        <tr><td>Braki</td><td className="num">{pct(vinfo.stats.missing_pct)}</td></tr>
        <tr><td>M (SD)</td><td className="num">{n2(vinfo.stats.mean)} ({n2(vinfo.stats.sd)})</td></tr>
        <tr><td>Mediana · zakres</td><td className="num">{n1(vinfo.stats.median)} · {n1(vinfo.stats.min)}–{n1(vinfo.stats.max)}</td></tr>
        <tr><td>Skośność · kurtoza</td><td className="num">{n2(vinfo.stats.skew)} · {n2(vinfo.stats.kurt)}</td></tr>
        <tr><td>Efekt podłogi · sufitu</td><td className="num">{pct(vinfo.stats.floor, 0)} · {pct(vinfo.stats.ceiling, 0)}</td></tr>
        {vinfo.r_rest != null ? <tr><td>Korelacja z resztą skali</td><td className="num">{n2(vinfo.r_rest)}</td></tr> : null}
      </tbody></table>
      {vinfo.r_rest != null && vinfo.r_rest < 0 && vinfo.alpha_reversed != null ? (
        <Diagnosis level="warn" compact title={`Pozycja ${vinfo.name} działa odwrotnie niż reszta skali`}
          what={`Korelacja z resztą skali ${vinfo.scale} wynosi ${n2(vinfo.r_rest)}.`}
          effect={`Po odwróceniu α skali wzrośnie z ${n2(vinfo.alpha)} do ${n2(vinfo.alpha_reversed)}.`}
          fixes={[{ title: 'Odwróć, jeśli treść pozycji jest sformułowana negatywnie', recommended: true, actionLabel: 'Odwróć pozycję', actionIcon: 'refresh', onAction: () => reverse(vinfo) }]} />
      ) : null}
      {Math.abs(vinfo.stats.skew) > 2 || Math.abs(vinfo.stats.kurt) > 7 ? (
        <Interpretation tone="warn" title="Rozkład silnie odbiega od normalnego" source="Curran, West i Finch (1996)">Skośność powyżej 2 albo kurtoza powyżej 7 — użyj estymatora MLM (odporne błędy).</Interpretation>
      ) : null}
    </>
  ) : <Loading variant="block" />;

  return (
    <Screen inspector={insp} inspectorTitle={sel ? `Zmienna ${sel}` : 'Zmienna'} inspectorOpen={drawer} onInspectorClose={() => setDrawer(false)}>
      <div className="tiles">
        <StatTile label="Respondenci w analizie" value={int(data.n)} icon="data" note={data.n_excluded ? `wykluczono ${data.n_excluded} z ${int(data.n_total)}` : `z ${int(data.n_total)} w pliku`} />
        <StatTile label="Zmienne" value={data.k} icon="observed" note={`${data.scales.length} skale`} />
        <StatTile label="Braki danych" value={pct(data.missing_pct)} icon="info" tone={data.missing_pct > 0.1 ? 'ok' : 'good'} meter={Math.min(1, data.missing_pct * 5)} note={`${int(data.complete_cases)} przypadków kompletnych`} />
        <StatTile label="Zmiany w danych" value={changes.length} icon="history" note={changes.length ? 'odwrócenia i wykluczenia w dzienniku' : 'dane jak w pliku'} />
      </div>
      {proposals.length ? proposals.map(({ scale, item }) => (
        <Interpretation key={item} tone="warn" title={`Propozycja: odwróć pozycję ${item}`}
          actions={<Button size="sm" variant="secondary" onClick={() => { setSel(item); setDrawer(true); }}>Pokaż szczegóły</Button>}>
          Pozycja {item} koreluje ujemnie z resztą skali {scale.name} (α skali = {n2(scale.alpha)}). Sprawdź treść; jeśli jest sformułowana negatywnie, odwróć ją przed analizą.
        </Interpretation>
      )) : null}
      <Panel flush title="Dane" subtitle="Kliknij nagłówek kolumny, aby zobaczyć rozkład i statystyki">
        {rows ? <DataGrid columns={columns} rows={rows.rows} rowIds={rows.ids} rowFlags={rowFlags} selectedColumn={sel}
          onSelectColumn={(k) => { setSel(k); setDrawer(true); }} height={460} limit={rows.rows.length}
          onMore={rows.total > limit ? () => setLimit(limit + 300) : undefined} /> : <div className="pad"><Loading variant="table" /></div>}
      </Panel>
      {running ? <Loading variant="text" label="Zapisywanie zmiany" /> : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- nieuważni */
function Careless() {
  const data = useStore((s) => s.data);
  const changes = useStore((s) => s.changes);
  const timeVars = data.variables.filter((v) => v.type === 'continuous').map((v) => v.name);
  const [tv, setTv] = useState(timeVars.find((v) => /czas|time|dur|sek|sec/i.test(v)) || '');
  const [res, setRes] = useState(null);
  const [only, setOnly] = useState('both');
  const { running, error, setError, run } = useRun();
  useEffect(() => { run(async () => setRes(await engine.call('careless', { time_var: tv || null }))); }, [tv, data.n_total]);
  if (!res) return <Screen><EngineErrorView error={error} onClose={() => setError(null)} /><Loading /></Screen>;
  const excluded = new Set(data.excluded);
  const hasTime = res.time_cut != null;
  const pick = res.rows.filter((r) => (only === 'both' && hasTime ? r.both : r.flag) && !excluded.has(r.row));
  const pts = res.rows.map((r) => ({ x: r.longstring, y: hasTime ? r.sec_per_item : r.irv, flag: hasTime ? r.both : r.flag, excluded: excluded.has(r.row), id: r.row + 1 }));
  const already = changes.find((c) => c.kind === 'exclude');
  async function exclude() {
    const rows = pick.map((r) => r.row);
    await addChange({ kind: 'exclude', rows }, {
      module: 'Dane', moduleIcon: 'data', kind: 'remove', origin: 'proposal', action: `Wykluczono ${rows.length} nieuważnych respondentów`,
      reason: hasTime ? `Jednakowe odpowiedzi w ≥ ${res.ls_cut} pozycjach z rzędu i czas poniżej ${n1(res.time_cut)} s na pozycję.` : `Jednakowe odpowiedzi w ≥ ${res.ls_cut} pozycjach z rzędu.`,
      effects: [{ label: 'N w analizie', from: String(data.n), to: String(data.n - rows.length) }],
      toast: `Wykluczono ${rows.length} respondentów. Wyniki czekają na przeliczenie.`,
    });
  }
  return (
    <Screen>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <div className="form">
        <Field label="Czas wypełniania (sekundy)" hint="Kolumna z łącznym czasem ankiety"><Select value={tv} onChange={(e) => setTv(e.target.value)} options={[{ value: '', label: 'brak — tylko longstring' }].concat(timeVars.map((v) => ({ value: v, label: v })))} /></Field>
        {hasTime ? <Field label="Kogo zaproponować"><Select value={only} onChange={(e) => setOnly(e.target.value)} options={[{ value: 'both', label: 'oba sygnały naraz (zalecane)' }, { value: 'any', label: 'dowolny sygnał' }]} /></Field> : null}
      </div>
      <div className="tiles t3">
        <StatTile label={<Term term="Longstring" definition="Najdłuższy ciąg identycznych odpowiedzi z rzędu." source="Johnson (2005)" />} value={res.rows.filter((r) => r.longstring >= res.ls_cut).length} icon="minus" note={`próg ≥ ${res.ls_cut} z ${res.items.length} pozycji`} />
        <StatTile label="Za szybko" value={hasTime ? res.rows.filter((r) => r.sec_per_item != null && r.sec_per_item < res.time_cut).length : '—'} icon="history" note={hasTime ? `< ${n1(res.time_cut)} s na pozycję (35% mediany)` : 'wskaż kolumnę czasu'} />
        <StatTile label="Odstający wielowymiarowo" value={res.n_maha} icon="poor" note="odległość Mahalanobisa, p < 0,001" />
      </div>
      <div className="cols">
        <Panel title="Wzorzec odpowiedzi" subtitle={hasTime ? 'Każdy punkt to respondent; strefa = oba sygnały naraz' : 'Każdy punkt to respondent'}>
          <ScatterPlot points={pts} xLabel="Longstring (pozycje z rzędu)" xShort="LS" yLabel={hasTime ? 'Sekundy na pozycję' : 'Zmienność odpowiedzi (IRV)'} yShort={hasTime ? 's/poz.' : 'IRV'}
            xThreshold={res.ls_cut} xThresholdLabel={`LS ≥ ${res.ls_cut}`} yThreshold={hasTime ? res.time_cut : undefined} yThresholdLabel={hasTime ? `< ${n1(res.time_cut)} s` : undefined}
            zone={hasTime ? { x0: res.ls_cut, y1: res.time_cut } : undefined} zoneLabel="nieuważni" flagLabel="do wykluczenia" normalLabel="pozostali" legend fluid height={320}
            pointLabel={(p) => `Respondent ${p.id}: LS ${p.x}, ${format.num(p.y, 1)}`} label="Wykres longstring względem czasu odpowiedzi" />
        </Panel>
        <div className="stack">
          <Interpretation tone={pick.length ? 'warn' : 'good'} title={pick.length ? `${pick.length} respondentów odpowiadało prawdopodobnie bez czytania` : 'Brak respondentów do wykluczenia'}
            source="Meade i Craig (2012); Curran (2016)"
            actions={pick.length ? <Button size="sm" variant="secondary" icon="trash" onClick={() => run(exclude)} loading={running}>Wyklucz {pick.length} z analizy</Button> : null}>
            {pick.length ? `Wykluczenie jest odwracalne i trafi do dziennika decyzji. Wiersze zostają w danych z oznaczeniem.` : 'Żaden respondent nie spełnia kryteriów przy obecnych progach.'}
            {already ? ` Obecnie wykluczonych: ${data.n_excluded}.` : ''}
          </Interpretation>
          <Panel flush title="Proponowani do wykluczenia">
            <div className="pad-x"><ResultTable dense columns={[{ key: 'id', label: 'Wiersz', type: 'num', digits: 0 }, { key: 'longstring', label: 'LS', type: 'num', digits: 0 }, { key: 'spi', label: 's/poz.', type: 'num', digits: 1 }, { key: 'why', label: 'Powód', type: 'text' }]}
              rows={pick.slice(0, 30).map((r) => ({ id: r.row + 1, longstring: r.longstring, spi: r.sec_per_item, why: r.reasons.join('; ') }))}
              note={pick.length > 30 ? `Pokazano 30 z ${pick.length}.` : undefined} /></div>
          </Panel>
        </div>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- braki */
function Missing() {
  const data = useStore((s) => s.data);
  const [res, setRes] = useState(null);
  const { error, setError, run } = useRun();
  useEffect(() => { run(async () => setRes(await engine.call('missing', {}))); }, [data]);
  if (!res) return <Screen><EngineErrorView error={error} onClose={() => setError(null)} /><Loading /></Screen>;
  const lt = res.little;
  const lost = res.n - res.complete;
  return (
    <Screen>
      <div className="tiles t3">
        <StatTile label="Przypadki kompletne" value={int(res.complete)} icon="check" note={`z ${int(res.n)} (${pct(res.complete / Math.max(res.n, 1))})`} tone={lost / Math.max(res.n, 1) > 0.2 ? 'ok' : 'good'} />
        <StatTile label="Najwięcej braków" value={pct(Math.max(...Object.values(res.per_var)))} icon="info" note={Object.entries(res.per_var).sort((a, b) => b[1] - a[1])[0][0]} />
        <StatTile label={<Term term="Test MCAR Little’a" definition="Sprawdza, czy braki są całkowicie losowe; p > 0,05 nie przeczy MCAR." source="Little (1988)" />} value={lt ? pTxt(lt.p) : '—'} icon="stats" note={lt ? `χ²(${lt.df}) = ${format.num(lt.chi2, 2)}` : 'brak braków'} />
      </div>
      <Interpretation tone={lt && lt.p < 0.05 ? 'warn' : 'info'} title={lt ? (lt.p < 0.05 ? 'Braki prawdopodobnie nie są całkowicie losowe' : 'Wzorzec braków jest zgodny z MCAR') : 'W pozycjach skal nie ma braków'} source="Little (1988); Enders (2010)">
        {lt ? (lt.p < 0.05 ? 'Usuwanie przypadków (listwise) może obciążyć wyniki. W CFA i SEM wybierz „EM (kowariancja)” w ustawieniach braków.' : `Analizy usuwają przypadki z brakami (listwise): stracisz ${int(lost)} respondentów. Przy dużej utracie wybierz w CFA estymację na macierzy kowariancji z algorytmu EM.`) : 'Analizy użyją wszystkich respondentów.'}
      </Interpretation>
      <Panel title="Wzorce braków" subtitle="Najczęstsze kombinacje brakujących pozycji">
        <MissingMap variables={res.vars} patterns={res.patterns.map((p) => ({ missing: p.missing, count: p.count, label: p.label || undefined }))} />
      </Panel>
    </Screen>
  );
}

/* ---------------------------------------------------------------- skale */
function Scales() {
  const data = useStore((s) => s.data);
  const [text, setText] = useState(() => data.scales.map((s) => `${s.id} (${s.name}): ${s.items.join(', ')}`).join('\n'));
  const { running, error, setError, run } = useRun();
  const vars = new Set(data.variables.map((v) => v.name));
  const parsed = text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?\s*[:=]\s*(.+)$/);
    if (!m) return { error: l };
    const items = m[3].split(/[,\s+]+/).filter(Boolean);
    return { id: m[1], name: m[2] || m[1], items, unknown: items.filter((i) => !vars.has(i)) };
  });
  const bad = parsed.filter((p) => p.error || p.unknown.length || p.items.length < 2);
  async function save() {
    const sc = {}, names = {};
    parsed.forEach((p) => { sc[p.id] = p.items; names[p.id] = p.name; });
    const summary = await engine.call('set_scales', { scales: sc, names });
    setState({ data: summary });
    markStale(DOWNSTREAM);
    logDecision({ module: 'Dane', moduleIcon: 'data', kind: 'change', action: `Zdefiniowano skale: ${parsed.map((p) => p.id).join(', ')}`, reason: 'Przypisanie pozycji do konstruktów.' });
    toast('Zapisano skale. Rzetelność, CFA i SEM czekają na przeliczenie.');
  }
  return (
    <Screen>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <div className="cols">
        <Panel title="Skale i pozycje" subtitle="Jedna skala w wierszu: SKRÓT (nazwa): pozycje oddzielone przecinkami">
          <textarea className="mono" aria-label="Definicje skal" value={text} onChange={(e) => setText(e.target.value)} rows={10}
            style={{ width: '100%', font: 'inherit', fontFamily: 'var(--font-mono)', fontSize: 13, padding: 12, border: '1px solid var(--line-control)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', color: 'var(--ink)' }} />
          <div className="row" style={{ marginTop: 12 }}>
            <Button variant="primary" icon="check" disabled={!!bad.length || !parsed.length} loading={running} onClick={() => run(save)}>Zapisz skale</Button>
            {bad.length ? <Verdict level="poor">{bad[0].error ? `Nie rozpoznano wiersza „${bad[0].error}”` : bad[0].unknown.length ? `Nieznane zmienne: ${bad[0].unknown.join(', ')}` : `Skala ${bad[0].id} ma mniej niż 2 pozycje`}</Verdict> : <Verdict level="good">{parsed.length} skal gotowych</Verdict>}
          </div>
        </Panel>
        <div className="stack">
          {data.scales.map((s) => (
            <Panel key={s.id} title={`${s.id} — ${s.name}`} subtitle={`α = ${n2(s.alpha)} · ${s.items.length} pozycji`}>
              <div className="chips">{s.items.map((i) => { const v = data.variables.find((x) => x.name === i); return <VariableChip key={i} name={i} type={v ? v.type : 'ordinal'} label={v ? v.label : ''} reversed={v && v.reversed} />; })}</div>
            </Panel>
          ))}
          {!data.scales.length ? <EmptyState size="sm" icon="reliability" title="Brak zdefiniowanych skal">Wpisz skale po lewej, np. „SAT (Satysfakcja): Q1, Q2, Q3”.</EmptyState> : null}
        </div>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- ekran */
export default function DataScreen() {
  const data = useStore((s) => s.data);
  const draft = useStore((s) => s.importDraft);
  const [tab, setTab] = useState('overview');
  if (draft) return <ImportStep />;
  if (!data) return <Start />;
  const flagged = data.scales.reduce((a, s) => a + s.flag.length, 0);
  return (
    <>
      <div className="content" style={{ paddingBottom: 0 }}>
        <Head eyebrow="Dane i czyszczenie" title={data.file} meta={[<Badge key="n">N = {int(data.n)}{data.n_excluded ? ` (−${data.n_excluded})` : ''}</Badge>, <Badge key="k">{data.k} zmiennych</Badge>, <Badge key="p" icon="lock">dane lokalnie</Badge>]}>
          <Button variant="secondary" icon="upload" onClick={() => { if (window.confirm('Wczytać nowy plik? Bieżący projekt zostanie zamknięty — zapisz go wcześniej, jeśli chcesz do niego wrócić.')) setState({ data: null, importDraft: null, results: {} }); }}>Wczytaj inny plik</Button>
        </Head>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: 'Przegląd', icon: 'data', count: flagged || undefined, status: flagged ? 'ok' : undefined },
          { id: 'careless', label: 'Nieuważni respondenci', icon: 'eye' },
          { id: 'missing', label: 'Braki danych', icon: 'info' },
          { id: 'scales', label: 'Skale', icon: 'reliability', count: data.scales.length },
        ]} />
      </div>
      {tab === 'overview' ? <Overview /> : tab === 'careless' ? <Careless /> : tab === 'missing' ? <Missing /> : <Scales />}
    </>
  );
}
