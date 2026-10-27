"""Review item 1, step 1: SEMplex estimates of the four approaches on ECSI, for the point estimate and for
R = 500 bootstrap draws (seed 1) generated exactly as CompareJob does (np.random.default_rng(1).integers(0, n, n)).
Writes models.json (scales, models), indices_<model>.csv (one row per draw, 0-based row indices) and semplex_<model>.csv.
Run from the repository root: python validation/revision/four_approaches/export_semplex.py
"""
import json, os, sys
import numpy as np, pandas as pd
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "public", "engine"))
import semplex
from semplex import bridge
SC = {"IMAG": [f"imag{i}" for i in range(1, 6)], "EXPE": [f"expe{i}" for i in range(1, 6)], "QUAL": [f"qual{i}" for i in range(1, 6)],
      "VAL": [f"val{i}" for i in range(1, 5)], "SAT": [f"sat{i}" for i in range(1, 5)], "LOY": [f"loy{i}" for i in range(1, 5)]}
MODELS = {"M1_SAT_QUAL_VAL": ("SAT", ["QUAL", "VAL"]), "M2_LOY_SAT": ("LOY", ["SAT"]), "M3_LOY_ALL": ("LOY", ["IMAG", "EXPE", "QUAL", "VAL", "SAT"])}
APPS = ["fscore", "croon", "single", "esem"]
R, SEED = int(os.environ.get("FA_R", 500)), 1
R_BY_MODEL = {"M3_LOY_ALL": int(os.environ.get("FA_R3", 100))}  # the six-construct model is slow (EXPE-QUAL r = 0.99)
dat = pd.read_csv(os.path.join(ROOT, "validation", "data", "ecsi.csv"))
json.dump({"scales": SC, "models": {k: {"y": y, "xs": xs, "R": R_BY_MODEL.get(k, R)} for k, (y, xs) in MODELS.items()}, "R": R, "seed": SEED, "engine": semplex.__version__},
          open(os.path.join(HERE, "models.json"), "w"), indent=1)

def run(D, y, xs, cache=None, capture=None):
    orig = bridge._beta_from_cov
    if capture is not None:
        def cap(C, ypos, xpos):
            d = np.sqrt(np.diag(C)); capture.append((C / np.outer(d, d)).tolist()); return orig(C, ypos, xpos)
        bridge._beta_from_cov = cap
    try:
        return bridge.estimate_all(D, SC, y, xs, cache)
    finally:
        bridge._beta_from_cov = orig

for name, (y, xs) in MODELS.items():
    items = [it for f in [*xs, y] for it in SC[f]]
    D = dat[items].dropna().reset_index(drop=True); n = len(D)
    caps = []
    b0, ex0, cache = run(D, y, xs, capture=caps)
    # captured order of _beta_from_cov calls: sum, fscore, croon, sam, esem
    point = {"beta": {a: list(map(float, b0[a])) for a in APPS}, "valid": {a: bool(ex0["valid"][a]) for a in APPS},
             "latent_corr": {"fscore": caps[1], "croon": caps[2], "esem": caps[4]}, "alpha": ex0.get("alpha"), "n": n}
    json.dump(point, open(os.path.join(HERE, f"semplex_point_{name}.json"), "w"), indent=1)
    rng = np.random.default_rng(SEED); idx_rows, rows = [], []
    for r in range(R_BY_MODEL.get(name, R)):
        idx = rng.integers(0, n, n); idx_rows.append(idx)
        b, ex, _ = bridge.estimate_all(D.iloc[idx].reset_index(drop=True), SC, y, xs, dict(cache))
        row = {"draw": r + 1}
        for a in APPS:
            row[f"{a}_valid"] = bool(ex["valid"][a]); row[f"{a}_why"] = ex["why"][a]
            for j, x in enumerate(xs): row[f"{a}_{x}"] = float(b[a][j])
        rows.append(row)
        if (r + 1) % 25 == 0:
            pd.DataFrame(rows).to_csv(os.path.join(HERE, f"semplex_{name}.csv"), index=False)
            np.savetxt(os.path.join(HERE, f"indices_{name}.csv"), np.array(idx_rows), fmt="%d", delimiter=",")
    np.savetxt(os.path.join(HERE, f"indices_{name}.csv"), np.array(idx_rows), fmt="%d", delimiter=",")
    pd.DataFrame(rows).to_csv(os.path.join(HERE, f"semplex_{name}.csv"), index=False)
    print(name, n, "done", flush=True)
