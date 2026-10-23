import React, { useEffect, useMemo, useState } from 'react';
import {
  Dropzone, Button, Panel, Field, Select, Switch, TagInput, Badge, Interpretation, Tabs, DataGrid, StatTile, Distribution,
  ScatterPlot, MissingMap, ResultTable, VariableChip, Input, Diagnosis, Verdict, EmptyState, Term, format,
} from 'semplex-ui';
import { useStore, setState, getState, engine, addChange, toast, logDecision, markStale, DOWNSTREAM, revertDecision } from '../store.js';
import { sniffFile, resniff, commitImport, loadSample, openProjectFile } from '../lib/project.js';
import { Head, Screen, EngineBanner, EngineErrorView, useRun, Loading } from '../ui.jsx';
import { n2, n3, n1, pct, pTxt, int } from '../lib/fit.js';
import { t, lazy } from '../i18n/index.js';

const TYPE_OPTS = lazy(() => ([
  { value: 'ordinal', label: t("porządkowa") }, { value: 'continuous', label: t("ciągła") }, { value: 'binary', label: t("dwuwartościowa") },
  { value: 'nominal', label: 'nominalna' }, { value: 'skip', label: t("pomiń") },
]));
const TYPE_PL = lazy(() => ({ ordinal: t("porządkowa"), continuous: t("ciągła"), binary: t("dwuwartościowa"), nominal: 'nominalna', text: 'tekst', date: 'data', id: 'identyfikator', skip: t("pominięta") }));

