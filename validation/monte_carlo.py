"""Monte Carlo recovery study: a work-engagement model from human-resource management.

Population (standardized, linear): autonomy (AUT) -> work engagement (ZAA) -> burnout (WYP) -> turnover
intention (ROT), with direct paths AUT -> WYP and ZAA -> ROT. Each construct has 3-4 indicators with
standardized loadings .65-.85, discretized into 7-point Likert categories (symmetric thresholds), i.e. the
data a survey in management research typically produces.

For every replication the script fits the full SEM in SEMplex (ML and MLM) and the compare-approaches
module for ROT ~ WYP + ZAA, and records the standardized estimates, their standard errors and whether the
95% Wald interval covers the population value. Run from the repository root:
    python validation/monte_carlo.py [replications]          (default 500 per sample size)
Writes validation/results/monte_carlo_raw.csv and monte_carlo_summary.csv.
"""
import os
import sys
import time

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "public", "engine"))
from semplex import sem as S  # noqa: E402
from semplex.bridge import estimate_all  # noqa: E402

RES = os.path.join(ROOT, "validation", "results")
os.makedirs(RES, exist_ok=True)
REPS = int(sys.argv[1]) if len(sys.argv) > 1 else 500
SIZES = (150, 300, 600)
SEED = 20261017

TRUE = {"ZAA~AUT": 0.50, "WYP~ZAA": -0.45, "WYP~AUT": -0.15, "ROT~WYP": 0.40, "ROT~ZAA": -0.20}
TRUE["ind"] = TRUE["WYP~ZAA"] * TRUE["ROT~WYP"]
LOADS = {"AUT": [.80, .75, .72, .68], "ZAA": [.82, .78, .74, .70], "WYP": [.80, .76, .72, .65], "ROT": [.85, .80, .75]}
SCALES = {f: [f"{f}{i + 1}" for i in range(len(l))] for f, l in LOADS.items()}
MODEL = "\n".join(f"{f} =~ " + " + ".join(it) for f, it in SCALES.items()) + """
ZAA ~ AUT
WYP ~ a*ZAA + AUT
ROT ~ b*WYP + ZAA
ind := a*b"""
CUTS = np.linspace(-1.8, 1.8, 6) * 0.85


def latent(n, rng):
    AUT = rng.standard_normal(n)
    ZAA = 0.50 * AUT + np.sqrt(0.75) * rng.standard_normal(n)
    WYP = -0.45 * ZAA - 0.15 * AUT
    WYP = WYP + np.sqrt(1 - (0.45 ** 2 + 0.15 ** 2 + 2 * 0.45 * 0.15 * 0.50)) * rng.standard_normal(n)
    cov_wz = -0.45 - 0.15 * 0.50
    ROT = 0.40 * WYP - 0.20 * ZAA
    ROT = ROT + np.sqrt(1 - (0.16 + 0.04 + 2 * 0.40 * -0.20 * cov_wz)) * rng.standard_normal(n)
    return {"AUT": AUT, "ZAA": ZAA, "WYP": WYP, "ROT": ROT}


def sample(n, rng):
    L = latent(n, rng)
    cols = {}
    for f, lams in LOADS.items():
        for name, lam in zip(SCALES[f], lams):
            x = lam * L[f] + np.sqrt(1 - lam ** 2) * rng.standard_normal(n)
            cols[name] = np.digitize(x, CUTS) + 1
    return pd.DataFrame(cols).astype(float)


def one(df):
    out = []
    for est in ("ML", "MLM"):
        f = S.fit_model(MODEL, data=df, estimator=est)
        if not f.converged:
            out.append({"estimator": est, "converged": False})
            continue
        tab = {f"{p['lhs']}~{p['rhs']}": p for p in S.param_table(f) if p["op"] == "~"}
        rec = {"estimator": est, "converged": True, "cfi": f.fit.get("cfi_scaled", f.fit["cfi"]),
               "rmsea": f.fit.get("rmsea_scaled", f.fit["rmsea"])}
        for k in TRUE:
            if k == "ind":
                d = f.defined[0]
                e, se = d["std"], d["std_se"]
            else:
                e, se = tab[k]["std"], tab[k]["std_se"]
            rec[f"{k}|est"] = e
            rec[f"{k}|se"] = se
            rec[f"{k}|cover"] = float(abs(e - TRUE[k]) <= 1.959964 * se)
        out.append(rec)
    pt, _, _ = estimate_all(df, SCALES, "ROT", ["WYP", "ZAA"])
    ap = {"estimator": "approaches", "converged": True}
    for key in ("sum", "fscore", "croon", "single", "sam", "esem", "sem"):
        ap[f"ROT~WYP|{key}"] = float(pt[key][0])
        ap[f"ROT~ZAA|{key}"] = float(pt[key][1])
    out.append(ap)
    return out


def main():
    rng = np.random.default_rng(SEED)
    rows = []
    t0 = time.time()
    for n in SIZES:
        for r in range(REPS):
            df = sample(n, rng)
            try:
                for rec in one(df):
                    rows.append({"n": n, "rep": r, **rec})
            except Exception as e:  # recorded, not hidden
                rows.append({"n": n, "rep": r, "estimator": "error", "converged": False, "error": str(e)[:200]})
            if r % 50 == 0:
                print(f"n={n} rep={r} {time.time() - t0:.0f}s", flush=True)
    raw = pd.DataFrame(rows)
    raw.to_csv(os.path.join(RES, "monte_carlo_raw.csv"), index=False)

    summ = []
    for (n, est), g in raw[raw["estimator"].isin(["ML", "MLM"])].groupby(["n", "estimator"]):
        ok = g[g["converged"] == True]  # noqa: E712
        for k, tv in TRUE.items():
            e = ok[f"{k}|est"]
            summ.append({"n": n, "method": f"SEM {est}", "parameter": k, "true": tv, "mean": e.mean(), "bias": e.mean() - tv,
                         "rel_bias": (e.mean() - tv) / tv, "emp_sd": e.std(ddof=1), "mean_se": ok[f"{k}|se"].mean(),
                         "se_ratio": ok[f"{k}|se"].mean() / e.std(ddof=1), "coverage": ok[f"{k}|cover"].mean(),
                         "rmse": float(np.sqrt(((e - tv) ** 2).mean())), "converged": len(ok), "reps": len(g)})
    ap = raw[raw["estimator"] == "approaches"]
    for n, g in ap.groupby("n"):
        for k in ("ROT~WYP", "ROT~ZAA"):
            for key in ("sum", "fscore", "croon", "single", "sam", "esem", "sem"):
                e = g[f"{k}|{key}"].dropna()
                tv = TRUE[k]
                summ.append({"n": n, "method": key, "parameter": k, "true": tv, "mean": e.mean(), "bias": e.mean() - tv,
                             "rel_bias": (e.mean() - tv) / tv, "emp_sd": e.std(ddof=1),
                             "rmse": float(np.sqrt(((e - tv) ** 2).mean())), "converged": len(e), "reps": len(g)})
    pd.DataFrame(summ).to_csv(os.path.join(RES, "monte_carlo_summary.csv"), index=False)
    print(f"done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
