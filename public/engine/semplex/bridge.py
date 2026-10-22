"""Most EFA – regresja – SEM: ten sam efekt strukturalny liczony kilkoma podejściami.

Podejścia: regresja na sumach (średnich) pozycji, regresja na wynikach czynnikowych (Thurstone),
korekta Croona, pojedynczy wskaźnik z korektą α, SAM lokalny (Rosseel i Loh, 2024),
ESEM (rotacja target; efekt z macierzy Φ przy nasyconej części strukturalnej) oraz pełny SEM.
Wszystkie β są standaryzowane. Przedziały: percentylowy bootstrap.
Licencja MIT.
"""
import math
import numpy as np

from . import sem as semmod
from . import efa as efamod
from .data import cronbach_alpha

APPROACHES = [
    ("sum", "Regresja na średnich pozycji", "obserwowalne · bez modelu błędu pomiaru"),
    ("fscore", "Wyniki czynnikowe (regresyjne)", "obserwowalne · wyniki z CFA"),
    ("croon", "Korekta Croona", "korekta · Croon (2002)"),
    ("single", "Pojedynczy wskaźnik z korektą α", "korekta · wariancja błędu = (1 − α)·σ²"),
    ("sam", "SAM (lokalny)", "latentne · najpierw pomiar, potem struktura"),
    ("esem", "Przybliżenie ESEM", "rotacja target rozwiązania ML · ładunki krzyżowe dopuszczone"),
    ("sem", "SEM łączny", "latentne · pomiar i struktura szacowane razem w modelu zredukowanym"),
]


def _beta_from_cov(C, ypos, xpos):
    """Standaryzowane współczynniki regresji y na x z macierzy kowariancji/korelacji."""
    d = np.sqrt(np.diag(C))
    Rm = C / np.outer(d, d)
    Rxx = Rm[np.ix_(xpos, xpos)]
    rxy = Rm[np.ix_(xpos, [ypos])].ravel()
    b = np.linalg.solve(Rxx, rxy)
    return b


def _cfa_syntax(scales, factors):
    return "\n".join(f"{f} =~ " + " + ".join(scales[f]) for f in factors)


def _thurstone(X, S, Lam, Phi, Theta):
    Sig = Lam @ Phi @ Lam.T + Theta
    A = Phi @ Lam.T @ np.linalg.inv(Sig)  # wagi wyników regresyjnych (k x p)
    return A


def _measurement(fit, factors, items):
    spec = fit.spec
    A, Sm = spec.matrices(fit.theta)
    Lam = np.zeros((len(items), len(factors)))
    for i, it in enumerate(items):
        for j, f in enumerate(factors):
            Lam[i, j] = A[spec.idx[it], spec.idx[f]]
    Theta = np.diag([Sm[spec.idx[it], spec.idx[it]] for it in items])
    for a in range(len(items)):
        for b in range(a + 1, len(items)):
            Theta[a, b] = Theta[b, a] = Sm[spec.idx[items[a]], spec.idx[items[b]]]
    Phi = Sm[np.ix_([spec.idx[f] for f in factors], [spec.idx[f] for f in factors])]
    return Lam, Phi, Theta


def _target_rotate(L, T):
    W = (T == 0).astype(float)
    vgq = lambda M: (np.sum((W * M) ** 2), 2 * W * W * M)
    return efamod._gpf_oblq(L, vgq)


def _pl(x, fmt):
    """Liczba w polskim zapisie (przecinek dziesiętny)."""
    return format(x, fmt).replace('.', ',')


