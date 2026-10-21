# SEMplex — analiza ankiet w przeglądarce

SEMplex prowadzi badacza od surowego pliku z ankiety przez rzetelność, EFA i CFA do modelu strukturalnego i gotowej sekcji Wyniki. Wszystko liczy się **w przeglądarce**: silnik w Pythonie (numpy, scipy, pandas) działa w WebAssembly dzięki Pyodide, a dane nie są wysyłane na żaden serwer. Interfejs jest zbudowany z biblioteki `semplex-ui` (system projektowy SEMplex, wersja 18).

Aplikacja jest w pełni statyczna, więc działa na **GitHub Pages** albo na dowolnym hostingu plików (Netlify, Cloudflare Pages, serwer uczelniany).

## Moduły

| Moduł | Co robi |
|---|---|
| Dane i czyszczenie | import CSV/TXT/TSV/XLSX z wykrywaniem kodowania (UTF-8, Windows-1250), separatora i znaku dziesiętnego; kody braków; pomijanie danych osobowych (e-mail, telefon, PESEL, imię i nazwisko); skale Likerta zapisane słowami; propozycje odwrócenia pozycji; nieuważni respondenci (longstring, czas, Mahalanobis); wzorce braków i test MCAR Little’a; definicje skal |
| Opisowe i testy | M, SD, skośność, kurtoza, mini-rozkłady; macierz korelacji Pearsona/Spearmana; test Mardii z wyborem estymatora; test t Welcha z g Hedgesa, ANOVA |
| Rzetelność i trafność | ω McDonalda (z jednoczynnikowej CFA) i α Cronbacha z CI Feldta lub bootstrap; analiza pozycji „bez tej pozycji”; CR, AVE, MSV, Fornell–Larcker, HTMT |
| EFA | korelacje polichoryczne lub Pearsona; KMO, Bartlett; minres, ML, PAF; rotacje oblimin, geomin, promax, varimax, quartimax; konsensus 9 kryteriów liczby czynników (m.in. analiza równoległa, MAP, Hull, BIC); stabilność ładunków z bootstrapu; podział próby EFA/CFA z ziarnem i warstwowaniem; model CFA z rozwiązania jednym przyciskiem |
| CFA | składnia lavaan z kontrolą identyfikowalności; estymatory ML i MLM (Satorra–Bentler); χ², CFI, TLI, RMSEA z 90% CI, SRMR z progami i źródłami; ładunki z CI (delta lub bootstrap); przypadki Heywooda; indeksy modyfikacji z propozycją „Dodaj”; porównanie modeli (skalowane Δχ² tylko przy potwierdzonym zagnieżdżeniu, te same zmienne i wiersze; ΔCFI, AIC, BIC); diagram ścieżek (SVG); kod Python i lavaan |
| SEM — edytor modelu | płótno modelu zsynchronizowane ze składnią w obie strony, przeciąganie zmiennych z danych, cofanie/ponawianie; ścieżki, R², efekty zdefiniowane (`:=`) z bootstrapem |
| Mediacja i moderacja | szablony PROCESS 4 (na zmiennych latentnych albo średnich), 7 i 14 (moderowana mediacja, ścieżka a albo b) oraz 1 (moderacja z obszarem Johnsona–Neymana); szablon 58 w wydaniu v1 |
| Porównanie podejść | ten sam efekt w 7 podejściach: średnie pozycji, wyniki czynnikowe, korekta Croona, pojedynczy wskaźnik z korektą α, SAM lokalny, przybliżenie ESEM (rotacja target), SEM łączny; przedziały bootstrap z liczbą odrzuconych losowań; wykres leśny, kolejne różnice (opisowo), sugestia heurystyczna i akapit do Metod (PL/EN) |
| Raport | sekcja Wyniki po polsku albo w APA 7 po angielsku z tabelami; eksport HTML, Word (.doc), druk/PDF |
| Dziennik decyzji | obsługiwane zmiany danych i modelu (odwrócenia, wykluczenia, skale, propozycje EFA, modyfikacje z MI, tryb braków w CFA, uruchomienia EFA z ziarnem) z uzasadnieniem i skutkiem; notatki badacza; cofanie z listą modułów do przeliczenia; eksport CSV i JSON |

Moduły Porównanie grup, Moc i wielkość próby, PLS-SEM/IPMA/NCA (v1) i Modele wielopoziomowe (v2) mają w interfejsie ekran zapowiedzi, zgodnie ze specyfikacją wydań.

Wspólne dla wszystkich ekranów: przełącznik Prosty / Zaawansowany / Kod, paleta poleceń (Ctrl K), motyw jasny i ciemny, zadania w tle z postępem i anulowaniem, zapis i odczyt projektu `.sxp` (Ctrl S), inspektor przechodzący w szufladę poniżej 1280 px.

## Uruchomienie lokalne

Testowane z Node.js 20 (tak jak w CI). Testy interfejsu (`tools/ui-test.mjs`) nie działają w Node.js 24 z powodu przypisania `globalThis.navigator` w środowisku testowym.

