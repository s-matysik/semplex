"""Compare SEMplex with lavaan, semTools and psych on the ECSI customer-satisfaction data.

Prerequisites: Rscript validation/lavaan_reference.R and Rscript validation/lavaan_definitions.R (write validation/data/ecsi.csv and
validation/results/lavaan_reference.json). Run from the repository root:
    python validation/semplex_vs_lavaan.py
Writes validation/results/agreement.csv (one row per compared quantity) and agreement_summary.json.
"""
import json
import os
import sys

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "public", "engine"))
from semplex import efa as E, measure as M, sem as S  # noqa: E402

RES = os.path.join(ROOT, "validation", "results")
ref = json.load(open(os.path.join(RES, "lavaan_reference.json"), encoding="utf-8"))
dat = pd.read_csv(os.path.join(ROOT, "validation", "data", "ecsi.csv"))

MEAS = """IMAG =~ imag1 + imag2 + imag3 + imag4 + imag5
EXPE =~ expe1 + expe2 + expe3 + expe4 + expe5
QUAL =~ qual1 + qual2 + qual3 + qual4 + qual5
VAL  =~ val1 + val2 + val3 + val4
SAT  =~ sat1 + sat2 + sat3 + sat4
LOY  =~ loy1 + loy2 + loy3 + loy4"""
STRUCT = """EXPE ~ IMAG
QUAL ~ EXPE
VAL  ~ EXPE + q*QUAL
SAT  ~ IMAG + EXPE + QUAL + v*VAL
LOY  ~ IMAG + SAT
ind := q*v"""
SCALES = {"IMAG": [f"imag{i}" for i in range(1, 6)], "EXPE": [f"expe{i}" for i in range(1, 6)],
          "QUAL": [f"qual{i}" for i in range(1, 6)], "VAL": [f"val{i}" for i in range(1, 5)],
          "SAT": [f"sat{i}" for i in range(1, 5)], "LOY": [f"loy{i}" for i in range(1, 5)]}
rows = []
MISSING = []  # reference parameters without a SEMplex counterpart (must stay empty)


def add(block, quantity, semplex, lavaan_value, kind):
    rows.append({"block": block, "quantity": quantity, "kind": kind, "semplex": float(semplex), "reference": float(lavaan_value),
                 "abs_diff": abs(float(semplex) - float(lavaan_value))})


FIT_MAP = {"chi2": "chisq", "df": "df", "cfi": "cfi", "tli": "tli", "rmsea": "rmsea", "rmsea_lo": "rmsea.ci.lower",
           "rmsea_hi": "rmsea.ci.upper", "srmr": "srmr", "aic": "aic", "bic": "bic", "loglik": "logl"}
FIT_MAP_S = {"chi2_scaled": "chisq.scaled", "scaling": "chisq.scaling.factor", "cfi_scaled": "cfi.scaled",
             "tli_scaled": "tli.scaled", "rmsea_scaled": "rmsea.scaled"}

