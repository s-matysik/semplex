"""Synthetic datasets for self-testing SEMplex (with known population values).

  A  pracownicy_2026.csv     UTF-8, ';', decimal comma, scale 1–7; SEM with mediation and moderation,
                             reverse-worded item, missing values coded as -9 (recognized by default) and 99 (trap:
                             not on the default list - must be added in the "Missing codes" field on import),
                             personal data, inattentive respondents
  B  studenci_ankieta.xlsx   Excel, responses recorded as words (scale 1–5), EFA with cross-loading
                             and a weak item; missing response recorded as a word
  C  klienci_cp1250.csv      Windows-1250, ';', N = 150, cross-loadings - comparison of approaches (SAM, ESEM)

"True" values are computed by the same script on a population of N = 400 000 (latent variables without measurement error)
and saved to klucz_wartosci.json. Run:  python tools/make_test_data.py  → dane-testowe/ folder
"""
import json
import os

import numpy as np
import pandas as pd

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dane-testowe")
os.makedirs(OUT, exist_ok=True)
KEY = {}


def z(x):
    return (x - x.mean()) / x.std()


def items(F, loads, k, rng, shift=0.0, cross=None):
    """Ordinal items 1..k from standardized loadings; cross = {name: (F2, λ2)}."""
    cuts = np.linspace(-1.8, 1.8, k - 1) * (1.0 if k == 5 else 0.85)
    out = {}
    for name, lam in loads.items():
        sig = lam * F
        tot = lam ** 2
        if cross and name in cross:
            F2, l2 = cross[name]
            sig = sig + l2 * F2
            tot = np.var(sig)
        x = sig + np.sqrt(max(1 - tot, 0.05)) * rng.standard_normal(len(F))
        out[name] = np.digitize(x + shift, cuts) + 1
    return out


def ols_std(y, X):
    Y = z(y)
    Xs = np.column_stack([z(c) for c in X])
    b, *_ = np.linalg.lstsq(Xs, Y, rcond=None)
    return b


# =========================================================================== A
def latent_A(n, rng):
    AUT = rng.standard_normal(n)
    WSP = 0.30 * AUT + np.sqrt(1 - 0.09) * rng.standard_normal(n)
    ZAA = 0.45 * AUT + 0.20 * WSP + 0.20 * AUT * WSP
    ZAA = z(ZAA + rng.standard_normal(n) * np.sqrt(max(1 - ZAA.var(), 0.3)))
    WYP = -0.45 * ZAA - 0.15 * AUT
    WYP = z(WYP + rng.standard_normal(n) * np.sqrt(1 - WYP.var()))
    ROT = 0.40 * WYP - 0.20 * ZAA
    ROT = z(ROT + rng.standard_normal(n) * np.sqrt(1 - ROT.var()))
    return dict(AUT=AUT, WSP=WSP, ZAA=ZAA, WYP=WYP, ROT=ROT)


P = latent_A(400_000, np.random.default_rng(1))
a = ols_std(P["WYP"], [P["ZAA"]])[0]
bc = ols_std(P["ROT"], [P["WYP"], P["ZAA"]])
KEY["A"] = {
    "sem_beta": {"ZAA~AUT": ols_std(P["ZAA"], [P["AUT"]])[0],
                 "WYP~ZAA": ols_std(P["WYP"], [P["ZAA"], P["AUT"]])[0], "WYP~AUT": ols_std(P["WYP"], [P["ZAA"], P["AUT"]])[1],
                 "ROT~WYP": bc[0], "ROT~ZAA": bc[1]},
    "med4_ZAA_WYP_ROT": {"a": a, "b": bc[0], "c_direct": bc[1], "ind": a * bc[0], "total": a * bc[0] + bc[1]},
    "phi": {f"{x}-{y}": float(np.corrcoef(P[x], P[y])[0, 1]) for x, y in [("AUT", "ZAA"), ("AUT", "WSP"), ("ZAA", "WYP"), ("WYP", "ROT"), ("ZAA", "ROT")]},
}
# moderation AUT × WSP → ZAA on standardized values
Xs, Ws = z(P["AUT"]), z(P["WSP"])
b, *_ = np.linalg.lstsq(np.column_stack([np.ones(len(Xs)), Xs, Ws, Xs * Ws]), z(P["ZAA"]), rcond=None)
KEY["A"]["mod_AUTxWSP_ZAA"] = {"b_X": b[1], "b_W": b[2], "b_XW": b[3], "slope_W_-1SD": b[1] - b[3], "slope_W_+1SD": b[1] + b[3]}

