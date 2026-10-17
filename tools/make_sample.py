"""Generuje przykładowy zbiór „Lojalność klientów 2026” (dane syntetyczne, ziarno 2026).

Model populacyjny (standaryzowane zmienne latentne):
  SAT, LOY, TRU, VAL z rozkładu normalnego o macierzy korelacji Φ (r od 0,29 do 0,58)
  ENG — słaby czynnik zaangażowania (Q13–Q15, Q17, Q18); Q16 ładuje SAT i LOY.
Q6 jest odwrócona treścią (ujemny ładunek na LOY). 12 nieuważnych respondentów (jednakowe
odpowiedzi, krótki czas), ok. 2% braków MCAR, kolumna e-mail do pokazania ochrony danych osobowych.
Uruchom:  python tools/make_sample.py
"""
import json
import os
import numpy as np
import pandas as pd

rng = np.random.default_rng(2026)
N = 524
# korelacje czynników jak na ekranach projektu (Φ): SAT, LOY, TRU, VAL
PHI = np.array([[1.00, 0.58, 0.46, 0.39],
                [0.58, 1.00, 0.41, 0.33],
                [0.46, 0.41, 1.00, 0.29],
                [0.39, 0.33, 0.29, 1.00]])
Z = rng.multivariate_normal(np.zeros(4), PHI, size=N)
SAT, LOY, TRU, VAL = Z.T
ENG = 0.30 * LOY + np.sqrt(1 - 0.09) * rng.standard_normal(N)

spec = {
    "Q1": (SAT, 0.88), "Q2": (SAT, 0.85), "Q3": (SAT, 0.78),
    "Q4": (LOY, 0.86), "Q5": (LOY, 0.82), "Q6": (LOY, -0.74),
    "Q7": (TRU, 0.87), "Q8": (TRU, 0.83), "Q9": (TRU, 0.76),
    "Q10": (VAL, 0.86), "Q11": (VAL, 0.81), "Q12": (VAL, 0.76),
    "Q13": (ENG, 0.62), "Q14": (ENG, 0.58), "Q15": (ENG, 0.55), "Q17": (ENG, 0.50), "Q18": (ENG, 0.52),
}
cont = {}
for q, (f, l) in spec.items():
    cont[q] = l * f + np.sqrt(1 - l ** 2) * rng.standard_normal(N)
cont["Q16"] = 0.42 * SAT + 0.38 * LOY + np.sqrt(1 - 0.42 ** 2 - 0.38 ** 2 - 2 * 0.42 * 0.38 * 0.58) * rng.standard_normal(N)
cuts = np.array([-1.45, -0.55, 0.35, 1.25])
items = [f"Q{i}" for i in range(1, 19)]
df = pd.DataFrame({q: np.digitize(cont[q] + 0.15, cuts) + 1 for q in items})

# nieuważni: jednakowe odpowiedzi i krótki czas
careless = rng.choice(N, 12, replace=False)
for r in careless:
    df.loc[r, items] = rng.integers(2, 5)
czas = np.clip(rng.normal(310, 85, N), 120, 900).round()
czas[careless] = rng.integers(40, 75, len(careless))

# braki MCAR ~2%
mask = rng.random((N, len(items))) < 0.02
df = df.astype(float)
df[mask] = np.nan

plec = rng.choice(["kobieta", "mężczyzna"], N, p=[0.55, 0.45])
wiek = np.clip(rng.normal(41, 13, N), 18, 79).round()
oddzial = rng.integers(1, 13, N)
email = [f"respondent{i + 1:04d}@example.com" for i in range(N)]

out = pd.DataFrame({"id": np.arange(1, N + 1), "email": email, "plec": plec, "wiek": wiek.astype(int), "oddzial": oddzial,
                    "czas_s": czas.astype(int)})
for q in items:
    out[q] = df[q].map(lambda v: "" if np.isnan(v) else str(int(v)))

here = os.path.dirname(os.path.abspath(__file__))
dst = os.path.join(here, "..", "public", "samples")
os.makedirs(dst, exist_ok=True)
out.to_csv(os.path.join(dst, "lojalnosc_2026.csv"), sep=";", index=False, encoding="utf-8")

labels = {
    "Q1": "Jestem zadowolony z usługi", "Q2": "Usługa spełnia moje oczekiwania", "Q3": "Poleciłbym usługę znajomym",
    "Q4": "Zostanę klientem w przyszłym roku", "Q5": "Wybiorę tę firmę ponownie", "Q6": "Często myślę o zmianie dostawcy",
    "Q7": "Firma dotrzymuje obietnic", "Q8": "Mogę polegać na informacjach od firmy", "Q9": "Firma działa w moim interesie",
    "Q10": "Cena jest adekwatna do jakości", "Q11": "Dostaję więcej, niż płacę", "Q12": "Usługa jest warta swojej ceny",
    "Q13": "Korzystam z aplikacji firmy", "Q14": "Czytam newsletter", "Q15": "Kontaktuję się z infolinią",
    "Q16": "Polecam firmę w mediach społecznościowych", "Q17": "Śledzę promocje", "Q18": "Porównuję oferty konkurencji",
    "plec": "Płeć", "wiek": "Wiek w latach", "oddzial": "Oddział", "czas_s": "Czas wypełniania ankiety (s)",
}
value_labels = {str(i): l for i, l in enumerate(["zdecydowanie się nie zgadzam", "raczej się nie zgadzam", "ani się zgadzam, ani nie zgadzam",
                                                 "raczej się zgadzam", "zdecydowanie się zgadzam"], start=1)}
meta = {"title": "Lojalność klientów 2026", "file": "lojalnosc_2026.csv", "labels": labels, "likert": value_labels,
        "scales": {"SAT": ["Q1", "Q2", "Q3"], "LOY": ["Q4", "Q5", "Q6"], "TRU": ["Q7", "Q8", "Q9"], "VAL": ["Q10", "Q11", "Q12"]},
        "scale_names": {"SAT": "Satysfakcja", "LOY": "Lojalność", "TRU": "Zaufanie", "VAL": "Postrzegana wartość"},
        "note": "Dane syntetyczne wygenerowane skryptem tools/make_sample.py (ziarno 2026)."}
with open(os.path.join(dst, "lojalnosc_2026.meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=1)
print("zapisano", len(out), "wierszy")
