"""Second illustrative example: organizational identification survey (Bergami and Bagozzi, 2000; data from cSEM 0.7.1).
Pre-specified model (Henseler 2021 tutorial, without the single-indicator gender composite): OrgIden ~ OrgPres; AffLove ~ OrgPres + OrgIden.
Nominated relation for the approach comparison: AffLove regressed on OrgPres and OrgIden (500 resamples, seed 1).
Run from the repository root: python validation/revision/second_example/second_example.py"""
import json, os, sys, time
import numpy as np, pandas as pd
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "public", "engine"))
import semplex
from semplex import sem as S, bridge as B, measure as M
R = int(os.environ.get("SX_R", 500))
dat = pd.read_csv(os.path.join(ROOT, "validation", "data", "bergami_bagozzi2000.csv"))
SC = {"OrgPres": [f"cei{i}" for i in range(1, 9)], "OrgIden": [f"ma{i}" for i in range(1, 7)], "AffLove": ["orgcmt1", "orgcmt2", "orgcmt3", "orgcmt7"]}
items = [i for v in SC.values() for i in v]
D = dat[items].astype(float)
meas = "\n".join(f"{k} =~ " + " + ".join(v) for k, v in SC.items())
model = meas + "\nOrgIden ~ OrgPres\nAffLove ~ OrgPres + OrgIden"
f = S.fit_model(model, data=D, estimator="MLM")
pt = S.param_table(f)
out = {"engine": semplex.__version__, "n": int(len(D)), "R": R, "fit": {k: float(v) for k, v in f.fit.items() if isinstance(v, (int, float))},
       "heywood": bool(getattr(f, "heywood", False)), "paths": {r["lhs"] + "~" + r["rhs"]: {"std": r["std"], "lo": r.get("std_lo"), "hi": r.get("std_hi")} for r in pt if r["op"] == "~"}}
out["alpha"] = {k: float(M.cronbach_alpha(D[v].to_numpy())) for k, v in SC.items()}
H = M.htmt_matrix(D, SC) if True else None
out["htmt"] = H.tolist() if hasattr(H, "tolist") else H
t = time.time()
J = B.CompareJob(D, SC, "AffLove", ["OrgPres", "OrgIden"], R=R, seed=1)
while not J.step(50): pass
out["compare_seconds"] = round(time.time() - t, 1)
for xi, x in enumerate(["OrgPres", "OrgIden"]):
    res = J.result(xi)
    out["compare_" + x] = [{"id": r["id"], "label": r["label"], "est": r["est"], "lo": r["lo"], "hi": r["hi"], "n_valid": r["n_valid"], "point_valid": r["point_valid"], "ci_available": r["ci_available"]} for r in res["rows"]]
    out["reasons_" + x] = res.get("reasons")
    out["pred_r"] = res.get("pred_r", J.extra.get("pred_r"))
clean = lambda o: {k: clean(v) for k, v in o.items()} if isinstance(o, dict) else [clean(v) for v in o] if isinstance(o, (list, tuple)) else (None if isinstance(o, float) and not np.isfinite(o) else (float(o) if isinstance(o, (np.floating, np.integer)) else o))
json.dump(clean(out), open(os.path.join(HERE, "second_example_results.json"), "w"), indent=1)
print("ok", out["compare_seconds"])
