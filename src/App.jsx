import React, { useEffect, useMemo } from 'react';
import {
  Sidebar, TopBar, Logo, Icon, Button, PipelineStepper, JobTray, Toast, CommandPalette, Dialog, Field, Input, Select, Kbd, Diagnosis,
  navSections, useMedia, format, Segmented,
} from 'semplex-ui';
import { useStore, setState, toggleTheme, go, cancelJob, setSettings, getState, setLang } from './store.js';
import { t, LANGS, lazy } from './i18n/index.js';
import { overallFit, RULES, grade } from './lib/fit.js';
import { saveProject, openProjectFile } from './lib/project.js';
import DataScreen from './screens/Data.jsx';
import StatsScreen from './screens/Stats.jsx';
import RelScreen from './screens/Reliability.jsx';
import EfaScreen from './screens/Efa.jsx';
import CfaScreen from './screens/Cfa.jsx';
import SemScreen from './screens/Sem.jsx';
import MedScreen from './screens/Mediation.jsx';
import BridgeScreen from './screens/Bridge.jsx';
import ReportScreen from './screens/Report.jsx';
import LogScreen from './screens/Log.jsx';
import PlannedScreen from './screens/Planned.jsx';

const LABELS = lazy(() => ({ data: t("Dane i czyszczenie"), stats: t("Opisowe i testy"), rel: t("Rzetelność i trafność"), efa: 'EFA', cfa: 'CFA', sem: t("SEM - edytor modelu"),
  med: t("Mediacja i moderacja"), bridge: t("Porównanie podejść"), groups: t("Porównanie grup"), power: t("Moc i wielkość próby"), pls: t("PLS-SEM, IPMA, NCA"),
  ml: t("Modele wielopoziomowe"), report: t("Raport"), log: t("Dziennik decyzji") }));

const NEXT = lazy(() => ({ data: ['stats', t("Przejdź do opisowych")], stats: ['rel', t("Przejdź do rzetelności")], rel: ['efa', t("Przejdź do EFA")], efa: ['cfa', t("Przejdź do CFA")],
  cfa: ['sem', t("Przejdź do SEM")], sem: ['bridge', t("Porównaj podejścia")], med: ['report', t("Przejdź do raportu")], bridge: ['report', t("Przejdź do raportu")],
  report: null, log: ['report', t("Przejdź do raportu")] }));

class ScreenBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('SEMPLEX_SCREEN_ERROR', error && error.stack, info && info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="content">
        <Diagnosis level="poor" title={t("Ten ekran napotkał błąd")} what={String(this.state.error.message || this.state.error)}
          effect={t("Dane i wyniki pozostałych modułów są nienaruszone.")} log={String(this.state.error.stack || '')} logLabel={t("Szczegóły techniczne")}
          fixes={[{ title: t("Wróć do danych i spróbuj ponownie"), recommended: true, actionLabel: t("Przejdź do danych"), onAction: () => { this.setState({ error: null }); go('data'); } }]} />
      </div>
    );
  }
}

function screenFor(module) {
  switch (module) {
    case 'data': return <DataScreen />;
    case 'stats': return <StatsScreen />;
    case 'rel': return <RelScreen />;
    case 'efa': return <EfaScreen />;
    case 'cfa': return <CfaScreen />;
    case 'sem': return <SemScreen />;
    case 'med': return <MedScreen />;
    case 'bridge': return <BridgeScreen />;
    case 'report': return <ReportScreen />;
    case 'log': return <LogScreen />;
    default: return <PlannedScreen module={module} label={LABELS[module]} />;
  }
}

