/* Wspólne elementy ekranów. */
import React, { useState, useCallback } from 'react';
import { Badge, Button, Diagnosis, EmptyState, Interpretation, Progress, Inspector, useMedia, Skeleton } from 'semplex-ui';
import { useStore, go } from './store.js';

export function Head({ eyebrow, title, meta, children }) {
  return (
    <div className="head">
      <div className="grow">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="title">{title}</h1>
        {meta && meta.length ? <div className="meta">{meta}</div> : null}
      </div>
      {children}
    </div>
  );
}

/* Ekran z kolumną inspektora (poniżej 1280 px - szuflada). */
export function Screen({ children, inspector, inspectorTitle, inspectorOpen, onInspectorClose }) {
  const narrow = useMedia('(max-width: 1279px)');
  const [own, setOwn] = useState(false);
  if (!inspector) return <div className="screen no-insp"><div className="content">{children}</div></div>;
  const isOpen = !!inspectorOpen || own;
  const close = () => { setOwn(false); onInspectorClose && onInspectorClose(); };
  return (
    <div className="screen">
      <div className="content">
        {narrow ? <div className="row end no-print"><Button size="sm" variant="secondary" icon="eye" onClick={() => setOwn(true)}>Szczegóły{typeof inspectorTitle === 'string' ? ' · ' + inspectorTitle : ''}</Button></div> : null}
        {children}
      </div>
      <Inspector open={isOpen} onClose={close} title={inspectorTitle || 'Szczegóły'}>
        {narrow ? <div className="insp-body">{inspector}</div> : <aside className="insp" aria-label={typeof inspectorTitle === 'string' ? inspectorTitle : 'Szczegóły'}><div className="insp-body">{inspector}</div></aside>}
      </Inspector>
    </div>
  );
}

export function EngineBanner() {
  const e = useStore((s) => s.engine);
  if (e.status === 'ready') return null;
  if (e.status === 'error') {
    return (
      <Diagnosis level="poor" title="Silnik obliczeniowy nie uruchomił się"
        what="Środowisko Python (Pyodide) pobiera się z cdn.jsdelivr.net przy pierwszym uruchomieniu."
        effect="Bez silnika nie policzysz analiz; przeglądanie interfejsu działa."
        fixes={[{ title: 'Sprawdź połączenie z internetem i odśwież stronę', recommended: true, actionLabel: 'Odśwież', actionIcon: 'refresh', onAction: () => window.location.reload() }]}
        log={e.error} logLabel="Szczegóły techniczne" />
    );
  }
  return (
    <div className="boot">
      <Progress value={Math.round((e.progress || 0) * 100)} max={100} label="Uruchamianie silnika obliczeniowego" detail={e.text + ' · pierwsze uruchomienie trwa do minuty, potem przeglądarka korzysta z pamięci podręcznej'} />
    </div>
  );
}

export function NeedData({ what }) {
  return (
    <EmptyState icon="data" title="Najpierw wczytaj dane" actions={<Button variant="primary" icon="upload" onClick={() => go('data')}>Przejdź do danych</Button>}>
      {what || 'Ten moduł liczy na danych z projektu.'} Możesz też otworzyć przykładowy zbiór „Lojalność klientów 2026”.
    </EmptyState>
  );
}

export function StaleNote({ stale, onRun, running }) {
  if (!stale) return null;
  return (
    <Interpretation tone="warn" title="Wyniki są nieaktualne" icon="refresh"
      actions={onRun ? <Button size="sm" variant="secondary" icon="refresh" loading={running} onClick={onRun}>Przelicz teraz</Button> : null}>
      Od ostatniego uruchomienia zmieniły się dane, model albo ustawienia. Liczby poniżej pochodzą z poprzedniego przebiegu - nie raportuj ich przed przeliczeniem.
    </Interpretation>
  );
}

export function EngineErrorView({ error, onClose }) {
  if (!error) return null;
  const model = error.kind === 'model';
  return (
    <Diagnosis level={model ? 'warn' : 'poor'} compact title={model ? 'Model wymaga poprawki' : 'Obliczenia przerwał błąd'}
      what={error.message} effect={model ? 'Nie policzono wyników dla tej specyfikacji.' : 'Wynik nie powstał. Dane i projekt są nienaruszone.'}
      fixes={model ? [{ title: 'Popraw składnię albo wybór zmiennych i uruchom ponownie', recommended: true }] : [{ title: 'Uruchom ponownie; jeśli błąd się powtarza, skopiuj szczegóły do zgłoszenia', recommended: true }]}
      log={error.trace || undefined} logLabel="Szczegóły techniczne"
      aside={onClose ? <Button size="sm" variant="ghost" icon="x" onClick={onClose} aria-label="Zamknij komunikat" /> : null} />
  );
}

/* Hook: uruchomienie z obsługą stanu i błędu. */
export function useRun() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (fn) => {
    setRunning(true); setError(null);
    try { return await fn(); } catch (e) { setError(e); console.error(e); return undefined; } finally { setRunning(false); }
  }, []);
  return { running, error, setError, run };
}

export function Loading({ variant = 'chart', label = 'Liczenie' }) {
  return <Skeleton variant={variant} label={label} />;
}

export function SeedBadge({ seed, R }) {
  return <Badge icon="shuffle">{R ? `bootstrap ${R} · ` : ''}ziarno {seed}</Badge>;
}