rng = np.random.default_rng(20261)
N = 480
L = latent_A(N, rng)
cols = {}
cols.update(items(L["AUT"], {"AUT1": .80, "AUT2": .75, "AUT3": .72, "AUT4": .68}, 7, rng))
cols.update(items(L["ZAA"], {"ZAA1": .82, "ZAA2": .78, "ZAA3": .74, "ZAA4": .70}, 7, rng))
cols.update(items(L["WYP"], {"WYP1": .80, "WYP2": .76, "WYP3": .72, "WYP4": -.65}, 7, rng))
cols.update(items(L["ROT"], {"ROT1": .85, "ROT2": .80, "ROT3": .75}, 7, rng))
cols.update(items(L["WSP"], {"WSP1": .80, "WSP2": .76, "WSP3": .70}, 7, rng))
item_names = list(cols)
dfA = pd.DataFrame(cols)
careless = rng.choice(N, 15, replace=False)
for r in careless:
    dfA.loc[r, item_names] = rng.integers(3, 6)
czas = np.clip(rng.normal(420, 110, N), 160, 1200).round().astype(int)
czas[careless] = rng.integers(55, 95, len(careless))
dfA = dfA.astype(object)
# missingness rare (about 1,2% per item), because the engine computes on complete cases: with 18 items
# zostaje ok. 80% wierszy
m9 = rng.random(dfA.shape) < 0.008
m99 = rng.random(dfA.shape) < 0.004  # code 99 - is NOT the default missing-value code
dfA = dfA.mask(m9, -9).mask(m99 & ~m9, 99)
imiona = ["Anna", "Piotr", "Katarzyna", "Tomasz", "Magdalena", "Krzysztof", "Agnieszka", "Michał", "Joanna", "Paweł"]
nazw = ["Nowak", "Kowalska", "Wiśniewski", "Wójcik", "Kamińska", "Lewandowski", "Zielińska", "Szymański", "Woźniak", "Dąbrowska"]
outA = pd.DataFrame({
    "id": np.arange(1001, 1001 + N),
    "imie_nazwisko": [f"{rng.choice(imiona)} {rng.choice(nazw)}" for _ in range(N)],
    "telefon": [f"+48 {rng.integers(500, 799)} {rng.integers(100, 999)} {rng.integers(100, 999)}" for _ in range(N)],
    "plec": rng.choice(["K", "M"], N, p=[0.56, 0.44]),
    "wiek": np.clip(rng.normal(38, 10, N), 20, 66).round().astype(int),
    "dzial": rng.choice(["Sprzedaż", "Produkcja", "IT", "Finanse", "Obsługa klienta"], N),
    "staz_lat": [f"{v:.1f}".replace(".", ",") for v in np.clip(rng.gamma(2.2, 3.5, N), 0.2, 40)],
    "czas_s": czas,
})
for c in item_names:
    outA[c] = dfA[c].values
outA.to_csv(os.path.join(OUT, "pracownicy_2026.csv"), sep=";", index=False, encoding="utf-8")
KEY["A"]["careless_rows_id"] = sorted(int(1001 + r) for r in careless)
KEY["A"]["n"] = N

