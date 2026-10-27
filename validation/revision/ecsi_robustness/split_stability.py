import json, os, sys, time
import numpy as np, pandas as pd
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "public", "engine"))
import semplex
import semplex.api as API
from semplex import sem as S, measure as M
DATA = os.path.join(ROOT, "validation", "data", "ecsi.csv")
SC = {"IMAG": [f"imag{i}" for i in range(1, 6)], "EXPE": [f"expe{i}" for i in range(1, 6)], "QUAL": [f"qual{i}" for i in range(1, 6)],
      "VAL": [f"val{i}" for i in range(1, 5)], "SAT": [f"sat{i}" for i in range(1, 5)], "LOY": [f"loy{i}" for i in range(1, 5)]}
ITEMS = [i for v in SC.values() for i in v]
MEAS = "\n".join(f"{k} =~ " + " + ".join(v) for k, v in SC.items())
PAIRS = "\n".join(f"expe{k} ~~ qual{k}" for k in range(1, 6))


def call(fn, **kw):
    r = json.loads(API.call(fn, json.dumps(kw)))
    if not r["ok"]:
        raise RuntimeError(f"{fn}: {r['message']}")
    return r["result"]


def setup(zero_missing=False):
    sn = call("sniff", filename="ecsi.csv", path=DATA)
    call("import_data", columns=sn["columns"], missing_codes=list(sn["missing_codes"]) + (["0"] if zero_missing else []))
    call("set_scales", scales=SC, names={k: k for k in SC})

"""Review item 7: stability of the seeded 125/125 EFA/CFA split of the ECSI data over many seeds (0 as a response).
For each seed: factor numbers from the nine retention criteria and the weighted suggestion (efa_run on the EFA half,
parallel-analysis seed fixed at 1), Tucker congruence of the six-factor EFA with the seed-1 solution (factors matched
by the Hungarian algorithm), the MLM fit of the six-factor CFA on the CFA half and its six largest modification indices.
Run from the repository root: python validation/revision/ecsi_robustness/split_stability.py   (SPLIT_SEEDS, default 200)"""
from scipy.optimize import linear_sum_assignment
N_SEEDS = int(os.environ.get("SPLIT_SEEDS", 200))
setup()
out_path = os.path.join(HERE, "split_stability.csv")
rows, ref = [], None
t0 = time.time()


def congruence(A, B):
    num = A.T @ B
    den = np.sqrt(np.outer((A ** 2).sum(0), (B ** 2).sum(0)))
    C = num / den
    r, c = linear_sum_assignment(-np.abs(C))
    return np.abs(C[r, c])


for seed in range(1, N_SEEDS + 1):
    call("split", seed=seed)
    e = call("efa_run", items=ITEMS, part="efa", seed=1)
    e6 = call("efa_run", items=ITEMS, part="efa", seed=1, k=6)
    L6 = np.array(e6["loadings"], float)
    if ref is None:
        ref = L6
    phi = congruence(ref, L6)
    f = call("fit", syntax=MEAS, estimator="MLM", part="cfa", mi=True)
    mi = sorted(f["mi"], key=lambda m: -m["mi"])[:6]
    is_pair = lambda m: m["op"] == "~~" and {m["lhs"][:4], m["rhs"][:4]} == {"expe", "qual"} and m["lhs"][-1] == m["rhs"][-1]
    row = {"seed": seed, "suggestion": e["nf"]["consensus"], **{f"k_{c['id']}": c["k"] for c in e["nf"]["criteria"]},
           "tucker_min": float(phi.min()), "tucker_mean": float(phi.mean()),
           "cfi_scaled": f["fit"].get("cfi_scaled"), "rmsea_scaled": f["fit"].get("rmsea_scaled"), "srmr": f["fit"].get("srmr"),
           "cfa_admissible": not f["heywood"], "n_pairs_top6": int(sum(is_pair(m) for m in mi)), "top6": "; ".join(f"{m['lhs']}{m['op']}{m['rhs']}" for m in mi)}
    rows.append(row)
    if seed % 10 == 0 or seed == N_SEEDS:
        pd.DataFrame(rows).to_csv(out_path, index=False)
        print(seed, round(time.time() - t0), flush=True)
df = pd.DataFrame(rows)
summ = {"engine": semplex.__version__, "n_seeds": len(df), "seconds": round(time.time() - t0, 1),
        "suggestion_counts": df["suggestion"].value_counts().sort_index().to_dict(),
        "share_suggestion_2": float((df["suggestion"] == 2).mean()),
        "criteria_ranges": {c: [int(df[c].min()), int(df[c].median()), int(df[c].max())] for c in df.columns if c.startswith("k_")},
        "tucker_min": {"median": float(df.tucker_min.median()), "q25": float(df.tucker_min.quantile(.25)), "q75": float(df.tucker_min.quantile(.75)), "min": float(df.tucker_min.min())},
        "cfi_scaled": {"median": float(df.cfi_scaled.median()), "q25": float(df.cfi_scaled.quantile(.25)), "q75": float(df.cfi_scaled.quantile(.75)), "min": float(df.cfi_scaled.min()), "max": float(df.cfi_scaled.max())},
        "rmsea_scaled": {"median": float(df.rmsea_scaled.median()), "min": float(df.rmsea_scaled.min()), "max": float(df.rmsea_scaled.max())},
        "srmr": {"median": float(df.srmr.median()), "min": float(df.srmr.min()), "max": float(df.srmr.max())},
        "share_cfa_admissible": float(df.cfa_admissible.mean()),
        "n_pairs_top6_counts": df["n_pairs_top6"].value_counts().sort_index().to_dict(),
        "share_pairs_ge5": float((df["n_pairs_top6"] >= 5).mean()), "share_pairs_ge3": float((df["n_pairs_top6"] >= 3).mean())}
json.dump(summ, open(os.path.join(HERE, "split_stability_summary.json"), "w"), indent=1, default=float)
print(json.dumps(summ, default=float)[:1500])