def estimate_all(D, scales, y, xs, theta_cache=None):
    """D: DataFrame kompletnych przypadków. Zwraca słownik id → β (lista dla predyktorów) oraz dodatki."""
    factors = [*xs, y]
    items = [it for f in factors for it in scales[f]]
    X = D[items].to_numpy(float)
    S = np.cov(X, rowvar=False, bias=True)
    out, extra = {}, {}
    cache = theta_cache if theta_cache is not None else {}
    ypos, xpos = len(factors) - 1, list(range(len(xs)))

    # 1. sumy (średnie) pozycji
    M = np.column_stack([D[scales[f]].mean(axis=1).to_numpy() for f in factors])
    out["sum"] = _beta_from_cov(np.cov(M, rowvar=False), ypos, xpos)

    # CFA wspólna (do wyników czynnikowych i Croona)
    cfa = semmod.fit_model(_cfa_syntax(scales, factors), data=D[items], se=False, theta0=cache.get("cfa"))
    cache["cfa"] = cfa.theta
    Lam, Phi, Theta = _measurement(cfa, factors, items)
    A = _thurstone(X, S, Lam, Phi, Theta)
    Fs = (X - X.mean(0)) @ A.T
    out["fscore"] = _beta_from_cov(np.cov(Fs, rowvar=False), ypos, xpos)
    # 3. Croon: Cov(η) = (AΛ)^-1 (Cov(F) − AΘA') (AΛ)^-T
    AL = A @ Lam
    covF = A @ S @ A.T
    Ceta = np.linalg.solve(AL, np.linalg.solve(AL, (covF - A @ Theta @ A.T)).T).T
    out["croon"] = _beta_from_cov(Ceta, ypos, xpos)
    extra["cfa_fit"] = cfa.fit
    dphi = np.sqrt(np.clip(np.diag(Phi), 1e-12, None))
    Rphi = Phi / np.outer(dphi, dphi)
    extra["pred_r"] = float(max((abs(Rphi[i, j]) for i in xpos for j in xpos if i < j), default=0.0))
    extra["cfa_converged"] = cfa.converged
    cfa_ok = bool(cfa.converged and not cfa.heywood)
    valid = {"sum": True, "fscore": cfa_ok, "croon": cfa_ok and bool(np.all(np.diag(Ceta) > 0))}
    why = {"fscore": None if cfa_ok else ("cfa_nonconverged" if not cfa.converged else "cfa_inadmissible"),
           "croon": None if valid["croon"] else ("cfa_nonconverged" if not cfa.converged else "cfa_inadmissible" if cfa.heywood else "croon_nonpositive")}

    # 4. pojedynczy wskaźnik z korektą α
    parts, alphas = [], {}
    Ds = D.copy()
    for f in factors:
        a = cronbach_alpha(D[scales[f]].to_numpy(float))
        alphas[f] = a
        Ds[f"_s_{f}"] = D[scales[f]].mean(axis=1)
    lines = []
    for f in factors:
        v = Ds[f"_s_{f}"].var(ddof=0)
        lines.append(f"{f} =~ 1*_s_{f}")
        lines.append(f"_s_{f} ~~ {max((1 - alphas[f]) * v, 1e-6):.10f}*_s_{f}")
    lines.append(f"{y} ~ " + " + ".join(xs))
    single = semmod.fit_model("\n".join(lines), data=Ds[[f"_s_{f}" for f in factors]], se=False, theta0=cache.get("single"))
    cache["single"] = single.theta
    out["single"] = np.array([_std_path(single, y, x) for x in xs])
    valid["single"] = bool(single.converged and not single.heywood)
    why["single"] = None if valid["single"] else ("nonconverged" if not single.converged else "inadmissible")
    extra["alpha"] = alphas

    # 5. SAM lokalny: osobne bloki pomiarowe, M = (Λ'Θ⁻¹Λ)⁻¹Λ'Θ⁻¹
    k, p = len(factors), len(items)
    blk_flags = []
    Mmat = np.zeros((k, p))
    ThetaB = np.zeros((p, p))
    start = 0
    for j, f in enumerate(factors):
        it = scales[f]
        n_it = len(it)
        syn = f"{f} =~ " + (" + ".join(it) if n_it > 2 else f"1*{it[0]} + 1*{it[1]}")
        blk = semmod.fit_model(syn, data=D[it], se=False, theta0=cache.get(("blk", f)))
        cache[("blk", f)] = blk.theta
        blk_flags.append(bool(blk.converged and not blk.heywood))
        Lb, _, Tb = _measurement(blk, [f], it)
        Tinv = np.linalg.inv(Tb)
        Mb = np.linalg.solve(Lb.T @ Tinv @ Lb, Lb.T @ Tinv)
        Mmat[j, start:start + n_it] = Mb.ravel()
        ThetaB[start:start + n_it, start:start + n_it] = Tb
        start += n_it
    Veta = Mmat @ (S - ThetaB) @ Mmat.T
    out["sam"] = _beta_from_cov(Veta, ypos, xpos)
    valid["sam"] = bool(all(blk_flags) and np.all(np.diag(Veta) > 0))
    why["sam"] = None if valid["sam"] else ("block_nonconverged_or_inadmissible" if not all(blk_flags) else "latent_cov_nonpositive")

    # 6. ESEM: EFA (ML) z rotacją target zgodną ze skalami; Φ → β
    Rm = np.corrcoef(X, rowvar=False)
    L0, _ = efamod.extract(Rm, k, "ml")
    Tg = np.zeros((p, k))
    pos = 0
    for j, f in enumerate(factors):
        Tg[pos:pos + len(scales[f]), j] = 1
        pos += len(scales[f])
    # rotacja target z zerami poza skalą: kolumna j odpowiada czynnikowi j celu; ustalamy tylko znaki
    Lr, PhiE = _target_rotate(L0, Tg)
    sg = np.sign((Lr * Tg).sum(0))
    sg[sg == 0] = 1
    Lr2 = Lr * sg
    PhiM = PhiE * np.outer(sg, sg)
    out["esem"] = _beta_from_cov(PhiM, ypos, xpos)
    cross = np.abs(Lr2) * (Tg == 0)
    extra["esem_max_cross"] = float(cross.max()) if cross.size else 0.0
    valid["esem"] = bool(np.all(np.isfinite(out["esem"])) and np.all(np.diag(PhiM) > 0))
    why["esem"] = None if valid["esem"] else "esem_invalid"

    # 7. pełny SEM
    syn = _cfa_syntax(scales, factors) + f"\n{y} ~ " + " + ".join(xs)
    full = semmod.fit_model(syn, data=D[items], se=False, theta0=cache.get("sem"))
    cache["sem"] = full.theta
    out["sem"] = np.array([_std_path(full, y, x) for x in xs])
    extra["sem_fit"] = full.fit
    extra["sem_converged"] = full.converged
    extra["syntax"] = syn
    valid["sem"] = bool(full.converged and not full.heywood)
    why["sem"] = None if valid["sem"] else ("nonconverged" if not full.converged else "inadmissible")
    for key in out:
        if not np.all(np.isfinite(out[key])):
            valid[key], why[key] = False, why.get(key) or "nonfinite"
    extra["valid"], extra["why"] = valid, why
    return out, extra, cache