for name, syntax in (("cfa", MEAS), ("sem", MEAS + "\n" + STRUCT)):
    for est in ("ML", "MLM"):
        r = ref["fits"][f"{name}_{est}"]
        f = S.fit_model(syntax, data=dat, estimator=est, mi=(est == "ML"))
        assert f.converged, (name, est)
        block = f"ECSI {name.upper()} {est}"
        for a, b in FIT_MAP.items():
            if b in r["fit"]:
                add(block, a, f.fit[a], r["fit"][b], "fit")
        if est == "MLM":
            for a, b in FIT_MAP_S.items():
                if b in r["fit"] and a in f.fit:
                    add(block, a, f.fit[a], r["fit"][b], "fit")
        mine = {(p["lhs"], p["op"], p["rhs"]): p for p in S.param_table(f)}
        for d in f.defined:
            mine[(d["name"], ":=", d["expr"].replace(" ", ""))] = d
        for p in r["params"]:
            key = (p["lhs"], p["op"], p["rhs"].replace(" ", ""))
            m = mine.get(key) or (mine.get((p["rhs"], p["op"], p["lhs"])) if p["op"] == "~~" else None)
            if m is None:
                MISSING.append((block, p["lhs"], p["op"], p["rhs"]))
                continue
            q = f"{p['lhs']} {p['op']} {p['rhs']}"
            add(block, q + " | est", m["est"], p["est"], "estimate")
            add(block, q + " | std", m["std"], p["est.std"], "std estimate")
            if p.get("se") is not None and m.get("se") is not None and np.isfinite(m["se"]):
                add(block, q + " | se", m["se"], p["se"], "standard error")
            # standardized SE and 95% CI bounds (lavaan::standardizedSolution, delta method); rows with
            # se.std = 0 are parameters fixed after standardization (e.g. latent variances = 1)
            if p.get("se.std") is not None and p["se.std"] > 1e-10 and np.isfinite(m.get("std_se", np.nan)):
                add(block, q + " | std se", m["std_se"], p["se.std"], "standardized SE / CI")
                if "std_lo" in m:
                    zq = 1.959963984540054
                    add(block, q + " | std ci.lower", m["std_lo"], p["est.std"] - zq * p["se.std"], "standardized SE / CI")
                    add(block, q + " | std ci.upper", m["std_hi"], p["est.std"] + zq * p["se.std"], "standardized SE / CI")
        if est == "ML":
            ref_mi = {(x["lhs"], x["op"], x["rhs"]): x["mi"] for x in r["mi"]}
            my_mi = {(x["lhs"], x["op"], x["rhs"]): x["mi"] for x in f.mi}
            for k, v in ref_mi.items():
                mk = my_mi.get(k) or my_mi.get((k[2], k[1], k[0]))
                if mk is not None:
                    add(block, f"MI {' '.join(k)}", mk, v, "modification index")
            if name == "sem":
                for lvn, v in ref["fits"]["sem_ML"]["r2"].items():
                    if lvn in f.r2:
                        add(block, f"R2 {lvn}", f.r2[lvn], v, "R-squared")

# reliability and validity. Primary comparison: reference values computed in R under the definitions
# SEMplex implements (lavaan_definitions.R). Secondary rows (kind "... (semTools default)") document how far
# the semTools defaults, which use different formulas, sit from SEMplex; they are not agreement checks.
dref = json.load(open(os.path.join(RES, "lavaan_definitions.json"), encoding="utf-8"))
fc = S.fit_model(MEAS, data=dat)
val = M.validity_from_cfa(fc, SCALES, dat)
for row in val["rows"]:
    add("Reliability/validity", f"AVE {row['factor']}", row["ave"], dref["ave_fornell_larcker"][row["factor"]], "AVE")
    add("Definitions", f"AVE {row['factor']}", row["ave"], ref["ave"][row["factor"]], "AVE (semTools default)")
for f_ in SCALES:
    om = M.one_factor(dat, SCALES[f_])["omega"]
    add("Reliability/validity", f"omega {f_}", om, dref["omega_onefactor"][f_], "omega")
    add("Definitions", f"omega {f_}", om, ref["omega"][f_], "omega (semTools default)")
    add("Reliability/validity", f"alpha {f_}", M.cronbach_alpha(dat[SCALES[f_]].to_numpy(float)), ref["alpha"][f_], "alpha")
H = np.array(dref["htmt_original"])
H2 = np.array(ref["htmt"])
names = list(SCALES)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        add("Reliability/validity", f"HTMT {names[i]}-{names[j]}", val["htmt"][i][j], H[i][j], "HTMT")
        add("Definitions", f"HTMT {names[i]}-{names[j]}", val["htmt"][i][j], H2[i][j], "HTMT (semTools default HTMT2)")

# Satorra-Bentler (2001) scaled difference test (lavaan::anova) for nested CFA models
import semplex.api as API  # noqa: E402
_csv = os.path.join(ROOT, "validation", "data", "ecsi.csv")
_sn = API.sniff("ecsi.csv", path=_csv)
API.import_data(_sn["columns"], _sn["missing_codes"])
PAIRS = "\n".join(f"expe{k} ~~ qual{k}" for k in range(1, 6))
cmpm = API.compare_models([{"id": "m1", "syntax": MEAS}, {"id": "m2", "syntax": MEAS + "\n" + PAIRS}], part="all", estimator="MLM")
tst = cmpm["tests"][0]
add("Model comparison", "SB2001 scaled delta chi2", tst["dchi2"], dref["sb2001"]["dchi2"], "fit")
add("Model comparison", "SB2001 p-value", tst["p"], dref["sb2001"]["p"], "p-value")