function useNav() {
  const s = useStore();
  return useMemo(() => {
    const r = s.results;
    const over = {};
    if (s.data) over.data = { status: s.data.n_excluded > 0 || s.changes.length ? 'good' : 'ok' };
    if (r.stats) over.stats = { status: 'good' };
    if (r.rel && r.rel.value) {
      const worst = Math.min(...r.rel.value.scales.map((x) => x.omega || 0));
      over.rel = { status: grade(worst, RULES.omega) };
    }
    if (r.efa && r.efa.value) over.efa = { status: r.efa.value.proposals.length ? 'ok' : 'good', count: r.efa.value.k };
    if (r.cfa && r.cfa.value) over.cfa = { status: overallFit(r.cfa.value.fit, r.cfa.value.estimator === 'MLM') };
    if (r.sem && r.sem.value) over.sem = { status: overallFit(r.sem.value.fit, r.sem.value.estimator === 'MLM') };
    if (r.bridge && r.bridge.value) over.bridge = { status: 'good' };
    if (r.med && r.med.value) over.med = { status: 'good' };
    const active = s.decisions.filter((d) => !d.reverted).length;
    if (active) over.log = { count: active };
    Object.keys(over).forEach((k) => { if (r[k] && r[k].stale) over[k].status = 'ok'; });
    return navSections(over);
  }, [s.results, s.data, s.changes, s.decisions]);
}

function usePipeline() {
  const s = useStore();
  const r = s.results;
  const st = (m) => (s.module === m ? 'current' : r[m] && r[m].value ? (r[m].stale ? 'warn' : 'done') : 'todo');
  const excl = s.data ? s.data.n_excluded : 0;
  return [
    { id: 'data', label: t("Dane"), meta: s.data ? t("N = {0} · {1} zmiennych", { 0: format.num(s.data.n_total, 0), 1: s.data.k }) : t("wczytaj plik"), status: s.module === 'data' ? 'current' : s.data ? 'done' : 'todo' },
    { id: 'rel', label: t("Rzetelność"), meta: r.rel && r.rel.value ? t("{0} skale", { 0: r.rel.value.scales.length }) : excl ? t("−{0} nieuważnych", { 0: excl }) : undefined, status: st('rel') },
    { id: 'efa', label: 'EFA', meta: r.efa && r.efa.value ? t("{0} czynniki · n = {1}", { 0: r.efa.value.k, 1: r.efa.value.n }) : undefined, status: st('efa') },
    { id: 'cfa', label: 'CFA', meta: r.cfa && r.cfa.value ? `n = ${r.cfa.value.n} · ${r.cfa.value.estimator}` : undefined, status: st('cfa') },
    { id: 'sem', label: 'SEM', meta: r.sem && r.sem.value ? t("CFI = {0}", { 0: format.num(r.sem.value.fit.cfi, 3) }) : undefined, status: st('sem') },
    { id: 'report', label: t("Raport"), meta: t("APA · PL/EN"), status: s.module === 'report' ? 'current' : 'todo' },
  ];
}

