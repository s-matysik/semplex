"""Engine message translation (gettext style): the Polish source text is the key; EN maps it to English.
Missing entries fall back to Polish. The interface sends the current language with every call (_lang)."""

LANG = "pl"

# Polish source text -> English. Filled by the translation step; keep the {placeholders} identical.
EN = {
    "Diagnostyka: N = {p0} < 300. Przy małych próbach rozwiązania SEM łącznego częściej bywają niezbieżne lub niedopuszczalne; sprawdź liczbę dopuszczalnych losowań i porównaj wynik z SAM.": "Diagnostic: N = {p0} < 300. In small samples, joint SEM solutions are more often non-convergent or inadmissible; check the number of admissible draws and compare the result with SAM.",
    "Diagnostyka: model pomiarowy słabo pasuje (CFI = {p0} < 0,90). W SEM łącznym błąd specyfikacji jednej skali może przenosić się na ścieżki strukturalne, a SAM szacuje bloki pomiarowe osobno (Rosseel i Loh, 2024). Popraw lub uzasadnij model pomiarowy przed interpretacją.": "Diagnostic: the measurement model fits poorly (CFI = {p0} < 0.90). In joint SEM, misspecification of one scale can propagate to the structural paths, whereas SAM estimates measurement blocks separately (Rosseel and Loh, 2024). Revise or justify the measurement model before interpretation.",
    "Diagnostyka: przybliżenie ESEM różni się od SEM łącznego o {p0}, a największy ładunek krzyżowy wynosi {p1} - sprawdź, czy ładunki krzyżowe mają uzasadnienie merytoryczne.": "Diagnostic: the ESEM approximation differs from joint SEM by {p0}, and the largest cross-loading is {p1} - check whether the cross-loadings are substantively justified.",
    "Diagnostyka nie wskazuje problemu (N = {p0} ≥ 300, CFI = {p1} ≥ 0,90, ładunki krzyżowe nie zmieniają wyniku).": "The diagnostics flag no problem (N = {p0} ≥ 300, CFI = {p1} ≥ 0.90, cross-loadings do not change the result).",
    "SEMplex nie wskazuje najlepszego podejścia: SEM łączny jest punktem odniesienia na wykresie, a różnice opisują wrażliwość wyniku na reprezentację konstruktów.": "SEMplex does not select a best approach: joint SEM is the reference line in the plot, and the differences describe how sensitive the result is to construct representation.",
    "16. percentyl": "16th percentile",
    "84. percentyl": "84th percentile",
    "Analiza równoległa": "Parallel analysis",
    "BIC modeli EFA": "BIC of EFA models",
    "Braeken i van Assen (2017)": "Braeken and van Assen (2017)",
    "Czynnik przyspieszenia": "Acceleration factor",
    "Czynnik skalujący różnicy jest niedodatni - skalowanego testu Δχ² nie można obliczyć (rozważ test Satorry–Bentlera, 2010).": "The scaling factor of the difference is non-positive - the scaled Δχ² test cannot be computed (consider the Satorra-Bentler test, 2010).",
    "Część podejść nie ma wiarygodnego przedziału (za mało dopuszczalnych losowań bootstrap lub niedopuszczalne rozwiązanie w próbie): {p0}.": "Some approaches do not have a reliable interval (too few admissible bootstrap draws or an inadmissible solution in the resample): {p0}.",
    "ESEM (przybliżenie) − SEM łączny": "ESEM (approximation) − joint SEM",
    "Empiryczne kryterium Kaisera": "Empirical Kaiser criterion",
    "Etykieta „{p0}” z wyrażenia nie występuje w modelu.": "The label “{p0}” from the expression does not appear in the model.",
    "Horn (1965)": "Horn (1965)",
    "Kaiser (1960)": "Kaiser (1960)",
    "Korekta Croona": "Croon's correction",
    "Kryterium Kaisera": "Kaiser criterion",
    "Lorenzo-Seva i in. (2011)": "Lorenzo-Seva et al. (2011)",
    "M + 1 SD": "M + 1 SD",
    "M − 1 SD": "M − 1 SD",
    "MAP Velicera": "Velicer's MAP",
    "Macierz informacji jest osobliwa - model może być nieidentyfikowany empirycznie.": "The information matrix is singular - the model may be empirically unidentified.",
    "Macierz kowariancji próby nie jest dodatnio określona (np. zmienna stała albo liniowo zależne zmienne).": "The sample covariance matrix is not positive definite (e.g., a constant variable or linearly dependent variables).",
    "Mahalanobis p = {p0:.4f}": "Mahalanobis p = {p0:.4f}",
    "Metoda Hulla": "Hull method",
    "Model nie jest identyfikowany: {p0} parametrów przy {p1} momentach (df = {p2}).": "The model is not identified: {p0} parameters with {p1} moments (df = {p2}).",
    "Model nie zawiera zmiennych obserwowalnych.": "The model does not contain observed variables.",
    "Nazwa efektu „{p0}” jest niepoprawna.": "The effect name “{p0}” is invalid.",
    "Nie rozpoznano modyfikatora „{p0}”.": "The modifier “{p0}” was not recognized.",
    "Nie stwierdzono zawierania wolnych parametrów - upewnij się, że modele są zagnieżdżone.": "No containment of free parameters was found - make sure the models are nested.",
    "Niedozwolone znaki w wyrażeniu efektu.": "Disallowed characters in the effect expression.",
    "Ograniczenia nierówności i równości wyrażeń nie są jeszcze obsługiwane - wiersz pominięto.": "Inequality and equality constraints on expressions are not yet supported - the row was skipped.",
    "Po operatorze brakuje zmiennych.": "Variables are missing after the operator.",
    "Pojedynczy wskaźnik z korektą α": "Single indicator with alpha correction",
    "Pojedynczy wskaźnik − średnie": "Single indicator − means",
    "Predyktory są bardzo silnie skorelowane na poziomie latentnym (r = {p0}). Efekty cząstkowe są niestabilne i zależą od podejścia - ostrożnie interpretuj ich oddzielne wkłady. Łączenie konstruktów wymaga uzasadnienia teoretycznego, a nie tylko wysokiej korelacji.": "The predictors are very strongly correlated at the latent level (r = {p0}). The partial effects are unstable and depend on the approach - interpret their separate contributions with caution. Combining constructs requires theoretical justification, not just a high correlation.",
    "Przybliżenie ESEM": "ESEM approximation",
    "Raîche i in. (2013)": "Raîche et al. (2013)",
    "Regresja na średnich pozycji": "Regression on item means",
    "Reguła heurystyczna (N < 300 lub CFI < 0,90): sugerujemy obejrzeć wynik SAM, który w lokalnej estymacji ogranicza przenoszenie błędnej specyfikacji jednej skali na ścieżki strukturalne. Tu N = {p0}, CFI = {p1}.": "Heuristic rule (N < 300 or CFI < 0.90): we suggest reviewing the SAM result, which in local estimation limits the propagation of misspecification of one scale onto the structural paths. Here N = {p0}, CFI = {p1}.",
    "Reguła heurystyczna: N = {p0} ≥ 300 i CFI = {p1} ≥ 0,90, a ładunki krzyżowe nie zmieniają wyniku - punktem odniesienia jest SEM łączny. Oceń dopasowanie także innymi wskaźnikami.": "Heuristic rule: N = {p0} ≥ 300 and CFI = {p1} ≥ 0.90, and cross-loadings do not change the result - the reference point is the joint SEM. Also assess fit using other indices.",
    "Reguła heurystyczna: przybliżenie ESEM różni się od SEM łącznego o {p0}, a największy ładunek krzyżowy wynosi {p1} - sprawdź, czy ładunki krzyżowe mają uzasadnienie merytoryczne.": "Heuristic rule: the ESEM approximation differs from the joint SEM by {p0}, and the largest cross-loading is {p1} - check whether the cross-loadings have substantive justification.",
    "Revelle i Rocklin (1979)": "Revelle and Rocklin (1979)",
    "SAM (lokalny)": "SAM (local)",
    "SAM − pojedynczy wskaźnik": "SAM − single indicator",
    "SEM łączny": "Joint SEM",
    "SEM łączny − SAM": "Joint SEM − SAM",
    "Schwarz (1978)": "Schwarz (1978)",
    "Sugestia nie zastępuje oceny modelu pomiarowego ani nie wskazuje wyniku „prawdziwego”.": "The suggestion does not replace assessment of the measurement model, nor does it indicate the “true” result.",
    "VSS, złożoność 1": "VSS, complexity 1",
    "Velicer (1976)": "Velicer (1976)",
    "Wczytaj dane, zanim uruchomisz analizę.": "Load the data before running the analysis.",
    "Wiersz {p0}: {p1}": "Row {p0}: {p1}",
    "Współrzędne optymalne": "Optimal coordinates",
    "Wyniki czynnikowe (regresyjne)": "Factor scores (regression)",
    "Wyrazy wolne (~ 1) są pomijane - model nie ma struktury średnich.": "Intercepts (~ 1) are omitted - the model has no mean structure.",
    "Wyrażenie efektu może zawierać tylko etykiety, liczby i + − * / ( ).": "An effect expression may only contain labels, numbers and + − * / ( ).",
    "Za mało kompletnych przypadków do EFA: {p0} przy {p1} pozycjach.": "Too few complete cases for EFA: {p0} with {p1} items.",
    "Zmienne nie występują w danych ani nie są zdefiniowane jako latentne: ": "Variables do not appear in the data and are not defined as latent: ",
    "imię lub nazwisko": "first or last name",
    "korekta · Croon (2002)": "correction · Croon (2002)",
    "korekta · wariancja błędu = (1 − α)·σ²": "correction · error variance = (1 − α)·σ²",
    "latentne · najpierw pomiar, potem struktura": "latent · measurement first, then structure",
    "latentne · pomiar i struktura szacowane razem w modelu zredukowanym": "latent · measurement and structure estimated together in a reduced model",
    "nie potwierdzono zagnieżdżenia (zbiory wolnych parametrów); porównaj CFI, AIC i BIC": "nesting not confirmed (sets of free parameters); compare CFI, AIC and BIC",
    "obserwowalne · bez modelu błędu pomiaru": "observed · without a measurement error model",
    "obserwowalne · wyniki z CFA": "observed · scores from CFA",
    "odwrócono {p0} (skala {p1}–{p2})": "reversed {p0} (scale {p1}–{p2})",
    "przeciętna": "average",
    "przywrócono {p0} wierszy": "restored {p0} rows",
    "rotacja target rozwiązania ML · ładunki krzyżowe dopuszczone": "target rotation of the ML solution · cross-loadings allowed",
    "rozwiązanie niedopuszczalne (przypadek Heywooda)": "inadmissible solution (Heywood case)",
    "rozwiązanie niezbieżne": "non-converged solution",
    "różne wiersze danych albo tryb EM": "different data rows or EM mode",
    "różne zmienne obserwowalne": "different observed variables",
    "słaba": "weak",
    "usunięto zmienną {p0}": "removed variable {p0}",
    "wykluczono {p0} wierszy": "excluded {p0} rows",
    "{p0:.1f} s na pozycję": "{p0:.1f} s per item",
    "Średnie pozycji": "Item means",
    "„{p0}” nie jest poprawną nazwą zmiennej.": "“{p0}” is not a valid variable name.",
}


def set_lang(lang):
    global LANG
    LANG = "en" if lang == "en" else "pl"


def T(pl, **kw):
    """Translate a message; T("Wiersz {line}: ...", line=3)."""
    s = EN.get(pl, pl) if LANG == "en" else pl
    return s.format(**kw) if kw else s


def num(x, fmt=".2f"):
    """Number with the decimal separator of the current language."""
    s = format(x, fmt)
    return s.replace(".", ",") if LANG == "pl" else s
