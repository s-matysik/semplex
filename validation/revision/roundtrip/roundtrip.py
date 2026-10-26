"""Round-trip test of SEMplex code export (review item 9).

For each scenario the script (1) runs the analysis through the same JSON API the browser worker calls,
(2) writes the analysis CSV exactly as the app's "download analysis data" button (api.analysis_csv),
(3) generates the Python and lavaan scripts with the unmodified codeSnippets() template from src/lib/model.js,
(4) runs both scripts as separate processes in a clean folder (Python: CPython with the engine on PYTHONPATH;
R: Rscript with lavaan), and (5) compares their results with the values shown in the app.
The exported scripts are run unchanged; for R, lines that write parameterEstimates/standardizedSolution/fitMeasures
to JSON are APPENDED after the exported code (the printed summary is not parsed).
Run from the repository root:  python validation/revision/roundtrip/roundtrip.py
"""
import ast
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.join(ROOT, "public", "engine")
sys.path.insert(0, ENGINE)
import semplex  # noqa: E402
import semplex.api as API  # noqa: E402

NODE = os.environ.get("SEMPLEX_NODE", "node")
RSCRIPT = os.environ.get("SEMPLEX_RSCRIPT", "Rscript")
DATA = os.path.join(ROOT, "validation", "data", "ecsi.csv")
SCALES = {"IMAG": [f"imag{i}" for i in range(1, 6)], "EXPE": [f"expe{i}" for i in range(1, 6)],
          "QUAL": [f"qual{i}" for i in range(1, 6)], "VAL": [f"val{i}" for i in range(1, 5)],
          "SAT": [f"sat{i}" for i in range(1, 5)], "LOY": [f"loy{i}" for i in range(1, 5)]}
MEAS = "\n".join(f"{k} =~ " + " + ".join(v) for k, v in SCALES.items())
PAIRS = "\n".join(f"expe{k} ~~ qual{k}" for k in range(1, 6))
STRUCT = "EXPE ~ IMAG\nQUAL ~ EXPE\nVAL ~ EXPE + QUAL\nSAT ~ IMAG + EXPE + QUAL + VAL\nLOY ~ IMAG + SAT"
SMALL = "QUAL =~ qual1 + qual2 + qual3 + qual4 + qual5\nVAL =~ val1 + val2 + val3 + val4\nSAT =~ sat1 + sat2 + sat3 + sat4"

SCENARIOS = [
    {"id": "A_cfa_split_mlm", "zero_missing": False, "changes": [], "split": 1, "part": "cfa", "kind": "cfa",
     "estimator": "MLM", "syntax": MEAS + "\n" + PAIRS},
    {"id": "B_sem_full_mlm", "zero_missing": False, "changes": [], "split": None, "part": "all", "kind": "sem",
     "estimator": "MLM", "syntax": MEAS + "\n" + PAIRS + "\n" + STRUCT},
    {"id": "C_cfa_changes_ml", "zero_missing": False, "split": None, "part": "all", "kind": "cfa", "estimator": "ML",
     "changes": [{"kind": "reverse", "var": "qual5", "lo": 0, "hi": 10}, {"kind": "exclude", "rows": list(range(0, 40, 4))}],
     "syntax": SMALL},
    {"id": "D_cfa_zero_missing_ml", "zero_missing": True, "changes": [], "split": None, "part": "all", "kind": "cfa",
     "estimator": "ML", "syntax": SMALL},
]
R_EXTRACT = """
## ---- appended by roundtrip.py (not part of the export): write results as JSON
pe <- parameterEstimates(fit, standardized = TRUE)
fm <- fitMeasures(fit)
jsonlite::write_json(list(pe = pe, fm = as.list(fm)), "lavaan_out.json", digits = NA, auto_unbox = TRUE)
"""


def call(fn, **kw):
    r = json.loads(API.call(fn, json.dumps(kw)))
    if not r["ok"]:
        raise RuntimeError(f"{fn}: {r['message']}")
    return r["result"]


def key(r):
    a, b = r["lhs"], r["rhs"]
    if r["op"] == "~~" and a > b:
        a, b = b, a
    return (a, r["op"], b)


def setup(sc):
    sn = call("sniff", filename="ecsi.csv", path=DATA)
    codes = list(sn["missing_codes"]) + (["0"] if sc["zero_missing"] else [])
    call("import_data", columns=sn["columns"], missing_codes=codes)
    call("set_scales", scales=SCALES, names={k: k for k in SCALES})
    if sc["changes"]:
        call("set_changes", changes=sc["changes"])
    if sc["split"] is not None:
        call("split", seed=sc["split"])


