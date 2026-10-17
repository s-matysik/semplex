"""Reproduce every number of the ECSI case study (Section 3 of the SEMplex paper) through the same engine API the
browser application calls.

Prerequisite: Rscript validation/lavaan_reference.R  (writes validation/data/ecsi.csv from cSEM 0.7.1).
Run from the repository root:
    python validation/ecsi_case_study.py            # main analysis (0 treated as a response)
    python validation/ecsi_case_study.py --zero-missing   # sensitivity analysis: 0 treated as missing
Writes validation/results/case_study[_zero_missing].json and case_compare[_zero_missing].json.

The distributed data contain integer responses from 0 to 10. Neither the cSEM nor the plspm documentation states
whether 0 is a substantive response or a code for "don't know"/missing, so the analysis is reported both ways.
"""
import hashlib
import json
import os
import platform
import sys
import time

import numpy as np
import pandas as pd
import scipy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "public", "engine"))
import semplex  # noqa: E402
import semplex.api as API  # noqa: E402

RES = os.path.join(ROOT, "validation", "results")
DATA = os.path.join(ROOT, "validation", "data", "ecsi.csv")
ZERO_MISSING = "--zero-missing" in sys.argv
R_BOOT = int(os.environ.get("SEMPLEX_R_BOOT", "500"))
SEED = 1

SCALES = {"IMAG": [f"imag{i}" for i in range(1, 6)], "EXPE": [f"expe{i}" for i in range(1, 6)],
          "QUAL": [f"qual{i}" for i in range(1, 6)], "VAL": [f"val{i}" for i in range(1, 5)],
          "SAT": [f"sat{i}" for i in range(1, 5)], "LOY": [f"loy{i}" for i in range(1, 5)]}
MEAS = "\n".join(f"{k} =~ " + " + ".join(v) for k, v in SCALES.items())
PAIRS = "\n".join(f"expe{k} ~~ qual{k}" for k in range(1, 6))
STRUCT = "EXPE ~ IMAG\nQUAL ~ EXPE\nVAL ~ EXPE + QUAL\nSAT ~ IMAG + EXPE + QUAL + VAL\nLOY ~ IMAG + SAT"


def call(fn, **kw):
    r = json.loads(API.call(fn, json.dumps(kw)))
    if not r["ok"]:
        raise RuntimeError(f"{fn}: {r['message']}")
    return r["result"]


def job(kind, params, chunk=25, results=None):
    j = call("job_start", kind=kind, params=params)
    while not call("job_step", id=j["id"], chunk=chunk)["finished"]:
        pass
    out = [call("job_result", id=j["id"], **a) for a in (results or [{}])]
    call("job_drop", id=j["id"])
    return out


def fitsum(f):
    k = ("chi2", "chi2_scaled", "df", "pvalue_scaled", "cfi", "cfi_scaled", "tli_scaled", "rmsea", "rmsea_scaled",
         "rmsea_lo_scaled", "rmsea_hi_scaled", "srmr", "aic", "bic")
    return {x: f["fit"].get(x) for x in k if x in f["fit"]} | {"n": f["n"], "converged": f["converged"],
                                                             "heywood": f["heywood"]}


def paths(f):
    return {f"{p['lhs']}~{p['rhs']}": {"std": p["std"], "std_lo": p["std_lo"], "std_hi": p["std_hi"], "p": p["p"]}
            for p in f["params"] if p["op"] == "~"}


