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

"""Review item 6: discriminant validity of the ECSI constructs (main coding, 0 as a response).
HTMT with 95% percentile bootstrap intervals (B draws, seed 1), latent correlations of the six-factor MLM CFA with
the five expe_k ~~ qual_k covariances (delta-method intervals), and alternative measurement models with merged
constructs (fit and structural paths). Cross-checks against semTools/lavaan are in discriminant_check.R.
Run from the repository root: python validation/revision/ecsi_robustness/discriminant.py"""
B = int(os.environ.get("HTMT_B", 1000))
setup()
dat = pd.read_csv(DATA)[ITEMS]
pairs = [(a, b) for i, a in enumerate(SC) for b in list(SC)[i + 1:]]


def htmt_pairs(df):
    H = M.htmt_matrix(df, SC)
    if isinstance(H, dict) and "matrix" in H:
        names, mat = H.get("names", list(SC)), np.array(H["matrix"], float)
    elif isinstance(H, dict):
        return {p: float(H[p[0]][p[1]]) for p in pairs}
    else:
        names, mat = list(SC), np.array(H, float)
    ix = {n: i for i, n in enumerate(names)}
    return {p: float(mat[ix[p[0]], ix[p[1]]]) for p in pairs}


t0 = time.time()
point = htmt_pairs(dat)
rng = np.random.default_rng(1)
draws = []
for b in range(B):
    idx = rng.integers(0, len(dat), len(dat))
    draws.append(htmt_pairs(dat.iloc[idx].reset_index(drop=True)))
htmt_rows = []
for p in pairs:
    v = np.array([d[p] for d in draws])
    htmt_rows.append({"pair": f"{p[0]}-{p[1]}", "htmt": point[p], "lo": float(np.percentile(v, 2.5)), "hi": float(np.percentile(v, 97.5)),
                      "p_ge_090": float(np.mean(v >= 0.90)), "p_ge_085": float(np.mean(v >= 0.85))})
pd.DataFrame(htmt_rows).to_csv(os.path.join(HERE, "htmt_bootstrap.csv"), index=False)

base = S.fit_model(MEAS + "\n" + PAIRS, data=dat, estimator="MLM")
lc = [{"pair": f"{r['lhs']}-{r['rhs']}", "r": r["std"], "lo": r.get("std_lo"), "hi": r.get("std_hi")}
      for r in S.param_table(base) if r["op"] == "~~" and r["lhs"] in SC and r["rhs"] in SC and r["lhs"] != r["rhs"]]
pd.DataFrame(lc).to_csv(os.path.join(HERE, "latent_correlations.csv"), index=False)

MERGE = {
    "i_six_factors": ({}, "EXPE ~ IMAG\nQUAL ~ EXPE\nVAL ~ EXPE + QUAL\nSAT ~ IMAG + EXPE + QUAL + VAL\nLOY ~ IMAG + SAT"),
    "ii_EXPE_QUAL": ({"EQ": ["EXPE", "QUAL"]}, "EQ ~ IMAG\nVAL ~ EQ\nSAT ~ IMAG + EQ + VAL\nLOY ~ IMAG + SAT"),
    "iii_VAL_SAT": ({"VS": ["VAL", "SAT"]}, "EXPE ~ IMAG\nQUAL ~ EXPE\nVS ~ IMAG + EXPE + QUAL\nLOY ~ IMAG + VS"),
    "iv_both": ({"EQ": ["EXPE", "QUAL"], "VS": ["VAL", "SAT"]}, "EQ ~ IMAG\nVS ~ IMAG + EQ\nLOY ~ IMAG + VS"),
}
FITK = ["chi2", "df", "chi2_scaled", "cfi_scaled", "tli_scaled", "rmsea_scaled", "srmr", "aic", "bic"]
mods = []
syntaxes = {}
for name, (merge, struct) in MERGE.items():
    sc = {k: v for k, v in SC.items() if not any(k in grp for grp in merge.values())}
    for new, grp in merge.items():
        sc[new] = [i for g in grp for i in SC[g]]
    order = [k for k in ("IMAG", "EXPE", "QUAL", "EQ", "VAL", "SAT", "VS", "LOY") if k in sc]
    meas = "\n".join(f"{k} =~ " + " + ".join(sc[k]) for k in order)
    syntaxes[name] = {"cfa": meas + "\n" + PAIRS, "sem": meas + "\n" + PAIRS + "\n" + struct}
    fc = S.fit_model(syntaxes[name]["cfa"], data=dat, estimator="MLM")  # se needed for scaled statistics
    fs = S.fit_model(syntaxes[name]["sem"], data=dat, estimator="MLM")
    paths = {f"{r['lhs']}~{r['rhs']}": {"std": r["std"], "lo": r.get("std_lo"), "hi": r.get("std_hi")} for r in S.param_table(fs) if r["op"] == "~"}
    mods.append({"model": name, **{f"cfa_{k}": fc.fit.get(k) for k in FITK}, "cfa_heywood": [h["kind"] for h in fc.heywood],
                 **{f"sem_{k}": fs.fit.get(k) for k in FITK}, "sem_heywood": [h["kind"] for h in fs.heywood], "paths": paths, "r2_LOY": fs.r2.get("LOY")})
json.dump({"engine": semplex.__version__, "B": B, "seconds": round(time.time() - t0, 1), "htmt": htmt_rows, "latent_corr": lc, "models": mods, "syntax": syntaxes},
          open(os.path.join(HERE, "discriminant_results.json"), "w"), indent=1, default=float)
print("done", round(time.time() - t0, 1))
