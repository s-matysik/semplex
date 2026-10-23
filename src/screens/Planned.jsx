import React from 'react';
import { EmptyState, Button, Badge, Interpretation } from 'semplex-ui';
import { go } from '../store.js';
import { Head, Screen } from '../ui.jsx';
import { t, lazy } from '../i18n/index.js';

const PLAN = lazy(() => ({
  groups: { release: 'v1', what: t("Inwariancja pomiarowa (konfiguracyjna, metryczna, skalarna, ścisła), porównanie średnich latentnych i alignment."), now: ['stats', t("Szybkie porównania średnich skal (test t Welcha, ANOVA) są w module Opisowe i testy.")] },
  power: { release: 'v1', what: t("Moc i wielkość próby z symulacji Monte Carlo dla modelu SEM, krzywe mocy i dynamiczne progi dopasowania (DFI)."), now: ['sem', t("Model, dla którego policzysz moc, przygotujesz w edytorze SEM.")] },
  pls: { release: 'v1', what: t("PLS-SEM z bootstrapem, Q²predict, IPMA (ważność i wykonanie) oraz NCA (warunki konieczne)."), now: ['bridge', t("Porównanie podejść już dziś zestawia SEM, SAM, ESEM i regresję na sumach.")] },
  ml: { release: 'v2', what: t("Modele wielopoziomowe: ICC, efekt schematu, losowe stałe i nachylenia, wielopoziomowa CFA."), now: ['data', t("Zmienną grupującą (np. oddział) zaimportujesz już teraz jako nominalną.")] },
}));

export default function PlannedScreen({ module, label }) {
  const p = PLAN[module] || { release: 'v1', what: t("Moduł w przygotowaniu."), now: null };
  return (
    <Screen>
      <Head eyebrow={t("Moduł planowany")} title={label || module} meta={[<Badge key="r" tone="brand">{t("wydanie")} {p.release}</Badge>]} />
      <EmptyState icon="layers" title={t("Ten moduł wejdzie w wydaniu {0}", { 0: p.release })}
        actions={p.now ? <Button variant="secondary" iconRight="arrow-right" onClick={() => go(p.now[0])}>{t("Przejdź dalej")}</Button> : null}>
        {p.what}
      </EmptyState>
      {p.now ? <Interpretation tone="info" title={t("Co możesz zrobić teraz")}>{p.now[1]}</Interpretation> : null}
    </Screen>
  );
}
