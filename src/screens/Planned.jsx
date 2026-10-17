import React from 'react';
import { EmptyState, Button, Badge, Interpretation } from 'semplex-ui';
import { go } from '../store.js';
import { Head, Screen } from '../ui.jsx';

const PLAN = {
  groups: { release: 'v1', what: 'Inwariancja pomiarowa (konfiguracyjna, metryczna, skalarna, ścisła), porównanie średnich latentnych i alignment.', now: ['stats', 'Szybkie porównania średnich skal (test t Welcha, ANOVA) są w module Opisowe i testy.'] },
  power: { release: 'v1', what: 'Moc i wielkość próby z symulacji Monte Carlo dla modelu SEM, krzywe mocy i dynamiczne progi dopasowania (DFI).', now: ['sem', 'Model, dla którego policzysz moc, przygotujesz w edytorze SEM.'] },
  pls: { release: 'v1', what: 'PLS-SEM z bootstrapem, Q²predict, IPMA (ważność i wykonanie) oraz NCA (warunki konieczne).', now: ['bridge', 'Porównanie podejść już dziś zestawia SEM, SAM, ESEM i regresję na sumach.'] },
  ml: { release: 'v2', what: 'Modele wielopoziomowe: ICC, efekt schematu, losowe stałe i nachylenia, wielopoziomowa CFA.', now: ['data', 'Zmienną grupującą (np. oddział) zaimportujesz już teraz jako nominalną.'] },
};

export default function PlannedScreen({ module, label }) {
  const p = PLAN[module] || { release: 'v1', what: 'Moduł w przygotowaniu.', now: null };
  return (
    <Screen>
      <Head eyebrow="Moduł planowany" title={label || module} meta={[<Badge key="r" tone="brand">wydanie {p.release}</Badge>]} />
      <EmptyState icon="layers" title={`Ten moduł wejdzie w wydaniu ${p.release}`}
        actions={p.now ? <Button variant="secondary" iconRight="arrow-right" onClick={() => go(p.now[0])}>Przejdź dalej</Button> : null}>
        {p.what}
      </EmptyState>
      {p.now ? <Interpretation tone="info" title="Co możesz zrobić teraz">{p.now[1]}</Interpretation> : null}
    </Screen>
  );
}
