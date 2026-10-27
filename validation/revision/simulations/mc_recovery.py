import json, os, sys, time, itertools
import numpy as np, pandas as pd
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "public", "engine"))
B_X, B_Z = 0.30, 0.40
SC = {"X": [f"x{j}" for j in range(4)], "Z": [f"z{j}" for j in range(4)], "Y": [f"y{j}" for j in range(4)]}
APPS = ["sum", "fscore", "croon", "single", "sam", "esem", "sem"]
LOAD = {"low": [0.5, 0.6, 0.55, 0.6], "high": [0.7, 0.8, 0.75, 0.8]}
THR = {"4": [-1.0, 0.0, 1.0], "5": [-1.5, -0.5, 0.5, 1.5], "7": [-1.8, -1.1, -0.4, 0.4, 1.1, 1.8], "5skew": [-0.5, 0.2, 0.8, 1.5], "cont": None}


def generate(n, r, load, spec, cat, rng):
    """Latent X, Z standard normal with correlation r; Y = 0.30 X + 0.40 Z + e with Var(Y) = 1 (population standardized
    betas 0.30 and 0.40). Standardized indicators; under 'cross' the first Z indicator also loads 0.3 on X (omitted in the
    fitted models). Indicators are cut at fixed thresholds into ordered categories ('cont': left continuous)."""
    X = rng.standard_normal(n)
    Z = r * X + np.sqrt(1 - r * r) * rng.standard_normal(n)
    ve = 1 - (B_X ** 2 + B_Z ** 2 + 2 * B_X * B_Z * r)
    Y = B_X * X + B_Z * Z + np.sqrt(ve) * rng.standard_normal(n)
    lam = LOAD[load]
    cols = {}
    for name, eta in (("x", X), ("z", Z), ("y", Y)):
        for j in range(4):
            common = lam[j] * eta
            if spec == "cross" and name == "z" and j == 0:
                common = common + 0.3 * X
            cross = spec == "cross" and name == "z" and j == 0
            v_common = lam[j] ** 2 + (0.09 + 2 * 0.3 * lam[j] * r if cross else 0.0)  # population variance of the common part
            cols[f"{name}{j}"] = common + np.sqrt(max(1 - v_common, 0.05)) * rng.standard_normal(n)
    D = pd.DataFrame(cols)
    if THR[cat] is not None:
        D = D.apply(lambda c: np.digitize(c.to_numpy(), THR[cat]) + 1).astype(float)
    return D


def one(task):
    cond, rep, seed = task
    from semplex import bridge
    rng = np.random.default_rng(seed)
    D = generate(cond["n"], cond["r"], cond["load"], cond["spec"], cond["cat"], rng)
    row = {**cond, "rep": rep}
    try:
        b, ex, _ = bridge.estimate_all(D, SC, "Y", ["X", "Z"])
        for a in APPS:
            row[f"{a}_X"], row[f"{a}_Z"] = float(b[a][0]), float(b[a][1])
            row[f"{a}_valid"] = bool(ex["valid"][a])
        row["cfa_cfi"] = ex.get("cfa_fit", {}).get("cfi")
    except Exception as e:  # recorded, not hidden
        row["error"] = f"{type(e).__name__}: {e}"[:200]
    return row


if __name__ == "__main__":
    """Review item 3: recovery of the population standardized betas (0.30, 0.40) by the seven SEMplex approaches.
    Full factorial: specification (correct / omitted cross-loading 0.3) x loadings (0.5-0.6 / 0.7-0.8) x predictor
    correlation (0.3 / 0.8) x response format (continuous, 4, 5, 7 categories, skewed 5) x N (150 / 400)."""
    from multiprocessing import Pool
    REPS, W = int(os.environ.get("MC_REPS", 200)), int(os.environ.get("MC_WORKERS", 4))
    conds = [dict(spec=s, load=l, r=r, cat=c, n=n) for s, l, r, c, n in itertools.product(["correct", "cross"], ["low", "high"], [0.3, 0.8], ["cont", "4", "5", "7", "5skew"], [150, 400])]
    ss = np.random.SeedSequence(20261027)
    seeds = ss.generate_state(len(conds) * REPS)
    tasks = [(c, rep, int(seeds[i * REPS + rep])) for i, c in enumerate(conds) for rep in range(REPS)]
    t0 = time.time(); rows = []
    with Pool(W) as pool:
        for k, row in enumerate(pool.imap_unordered(one, tasks, chunksize=4)):
            rows.append(row)
            if (k + 1) % 400 == 0:
                pd.DataFrame(rows).to_csv(os.path.join(HERE, "mc_recovery_raw.csv"), index=False)
                print(k + 1, len(tasks), round(time.time() - t0), flush=True)
    raw = pd.DataFrame(rows); raw.to_csv(os.path.join(HERE, "mc_recovery_raw.csv"), index=False)
    keys = ["spec", "load", "r", "cat", "n"]; out = []
    for cond, g in raw.groupby(keys):
        for a in APPS:
            for x, true in (("X", B_X), ("Z", B_Z)):
                v = g[f"{a}_valid"].astype(bool); est = g.loc[v, f"{a}_{x}"].to_numpy(float)
                out.append({**dict(zip(keys, cond)), "approach": a, "param": x, "true": true, "reps": len(g), "admissible": float(v.mean()),
                            "mean": float(est.mean()) if len(est) else np.nan, "bias": float(est.mean() - true) if len(est) else np.nan,
                            "rel_bias": float((est.mean() - true) / true) if len(est) else np.nan,
                            "mcse_bias": float(est.std(ddof=1) / np.sqrt(len(est))) if len(est) > 1 else np.nan,
                            "rmse": float(np.sqrt(np.mean((est - true) ** 2))) if len(est) else np.nan})
    pd.DataFrame(out).to_csv(os.path.join(HERE, "mc_recovery_summary.csv"), index=False)
    print("done", round(time.time() - t0))