```bash
npm install
npm run build          # → folder dist/
npx serve dist         # albo: python -m http.server 8080 -d dist
```

Otwórz wskazany adres (np. http://localhost:3000). Plik `dist/index.html` otwarty bezpośrednio z dysku (`file://`) nie zadziała, bo przeglądarki blokują wtedy wątki obliczeń — potrzebny jest dowolny serwer plików.

Tryb deweloperski z odświeżaniem: `npm run dev` (Vite).

## Publikacja na GitHub Pages

1. Utwórz repozytorium na GitHubie i wypchnij zawartość tego folderu (gałąź `main`).
2. W repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Każdy `push` do `main` uruchamia `.github/workflows/deploy.yml`: testy silnika (pytest), budowanie, test interfejsu i publikację. Aplikacja będzie pod adresem `https://<użytkownik>.github.io/<repozytorium>/`.

Aplikacja używa ścieżek względnych, więc działa w podfolderze repozytorium bez dodatkowej konfiguracji.

### Inny hosting

Netlify, Cloudflare Pages, Vercel: polecenie budowania `npm run build`, folder publikacji `dist`. Serwer uczelniany: skopiuj zawartość `dist/` do katalogu WWW. Serwer nie wykonuje żadnych obliczeń.

## Architektura

```
przeglądarka
├── interfejs React 18 + semplex-ui        src/ (ekrany w src/screens/)
│     └── klient silnika                   src/engine/client.js — kolejka wywołań, zadania liczone porcjami
└── wątek obliczeń (Web Worker)            public/engine/worker.js
      └── Pyodide 0.29.5 (CPython 3.13 w WebAssembly, z cdn.jsdelivr.net)
            └── silnik SEMplex (Python)    public/engine/semplex/
                  syntax.py    parser składni lavaan (=~, ~, ~~, :=, etykiety, wartości stałe)
                  sem.py       model RAM, ML z gradientem analitycznym, MLM (Satorra–Bentler), dopasowanie, MI, bootstrap
                  efa.py       korelacje polichoryczne, ekstrakcja, rotacje GPA, kryteria liczby czynników
                  data.py      import, typy, braki, dane osobowe, nieuważni, MCAR, EM
                  measure.py   opisowe, Mardia, testy grup, ω, α, CR, AVE, HTMT
                  bridge.py    porównanie 7 podejść
                  mediation.py szablony PROCESS 4, 7, 14 i 1
                  api.py       polecenia JSON wywoływane z interfejsu
```

Silnik jest zwykłym pakietem Pythona — ten sam kod można uruchomić poza przeglądarką (`sys.path.insert(0, "public/engine")`, potem `from semplex.sem import fit_model`); tak działa eksport kodu w aplikacji.

Budowanie (`tools/build.mjs`) używa esbuild-wasm w jednym procesie Node, bez binariów zależnych od systemu, więc wynik jest taki sam lokalnie i w GitHub Actions.

## Testy

| Polecenie | Co sprawdza |
|---|---|
| `npm run test:engine` | test różnicy χ² Satorry–Bentlera i diagnostyka współliniowości; zgodność z lavaan na zbiorach Holzinger–Swineford (CFA: χ² = 85,306, df = 24, CFI = 0,931, RMSEA = 0,092 [0,071; 0,114], SRMR = 0,065, ładunki i SE) i Political Democracy (SEM z kowariancjami reszt: χ² = 38,125, df = 35, ścieżki i SE); parser składni; EFA; ścieżkę API na danych przykładowych |
| `npm run test:ui` | zbudowaną aplikację w happy-dom: import przykładu, wszystkie moduły i główne przyciski, szablony mediacji, raport PL/EN, decyzja i jej cofnięcie — na nagranych odpowiedziach silnika (`tests/fixtures/engine.json`) |
| `npm run test:wasm <folder_pyodide>` | prawdziwy `worker.js` z Pyodide w Node: wyniki w WebAssembly porównane z CPython (wymaga lokalnej kopii Pyodide 0.29.5 z kołami numpy, scipy, pandas) |

Czasy w WebAssembly (Node 20, Pyodide 0.29.5 z plików lokalnych, dane przykładowe N = 512): start silnika ok. 25 s (w przeglądarce dochodzi pierwsze pobranie ok. 25 MB, kolejne uruchomienia korzystają z pamięci podręcznej), CFA 0,1 s, EFA z konsensusem 2,3 s, bootstrap CFA ok. 0,06 s na próbę, porównanie podejść ok. 0,2 s na próbę bootstrap.

## Walidacja (validation)

Folder `validation/` odtwarza wyniki walidacji opisane w artykule o SEMplex.

| Skrypt | Co robi |
|---|---|
| `Rscript validation/lavaan_reference.R` | pobiera dane ECSI (`satisfaction`, N = 250 klientów banku, 27 wskaźników; pakiet cSEM 0.7.1 z CRAN, GPL-3 — dane nie są przechowywane w repozytorium) i liczy wartości referencyjne w lavaan 0.7-2, semTools 0.5-9 i psych 2.6.9 |
| `Rscript validation/lavaan_definitions.R` | wartości referencyjne dla definicji stosowanych w SEMplex (ω z jednoczynnikowej CFA, AVE Fornella–Larckera, HTMT w wersji oryginalnej, analiza równoległa na składowych) oraz test różnicy χ² Satorry–Bentlera (2001) |
| `python validation/semplex_vs_lavaan.py` | porównuje 1988 wielkości (dopasowanie, oszacowania, błędy standardowe, standaryzowane SE i granice 95% CI, MI, R², ładunki EFA, rzetelność, podejścia porównawcze); kończy się błędem, gdy któremuś parametrowi referencyjnemu brak odpowiednika, wartość nie jest skończona albo różnica (dla wartości p — bezwzględna) przekracza 10⁻⁴ → `validation/results/agreement.csv` |
| `python validation/monte_carlo.py 500` | badanie symulacyjne modelu z zarządzania zasobami ludzkimi (autonomia → zaangażowanie → wypalenie → intencja odejścia; pozycje Likerta 1–7; N = 150, 300, 600; 500 replikacji) → `validation/results/monte_carlo_summary.csv` |
| `python validation/ecsi_case_study.py` (oraz `--zero-missing`) | odtwarza wszystkie liczby studium przypadku ECSI z artykułu (z sumą SHA-256 pliku danych i wersjami środowiska w wyniku) oraz analizę wrażliwości z dodatkową kowariancją val2 ~~ val3; wariant `--zero-missing` to analiza wrażliwości, w której odpowiedź 0 traktowana jest jako brak (znaczenie 0 nie jest udokumentowane w cSEM ani plspm) |

Wynik: największa znormalizowana różnica, liczona jako |SEMplex − referencja| / max(1, |referencja|), wynosi 3,3·10⁻⁵; w symulacji obciążenie standaryzowanych ścieżek SEM nie przekracza 6,0% (N = 150), a pokrycie 95% przedziałów Walda mieści się w zakresie 91,8–96,2%.

*English:* `validation/` reproduces the agreement study against lavaan, semTools and psych on the ECSI customer-satisfaction data and the Monte Carlo recovery study reported in the SEMplex software paper.

## Dane przykładowe

`public/samples/lojalnosc_2026.csv` — syntetyczny zbiór „Lojalność klientów 2026” (N = 524, 18 pozycji Likerta, skale SAT, LOY, TRU, VAL, pozycja odwrócona Q6, pozycja z ładunkiem krzyżowym Q16, 12 nieuważnych respondentów, kolumna e-mail do pokazania ochrony danych osobowych). Generator: `python tools/make_sample.py` (ziarno 2026).

## Ograniczenia tego wydania

Względem specyfikacji (`specyfikacja-semplex.md`) świadomie odłożono:

- **Estymatory:** dostępne ML i MLM (Satorra–Bentler). MLR i WLSMV dla danych porządkowych nie są jeszcze zaimplementowane; dla pozycji Likerta zalecany jest MLM.
- **Braki danych:** domyślnie przypadki kompletne (listwise). W CFA dostępny jest też tryb „EM (kowariancja)”: macierz kowariancji z algorytmu EM i estymacja ML z N obejmującym wszystkie częściowo obserwowane osoby. To nie jest FIML; błędy standardowe i testy w tym trybie nie zostały zwalidowane, więc traktuj je ostrożnie.
- **Struktura średnich i ograniczenia:** model nie ma wyrazów wolnych (`~ 1`); ograniczenia równości i nierówności (`==`, `<`, `>`) są pomijane z ostrzeżeniem.
- **ESEM** w porównaniu podejść to rotacja target rozwiązania EFA z efektem z macierzy Φ (bez pełnej estymacji błędów ESEM); przedziały daje bootstrap.
- **Pliki SPSS, Stata, SAS** — wydanie v1; zapisz dane jako CSV albo XLSX.
- **Pierwsze uruchomienie** wymaga internetu: przeglądarka pobiera Pyodide i pakiety (ok. 25 MB) z cdn.jsdelivr.net, potem korzysta z pamięci podręcznej. Obsługa XLSX doinstalowuje openpyxl z PyPI przy pierwszym pliku Excel.

## Prywatność

Plik czyta przeglądarka, a silnik liczy w wątku tej samej karty. Sieć służy tylko do pobrania środowiska Python. Kolumny z danymi osobowymi są domyślnie pomijane przy imporcie. Plik projektu `.sxp` domyślnie nie zawiera kolumn pominiętych przy imporcie, ale zawiera pozostałe odpowiedzi — przechowuj go jak same dane.

## Licencja i autor

MIT (implementacja od zera, bez kodu lavaan). Sebastian Matysik, Uniwersytet Szczeciński, Instytut Zarządzania, Szkoła Doktorska · ORCID [0009-0002-7264-0501](https://orcid.org/0009-0002-7264-0501).

React i React DOM — MIT, © Meta Platforms, Inc. Pyodide — MPL 2.0.