def run_scenario(sc):
    d = os.path.join(HERE, "out", sc["id"])
    os.makedirs(d, exist_ok=True)
    setup(sc)
    app = call("fit", syntax=sc["syntax"], estimator=sc["estimator"], part=sc["part"], mi=True)
    exp = call("analysis_csv", syntax=sc["syntax"], part=sc["part"])
    with open(os.path.join(d, "semplex_dane_analityczne.csv"), "w", encoding="utf-8", newline="") as fh:
        fh.write(exp["csv"])
    with open(os.path.join(d, "args.json"), "w", encoding="utf-8") as fh:
        json.dump({"syntax": sc["syntax"], "opts": {"estimator": sc["estimator"], "part": None if sc["part"] == "all" else sc["part"],
                                                     "seed": sc["split"] or 1, "kind": sc["kind"], "version": semplex.__version__}}, fh)
    sn = json.loads(subprocess.run([NODE, os.path.join(HERE, "gen_snippets.mjs"), os.path.join(d, "args.json")],
                                   capture_output=True, text=True, encoding="utf-8", check=True).stdout)
    with open(os.path.join(d, "analysis.py"), "w", encoding="utf-8") as fh:
        fh.write(sn["python"])
    with open(os.path.join(d, "analysis.R"), "w", encoding="utf-8") as fh:
        fh.write(sn["lavaan"] + R_EXTRACT)
    # --- exported Python, separate process
    env = dict(os.environ, PYTHONPATH=ENGINE, PYTHONIOENCODING="utf-8")
    pr = subprocess.run([sys.executable, "analysis.py"], cwd=d, capture_output=True, text=True, encoding="utf-8", env=env, timeout=600)
    if pr.returncode:
        raise RuntimeError("exported Python failed: " + pr.stderr[-800:])
    lines = pr.stdout.strip().splitlines()
    py_fit = ast.literal_eval(re.sub(r"np\.float64\(([^)]*)\)", r"\1", lines[0]).replace("nan", "None").replace("inf", "None"))
    py_par = {}
    for ln in lines[1:]:
        p = ln.split()
        if len(p) == 5:
            py_par[key({"lhs": p[0], "op": p[1], "rhs": p[2]})] = (float(p[3]), float(p[4]))
    # --- exported lavaan, separate process
    rr = subprocess.run([RSCRIPT, "analysis.R"], cwd=d, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900)
    if rr.returncode:
        raise RuntimeError("exported R failed: " + rr.stderr[-800:])
    lav = json.load(open(os.path.join(d, "lavaan_out.json"), encoding="utf-8"))
    pe = lav["pe"]
    lav_par = {}
    for row in pe:  # jsonlite writes data frames row-wise
        if row["op"] in ("=~", "~", "~~"):
            lav_par[key(row)] = (row["est"], row.get("se"), row["std.all"])
    fm = lav["fm"]
    # --- compare
    app_par = {key(r): r for r in app["params"] if r["op"] in ("=~", "~", "~~")}
    res = {"id": sc["id"], "n_app": app["n"], "n_csv": exp["n"], "csv_steps": exp["steps"], "n_params": len(app_par)}
    # (1) exported data reproduce the analysed rows
    res["rows_match"] = exp["n"] == app["n"]
    # (2) Python export: printed values (rounded to 3 decimals) vs app
    dp = [abs(round(app_par[k]["est"], 3) - v[0]) for k, v in py_par.items() if k in app_par]
    ds = [abs(round(app_par[k]["std"], 3) - v[1]) for k, v in py_par.items() if k in app_par]
    res["python"] = {"n_matched": len(dp), "n_missing": len(set(app_par) - set(py_par)), "max_abs_diff_est": max(dp), "max_abs_diff_std": max(ds),
                     "fit_max_abs_diff": max(abs(app["fit"][k] - py_fit[k]) for k in ("chi2", "cfi", "tli", "rmsea", "srmr") if py_fit.get(k) is not None)}
    # (3) lavaan export vs app (full precision)
    common = [k for k in app_par if k in lav_par]
    nd = lambda a, b: abs(a - b) / max(1.0, abs(b))
    res["lavaan"] = {"n_matched": len(common), "n_missing_in_lavaan": len(set(app_par) - set(lav_par)),
                     "max_d_est": max(nd(app_par[k]["est"], lav_par[k][0]) for k in common),
                     "max_d_std": max(nd(app_par[k]["std"], lav_par[k][2]) for k in common),
                     "max_d_se": max(nd(app_par[k]["se"], lav_par[k][1]) for k in common if app_par[k].get("se") is not None and lav_par[k][1] is not None)}
    scaled = sc["estimator"] == "MLM"
    pairs = [("chi2", "chisq"), ("df", "df"), ("cfi", "cfi"), ("tli", "tli"), ("rmsea", "rmsea"), ("srmr", "srmr")]
    if scaled:
        pairs += [("chi2_scaled", "chisq.scaled"), ("cfi_scaled", "cfi.scaled"), ("tli_scaled", "tli.scaled"), ("rmsea_scaled", "rmsea.scaled")]
    res["lavaan"]["fit"] = {a: [app["fit"][a], fm[b]] for a, b in pairs}
    res["lavaan"]["max_d_fit"] = max(nd(app["fit"][a], fm[b]) for a, b in pairs)
    return res


def main():
    out = [run_scenario(sc) for sc in SCENARIOS]
    with open(os.path.join(HERE, "roundtrip_results.json"), "w", encoding="utf-8") as fh:
        json.dump({"engine_version": semplex.__version__, "scenarios": out}, fh, indent=1, default=float)
    for r in out:
        print(r["id"], r["n_app"], r["rows_match"], {k: r["python"][k] for k in ("max_abs_diff_est", "max_abs_diff_std", "fit_max_abs_diff")},
              {k: r["lavaan"][k] for k in ("n_missing_in_lavaan", "max_d_est", "max_d_std", "max_d_se", "max_d_fit")})


if __name__ == "__main__":
    main()