const COMMANDS = lazy(() => ([
  { id: 'cmd:lang', title: t("English / Polski (PL ↔ EN)"), module: 'Polecenia', icon: 'refresh', keywords: 'language język english polski angielski' },
  { id: 'cmd:sample', title: t("Otwórz przykładowe dane"), module: 'Polecenia', icon: 'file', keywords: 'przykład lojalność sample demo', shortcut: '' },
  { id: 'cmd:save', title: t("Zapisz projekt (.sxp) bez kolumn pominiętych"), module: 'Polecenia', icon: 'download', keywords: 'save zapisz projekt', shortcut: 'Ctrl S' },
  { id: 'cmd:save-full', title: t("Zapisz projekt z pełnym plikiem źródłowym (także dane osobowe)"), module: 'Polecenia', icon: 'download', keywords: 'save zapisz projekt pełny oryginał', shortcut: '' },
  { id: 'cmd:open', title: t("Otwórz projekt (.sxp)"), module: 'Polecenia', icon: 'folder', keywords: 'open otwórz projekt' },
  { id: 'cmd:theme', title: t("Przełącz motyw jasny / ciemny"), module: 'Polecenia', icon: 'moon', keywords: 'theme dark light motyw' },
  { id: 'cmd:settings', title: t("Ustawienia"), module: 'Polecenia', icon: 'settings', keywords: 'settings ziarno bootstrap seed' },
  { id: 'cmd:help', title: t("Pomoc i skróty klawiszowe"), module: 'Pomoc', icon: 'help', keywords: 'help pomoc skróty keyboard' },
]));
const METHODS = lazy(() => ([
  ['data', t("Import CSV / Excel"), 'data', t("csv xlsx import wczytaj kodowanie separator")], ['data', t("Nieuważni respondenci (longstring, czas)"), 'data', t("careless longstring straightlining")],
  ['data', t("Braki danych i test MCAR Little’a"), 'data', t("missing mcar little braki")], ['data', t("Odwracanie pozycji"), 'data', t("reverse odwróć")],
  ['stats', t("Statystyki opisowe i macierz korelacji"), 'stats', t("descriptives correlation psych describe")], ['stats', t("Test Mardii"), 'stats', t("mardia normalność wielowymiarowa mvn")],
  ['stats', t("Test t Welcha i ANOVA"), 'stats', t("t-test anova welch hedges g")],
  ['rel', t("ω McDonalda i α Cronbacha"), 'reliability', t("omega alpha reliability psych semTools")], ['rel', t("CR, AVE i HTMT"), 'reliability', t("validity fornell larcker htmt")],
  ['efa', t("Analiza równoległa i konsensus kryteriów"), 'efa', t("parallel analysis fa.parallel hull map")], ['efa', t("EFA z rotacją oblimin / geomin / promax"), 'efa', t("factor analysis fa psych rotation")],
  ['cfa', t("Konfirmacyjna analiza czynnikowa"), 'cfa', t("cfa lavaan confirmatory")], ['cfa', t("Indeksy modyfikacji"), 'cfa', t("modification indices modindices mi")],
  ['sem', t("Edytor modelu SEM"), 'sem', t("sem lavaan path structural")], ['med', t("Mediacja - szablon 4 (PROCESS)"), 'mediation', t("mediation indirect process model 4")],
  ['med', t("Moderacja z obszarem Johnsona-Neymana"), 'mediation', t("moderation interaction johnson neyman model 1")],
  ['bridge', t("Porównanie podejść: sumy, SAM, ESEM, SEM"), 'bridge', t("sam esem croon factor scores compare approaches")],
  ['report', t("Raport APA (PL/EN)"), 'report', t("report apa docx html")], ['log', t("Dziennik decyzji"), 'history', t("decision log history undo")],
])).map(([m, title, icon, kw]) => ({ id: 'go:' + m + ':' + title, title, module: LABELS[m], icon, keywords: kw }));

function SettingsDialog() {
  const open = useStore((s) => s.settingsOpen);
  const st = useStore((s) => s.settings);
  return (
    <Dialog open={open} onClose={() => setState({ settingsOpen: false })} title={t("Ustawienia")} icon="settings"
      subtitle={t("Zapisywane w tej przeglądarce. Zmiana ziarna albo liczby prób wpływa na następne przeliczenia.")}
      actions={<Button variant="primary" onClick={() => setState({ settingsOpen: false })}>{t("Gotowe")}</Button>}>
      <div className="form">
        <Field label={t("Ziarno losowania")} hint={t("Podział próby, bootstrap, analiza równoległa")}><Input type="number" min={1} value={st.seed} onChange={(e) => setSettings({ seed: Math.max(1, parseInt(e.target.value || '1', 10)) })} /></Field>
        <Field label={t("Bootstrap SEM i mediacji")} hint={t("Podaj liczbę od 100 do 5000.")}><Input type="number" min={100} max={5000} step={100} value={st.bootR} onChange={(e) => setSettings({ bootR: Math.min(5000, Math.max(100, parseInt(e.target.value || '500', 10))) })} /></Field>
        <Field label={t("Bootstrap porównania podejść")} hint={t("Każda próba liczy 7 podejść.")}><Input type="number" min={50} max={2000} step={50} value={st.compareR} onChange={(e) => setSettings({ compareR: Math.min(2000, Math.max(50, parseInt(e.target.value || '200', 10))) })} /></Field>
        <Field label={t("Stabilność ładunków EFA")}><Input type="number" min={20} max={1000} step={20} value={st.stabilityB} onChange={(e) => setSettings({ stabilityB: Math.min(1000, Math.max(20, parseInt(e.target.value || '100', 10))) })} /></Field>
        <Field label={t("Język raportu")}><Select value={st.lang} onChange={(e) => setSettings({ lang: e.target.value })} options={[{ value: 'pl', label: 'polski' }, { value: 'en', label: t("angielski (APA)") }]} /></Field>
      </div>
    </Dialog>
  );
}

