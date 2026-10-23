import React, { useMemo, useState } from 'react';
import { DecisionTimeline, Panel, Button, Switch, Input, Badge, Dialog, EmptyState, Interpretation, Segmented, CodeExport } from 'semplex-ui';
import { useStore, revertDecision, go, logDecision } from '../store.js';
import { Head, Screen } from '../ui.jsx';
import { download } from '../lib/model.js';
import { t, lazy } from '../i18n/index.js';

const MODULE_TARGET = { Dane: 'data', 'Opisowe i testy': 'stats', 'Rzetelność': 'rel', EFA: 'efa', CFA: 'cfa', SEM: 'sem', Mediacja: 'med', 'Porównanie podejść': 'bridge' };
const AFFECTS = lazy(() => ({ Dane: [t("Rzetelność"), 'EFA', 'CFA', 'SEM', t("Mediacja"), t("Porównanie podejść")], 'Opisowe i testy': ['CFA', 'SEM'], 'Rzetelność': ['CFA', 'SEM', t("Porównanie podejść")], EFA: ['CFA', 'SEM'], CFA: ['SEM'], SEM: ['Porównanie podejść'] }));

function toCsv(rows) {
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const head = ['czas', t("moduł"), 'rodzaj', 'pochodzenie', t("decyzja"), 'uzasadnienie', 'skutek', t("cofnięta")];
  return [head.join(';')].concat(rows.map((d) => [d.time, d.module, d.kind, d.origin, d.action, d.reason, (d.effects || []).map((e) => `${e.label}: ${e.from || ''} → ${e.to}`).join(', '), d.reverted ? t("tak") : t("nie")].map(esc).join(';'))).join('\n');
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
    return [{ label: t("Ta sesja"), meta: t("{0} wpisów", { 0: list.length }), entries: list.slice().reverse().map((d) => ({ id: d.id, time: d.time, module: t(d.module), moduleIcon: d.moduleIcon, kind: d.kind, origin: d.origin, action: d.action, reason: d.reason, effects: d.effects, reverted: d.reverted, stale: d.stale })) }];
  }, [list]);
  const cur = decisions.find((d) => d.id === sel);
  const anyStale = decisions.some((d) => d.stale && !d.reverted);
  const base = (project.name || t("projekt")).replace(/[^\p{L}\p{N}_-]+/gu, '_');

  if (!decisions.length) return <Screen><EmptyState icon="history" title={t("Dziennik jest pusty")}>Wczytanie danych, odwrócenie pozycji, wykluczenie respondentów, zmiany skal i modelu oraz uruchomienia EFA trafiają tutaj; obsługiwane zmiany można cofnąć. Inne decyzje dopisz jako notatkę.</EmptyState></Screen>;

  const insp = cur ? (
    <>
      <div className="eyebrow">{cur.module} · {cur.time}</div>
      <h2 className="sub">{cur.action}</h2>
      <div className="chips"><Badge tone={cur.origin === 'proposal' ? 'brand' : 'neutral'}>{cur.origin === 'proposal' ? t("propozycja SEMplex") : cur.origin === 'auto' ? 'automatycznie' : t("ręcznie")}</Badge>{cur.reverted ? <Badge tone="ok" icon="undo">{t("cofnięta")}</Badge> : null}{cur.stale ? <Badge tone="ok" icon="refresh">{t("liczby do przeliczenia")}</Badge> : null}</div>
      {cur.reason ? <p className="muted">{cur.reason}</p> : null}
      {cur.effects && cur.effects.length ? <table className="tbl"><tbody>{cur.effects.map((e, i) => <tr key={i}><td>{e.label}</td><td className="num">{e.from} → <b>{e.to}</b></td></tr>)}</tbody></table> : null}
      {AFFECTS[cur.module] ? <Interpretation tone="info" title={t("Zależne moduły")}>{AFFECTS[cur.module].join(', ')}</Interpretation> : null}
      <div className="row">
        {MODULE_TARGET[cur.module] ? <Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => go(MODULE_TARGET[cur.module])}>{t("Otwórz moduł")}</Button> : null}
        {!cur.reverted && cur.undo ? <Button size="sm" variant="danger" icon="undo" onClick={() => setConfirm(cur)}>{t("Cofnij tę decyzję…")}</Button> : null}
      </div>
      {!cur.undo && !cur.reverted ? <p className="subtle">{t("Uruchomień analiz nie cofa się - zostają w historii jako ślad pracy.")}</p> : null}
    </>
  ) : <p className="muted">{t("Wybierz wpis na osi czasu.")}</p>;

  return (
    <Screen inspector={insp} inspectorTitle={cur ? cur.action : t("Decyzja")} inspectorOpen={!!sel} onInspectorClose={() => setSel(null)}>
      <Head eyebrow={t("Dziennik decyzji")} title={t("Co zmieniono, dlaczego i z jakim skutkiem")} meta={[<Badge key="n">{decisions.filter((d) => !d.reverted).length} aktywnych</Badge>, <Badge key="r">{decisions.filter((d) => d.reverted).length} {t("cofniętych")}</Badge>]}>
        <Button variant="secondary" icon="download" onClick={() => download(base + '_dziennik.csv', '\ufeff' + toCsv(decisions), 'text/csv;charset=utf-8')}>CSV</Button>
        <Button variant="secondary" icon="code" onClick={() => download(base + t("_dziennik.json"), JSON.stringify(decisions.map(({ undo, ...d }) => d), null, 1), 'application/json')}>JSON</Button>
      </Head>
      <Panel title={t("Notatka badacza")} subtitle={t("Decyzje, których program nie zapisuje sam (np. pozostawienie oznaczonych respondentów, odrzucenie sugestii liczby czynników)")}>
        <div className="row">
          <Input placeholder={t("Decyzja, np. Zachowano wszystkich oznaczonych respondentów")} value={note.action} onChange={(e) => setNote(Object.assign({}, note, { action: e.target.value }))} aria-label={t("Treść decyzji")} />
          <Input placeholder={t("Uzasadnienie")} value={note.reason} onChange={(e) => setNote(Object.assign({}, note, { reason: e.target.value }))} aria-label={t("Uzasadnienie decyzji")} />
          <Button size="sm" variant="secondary" icon="plus" disabled={!note.action.trim()} onClick={() => { logDecision({ module: 'Notatka', moduleIcon: 'history', kind: 'note', origin: 'manual', action: note.action.trim(), reason: note.reason.trim() }); setNote({ action: '', reason: '' }); }}>{t("Dodaj do dziennika")}</Button>
        </div>
      </Panel>
      {anyStale ? <Interpretation tone="warn" title={t("Część liczb czeka na przeliczenie")} icon="refresh">{t("Po cofnięciu decyzji wpisy późniejsze mają znacznik „liczby do przeliczenia”. Otwórz ich moduły i uruchom analizy ponownie.")}</Interpretation> : null}
      <div className="row">
        <Input icon="search" placeholder={t("Szukaj w dzienniku")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Szukaj w dzienniku")} />
        <Segmented size="sm" label={t("Pochodzenie")} value={origin} onChange={setOrigin} options={[{ value: 'all', label: t("Wszystkie") }, { value: 'proposal', label: t("Propozycje") }, { value: 'manual', label: t("Ręczne") }, { value: 'auto', label: t("Automatyczne") }]} />
        <Switch label={t("Pokaż cofnięte")} checked={showReverted} onChange={setShowReverted} />
      </div>
      <Panel><DecisionTimeline groups={groups} selected={sel || undefined} onSelect={setSel} /></Panel>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={t("Cofnąć tę decyzję?")} icon="undo" tone="danger"
        subtitle={confirm ? confirm.action : ''} onConfirm={async () => { const id = confirm.id; setConfirm(null); await revertDecision(id); }} confirmLabel={t("Cofnij decyzję")} cancelLabel={t("Zostaw")}
        footNote={t("Wpis zostanie w historii jako przekreślony. Wyniki zależnych modułów będą do przeliczenia.")}>
        {confirm && AFFECTS[confirm.module] ? <p className="muted">{t("Do przeliczenia:")} {AFFECTS[confirm.module].join(', ')}.</p> : null}
      </Dialog>
    </Screen>
  );
}