/* ---------------------------------------------------------------- start */
function Start() {
  const { running, error, setError, run } = useRun();
  const eng = useStore((s) => s.engine);
  async function onFiles(files) {
    const f = files && files[0];
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { setError({ kind: 'model', message: t("Plik ma ponad 60 MB. Zapisz w CSV tylko potrzebne kolumny.") }); return; }
    if (/\.(sav|dta|sas7bdat|por)$/i.test(f.name)) { setError({ kind: 'model', message: t("Pliki SPSS, Stata i SAS obsłuży wydanie v1. Zapisz dane jako CSV albo XLSX (w SPSS: Plik → Eksportuj → CSV).") }); return; }
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
      <Head eyebrow={t("Dane")} title={t("Wczytaj dane z ankiety")} meta={[<Badge key="a" icon="lock">{t("dane zostają w tej przeglądarce")}</Badge>, <Badge key="b">{t("CSV, TXT, TSV, XLSX")}</Badge>]}>
        <Button variant="secondary" icon="folder" onClick={openProjectFile} disabled={eng.status !== 'ready'}>{t("Otwórz projekt")}</Button>
      </Head>
      <EngineBanner />
      <EngineErrorView error={error} onClose={() => setError(null)} />
      {running ? <Loading variant="table" label={t("Rozpoznawanie pliku")} /> : (
        <Dropzone onFiles={onFiles} formats={['CSV', 'TXT', 'TSV', 'XLSX']} title={t("Upuść plik z danymi albo wybierz z dysku")}
          subtitle={t("Jeden wiersz = jeden respondent, pierwszy wiersz = nazwy zmiennych. Kodowanie i separator rozpoznają się same.")}
          cta={t("Wybierz plik")} onSample={() => run(loadSample)} sampleLabel={t("Otwórz przykład: Lojalność klientów 2026 (N = 524)")}
          privacy={t("Dane nie opuszczają komputera - plik czyta przeglądarka, a liczy silnik uruchomiony lokalnie.")} />
      )}
      <div className="cols even">
        <Interpretation tone="info" title={t("Jak przygotować plik")}>
          Pozycje skal nazwij z przedrostkiem i numerem (SAT1, SAT2…), wtedy SEMplex sam zaproponuje skale. Kody braków (−99, „nie wiem”) wskażesz w następnym kroku. Odpowiedzi tekstowe w skali Likerta („raczej się zgadzam”) zamienią się na liczby 1–5.
        </Interpretation>
        <Interpretation tone="brand" title={t("Co dzieje się z danymi osobowymi")} icon="lock">
          {t("Kolumny z adresami e-mail, telefonami, imionami i nazwiskami są rozpoznawane przy imporcie i domyślnie pomijane. W podglądzie widać je tylko zamaskowane.")}
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
      <Head eyebrow={t("Dane · import")} title={draft.filename} meta={[
        <Badge key="n">{int(draft.n_rows)} {t("wierszy ·")} {draft.n_cols} {t("kolumn")}</Badge>,
        info.kind === 'text' ? <Badge key="e" tone={info.replacement_chars ? 'ok' : 'good'} icon={info.replacement_chars ? 'ok' : 'good'}>kodowanie {info.encoding}</Badge> : <Badge key="x">{t("arkusz Excel")}</Badge>,
        info.kind === 'text' ? <Badge key="s">{t("separator „")}{info.sep === '\t' ? t("tab") : info.sep}” · dziesiętny „{info.decimal}”</Badge> : null,
      ].filter(Boolean)}>
        <Button variant="ghost" icon="x" onClick={() => setState({ importDraft: null })}>{t("Anuluj")}</Button>
        <Button variant="primary" icon="check" loading={running} disabled={!kept.length || dup}
          onClick={() => run(async () => { await commitImport(cols, [''].concat(codes), pendingMeta); setState({ pendingSampleMeta: null }); })}>
          {t("Importuj")} {kept.length} zmiennych
        </Button>
      </Head>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      {info.replacement_chars ? (
        <Diagnosis level="warn" compact title={t("Część znaków nie pasuje do kodowania")} what={t("{0} znaków nie dało się odczytać jako {1}.", { 0: info.replacement_chars, 1: info.encoding })}
          effect={t("Polskie litery w etykietach mogą być zniekształcone.")} fixes={[{ title: t("Wybierz kodowanie Windows-1250 (pliki z Excela i SPSS w Polsce)"), recommended: true, actionLabel: t("Użyj Windows-1250"), onAction: () => reopen({ encoding: 'cp1250' }) }]} />
      ) : null}
      {dup ? <Diagnosis level="poor" compact title={t("Dwie zmienne mają tę samą nazwę")} what={t("Nazwy w kolumnie „Nazwa w analizie” muszą być unikalne.")} fixes={[{ title: t("Zmień jedną z nazw albo pomiń kolumnę") }]} /> : null}
      {info.kind === 'text' ? (
        <Panel title={t("Odczyt pliku")} subtitle={t("Zmiana ustawień od razu odświeża podgląd")}>
          <div className="form">
            <Field label={t("Kodowanie")}><Select value={opts.encoding || 'auto'} onChange={(e) => reopen({ encoding: e.target.value })}
              options={[{ value: 'auto', label: 'automatycznie' }, { value: 'utf-8', label: 'UTF-8' }, { value: 'cp1250', label: t("Windows-1250") }, { value: 'iso-8859-2', label: t("ISO 8859-2") }]} /></Field>
            <Field label={t("Separator")}><Select value={opts.sep || 'auto'} onChange={(e) => reopen({ sep: e.target.value })}
              options={[{ value: 'auto', label: 'automatycznie' }, { value: ';', label: t("średnik ;") }, { value: ',', label: t("przecinek ,") }, { value: 'tab', label: 'tabulator' }, { value: '|', label: t("kreska |") }]} /></Field>
            <Field label={t("Znak dziesiętny")}><Select value={opts.decimal || 'auto'} onChange={(e) => reopen({ decimal: e.target.value })}
              options={[{ value: 'auto', label: 'automatycznie' }, { value: ',', label: 'przecinek' }, { value: '.', label: 'kropka' }]} /></Field>
            <Field label={t("Kody braków danych")} hint={t("Enter dodaje kod; puste komórki są brakami zawsze")}>
              <TagInput value={codes} onChange={setCodes} label={t("Kody braków danych")} suggestions={['-99', '-9', '99', '999', 'NA', t("nie wiem"), 'odmowa', t("brak")]} />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <Button size="sm" variant="secondary" icon="refresh" onClick={() => reopen({})}>{t("Zastosuj kody braków")}</Button>
            <span className="subtle">{Object.entries(draft.code_counts).filter(([, n]) => n > 0).map(([c, n]) => `„${c}”: ${n}`).join(' · ') || t("Żaden kod braku nie występuje w pliku.")}</span>
          </div>
        </Panel>
      ) : null}
      {pii.length ? (
        <Interpretation tone="brand" icon="lock" title={t("{0} na dane osobowe i zostanie pominięta", { 0: pii.length === 1 ? t("Jedna kolumna wygląda") : pii.length + t(" kolumny wyglądają") })}>
          {pii.map((c) => `${c.source} (${c.pii})`).join(', ')}. Możesz ją włączyć, zmieniając typ - wtedy trafi do pamięci tej karty przeglądarki i do zapisu projektu.
        </Interpretation>
      ) : null}
      <Panel flush title={t("Zmienne")} subtitle={t("Sprawdź typy. Pozycje Likerta to zmienne porządkowe; identyfikatory i tekst są pomijane.")}>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>{t("Kolumna w pliku")}</th><th>{t("Nazwa w analizie")}</th><th>{t("Typ")}</th><th>{t("Wykryto")}</th><th className="num">{t("Różnych")}</th><th className="num">{t("Puste")}</th><th>{t("Przykład")}</th></tr></thead>
            <tbody>
              {cols.map((c, i) => (
                <tr key={c.source} className={c.type === 'skip' ? 'is-muted' : ''}>
                  <td>{c.source}{c.pii ? <> <Badge tone="ok" icon="lock">{c.pii}</Badge></> : null}{c.scale ? <> <Badge tone="observed">{t("skala tekstowa")} {c.scale.length}-st.</Badge></> : null}</td>
                  <td><Input mono value={c.name} aria-label={t("Nazwa zmiennej {0}", { 0: c.source })} onChange={(e) => upd(i, { name: e.target.value.replace(/[^A-Za-z0-9_]/g, '_') })} /></td>
                  <td><Select aria-label={t("Typ zmiennej {0}", { 0: c.source })} value={c.type} onChange={(e) => upd(i, { type: e.target.value })}
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
      <Panel flush title={t("Podgląd pierwszych wierszy")} subtitle={t("Dane osobowe są zamaskowane")}>
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

/* ---------------------------------------------------------------- overview */
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
      module: 'Dane', moduleIcon: 'data', kind: 'change', origin: 'proposal', action: t("Odwrócono pozycję {0}", { 0: v.name }),
      reason: t("Korelacja z resztą skali {0} była ujemna (r = {1}); treść pozycji jest sformułowana negatywnie.", { 0: v.scale, 1: n2(v.r_rest) }),
      effects: [{ label: t("α skali {0}", { 0: v.scale }), from: n2(v.alpha), to: n2(v.alpha_reversed), tone: 'good' }],
      toast: t("Odwrócono {0}. Rzetelność, EFA, CFA i SEM czekają na przeliczenie.", { 0: v.name }),
    }));
  }

  const proposals = data.scales.flatMap((s) => s.flag.map((it) => ({ scale: s, item: it })));
  const insp = vinfo ? (
    <>
      <div className="eyebrow">{t("Zmienna")}</div>
      <h2 className="sub mono">{vinfo.name}</h2>
      {vinfo.label ? <div className="muted">{vinfo.label}</div> : null}
      <div className="chips"><Badge>{TYPE_PL[vinfo.type]}</Badge>{vinfo.scale ? <Badge tone="brand">{t("skala")} {vinfo.scale_name}</Badge> : null}
        {changes.some((c) => c.kind === 'reverse' && c.var === vinfo.name) ? <Badge tone="observed" icon="refresh">{t("odwrócona")}</Badge> : null}</div>
      <Distribution counts={vinfo.hist} labels={vinfo.hist_labels} valueLabels={vinfo.value_labels.length ? vinfo.value_labels.map((x) => x.label) : undefined}
        mean={vinfo.stats.mean} showValues label={t("Rozkład {0}", { 0: vinfo.name })} width={340} height={170} />
      <table className="tbl"><tbody>
        <tr><td>n</td><td className="num">{int(vinfo.stats.n)}</td></tr>
        <tr><td>{t("Braki")}</td><td className="num">{pct(vinfo.stats.missing_pct)}</td></tr>
        <tr><td>M (SD)</td><td className="num">{n2(vinfo.stats.mean)} ({n2(vinfo.stats.sd)})</td></tr>
        <tr><td>{t("Mediana · zakres")}</td><td className="num">{n1(vinfo.stats.median)} · {n1(vinfo.stats.min)}–{n1(vinfo.stats.max)}</td></tr>
        <tr><td>{t("Skośność · kurtoza")}</td><td className="num">{n2(vinfo.stats.skew)} · {n2(vinfo.stats.kurt)}</td></tr>
        <tr><td>{t("Efekt podłogi · sufitu")}</td><td className="num">{pct(vinfo.stats.floor, 0)} · {pct(vinfo.stats.ceiling, 0)}</td></tr>
        {vinfo.r_rest != null ? <tr><td>{t("Korelacja z resztą skali")}</td><td className="num">{n2(vinfo.r_rest)}</td></tr> : null}
      </tbody></table>
      {vinfo.r_rest != null && vinfo.r_rest < 0 && vinfo.alpha_reversed != null ? (
        <Diagnosis level="warn" compact title={t("Pozycja {0} działa odwrotnie niż reszta skali", { 0: vinfo.name })}
          what={t("Korelacja z resztą skali {0} wynosi {1}.", { 0: vinfo.scale, 1: n2(vinfo.r_rest) })}
          effect={t("Po odwróceniu α skali wzrośnie z {0} do {1}.", { 0: n2(vinfo.alpha), 1: n2(vinfo.alpha_reversed) })}
          fixes={[{ title: t("Odwróć, jeśli treść pozycji jest sformułowana negatywnie"), recommended: true, actionLabel: t("Odwróć pozycję"), actionIcon: 'refresh', onAction: () => reverse(vinfo) }]} />
      ) : null}
      {Math.abs(vinfo.stats.skew) > 2 || Math.abs(vinfo.stats.kurt) > 7 ? (
        <Interpretation tone="warn" title={t("Rozkład silnie odbiega od normalnego")} source={t("Curran, West i Finch (1996)")}>Skośność powyżej 2 albo kurtoza powyżej 7 - użyj estymatora MLM (odporne błędy).</Interpretation>
      ) : null}
    </>
  ) : <Loading variant="block" />;

  return (
    <Screen inspector={insp} inspectorTitle={sel ? t("Zmienna {0}", { 0: sel }) : t("Zmienna")} inspectorOpen={drawer} onInspectorClose={() => setDrawer(false)}>
      <div className="tiles">
        <StatTile label={t("Respondenci w analizie")} value={int(data.n)} icon="data" note={data.n_excluded ? t("wykluczono {0} z {1}", { 0: data.n_excluded, 1: int(data.n_total) }) : t("z {0} w pliku", { 0: int(data.n_total) })} />
        <StatTile label={t("Zmienne")} value={data.k} icon="observed" note={t("{0} skale", { 0: data.scales.length })} />
        <StatTile label={t("Braki danych")} value={pct(data.missing_pct)} icon="info" tone={data.missing_pct > 0.1 ? 'ok' : 'good'} meter={Math.min(1, data.missing_pct * 5)} note={t("{0} przypadków kompletnych", { 0: int(data.complete_cases) })} />
        <StatTile label={t("Zmiany w danych")} value={changes.length} icon="history" note={changes.length ? t("odwrócenia i wykluczenia w dzienniku") : t("dane jak w pliku")} />
      </div>
      {proposals.length ? proposals.map(({ scale, item }) => (
        <Interpretation key={item} tone="warn" title={t("Propozycja: odwróć pozycję {0}", { 0: item })}
          actions={<Button size="sm" variant="secondary" onClick={() => { setSel(item); setDrawer(true); }}>{t("Pokaż szczegóły")}</Button>}>
          {t("Pozycja")} {item} {t("koreluje ujemnie z resztą skali")} {scale.name} (α skali = {n2(scale.alpha)}). Sprawdź treść; jeśli jest sformułowana negatywnie, odwróć ją przed analizą.
        </Interpretation>
      )) : null}
      <Panel flush title={t("Dane")} subtitle={t("Kliknij nagłówek kolumny, aby zobaczyć rozkład i statystyki")}>
        {rows ? <DataGrid columns={columns} rows={rows.rows} rowIds={rows.ids} rowFlags={rowFlags} selectedColumn={sel}
          onSelectColumn={(k) => { setSel(k); setDrawer(true); }} height={460} limit={rows.rows.length}
          onMore={rows.total > limit ? () => setLimit(limit + 300) : undefined} /> : <div className="pad"><Loading variant="table" /></div>}
      </Panel>
      {running ? <Loading variant="text" label={t("Zapisywanie zmiany")} /> : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- careless */
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
      module: 'Dane', moduleIcon: 'data', kind: 'remove', origin: 'proposal', action: t("Wykluczono {0} nieuważnych respondentów", { 0: rows.length }),
      reason: hasTime ? t("Jednakowe odpowiedzi w ≥ {0} pozycjach z rzędu i czas poniżej {1} s na pozycję.", { 0: res.ls_cut, 1: n1(res.time_cut) }) : t("Jednakowe odpowiedzi w ≥ {0} pozycjach z rzędu.", { 0: res.ls_cut }),
      effects: [{ label: t("N w analizie"), from: String(data.n), to: String(data.n - rows.length) }],
      toast: t("Wykluczono {0} respondentów. Wyniki czekają na przeliczenie.", { 0: rows.length }),
    });
  }
  return (
    <Screen>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <div className="form">
        <Field label={t("Czas wypełniania (sekundy)")} hint={t("Kolumna z łącznym czasem ankiety")}><Select value={tv} onChange={(e) => setTv(e.target.value)} options={[{ value: '', label: t("brak - tylko longstring") }].concat(timeVars.map((v) => ({ value: v, label: v })))} /></Field>
        {hasTime ? <Field label={t("Kogo zaproponować")}><Select value={only} onChange={(e) => setOnly(e.target.value)} options={[{ value: 'both', label: t("oba sygnały naraz (zalecane)") }, { value: 'any', label: t("dowolny sygnał") }]} /></Field> : null}
      </div>
      <div className="tiles t3">
        <StatTile label={<Term term={t("Longstring")} definition={t("Najdłuższy ciąg identycznych odpowiedzi z rzędu.")} source={t("Johnson (2005)")} />} value={res.rows.filter((r) => r.longstring >= res.ls_cut).length} icon="minus" note={t("próg ≥ {0} z {1} pozycji", { 0: res.ls_cut, 1: res.items.length })} />
        <StatTile label={t("Za szybko")} value={hasTime ? res.rows.filter((r) => r.sec_per_item != null && r.sec_per_item < res.time_cut).length : '-'} icon="history" note={hasTime ? t("< {0} s na pozycję (35% mediany)", { 0: n1(res.time_cut) }) : t("wskaż kolumnę czasu")} />
        <StatTile label={t("Odstający wielowymiarowo")} value={res.n_maha} icon="poor" note={t("odległość Mahalanobisa, p < 0,001")} />
      </div>
      <div className="cols">
        <Panel title={t("Wzorzec odpowiedzi")} subtitle={hasTime ? t("Każdy punkt to respondent; strefa = oba sygnały naraz") : t("Każdy punkt to respondent")}>
          <ScatterPlot points={pts} xLabel={t("Longstring (pozycje z rzędu)")} xShort="LS" yLabel={hasTime ? t("Sekundy na pozycję") : t("Zmienność odpowiedzi (IRV)")} yShort={hasTime ? 's/poz.' : 'IRV'}
            xThreshold={res.ls_cut} xThresholdLabel={t("LS ≥ {0}", { 0: res.ls_cut })} yThreshold={hasTime ? res.time_cut : undefined} yThresholdLabel={hasTime ? `< ${n1(res.time_cut)} s` : undefined}
            zone={hasTime ? { x0: res.ls_cut, y1: res.time_cut } : undefined} zoneLabel={t("nieuważni")} flagLabel={t("do wykluczenia")} normalLabel="pozostali" legend fluid height={320}
            pointLabel={(p) => t("Respondent {0}: LS {1}, {2}", { 0: p.id, 1: p.x, 2: format.num(p.y, 1) })} label={t("Wykres longstring względem czasu odpowiedzi")} />
        </Panel>
        <div className="stack">
          <Interpretation tone={pick.length ? 'warn' : 'good'} title={pick.length ? t("{0} respondentów odpowiadało prawdopodobnie bez czytania", { 0: pick.length }) : t("Brak respondentów do wykluczenia")}
            source={t("Meade i Craig (2012); Curran (2016)")}
            actions={pick.length ? <Button size="sm" variant="secondary" icon="trash" onClick={() => run(exclude)} loading={running}>{t("Wyklucz")} {pick.length} {t("z analizy")}</Button> : null}>
            {pick.length ? t("Wykluczenie jest odwracalne i trafi do dziennika decyzji. Wiersze zostają w danych z oznaczeniem.") : t("Żaden respondent nie spełnia kryteriów przy obecnych progach.")}
            {already ? t(" Obecnie wykluczonych: {0}.", { 0: data.n_excluded }) : ''}
          </Interpretation>
          <Panel flush title={t("Proponowani do wykluczenia")}>
            <div className="pad-x"><ResultTable dense columns={[{ key: 'id', label: t("Wiersz"), type: 'num', digits: 0 }, { key: 'longstring', label: 'LS', type: 'num', digits: 0 }, { key: 'spi', label: 's/poz.', type: 'num', digits: 1 }, { key: 'why', label: t("Powód"), type: 'text' }]}
              rows={pick.slice(0, 30).map((r) => ({ id: r.row + 1, longstring: r.longstring, spi: r.sec_per_item, why: r.reasons.join('; ') }))}
              note={pick.length > 30 ? t("Pokazano 30 z {0}.", { 0: pick.length }) : undefined} /></div>
          </Panel>
        </div>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- missing values */
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
        <StatTile label={t("Przypadki kompletne")} value={int(res.complete)} icon="check" note={`z ${int(res.n)} (${pct(res.complete / Math.max(res.n, 1))})`} tone={lost / Math.max(res.n, 1) > 0.2 ? 'ok' : 'good'} />
        <StatTile label={t("Najwięcej braków")} value={pct(Math.max(...Object.values(res.per_var)))} icon="info" note={Object.entries(res.per_var).sort((a, b) => b[1] - a[1])[0][0]} />
        <StatTile label={<Term term={t("Test MCAR Little’a")} definition={t("Sprawdza, czy braki są całkowicie losowe; p > 0,05 nie przeczy MCAR.")} source={t("Little (1988)")} />} value={lt ? pTxt(lt.p) : '-'} icon="stats" note={lt ? `χ²(${lt.df}) = ${format.num(lt.chi2, 2)}` : t("brak braków")} />
      </div>
      <Interpretation tone={lt && lt.p < 0.05 ? 'warn' : 'info'} title={lt ? (lt.p < 0.05 ? t("Braki prawdopodobnie nie są całkowicie losowe") : t("Wzorzec braków jest zgodny z MCAR")) : t("W pozycjach skal nie ma braków")} source={t("Little (1988); Enders (2010)")}>
        {lt ? (lt.p < 0.05 ? t("Usuwanie przypadków (listwise) może obciążyć wyniki. W CFA i SEM wybierz „EM (kowariancja)” w ustawieniach braków.") : t("Analizy usuwają przypadki z brakami (listwise): stracisz {0} respondentów. Przy dużej utracie wybierz w CFA estymację na macierzy kowariancji z algorytmu EM.", { 0: int(lost) })) : t("Analizy użyją wszystkich respondentów.")}
      </Interpretation>
      <Panel title={t("Wzorce braków")} subtitle={t("Najczęstsze kombinacje brakujących pozycji")}>
        <MissingMap variables={res.vars} patterns={res.patterns.map((p) => ({ missing: p.missing, count: p.count, label: p.label || undefined }))} />
      </Panel>
    </Screen>
  );
}