function HelpDialog() {
  const open = useStore((s) => s.help);
  const v = useStore((s) => s.engine.versions);
  return (
    <Dialog open={open} onClose={() => setState({ help: false })} title={t("Pomoc")} icon="help" width={640}
      actions={<Button variant="primary" onClick={() => setState({ help: false })}>{t("Zamknij")}</Button>}
      footNote={v ? t("SEMplex {0} · Pyodide {1} · numpy {2} · scipy {3} · pandas {4}", { 0: v.semplex, 1: v.pyodide, 2: v.numpy, 3: v.scipy, 4: v.pandas }) : undefined}>
      <div className="stack">
        <p className="lead">SEMplex prowadzi przez ścieżkę Dane → Rzetelność → EFA → CFA → SEM → Raport. Obliczenia wykonuje silnik w Pythonie uruchomiony w Twojej przeglądarce (WebAssembly) - dane nie są wysyłane na żaden serwer.</p>
        <table className="tbl"><tbody>
          <tr><td><Kbd>{t("Ctrl")}</Kbd> <Kbd>K</Kbd></td><td>Paleta poleceń: metody, moduły, polecenia (<span className="mono">&gt;</span> {t("polecenia,")} <span className="mono">?</span> pomoc)</td></tr>
          <tr><td><Kbd>{t("Ctrl")}</Kbd> <Kbd>S</Kbd></td><td>{t("Zapisz projekt do pliku .sxp")}</td></tr>
          <tr><td><Kbd>{t("Ctrl")}</Kbd> <Kbd>{t("Enter")}</Kbd></td><td>{t("Uruchom model w edytorze składni")}</td></tr>
          <tr><td><Kbd>{t("Delete")}</Kbd> / <Kbd>{t("Esc")}</Kbd></td><td>{t("Usuń / odznacz element na płótnie modelu")}</td></tr>
        </tbody></table>
        <p className="subtle">Zgodność: estymacja ML i MLM (Satorra–Bentler) z konwencjami lavaan (macierz kowariancji z dzielnikiem N, pierwszy ładunek = 1). Wyniki testowano na zbiorach Holzinger–Swineford i Political Democracy względem lavaan. Licencja MIT.</p>
      </div>
    </Dialog>
  );
}