# =========================================================================== B
PHI_B = np.array([[1.00, -0.20, 0.40], [-0.20, 1.00, -0.35], [0.40, -0.35, 1.00]])  # MOT, STR, SAM
rng = np.random.default_rng(20262)
N = 260
MOT, STR, SAM = rng.multivariate_normal(np.zeros(3), PHI_B, size=N).T
cols = {}
cols.update(items(MOT, {"MOT1": .78, "MOT2": .74, "MOT3": .72, "MOT4": .66, "MOT5": .45}, 5, rng, shift=0.45, cross={"MOT5": (SAM, .45)}))
cols.update(items(STR, {"STR1": .80, "STR2": .76, "STR3": .70, "STR4": .66, "STR5": .30}, 5, rng, shift=-0.35))
cols.update(items(SAM, {"SAM1": .80, "SAM2": .75, "SAM3": .72, "SAM4": .68, "SAM5": .64}, 5, rng, shift=0.30))
LAB = ["zdecydowanie się nie zgadzam", "raczej się nie zgadzam", "ani się zgadzam, ani nie zgadzam", "raczej się zgadzam", "zdecydowanie się zgadzam"]
outB = pd.DataFrame({
    "Sygnatura czasowa": pd.date_range("2026-03-02 08:00", periods=N, freq="37min").strftime("%Y-%m-%d %H:%M"),
    "Adres e-mail": [f"student{i:03d}@example.edu.pl" for i in range(N)],
    "Płeć": rng.choice(["kobieta", "mężczyzna", "wolę nie podawać"], N, p=[0.6, 0.37, 0.03]),
    "Kierunek": rng.choice(["Zarządzanie", "Ekonomia", "Informatyka", "Psychologia"], N),
    "Rok studiów": rng.integers(1, 6, N),
})
for c, v in cols.items():
    s = pd.Series([LAB[x - 1] for x in v])
    s[rng.random(N) < 0.008] = "brak odpowiedzi"
    outB[c] = s.values
outB.to_excel(os.path.join(OUT, "studenci_ankieta.xlsx"), index=False, sheet_name="Odpowiedzi")
KEY["B"] = {"n": N, "phi": {"MOT-STR": -0.20, "MOT-SAM": 0.40, "STR-SAM": -0.35},
            "traps": {"MOT5": "ładunek krzyżowy: 0,45 na MOT i 0,45 na SAM", "STR5": "słaba pozycja: λ = 0,30"}}

# =========================================================================== C
def latent_C(n, rng):
    JAK = rng.standard_normal(n)
    ZAD = 0.60 * JAK + 0.80 * rng.standard_normal(n)
    LOJ = 0.50 * ZAD + 0.15 * JAK
    LOJ = z(LOJ + rng.standard_normal(n) * np.sqrt(1 - LOJ.var()))
    return dict(JAK=JAK, ZAD=z(ZAD), LOJ=LOJ)


P = latent_C(400_000, np.random.default_rng(3))
bL = ols_std(P["LOJ"], [P["ZAD"], P["JAK"]])
KEY["C"] = {"sem_beta": {"ZAD~JAK": ols_std(P["ZAD"], [P["JAK"]])[0], "LOJ~ZAD": bL[0], "LOJ~JAK": bL[1]},
            "simple_LOJ~ZAD": ols_std(P["LOJ"], [P["ZAD"]])[0]}
rng = np.random.default_rng(20263)
N = 150
L = latent_C(N, rng)
cols = {}
cols.update(items(L["JAK"], {"jakość_1": .78, "jakość_2": .74, "jakość_3": .70, "jakość_4": .55}, 5, rng, cross={"jakość_4": (L["ZAD"], .30)}))
cols.update(items(L["ZAD"], {"zadowolenie_1": .80, "zadowolenie_2": .76, "zadowolenie_3": .55}, 5, rng, cross={"zadowolenie_3": (L["LOJ"], .30)}))
cols.update(items(L["LOJ"], {"lojalność_1": .82, "lojalność_2": .78, "lojalność_3": .72}, 5, rng))
outC = pd.DataFrame({
    "nr": np.arange(1, N + 1),
    "województwo": rng.choice(["zachodniopomorskie", "wielkopolskie", "mazowieckie", "śląskie", "łódzkie"], N),
    "wydatki_zł": [f"{v:.2f}".replace(".", ",") for v in rng.lognormal(6.2, 0.6, N)],
})
for c, v in cols.items():
    s = pd.Series(v.astype(str))
    s[rng.random(N) < 0.01] = "nie wiem"
    outC[c] = s.values
outC.to_csv(os.path.join(OUT, "klienci_cp1250.csv"), sep=";", index=False, encoding="cp1250")
KEY["C"]["n"] = N
KEY["C"]["traps"] = {"jakość_4": "ładunek krzyżowy 0,30 na zadowolenie", "zadowolenie_3": "ładunek krzyżowy 0,30 na lojalność"}


def _r(o):
    if isinstance(o, dict):
        return {k: _r(v) for k, v in o.items()}
    if isinstance(o, (float, np.floating)):
        return round(float(o), 3)
    return o


json.dump(_r(KEY), open(os.path.join(OUT, "klucz_wartosci.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("zapisano:", sorted(os.listdir(OUT)))