# EFA (psych): KMO, minres + oblimin loadings for six factors
items = list(dat.columns)
X = dat[items].to_numpy(float)
Rm = np.corrcoef(X, rowvar=False)
add("EFA", "KMO overall", E.kmo(Rm)[0], ref["kmo"], "KMO")
mine = E.efa(Rm, 6, "minres", "oblimin")["loadings"]
L_ref = np.array(ref["efa6_loadings"])
mine = E._match(np.asarray(mine), L_ref)
for i, it in enumerate(items):
    for j in range(6):
        add("EFA", f"loading {it} F{j + 1}", mine[i, j], L_ref[i, j], "EFA loading")
nf = E.n_factors(Rm, len(dat), seed=1)
pa_k = [c["k"] for c in nf["criteria"] if c["id"] == "pa"][0]
add("EFA", "parallel analysis: number of factors", pa_k, dref["parallel_ncomp_pc95"], "count")
add("Definitions", "parallel analysis: number of factors", pa_k, ref["parallel_nfact"], "count (psych fa='fa' default)")

# compare-approaches case SAT ~ QUAL + VAL: sum scores, SAM (local) and full SEM
from semplex.bridge import estimate_all  # noqa: E402
D3 = dat[SCALES["QUAL"] + SCALES["VAL"] + SCALES["SAT"]]
pt, extra, _ = estimate_all(D3, SCALES, "SAT", ["QUAL", "VAL"])
if True:
    add("Approaches", "sum scores: SAT~QUAL", pt["sum"][0], ref["sum_std"]["scale(QUAL)"], "approach")
    add("Approaches", "sum scores: SAT~VAL", pt["sum"][1], ref["sum_std"]["scale(VAL)"], "approach")
for key, refkey in (("sam", "sam_std"), ("sem", "sem_cmp_std")):
    for i, x in enumerate(("QUAL", "VAL")):
        rv = [r_["est.std"] for r_ in ref[refkey] if r_["rhs"] == x][0]
        add("Approaches", f"{key.upper()}: SAT~{x}", pt[key][i], rv, "approach")

df = pd.DataFrame(rows)
df["scaled_diff"] = df["abs_diff"] / np.maximum(1.0, df["reference"].abs())
EXPECTED_KINDS = {"fit", "estimate", "std estimate", "standard error", "standardized SE / CI", "modification index",
                  "R-squared", "EFA loading", "HTMT", "omega", "alpha", "AVE", "KMO", "approach", "p-value", "count"}
missing_kinds = EXPECTED_KINDS - set(df["kind"])
TOL = 1e-4
chk_ = df[(df["block"] != "Definitions") & (df["kind"] != "p-value")]
bad = chk_[chk_["scaled_diff"] > TOL]
if MISSING or missing_kinds or len(bad):
    print("unmatched reference parameters:", MISSING[:10], "missing kinds:", sorted(missing_kinds))
    print(bad[["block", "quantity", "semplex", "reference", "scaled_diff"]].head(20).to_string(index=False))
    raise SystemExit("validation failed: incomplete comparison or difference above tolerance " + str(TOL))
df.to_csv(os.path.join(RES, "agreement.csv"), index=False)
chk = df[df["block"] != "Definitions"]
# one metric throughout, as in the paper: d = |SEMplex - reference| / max(1, |reference|)
summ = chk.groupby("kind").agg(count=("scaled_diff", "size"), max_scaled=("scaled_diff", "max"),
                               median_scaled=("scaled_diff", "median"), max_abs=("abs_diff", "max")).reset_index()
worst = chk.sort_values("scaled_diff", ascending=False)
out = {"n_quantities": int(len(chk)), "metric": "|SEMplex - reference| / max(1, |reference|)", "tolerance": TOL,
       "max_scaled_diff": float(chk["scaled_diff"].max()), "max_abs_diff": float(chk["abs_diff"].max()),
       "unmatched_reference_parameters": len(MISSING),
       "definition_rows": df[df["block"] == "Definitions"].to_dict(orient="records"), "by_kind": summ.to_dict(orient="records"),
       "worst": worst.head(8).to_dict(orient="records"),
       "environment": {"python": sys.version.split()[0], "numpy": np.__version__, "pandas": pd.__version__,
                       "scipy": __import__("scipy").__version__}}
json.dump(out, open(os.path.join(RES, "agreement_summary.json"), "w"), indent=1)
print(summ.to_string(index=False))
print("worst:\n", worst.head(8)[["block", "quantity", "semplex", "reference", "scaled_diff"]].to_string(index=False))