export default function App() {
  const s = useStore();
  const narrow = useMedia(t("(max-width: 1279px)"));
  const sections = useNav();
  const steps = usePipeline();

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setState({ palette: true }); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject('clean'); }
    }
    window.addEventListener('keydown', onKey);
    const warn = (e) => { if (getState().data && !getState().project.saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', warn); };
  }, []);

  function onPick(item) {
    setState({ palette: false });
    const id = item.id || '';
    if (id.startsWith('go:')) return go(id.split(':')[1]);
    if (id.startsWith('mod:')) return go(id.slice(4));
    if (id === 'cmd:sample') { setState({ wantSample: Date.now(), importDraft: null, data: null }); go('data'); }
    if (id === 'cmd:save') saveProject('clean');
    if (id === 'cmd:save-full') saveProject('full');
    if (id === 'cmd:open') openProjectFile();
    if (id === 'cmd:theme') toggleTheme();
    if (id === 'cmd:settings') setState({ settingsOpen: true });
    if (id === 'cmd:help') setState({ help: true });
    if (id === 'cmd:lang') setLang(getState().lang === 'pl' ? 'en' : 'pl');
  }

  const modItems = sections.flatMap((sec) => sec.items.map((it) => ({ id: 'mod:' + it.id, title: it.label, module: 'Moduły', icon: it.icon, release: it.release, keywords: it.id })));
  const varItems = s.data ? s.data.variables.map((v) => ({ id: 'mod:data', title: v.name, module: 'Zmienne', icon: 'observed', description: v.label || undefined, keywords: (v.label || '') })) : [];
  const next = NEXT[s.module];
  const jobs = s.jobs.map(({ signal, ...j }) => j);
  const statusTone = !s.data ? 'saved' : s.project.saved ? 'saved' : 'dirty';

  return (
    <div className={'app' + (narrow ? ' is-narrow' : '')}>
      <Sidebar sections={sections} active={s.module} onSelect={go}
        header={<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><Logo size={26} /><div className="subtle">Projekt: {s.project.name}</div></div>}
        footer={<><Icon name="lock" size={14} /> Obliczenia lokalnie · dane nie opuszczają komputera</>} />
      <div className="shell">
        <TopBar className="top" crumbs={[s.data ? s.data.file : s.project.name, LABELS[s.module]]}
          status={{ tone: statusTone, text: !s.data ? t("Brak danych") : s.project.saved ? t("Zapisano") : t("Niezapisane zmiany") }}
          search={{ placeholder: t("Szukaj metody, zmiennej, polecenia…"), onOpen: () => setState({ palette: true }) }}
          tools={<>
            <Segmented size="sm" label={t('Język interfejsu')} value={s.lang} onChange={(v) => setLang(v)} options={LANGS} />
            <JobTray jobs={jobs} onCancel={cancelJob} note={t("Zadania liczą się w tle; możesz pracować w innych modułach.")} />
            <Button size="sm" variant="ghost" icon="download" onClick={() => saveProject('clean')} title={t("Zapisz projekt bez kolumn pominiętych (Ctrl S)")} aria-label={t("Zapisz projekt")} />
            <Button size="sm" variant="ghost" icon="settings" onClick={() => setState({ settingsOpen: true })} aria-label={t("Ustawienia")} />
            <Button size="sm" variant="ghost" icon="help" onClick={() => setState({ help: true })} aria-label={t("Pomoc")} />
          </>}
          mode={s.mode} onModeChange={(m) => setState({ mode: m })}
          theme={s.theme} onThemeToggle={toggleTheme}
          actions={next && s.data ? <Button variant="primary" iconRight="arrow-right" onClick={() => go(next[0])}>{next[1]}</Button> : null} />
        <div className="pipe"><PipelineStepper steps={steps} onSelect={(id) => id && go(id)} allowAhead /></div>
        <main key={s.module + ':' + s.lang}><ScreenBoundary>{screenFor(s.module)}</ScreenBoundary></main>
      </div>
      {s.palette ? (
        <CommandPalette overlay autoFocus items={[...METHODS, ...modItems, ...COMMANDS, ...varItems].map((x) => Object.assign({}, x, { module: t(x.module) }))} onPick={onPick} onClose={() => setState({ palette: false })}
          placeholder={t("Szukaj metody, modułu, zmiennej…")} recent={['cmd:sample', 'mod:cfa', 'mod:sem']}
          scopes={[{ prefix: '>', label: t("Polecenia"), module: 'Polecenia' }, { prefix: '@', label: t("Zmienne"), module: 'Zmienne' }, { prefix: '?', label: t("Pomoc"), module: 'Pomoc' }]} />
      ) : null}
      <SettingsDialog />
      <HelpDialog />
      <Toast key={s.toast ? s.toast.key : 'none'} message={s.toast ? s.toast.message : null} open={!!s.toast} onClose={() => setState({ toast: null })}
        actionLabel={s.toast && s.toast.actionLabel} onAction={s.toast && s.toast.onAction ? () => { const a = s.toast.onAction; setState({ toast: null }); a(); } : undefined}
        icon={(s.toast && s.toast.icon) || 'check'} duration={s.toast && s.toast.actionLabel ? 8000 : 4000} />
    </div>
  );
}
