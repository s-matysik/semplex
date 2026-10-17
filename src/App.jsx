import React, { useEffect, useMemo } from 'react';
import {
  Sidebar, TopBar, Logo, Icon, Button, PipelineStepper, JobTray, Toast, CommandPalette, Dialog, Field, Input, Select, Kbd, Diagnosis,
  navSections, useMedia, format,
} from 'semplex-ui';
import { useStore, setState, toggleTheme, go, cancelJob, setSettings, getState } from './store.js';
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

const LABELS = { data: 'Dane i czyszczenie', stats: 'Opisowe i testy', rel: 'Rzetelność i trafność', efa: 'EFA', cfa: 'CFA', sem: 'SEM — edytor modelu',
  med: 'Mediacja i moderacja', bridge: 'Porównanie podejść', groups: 'Porównanie grup', power: 'Moc i wielkość próby', pls: 'PLS-SEM, IPMA, NCA',
  ml: 'Modele wielopoziomowe', report: 'Raport', log: 'Dziennik decyzji' };

const NEXT = { data: ['stats', 'Przejdź do opisowych'], stats: ['rel', 'Przejdź do rzetelności'], rel: ['efa', 'Przejdź do EFA'], efa: ['cfa', 'Przejdź do CFA'],
  cfa: ['sem', 'Przejdź do SEM'], sem: ['bridge', 'Porównaj podejścia'], med: ['report', 'Przejdź do raportu'], bridge: ['report', 'Przejdź do raportu'],
  report: null, log: ['report', 'Przejdź do raportu'] };

class ScreenBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('SEMPLEX_SCREEN_ERROR', error && error.stack, info && info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="content">
        <Diagnosis level="poor" title="Ten ekran napotkał błąd" what={String(this.state.error.message || this.state.error)}
          effect="Dane i wyniki pozostałych modułów są nienaruszone." log={String(this.state.error.stack || '')} logLabel="Szczegóły techniczne"
          fixes={[{ title: 'Wróć do danych i spróbuj ponownie', recommended: true, actionLabel: 'Przejdź do danych', onAction: () => { this.setState({ error: null }); go('data'); } }]} />
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
    { id: 'data', label: 'Dane', meta: s.data ? `N = ${format.num(s.data.n_total, 0)} · ${s.data.k} zmiennych` : 'wczytaj plik', status: s.module === 'data' ? 'current' : s.data ? 'done' : 'todo' },
    { id: 'rel', label: 'Rzetelność', meta: r.rel && r.rel.value ? `${r.rel.value.scales.length} skale` : excl ? `−${excl} nieuważnych` : undefined, status: st('rel') },
    { id: 'efa', label: 'EFA', meta: r.efa && r.efa.value ? `${r.efa.value.k} czynniki · n = ${r.efa.value.n}` : undefined, status: st('efa') },
    { id: 'cfa', label: 'CFA', meta: r.cfa && r.cfa.value ? `n = ${r.cfa.value.n} · ${r.cfa.value.estimator}` : undefined, status: st('cfa') },
    { id: 'sem', label: 'SEM', meta: r.sem && r.sem.value ? `CFI = ${format.num(r.sem.value.fit.cfi, 3)}` : undefined, status: st('sem') },
    { id: 'report', label: 'Raport', meta: 'APA · PL/EN', status: s.module === 'report' ? 'current' : 'todo' },
  ];
}

