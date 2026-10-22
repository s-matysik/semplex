import React, { useMemo, useState } from 'react';
import { DecisionTimeline, Panel, Button, Switch, Input, Badge, Dialog, EmptyState, Interpretation, Segmented, CodeExport } from 'semplex-ui';
import { useStore, revertDecision, go, logDecision } from '../store.js';
import { Head, Screen } from '../ui.jsx';
import { download } from '../lib/model.js';

const MODULE_TARGET = { Dane: 'data', 'Opisowe i testy': 'stats', 'Rzetelność': 'rel', EFA: 'efa', CFA: 'cfa', SEM: 'sem', Mediacja: 'med', 'Porównanie podejść': 'bridge' };
const AFFECTS = { Dane: ['Rzetelność', 'EFA', 'CFA', 'SEM', 'Mediacja', 'Porównanie podejść'], 'Opisowe i testy': ['CFA', 'SEM'], 'Rzetelność': ['CFA', 'SEM', 'Porównanie podejść'], EFA: ['CFA', 'SEM'], CFA: ['SEM'], SEM: ['Porównanie podejść'] };

function toCsv(rows) {
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const head = ['czas', 'moduł', 'rodzaj', 'pochodzenie', 'decyzja', 'uzasadnienie', 'skutek', 'cofnięta'];
  return [head.join(';')].concat(rows.map((d) => [d.time, d.module, d.kind, d.origin, d.action, d.reason, (d.effects || []).map((e) => `${e.label}: ${e.from || ''} → ${e.to}`).join(', '), d.reverted ? 'tak' : 'nie'].map(esc).join(';'))).join('\n');
}

