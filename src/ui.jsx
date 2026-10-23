/* Shared screen elements. */
import React, { useState, useCallback } from 'react';
import { Badge, Button, Diagnosis, EmptyState, Interpretation, Progress, Inspector, useMedia, Skeleton } from 'semplex-ui';
import { useStore, go } from './store.js';
import { t } from './i18n/index.js';

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

/* Screen with an inspector column (below 1280 px - drawer). */
export function Screen({ children, inspector, inspectorTitle, inspectorOpen, onInspectorClose }) {
  const narrow = useMedia(t("(max-width: 1279px)"));
  const [own, setOwn] = useState(false);
  if (!inspector) return <div className="screen no-insp"><div className="content">{children}</div></div>;
  const isOpen = !!inspectorOpen || own;
  const close = () => { setOwn(false); onInspectorClose && onInspectorClose(); };
  return (
    <div className="screen">
      <div className="content">
        {narrow ? <div className="row end no-print"><Button size="sm" variant="secondary" icon="eye" onClick={() => setOwn(true)}>{t("Szczegóły")}{typeof inspectorTitle === 'string' ? ' · ' + inspectorTitle : ''}</Button></div> : null}
        {children}
      </div>
      <Inspector open={isOpen} onClose={close} title={inspectorTitle || t("Szczegóły")}>
        {narrow ? <div className="insp-body">{inspector}</div> : <aside className="insp" aria-label={typeof inspectorTitle === 'string' ? inspectorTitle : t("Szczegóły")}><div className="insp-body">{inspector}</div></aside>}
      </Inspector>
    </div>
  );
}

export function EngineBanner() {
  const e = useStore((s) => s.engine);
  if (e.status === 'ready') return null;
  if (e.status === 'error') {
    return (
      <Diagnosis level="poor" title={t("Silnik obliczeniowy nie uruchomił się")}
        what={t("Środowisko Python (Pyodide) pobiera się z cdn.jsdelivr.net przy pierwszym uruchomieniu.")}
        effect={t("Bez silnika nie policzysz analiz; przeglądanie interfejsu działa.")}
        fixes={[{ title: t("Sprawdź połączenie z internetem i odśwież stronę"), recommended: true, actionLabel: t("Odśwież"), actionIcon: 'refresh', onAction: () => window.location.reload() }]}
        log={e.error} logLabel={t("Szczegóły techniczne")} />
    );
  }
  return (
    <div className="boot">
      <Progress value={Math.round((e.progress || 0) * 100)} max={100} label={t("Uruchamianie silnika obliczeniowego")} detail={e.text + t(" · pierwsze uruchomienie trwa do minuty, potem przeglądarka korzysta z pamięci podręcznej")} />
    </div>
  );
}

export function NeedData({ what }) {
  return (
    <EmptyState icon="data" title={t("Najpierw wczytaj dane")} actions={<Button variant="primary" icon="upload" onClick={() => go('data')}>{t("Przejdź do danych")}</Button>}>
      {what || t("Ten moduł liczy na danych z projektu.")} Możesz też otworzyć przykładowy zbiór „Lojalność klientów 2026”.
    </EmptyState>
  );
}

export function StaleNote({ stale, onRun, running }) {
  if (!stale) return null;
  return (
    <Interpretation tone="warn" title={t("Wyniki są nieaktualne")} icon="refresh"
      actions={onRun ? <Button size="sm" variant="secondary" icon="refresh" loading={running} onClick={onRun}>{t("Przelicz teraz")}</Button> : null}>
      {t("Od ostatniego uruchomienia zmieniły się dane, model albo ustawienia. Liczby poniżej pochodzą z poprzedniego przebiegu - nie raportuj ich przed przeliczeniem.")}
    </Interpretation>
  );
}

export function EngineErrorView({ error, onClose }) {
  if (!error) return null;
  const model = error.kind === 'model';
  return (
    <Diagnosis level={model ? 'warn' : 'poor'} compact title={model ? t("Model wymaga poprawki") : t("Obliczenia przerwał błąd")}
      what={error.message} effect={model ? t("Nie policzono wyników dla tej specyfikacji.") : t("Wynik nie powstał. Dane i projekt są nienaruszone.")}
      fixes={model ? [{ title: t("Popraw składnię albo wybór zmiennych i uruchom ponownie"), recommended: true }] : [{ title: t("Uruchom ponownie; jeśli błąd się powtarza, skopiuj szczegóły do zgłoszenia"), recommended: true }]}
      log={error.trace || undefined} logLabel={t("Szczegóły techniczne")}
      aside={onClose ? <Button size="sm" variant="ghost" icon="x" onClick={onClose} aria-label={t("Zamknij komunikat")} /> : null} />
  );
}

/* Hook: run with state and error handling. */
export function useRun() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (fn) => {
    setRunning(true); setError(null);
    try { return await fn(); } catch (e) { setError(e); console.error(e); return undefined; } finally { setRunning(false); }
  }, []);
  return { running, error, setError, run };
}

export function Loading({ variant = 'chart', label = t("Liczenie") }) {
  return <Skeleton variant={variant} label={label} />;
}

export function SeedBadge({ seed, R }) {
  return <Badge icon="shuffle">{R ? t("bootstrap {0} · ", { 0: R }) : ''}{t("ziarno")} {seed}</Badge>;
}