/* ---------------------------------------------------------------- scales */
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
    const before = data.scales.map((x) => ({ id: x.id, name: x.name, items: x.items.slice() }));
    const summary = await engine.call('set_scales', { scales: sc, names });
    setState({ data: summary });
    markStale(DOWNSTREAM);
    const fmt = (arr) => arr.map((x) => `${x.id}: ${x.items.join(', ')}`).join('; ');
    const d = logDecision({ module: 'Dane', moduleIcon: 'data', kind: 'change', action: t("Zdefiniowano skale: {0}", { 0: parsed.map((p) => p.id).join(', ') }),
      reason: t("Przypisanie pozycji do konstruktów."), effects: [{ label: t("Skale"), from: fmt(before), to: fmt(parsed) }], undo: { type: 'scales', before } });
    toast(t("Zapisano skale. Rzetelność, CFA i SEM czekają na przeliczenie."), { actionLabel: t("Cofnij"), onAction: () => revertDecision(d.id) });
  }
  return (
    <Screen>
      <EngineErrorView error={error} onClose={() => setError(null)} />
      <div className="cols">
        <Panel title={t("Skale i pozycje")} subtitle={t("Jedna skala w wierszu: SKRÓT (nazwa): pozycje oddzielone przecinkami")}>
          <textarea className="mono" aria-label={t("Definicje skal")} value={text} onChange={(e) => setText(e.target.value)} rows={10}
            style={{ width: '100%', font: 'inherit', fontFamily: 'var(--font-mono)', fontSize: 13, padding: 12, border: '1px solid var(--line-control)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', color: 'var(--ink)' }} />
          <div className="row" style={{ marginTop: 12 }}>
            <Button variant="primary" icon="check" disabled={!!bad.length || !parsed.length} loading={running} onClick={() => run(save)}>{t("Zapisz skale")}</Button>
            {bad.length ? <Verdict level="poor">{bad[0].error ? t("Nie rozpoznano wiersza „{0}”", { 0: bad[0].error }) : bad[0].unknown.length ? t("Nieznane zmienne: {0}", { 0: bad[0].unknown.join(', ') }) : t("Skala {0} ma mniej niż 2 pozycje", { 0: bad[0].id })}</Verdict> : <Verdict level="good">{parsed.length} {t("skal gotowych")}</Verdict>}
          </div>
        </Panel>
        <div className="stack">
          {data.scales.map((s) => (
            <Panel key={s.id} title={`${s.id} - ${s.name}`} subtitle={t("α = {0} · {1} pozycji", { 0: n2(s.alpha), 1: s.items.length })}>
              <div className="chips">{s.items.map((i) => { const v = data.variables.find((x) => x.name === i); return <VariableChip key={i} name={i} type={v ? v.type : 'ordinal'} label={v ? v.label : ''} reversed={v && v.reversed} />; })}</div>
            </Panel>
          ))}
          {!data.scales.length ? <EmptyState size="sm" icon="reliability" title={t("Brak zdefiniowanych skal")}>Wpisz skale po lewej, np. „SAT (Satysfakcja): Q1, Q2, Q3”.</EmptyState> : null}
        </div>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- screen */
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
        <Head eyebrow={t("Dane i czyszczenie")} title={data.file} meta={[<Badge key="n">N = {int(data.n)}{data.n_excluded ? ` (−${data.n_excluded})` : ''}</Badge>, <Badge key="k">{data.k} {t("zmiennych")}</Badge>, <Badge key="p" icon="lock">{t("dane lokalnie")}</Badge>]}>
          <Button variant="secondary" icon="upload" onClick={() => { if (window.confirm(t("Wczytać nowy plik? Bieżący projekt zostanie zamknięty - zapisz go wcześniej, jeśli chcesz do niego wrócić."))) setState({ data: null, importDraft: null, results: {} }); }}>{t("Wczytaj inny plik")}</Button>
        </Head>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: t("Przegląd"), icon: 'data', count: flagged || undefined, status: flagged ? 'ok' : undefined },
          { id: 'careless', label: t("Nieuważni respondenci"), icon: 'eye' },
          { id: 'missing', label: t("Braki danych"), icon: 'info' },
          { id: 'scales', label: t("Skale"), icon: 'reliability', count: data.scales.length },
        ]} />
      </div>
      {tab === 'overview' ? <Overview /> : tab === 'careless' ? <Careless /> : tab === 'missing' ? <Missing /> : <Scales />}
    </>
  );
}