export default function LogScreen() {
  const decisions = useStore((s) => s.decisions);
  const project = useStore((s) => s.project);
  const [showReverted, setShowReverted] = useState(true);
  const [q, setQ] = useState('');
  const [origin, setOrigin] = useState('all');
  const [sel, setSel] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [note, setNote] = useState({ action: '', reason: '' });

  const list = decisions.filter((d) => (showReverted || !d.reverted) && (origin === 'all' || d.origin === origin) && (!q || `${d.action} ${d.reason || ''} ${d.module}`.toLowerCase().includes(q.toLowerCase())));
  const groups = useMemo(() => {
    const by = {};
    list.slice().reverse().forEach((d) => { (by[d.module] = by[d.module] || []).push(d); });
    return [{ label: 'Ta sesja', meta: `${list.length} wpisów`, entries: list.slice().reverse().map((d) => ({ id: d.id, time: d.time, module: d.module, moduleIcon: d.moduleIcon, kind: d.kind, origin: d.origin, action: d.action, reason: d.reason, effects: d.effects, reverted: d.reverted, stale: d.stale })) }];
  }, [list]);
  const cur = decisions.find((d) => d.id === sel);
  const anyStale = decisions.some((d) => d.stale && !d.reverted);
  const base = (project.name || 'projekt').replace(/[^\p{L}\p{N}_-]+/gu, '_');

  if (!decisions.length) return <Screen><EmptyState icon="history" title="Dziennik jest pusty">Wczytanie danych, odwrócenie pozycji, wykluczenie respondentów, zmiany skal i modelu oraz uruchomienia EFA trafiają tutaj; obsługiwane zmiany można cofnąć. Inne decyzje dopisz jako notatkę.</EmptyState></Screen>;

  const insp = cur ? (
    <>
      <div className="eyebrow">{cur.module} · {cur.time}</div>
      <h2 className="sub">{cur.action}</h2>
      <div className="chips"><Badge tone={cur.origin === 'proposal' ? 'brand' : 'neutral'}>{cur.origin === 'proposal' ? 'propozycja SEMplex' : cur.origin === 'auto' ? 'automatycznie' : 'ręcznie'}</Badge>{cur.reverted ? <Badge tone="ok" icon="undo">cofnięta</Badge> : null}{cur.stale ? <Badge tone="ok" icon="refresh">liczby do przeliczenia</Badge> : null}</div>
      {cur.reason ? <p className="muted">{cur.reason}</p> : null}
      {cur.effects && cur.effects.length ? <table className="tbl"><tbody>{cur.effects.map((e, i) => <tr key={i}><td>{e.label}</td><td className="num">{e.from} → <b>{e.to}</b></td></tr>)}</tbody></table> : null}
      {AFFECTS[cur.module] ? <Interpretation tone="info" title="Zależne moduły">{AFFECTS[cur.module].join(', ')}</Interpretation> : null}
      <div className="row">
        {MODULE_TARGET[cur.module] ? <Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => go(MODULE_TARGET[cur.module])}>Otwórz moduł</Button> : null}
        {!cur.reverted && cur.undo ? <Button size="sm" variant="danger" icon="undo" onClick={() => setConfirm(cur)}>Cofnij tę decyzję…</Button> : null}
      </div>
      {!cur.undo && !cur.reverted ? <p className="subtle">Uruchomień analiz nie cofa się - zostają w historii jako ślad pracy.</p> : null}
    </>
  ) : <p className="muted">Wybierz wpis na osi czasu.</p>;

  return (
    <Screen inspector={insp} inspectorTitle={cur ? cur.action : 'Decyzja'} inspectorOpen={!!sel} onInspectorClose={() => setSel(null)}>
      <Head eyebrow="Dziennik decyzji" title="Co zmieniono, dlaczego i z jakim skutkiem" meta={[<Badge key="n">{decisions.filter((d) => !d.reverted).length} aktywnych</Badge>, <Badge key="r">{decisions.filter((d) => d.reverted).length} cofniętych</Badge>]}>
        <Button variant="secondary" icon="download" onClick={() => download(base + '_dziennik.csv', '\ufeff' + toCsv(decisions), 'text/csv;charset=utf-8')}>CSV</Button>
        <Button variant="secondary" icon="code" onClick={() => download(base + '_dziennik.json', JSON.stringify(decisions.map(({ undo, ...d }) => d), null, 1), 'application/json')}>JSON</Button>
      </Head>
      <Panel title="Notatka badacza" subtitle="Decyzje, których program nie zapisuje sam (np. pozostawienie oznaczonych respondentów, odrzucenie sugestii liczby czynników)">
        <div className="row">
          <Input placeholder="Decyzja, np. Zachowano wszystkich oznaczonych respondentów" value={note.action} onChange={(e) => setNote(Object.assign({}, note, { action: e.target.value }))} aria-label="Treść decyzji" />
          <Input placeholder="Uzasadnienie" value={note.reason} onChange={(e) => setNote(Object.assign({}, note, { reason: e.target.value }))} aria-label="Uzasadnienie decyzji" />
          <Button size="sm" variant="secondary" icon="plus" disabled={!note.action.trim()} onClick={() => { logDecision({ module: 'Notatka', moduleIcon: 'history', kind: 'note', origin: 'manual', action: note.action.trim(), reason: note.reason.trim() }); setNote({ action: '', reason: '' }); }}>Dodaj do dziennika</Button>
        </div>
      </Panel>
      {anyStale ? <Interpretation tone="warn" title="Część liczb czeka na przeliczenie" icon="refresh">Po cofnięciu decyzji wpisy późniejsze mają znacznik „liczby do przeliczenia”. Otwórz ich moduły i uruchom analizy ponownie.</Interpretation> : null}
      <div className="row">
        <Input icon="search" placeholder="Szukaj w dzienniku" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Szukaj w dzienniku" />
        <Segmented size="sm" label="Pochodzenie" value={origin} onChange={setOrigin} options={[{ value: 'all', label: 'Wszystkie' }, { value: 'proposal', label: 'Propozycje' }, { value: 'manual', label: 'Ręczne' }, { value: 'auto', label: 'Automatyczne' }]} />
        <Switch label="Pokaż cofnięte" checked={showReverted} onChange={setShowReverted} />
      </div>
      <Panel><DecisionTimeline groups={groups} selected={sel || undefined} onSelect={setSel} /></Panel>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title="Cofnąć tę decyzję?" icon="undo" tone="danger"
        subtitle={confirm ? confirm.action : ''} onConfirm={async () => { const id = confirm.id; setConfirm(null); await revertDecision(id); }} confirmLabel="Cofnij decyzję" cancelLabel="Zostaw"
        footNote="Wpis zostanie w historii jako przekreślony. Wyniki zależnych modułów będą do przeliczenia.">
        {confirm && AFFECTS[confirm.module] ? <p className="muted">Do przeliczenia: {AFFECTS[confirm.module].join(', ')}.</p> : null}
      </Dialog>
    </Screen>
  );
}