const COMMANDS = [
  { id: 'cmd:sample', title: 'Otwórz przykładowe dane', module: 'Polecenia', icon: 'file', keywords: 'przykład lojalność sample demo', shortcut: '' },
  { id: 'cmd:save', title: 'Zapisz projekt (.sxp)', module: 'Polecenia', icon: 'download', keywords: 'save zapisz projekt', shortcut: 'Ctrl S' },
  { id: 'cmd:open', title: 'Otwórz projekt (.sxp)', module: 'Polecenia', icon: 'folder', keywords: 'open otwórz projekt' },
  { id: 'cmd:theme', title: 'Przełącz motyw jasny / ciemny', module: 'Polecenia', icon: 'moon', keywords: 'theme dark light motyw' },
  { id: 'cmd:settings', title: 'Ustawienia', module: 'Polecenia', icon: 'settings', keywords: 'settings ziarno bootstrap seed' },
  { id: 'cmd:help', title: 'Pomoc i skróty klawiszowe', module: 'Pomoc', icon: 'help', keywords: 'help pomoc skróty keyboard' },
];
const METHODS = [
  ['data', 'Import CSV / Excel', 'data', 'csv xlsx import wczytaj kodowanie separator'], ['data', 'Nieuważni respondenci (longstring, czas)', 'data', 'careless longstring straightlining'],
  ['data', 'Braki danych i test MCAR Little’a', 'data', 'missing mcar little braki'], ['data', 'Odwracanie pozycji', 'data', 'reverse odwróć'],
  ['stats', 'Statystyki opisowe i macierz korelacji', 'stats', 'descriptives correlation psych describe'], ['stats', 'Test Mardii', 'stats', 'mardia normalność wielowymiarowa mvn'],
  ['stats', 'Test t Welcha i ANOVA', 'stats', 't-test anova welch hedges g'],
  ['rel', 'ω McDonalda i α Cronbacha', 'reliability', 'omega alpha reliability psych semTools'], ['rel', 'CR, AVE i HTMT', 'reliability', 'validity fornell larcker htmt'],
  ['efa', 'Analiza równoległa i konsensus kryteriów', 'efa', 'parallel analysis fa.parallel hull map'], ['efa', 'EFA z rotacją oblimin / geomin / promax', 'efa', 'factor analysis fa psych rotation'],
  ['cfa', 'Konfirmacyjna analiza czynnikowa', 'cfa', 'cfa lavaan confirmatory'], ['cfa', 'Indeksy modyfikacji', 'cfa', 'modification indices modindices mi'],
  ['sem', 'Edytor modelu SEM', 'sem', 'sem lavaan path structural'], ['med', 'Mediacja — szablon 4 (PROCESS)', 'mediation', 'mediation indirect process model 4'],
  ['med', 'Moderacja z obszarem Johnsona-Neymana', 'mediation', 'moderation interaction johnson neyman model 1'],
  ['bridge', 'Porównanie podejść: sumy, SAM, ESEM, SEM', 'bridge', 'sam esem croon factor scores compare approaches'],
  ['report', 'Raport APA (PL/EN)', 'report', 'report apa docx html'], ['log', 'Dziennik decyzji', 'history', 'decision log history undo'],
].map(([m, title, icon, kw]) => ({ id: 'go:' + m + ':' + title, title, module: LABELS[m], icon, keywords: kw }));

function SettingsDialog() {
  const open = useStore((s) => s.settingsOpen);
  const st = useStore((s) => s.settings);
  return (
    <Dialog open={open} onClose={() => setState({ settingsOpen: false })} title="Ustawienia" icon="settings"
      subtitle="Zapisywane w tej przeglądarce. Zmiana ziarna albo liczby prób wpływa na następne przeliczenia."
      actions={<Button variant="primary" onClick={() => setState({ settingsOpen: false })}>Gotowe</Button>}>
      <div className="form">
        <Field label="Ziarno losowania" hint="Podział próby, bootstrap, analiza równoległa"><Input type="number" min={1} value={st.seed} onChange={(e) => setSettings({ seed: Math.max(1, parseInt(e.target.value || '1', 10)) })} /></Field>
        <Field label="Bootstrap SEM i mediacji" hint="Podaj liczbę od 100 do 5000."><Input type="number" min={100} max={5000} step={100} value={st.bootR} onChange={(e) => setSettings({ bootR: Math.min(5000, Math.max(100, parseInt(e.target.value || '500', 10))) })} /></Field>
        <Field label="Bootstrap porównania podejść" hint="Każda próba liczy 7 podejść."><Input type="number" min={50} max={2000} step={50} value={st.compareR} onChange={(e) => setSettings({ compareR: Math.min(2000, Math.max(50, parseInt(e.target.value || '200', 10))) })} /></Field>
        <Field label="Stabilność ładunków EFA"><Input type="number" min={20} max={1000} step={20} value={st.stabilityB} onChange={(e) => setSettings({ stabilityB: Math.min(1000, Math.max(20, parseInt(e.target.value || '100', 10))) })} /></Field>
        <Field label="Język raportu"><Select value={st.lang} onChange={(e) => setSettings({ lang: e.target.value })} options={[{ value: 'pl', label: 'polski' }, { value: 'en', label: 'angielski (APA)' }]} /></Field>
      </div>
    </Dialog>
  );
}

