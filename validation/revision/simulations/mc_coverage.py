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
    cond, rep, seed, R = task
    from semplex import bridge
    rng = np.random.default_rng(seed)
    D = generate(cond["n"], cond["r"], "high", "correct", "5", rng)
    row = {**cond, "rep": rep}
    try:
        job = bridge.CompareJob(D, SC, "Y", ["X", "Z"], R=R, seed=int(seed % 2**31))
        while not job.step(25):
            pass
        for xi, (x, true) in enumerate((("X", B_X), ("Z", B_Z))):
            rows_ = {r_["id"]: r_ for r_ in job.result(xi)["rows"]}
            draws = {k: np.array([d_[xi] for d_ in job.draws[k]], float) for k in job.draws}
            for a in APPS:
                r_ = rows_[a]; d_ = draws[a]; d_ = d_[np.isfinite(d_)]
                row[f"{a}_{x}_est"] = r_["est"]; row[f"{a}_{x}_lo"] = r_["lo"]; row[f"{a}_{x}_hi"] = r_["hi"]
                row[f"{a}_{x}_nvalid"] = int(r_["n_valid"]); row[f"{a}_{x}_reported"] = bool(r_["ci_available"])
                lo_all, hi_all = (np.percentile(d_, 2.5), np.percentile(d_, 97.5)) if len(d_) >= 2 else (np.nan, np.nan)
                row[f"{a}_{x}_lo_all"], row[f"{a}_{x}_hi_all"] = float(lo_all), float(hi_all)
    except Exception as e:
        row["error"] = f"{type(e).__name__}: {e}"[:200]
    return row


if __name__ == "__main__":
    """Review item 2: coverage of the filtered 95% percentile bootstrap intervals of CompareJob (thresholds: >= 50
    admissible draws and >= 80% of attempted draws), with and without the thresholds. Correct model, loadings 0.7-0.8,
    5 symmetric categories; N in {150, 300} x predictor correlation in {0.3, 0.85}."""
    from multiprocessing import Pool
    REPS, R, W = int(os.environ.get("COV_REPS", 200)), int(os.environ.get("COV_R", 200)), int(os.environ.get("MC_WORKERS", 4))
    conds = [dict(n=n, r=r) for n in (150, 300) for r in (0.3, 0.85)]
    seeds = np.random.SeedSequence(20261028).generate_state(len(conds) * REPS)
    tasks = [(c, rep, int(seeds[i * REPS + rep]), R) for i, c in enumerate(conds) for rep in range(REPS)]
    t0 = time.time(); rows = []
    with Pool(W) as pool:
        for k, row in enumerate(pool.imap_unordered(one, tasks, chunksize=1)):
            rows.append(row)
            if (k + 1) % 20 == 0:
                pd.DataFrame(rows).to_csv(os.path.join(HERE, "mc_coverage_raw.csv"), index=False)
                print(k + 1, len(tasks), round(time.time() - t0), flush=True)
    raw = pd.DataFrame(rows); raw.to_csv(os.path.join(HERE, "mc_coverage_raw.csv"), index=False)
    out = []
    for (n, r), g in raw.groupby(["n", "r"]):
        for a in APPS:
            for x, true in (("X", B_X), ("Z", B_Z)):
                rep_ = g[f"{a}_{x}_reported"].astype(bool)
                cov_rep = ((g[f"{a}_{x}_lo"] <= true) & (true <= g[f"{a}_{x}_hi"]))[rep_]
                cov_all = (g[f"{a}_{x}_lo_all"] <= true) & (true <= g[f"{a}_{x}_hi_all"])
                out.append({"n": n, "r": r, "approach": a, "param": x, "reps": len(g), "share_reported": float(rep_.mean()),
                            "coverage_reported": float(cov_rep.mean()) if len(cov_rep) else np.nan,
                            "coverage_all_draws": float(cov_all.mean()), "coverage_if_unreported_counts_as_miss": float(((g[f"{a}_{x}_lo"] <= true) & (true <= g[f"{a}_{x}_hi"]) & rep_).mean()),
                            "mean_width": float((g[f"{a}_{x}_hi"] - g[f"{a}_{x}_lo"])[rep_].mean()) if rep_.any() else np.nan,
                            "mean_rejection_rate": float(1 - g[f"{a}_{x}_nvalid"].mean() / R), "mean_est": float(g[f"{a}_{x}_est"].mean())})
    pd.DataFrame(out).to_csv(os.path.join(HERE, "mc_coverage_summary.csv"), index=False)
    print("done", round(time.time() - t0))