def _std_path(fit, y, x):
    for i, prm in enumerate(fit.spec.params):
        if prm["op"] == "~" and prm["lhs"] == y and prm["rhs"] == x:
            return float(fit.std[i])
    return float("nan")


MIN_VALID_DRAWS = 50
MIN_VALID_SHARE = 0.80


class CompareJob:
    def __init__(self, df, scales, y, xs, R=200, seed=1):
        self.factors = [*xs, y]
        self.items = [it for f in self.factors for it in scales[f]]
        self.D = df[self.items].dropna().reset_index(drop=True)
        self.scales, self.y, self.xs, self.R, self.seed = scales, y, xs, R, seed
        self.point, self.extra, self.cache = estimate_all(self.D, scales, y, xs)
        self.rng = np.random.default_rng(seed)
        self.draws = {k: [] for k, _, _ in APPROACHES}
        self.rejected = {k: {} for k, _, _ in APPROACHES}
        self.errors = 0
        self.done = 0

    def step(self, chunk=10):
        n = len(self.D)
        for _ in range(min(chunk, self.R - self.done)):
            idx = self.rng.integers(0, n, n)
            try:
                b, ex, _ = estimate_all(self.D.iloc[idx].reset_index(drop=True), self.scales, self.y, self.xs, dict(self.cache))
                for k in self.draws:
                    if ex["valid"].get(k, False):
                        self.draws[k].append(b[k])
                    else:
                        r = ex["why"].get(k) or "invalid"
                        self.rejected[k][r] = self.rejected[k].get(r, 0) + 1
            except Exception:
                # a failure of the shared computation invalidates the draw for every approach
                self.errors += 1
                for k in self.draws:
                    self.rejected[k]["error"] = self.rejected[k].get("error", 0) + 1
            self.done += 1
        return self.done >= self.R

    def result(self, xi=0):
        rows = []
        for key, label, sub in APPROACHES:
            est = float(self.point[key][xi])
            d = np.array([v[xi] for v in self.draws[key]]) if self.draws[key] else np.array([])
            d = d[np.isfinite(d)]
            n_valid = int(len(d))
            share = n_valid / self.done if self.done else 0.0
            # percentile CI only from enough admissible draws; flag when many draws were rejected
            ok = n_valid >= MIN_VALID_DRAWS and share >= MIN_VALID_SHARE
            lo, hi = (float(np.percentile(d, 2.5)), float(np.percentile(d, 97.5))) if ok else (float("nan"), float("nan"))
            se = float(d.std(ddof=1)) if ok else float("nan")
            rows.append({"id": key, "label": label, "sub": sub, "est": est, "lo": lo, "hi": hi, "se": se,
                         "point_valid": bool(self.extra["valid"].get(key, False)), "n_valid": n_valid, "valid_share": share,
                         "rejected": dict(self.rejected[key]), "ci_available": ok, "low_valid_share": share < 0.95})
        ref = rows[-1]
        for r in rows:
            r["delta"] = (r["est"] - ref["est"]) / ref["est"] if abs(ref["est"]) > 1e-9 else float("nan")
            r["corrects_error"] = r["id"] not in ("sum", "fscore")
            r["cross_loadings"] = r["id"] == "esem"
            r["agrees"] = bool(np.isfinite(ref["lo"]) and ref["lo"] <= r["est"] <= ref["hi"])
        g = {r["id"]: r["est"] for r in rows}
        spread = max(g.values()) - min(g.values())
        total = g["sem"] - g["sum"]
        steps = [
            # kolejne różnice między podejściami - opis, a nie zidentyfikowany rozkład obciążenia
            {"label": "Średnie pozycji", "value": g["sum"], "kind": "start"},
            {"label": "Pojedynczy wskaźnik − średnie", "value": g["single"] - g["sum"], "kind": "step"},
            {"label": "SAM − pojedynczy wskaźnik", "value": g["sam"] - g["single"], "kind": "step"},
            {"label": "SEM łączny − SAM", "value": g["sem"] - g["sam"], "kind": "step"},
            {"label": "SEM łączny", "value": g["sem"], "kind": "end"},
            {"label": "ESEM (przybliżenie) − SEM łączny", "value": g["esem"] - g["sem"], "kind": "aside"},
        ]
        # opisowy udział pierwszego kroku w różnicy średnie → SEM; poza [0, 1] nie ma interpretacji udziału
        share_me = (g["single"] - g["sum"]) / total if abs(total) > 1e-9 else float("nan")
        if not (0.0 <= share_me <= 1.0):
            share_me = float("nan")
        n = len(self.D)
        cfi = self.extra["cfa_fit"]["cfi"]
        if n < 300 or cfi < 0.90:
            rec = "sam"
            reasons = [f"Reguła heurystyczna (N < 300 lub CFI < 0,90): sugerujemy obejrzeć wynik SAM, który w lokalnej estymacji "
                       f"ogranicza przenoszenie błędnej specyfikacji jednej skali na ścieżki strukturalne. Tu N = {n}, CFI = {_pl(cfi, '.3f')}.",
                       "Sugestia nie zastępuje oceny modelu pomiarowego ani nie wskazuje wyniku „prawdziwego”."]
        elif abs(g["esem"] - g["sem"]) > 0.05 and self.extra.get("esem_max_cross", 0) >= 0.20:
            rec = "esem"
            reasons = [f"Reguła heurystyczna: przybliżenie ESEM różni się od SEM łącznego o {_pl(g['esem'] - g['sem'], '+.2f')}, a największy "
                       f"ładunek krzyżowy wynosi {_pl(self.extra['esem_max_cross'], '.2f')} - sprawdź, czy ładunki krzyżowe mają uzasadnienie merytoryczne."]
        else:
            rec = "sem"
            reasons = [f"Reguła heurystyczna: N = {n} ≥ 300 i CFI = {_pl(cfi, '.3f')} ≥ 0,90, a ładunki krzyżowe nie zmieniają wyniku - "
                       "punktem odniesienia jest SEM łączny. Oceń dopasowanie także innymi wskaźnikami."]
        pred_r = self.extra.get("pred_r", 0.0)
        collinear = pred_r >= 0.85
        if collinear:
            reasons = [f"Predyktory są bardzo silnie skorelowane na poziomie latentnym (r = {_pl(pred_r, '.2f')}). Efekty cząstkowe są niestabilne "
                       "i zależą od podejścia - ostrożnie interpretuj ich oddzielne wkłady. Łączenie konstruktów wymaga uzasadnienia teoretycznego, "
                       "a nie tylko wysokiej korelacji."] + reasons
        mean_alpha = float(np.mean(list(self.extra["alpha"].values())))
        bad = [r["label"] for r in rows if not r["ci_available"] or not r["point_valid"]]
        if bad:
            reasons = [f"Część podejść nie ma wiarygodnego przedziału (za mało dopuszczalnych losowań bootstrap lub niedopuszczalne "
                       f"rozwiązanie w próbie): {', '.join(bad)}."] + reasons
        return {"rows": rows, "spread": spread, "underestimate": rows[0]["delta"], "share_measurement": share_me,
                "rule": "heuristic", "errors": self.errors, "reduced_model": True,
                "agree": sum(r["agrees"] for r in rows), "waterfall": steps, "recommended": rec, "reasons": reasons,
                "n": n, "alpha": self.extra["alpha"], "mean_alpha": mean_alpha, "cfa_fit": self.extra["cfa_fit"],
                "sem_fit": self.extra["sem_fit"], "esem_max_cross": self.extra.get("esem_max_cross"), "R": self.R, "R_done": self.done,
                "R_ok": int(min(r["n_valid"] for r in rows)), "pred_r": pred_r, "collinear": collinear, "seed": self.seed, "y": self.y, "xs": self.xs, "x": self.xs[xi], "syntax": self.extra["syntax"]}