function HelpDialog() {
  const open = useStore((s) => s.help);
  const v = useStore((s) => s.engine.versions);
  return (
    <Dialog open={open} onClose={() => setState({ help: false })} title="Pomoc" icon="help" width={640}
      actions={<Button variant="primary" onClick={() => setState({ help: false })}>Zamknij</Button>}
      footNote={v ? `SEMplex ${v.semplex} · Pyodide ${v.pyodide} · numpy ${v.numpy} · scipy ${v.scipy} · pandas ${v.pandas}` : undefined}>
      <div className="stack">
        <p className="lead">SEMplex prowadzi przez ścieżkę Dane → Rzetelność → EFA → CFA → SEM → Raport. Obliczenia wykonuje silnik w Pythonie uruchomiony w Twojej przeglądarce (WebAssembly) — dane nie są wysyłane na żaden serwer.</p>
        <table className="tbl"><tbody>
          <tr><td><Kbd>Ctrl</Kbd> <Kbd>K</Kbd></td><td>Paleta poleceń: metody, moduły, polecenia (<span className="mono">&gt;</span> polecenia, <span className="mono">?</span> pomoc)</td></tr>
          <tr><td><Kbd>Ctrl</Kbd> <Kbd>S</Kbd></td><td>Zapisz projekt do pliku .sxp</td></tr>
          <tr><td><Kbd>Ctrl</Kbd> <Kbd>Enter</Kbd></td><td>Uruchom model w edytorze składni</td></tr>
          <tr><td><Kbd>Delete</Kbd> / <Kbd>Esc</Kbd></td><td>Usuń / odznacz element na płótnie modelu</td></tr>
        </tbody></table>
        <p className="subtle">Zgodność: estymacja ML i MLM (Satorra–Bentler) z konwencjami lavaan (macierz kowariancji z dzielnikiem N, pierwszy ładunek = 1). Wyniki testowano na zbiorach Holzinger–Swineford i Political Democracy względem lavaan. Licencja MIT.</p>
      </div>
    </Dialog>
  );
}

export default function App() {
  const s = useStore();
  const narrow = useMedia('(max-width: 1279px)');
  const sections = useNav();
  const steps = usePipeline();

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setState({ palette: true }); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); }
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
    if (id === 'cmd:save') saveProject();
    if (id === 'cmd:open') openProjectFile();
    if (id === 'cmd:theme') toggleTheme();
    if (id === 'cmd:settings') setState({ settingsOpen: true });
    if (id === 'cmd:help') setState({ help: true });
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
          status={{ tone: statusTone, text: !s.data ? 'Brak danych' : s.project.saved ? 'Zapisano' : 'Niezapisane zmiany' }}
          search={{ placeholder: 'Szukaj metody, zmiennej, polecenia…', onOpen: () => setState({ palette: true }) }}
          tools={<>
            <JobTray jobs={jobs} onCancel={cancelJob} note="Zadania liczą się w tle; możesz pracować w innych modułach." />
            <Button size="sm" variant="ghost" icon="download" onClick={saveProject} title="Zapisz projekt (Ctrl S)" aria-label="Zapisz projekt" />
            <Button size="sm" variant="ghost" icon="settings" onClick={() => setState({ settingsOpen: true })} aria-label="Ustawienia" />
            <Button size="sm" variant="ghost" icon="help" onClick={() => setState({ help: true })} aria-label="Pomoc" />
          </>}
          mode={s.mode} onModeChange={(m) => setState({ mode: m })}
          theme={s.theme} onThemeToggle={toggleTheme}
          actions={next && s.data ? <Button variant="primary" iconRight="arrow-right" onClick={() => go(next[0])}>{next[1]}</Button> : null} />
        <div className="pipe"><PipelineStepper steps={steps} onSelect={(id) => id && go(id)} allowAhead /></div>
        <main key={s.module}><ScreenBoundary>{screenFor(s.module)}</ScreenBoundary></main>
      </div>
      {s.palette ? (
        <CommandPalette overlay autoFocus items={[...METHODS, ...modItems, ...COMMANDS, ...varItems]} onPick={onPick} onClose={() => setState({ palette: false })}
          placeholder="Szukaj metody, modułu, zmiennej…" recent={['cmd:sample', 'mod:cfa', 'mod:sem']}
          scopes={[{ prefix: '>', label: 'Polecenia', module: 'Polecenia' }, { prefix: '@', label: 'Zmienne', module: 'Zmienne' }, { prefix: '?', label: 'Pomoc', module: 'Pomoc' }]} />
      ) : null}
      <SettingsDialog />
      <HelpDialog />
      <Toast key={s.toast ? s.toast.key : 'none'} message={s.toast ? s.toast.message : null} open={!!s.toast} onClose={() => setState({ toast: null })}
        actionLabel={s.toast && s.toast.actionLabel} onAction={s.toast && s.toast.onAction ? () => { const a = s.toast.onAction; setState({ toast: null }); a(); } : undefined}
        icon={(s.toast && s.toast.icon) || 'check'} duration={s.toast && s.toast.actionLabel ? 8000 : 4000} />
    </div>
  );
}
