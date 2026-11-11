# -*- coding: utf-8 -*-
"""Independent check of the zero-coding accounting and the item-mean results of the ECSI example.

This script does NOT import SEMplex: it recomputes, with NumPy and pandas only, the numbers reported in
Section 3.4 of the paper and in Supplementary Section S8.

Prerequisite: Rscript validation/lavaan_reference.R  (writes validation/data/ecsi.csv from cSEM 0.7.1).
Run from the repository root:
    python validation/reproduce_supplement.py
Writes validation/results/reproduce_supplement.json.
"""
import hashlib
import json
import os

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.environ.get("SEMPLEX_ECSI", os.path.join(ROOT, "validation", "data", "ecsi.csv"))
OUT = os.path.join(ROOT, "validation", "results", "reproduce_supplement.json")
R_BOOT, SEED = 1500, 1

SCALES = {"IMAG": [f"imag{i}" for i in range(1, 6)], "EXPE": [f"expe{i}" for i in range(1, 6)],
          "QUAL": [f"qual{i}" for i in range(1, 6)], "VAL": [f"val{i}" for i in range(1, 5)],
          "SAT": [f"sat{i}" for i in range(1, 5)], "LOY": [f"loy{i}" for i in range(1, 5)]}
# reduced models of the approach comparison: outcome and predictors (panels a and b of Figure 5 share one model)
MODELS = {"SAT~QUAL+VAL": ("SAT", ["QUAL", "VAL"]), "LOY~SAT": ("LOY", ["SAT"])}


def std_beta(y, X):
    """Standardized OLS coefficients of y on the columns of X (both standardized)."""
    ys = (y - y.mean()) / y.std(ddof=1)
    Xs = (X - X.mean(0)) / X.std(0, ddof=1)
    return np.linalg.lstsq(Xs, ys, rcond=None)[0]


def item_means(df, factors):
    return np.column_stack([df[SCALES[f]].to_numpy(float).mean(1) for f in factors])


def analyse(df, outcome, predictors, rng):
    """Point estimate and percentile interval of the item-mean coefficients."""
    items = [it for f in [*predictors, outcome] for it in SCALES[f]]
    d = df[items].dropna()
    M = item_means(d, [*predictors, outcome])
    y, X = M[:, -1], M[:, :-1]
    est = std_beta(y, X)
    draws = np.empty((R_BOOT, X.shape[1]))
    n = len(d)
    for r in range(R_BOOT):
        idx = rng.integers(0, n, n)
        draws[r] = std_beta(y[idx], X[idx])
    lo, hi = np.percentile(draws, 2.5, axis=0), np.percentile(draws, 97.5, axis=0)
    return {"n": int(n), "predictors": predictors,
            "est": [float(v) for v in est], "lo": [float(v) for v in lo], "hi": [float(v) for v in hi]}


def main():
    raw = open(DATA, "rb").read()
    df = pd.read_csv(DATA)
    zeros = int((df == 0).to_numpy().sum())
    rows_with_zero = int((df == 0).any(axis=1).sum())
    out = {"data": {"file": os.path.basename(DATA), "sha256": hashlib.sha256(raw).hexdigest(),
                    "n_rows": int(len(df)), "n_items": int(df.shape[1]),
                    "zero_responses": zeros, "respondents_using_zero": rows_with_zero},
           "complete_cases": {}, "item_means": {}}

    zero_missing = df.replace(0, np.nan)
    for panel, (outcome, predictors) in MODELS.items():
        items = [it for f in [*predictors, outcome] for it in SCALES[f]]
        out["complete_cases"][panel] = {"zero_as_response": int(len(df[items].dropna())),
                                        "zero_as_missing": int(len(zero_missing[items].dropna()))}
        out["item_means"][panel] = {
            "zero_as_response": analyse(df, outcome, predictors, np.random.default_rng(SEED)),
            "zero_as_missing": analyse(zero_missing, outcome, predictors, np.random.default_rng(SEED))}

    # matched cases: the same respondents under both codings isolate the recoding from the exclusion
    keep = ~(df == 0).any(axis=1)
    for panel, (outcome, predictors) in MODELS.items():
        out["item_means"][panel]["matched_cases"] = analyse(df[keep], outcome, predictors, np.random.default_rng(SEED))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), indent=1)
    print(json.dumps(out["data"]))
    for panel in MODELS:
        cc = out["complete_cases"][panel]
        im = out["item_means"][panel]
        print(panel, "N", cc["zero_as_response"], "->", cc["zero_as_missing"],
              "| beta", [round(v, 3) for v in im["zero_as_response"]["est"]],
              "->", [round(v, 3) for v in im["zero_as_missing"]["est"]],
              "| CI(0 as missing)", [(round(a, 3), round(b, 3)) for a, b in
                                     zip(im["zero_as_missing"]["lo"], im["zero_as_missing"]["hi"])])


if __name__ == "__main__":
    main()