def main():
    t0 = time.time()
    out = {"zero_missing": ZERO_MISSING, "data_sha256": hashlib.sha256(open(DATA, "rb").read()).hexdigest()}
    raw = pd.read_csv(DATA)
    z = raw == 0
    out["data"] = {"n": int(len(raw)), "items": int(raw.shape[1]), "min": int(raw.min().min()), "max": int(raw.max().max()),
                   "zeros": int(z.values.sum()), "rows_with_zero": int(z.any(axis=1).sum())}

    sn = call("sniff", filename="ecsi.csv", path=DATA)
    codes = list(sn["missing_codes"]) + (["0"] if ZERO_MISSING else [])
    summ = call("import_data", columns=sn["columns"], missing_codes=codes)
    out["import"] = {"n": summ["n"], "missing_pct": summ.get("missing_pct"), "missing_codes": codes}
    call("set_scales", scales=SCALES, names={k: k for k in SCALES})

    cl = call("careless")
    out["screening"] = {"long_string_cut": cl.get("ls_cut"), "time_cut": cl.get("time_cut"),
                        "n_flagged_any": sum(1 for r in cl["rows"] if r["reasons"]),
                        "n_flagged_two_or_more": sum(1 for r in cl["rows"] if len(r["reasons"]) >= 2),
                        "by_reason": {}}
    for r in cl["rows"]:
        for reason in r["reasons"]:
            key = str(reason).split()[0] if isinstance(reason, str) else str(reason)
            out["screening"]["by_reason"][key] = out["screening"]["by_reason"].get(key, 0) + 1
    ds = call("descriptives")
    out["mardia"] = ds["mardia"]

    rel = call("reliability", part="all")
    out["alpha"] = {r["id"]: r["alpha"] for r in rel["scales"]}
    out["omega"] = {r["id"]: r["omega"] for r in rel["scales"]}

    sp = call("split", seed=SEED, strata=None)
    out["split"] = sp
    ef = call("efa_run", items=[i for v in SCALES.values() for i in v], part="efa")
    out["efa"] = {"n": ef["n"], "kmo": ef["kmo"] if not isinstance(ef["kmo"], dict) else ef["kmo"].get("overall"),
                  "criteria": {c["id"]: c["k"] for c in ef["nf"]["criteria"]}, "recommended": ef["nf"]["consensus"],
                  "support": ef["nf"].get("agree"), "n_criteria": len(ef["nf"]["criteria"])}

    m1 = call("fit", syntax=MEAS, estimator="MLM", part="cfa", mi=True)
    m2 = call("fit", syntax=MEAS + "\n" + PAIRS, estimator="MLM", part="cfa", mi=False)
    out["cfa_m1"] = fitsum(m1) | {"top_mi": [{k: x[k] for k in ("lhs", "op", "rhs", "mi")} for x in m1["mi"][:6]]}
    out["cfa_m2"] = fitsum(m2)
    cmp = call("compare_models", models=[{"id": "m1", "syntax": MEAS}, {"id": "m2", "syntax": MEAS + "\n" + PAIRS}],
               part="cfa", estimator="MLM")
    out["cfa_difference"] = cmp["tests"][0] if cmp["tests"] else {"skipped": cmp["skipped"]}
    relc = call("reliability", part="cfa")
    v = relc["validity"]
    names = [r["factor"] for r in v["rows"]]
    H = np.array(v["htmt"])
    out["htmt_cfa_half"] = {f"{names[i]}-{names[j]}": float(H[i][j]) for i in range(len(names)) for j in range(i + 1, len(names))}

    s0 = call("fit", syntax=MEAS + "\n" + STRUCT, estimator="MLM", part="all", mi=False)
    s1 = call("fit", syntax=MEAS + "\n" + PAIRS + "\n" + STRUCT, estimator="MLM", part="all", mi=False)
    out["sem_without_pairs"] = fitsum(s0) | {"paths": paths(s0), "collinearity": s0["collinearity"]}
    out["sem_with_pairs"] = fitsum(s1) | {"paths": paths(s1), "collinearity": s1["collinearity"], "r2": s1["r2"]}

    cq, cv = job("compare", {"y": "SAT", "xs": ["QUAL", "VAL"], "R": R_BOOT, "seed": SEED}, results=[{"xi": 0}, {"xi": 1}])
    (cl_,) = job("compare", {"y": "LOY", "xs": ["SAT"], "R": R_BOOT, "seed": SEED})
    comp = {"SAT_QUAL": cq, "SAT_VAL": cv, "LOY_SAT": cl_}
    suffix = "_zero_missing" if ZERO_MISSING else ""
    json.dump(comp, open(os.path.join(RES, f"case_compare{suffix}.json"), "w"), default=float, indent=1)
    out["compare_summary"] = {k: [{x: r[x] for x in ("id", "est", "lo", "hi", "n_valid", "rejected", "ci_available")} for r in c["rows"]]
                              for k, c in comp.items()}
    out["environment"] = {"semplex": semplex.__version__, "python": platform.python_version(), "numpy": np.__version__,
                          "scipy": scipy.__version__, "pandas": pd.__version__, "platform": platform.platform(),
                          "processor": platform.processor(), "bootstrap_R": R_BOOT, "seed": SEED,
                          "seconds": round(time.time() - t0, 1)}
    json.dump(out, open(os.path.join(RES, f"case_study{suffix}.json"), "w"), default=float, indent=1)
    print(f"written case_study{suffix}.json in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
