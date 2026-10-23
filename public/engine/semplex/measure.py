"""Descriptive statistics, correlations, Mardia's test, group comparisons, and reliability and validity
(α with Feldt CI, ω from single-factor CFA, item analysis, CR, AVE, MSV, HTMT, Fornell-Larcker).
MIT License.
"""
import math
import numpy as np
import pandas as pd
from scipy import stats

from . import sem as semmod
from .data import cronbach_alpha, describe_var


# --------------------------------------------------------------------------- opisowe
def correlations(df, vars_, method="pearson"):
    X = df[vars_]
    p = len(vars_)
    R = np.eye(p)
    P = np.zeros((p, p))
    for i in range(p):
        for j in range(i + 1, p):
            ok = X.iloc[:, i].notna() & X.iloc[:, j].notna()
            a, b = X.iloc[:, i][ok], X.iloc[:, j][ok]
            if ok.sum() < 4:
                r, pv = np.nan, np.nan
            elif method == "spearman":
                r, pv = stats.spearmanr(a, b)
            else:
                r, pv = stats.pearsonr(a, b)
            R[i, j] = R[j, i] = r
            P[i, j] = P[j, i] = pv
    return R, P


def mardia(X):
    X = X[~np.isnan(X).any(1)]
    n, p = X.shape
    D = X - X.mean(0)
    S = np.cov(X, rowvar=False, bias=True)
    G = D @ np.linalg.pinv(S) @ D.T
    b1 = (G ** 3).sum() / n ** 2
    b2 = (np.diag(G) ** 2).sum() / n
    skew = n * b1 / 6
    dfs = p * (p + 1) * (p + 2) / 6
    kz = (b2 - p * (p + 2)) / math.sqrt(8 * p * (p + 2) / n)
    return {"b1": float(b1), "skew_chi2": float(skew), "skew_df": float(dfs), "skew_p": float(stats.chi2.sf(skew, dfs)),
            "b2": float(b2), "kurt_z": float(kz), "kurt_p": float(2 * stats.norm.sf(abs(kz))), "n": int(n), "p": int(p)}


def hedges_g(a, b):
    na, nb = len(a), len(b)
    sp = math.sqrt(((na - 1) * a.var(ddof=1) + (nb - 1) * b.var(ddof=1)) / (na + nb - 2))
    d = (a.mean() - b.mean()) / sp if sp > 0 else 0.0
    J = 1 - 3 / (4 * (na + nb) - 9)
    g = d * J
    se = math.sqrt((na + nb) / (na * nb) + g ** 2 / (2 * (na + nb)))
    return g, g - 1.96 * se, g + 1.96 * se


def group_compare(df, var, group, labels=None):
    d = df[[var, group]].dropna()
    groups = sorted(d[group].unique())
    if len(groups) < 2:
        return None
    samples = [d[var][d[group] == g].to_numpy(float) for g in groups]
    names = [labels.get(str(int(g)) if float(g).is_integer() else str(g), str(g)) if labels else str(g) for g in groups]
    desc = [{"group": nm, "n": len(s), "mean": float(s.mean()), "sd": float(s.std(ddof=1))} for nm, s in zip(names, samples)]
    if len(groups) == 2:
        t = stats.ttest_ind(samples[0], samples[1], equal_var=False)
        g, lo, hi = hedges_g(samples[0], samples[1])
        df_w = t.df if hasattr(t, "df") else float("nan")
        return {"test": "welch", "t": float(t.statistic), "df": float(df_w), "p": float(t.pvalue), "g": g, "g_lo": lo, "g_hi": hi, "groups": desc}
    F, p = stats.f_oneway(*samples)
    allv = np.concatenate(samples)
    ssb = sum(len(s) * (s.mean() - allv.mean()) ** 2 for s in samples)
    sst = ((allv - allv.mean()) ** 2).sum()
    k, N = len(samples), len(allv)
    return {"test": "anova", "F": float(F), "df1": k - 1, "df2": N - k, "p": float(p), "eta2": float(ssb / sst), "groups": desc}


# --------------------------------------------------------------------------- reliability
def alpha_ci(alpha, n, k, level=0.95):
    a = (1 - level) / 2
    df1, df2 = n - 1, (n - 1) * (k - 1)
    lo = 1 - (1 - alpha) * stats.f.ppf(1 - a, df1, df2)
    hi = 1 - (1 - alpha) * stats.f.ppf(a, df1, df2)
    return float(lo), float(hi)


def one_factor(df, items):
    if len(items) < 2:
        return None
    if len(items) == 2:
        syn = f"F =~ l*{items[0]} + l*{items[1]}"
    else:
        syn = "F =~ " + " + ".join(items)
    f = semmod.fit_model(syn, data=df[items].dropna(), std_lv=True, se=False)
    lam, th = [], []
    for prm in f.spec.params:
        v = f.theta[prm["k"]] if prm["k"] is not None else prm["value"]
        if prm["op"] == "=~":
            lam.append(v)
        elif prm["lhs"] == prm["rhs"] and prm["lhs"] in items:
            th.append(v)
    sl = sum(lam)
    omega = sl ** 2 / (sl ** 2 + sum(th))
    std = [float(f.std[i]) for i, prm in enumerate(f.spec.params) if prm["op"] == "=~"]
    return {"omega": float(omega), "loadings": std, "fit": f.fit, "converged": f.converged}


def scale_reliability(df, items):
    X = df[items].dropna().to_numpy(float)
    n, k = X.shape
    a = cronbach_alpha(X)
    lo, hi = alpha_ci(a, n, k) if k >= 2 and n > 3 else (float("nan"), float("nan"))
    of = one_factor(df, items)
    rows = []
    tot = X.sum(1)
    for j, it in enumerate(items):
        rest = tot - X[:, j]
        r_ir = float(np.corrcoef(X[:, j], rest)[0, 1])
        rem = [x for x in items if x != it]
        a_del = cronbach_alpha(X[:, [i for i in range(k) if i != j]]) if k > 2 else float("nan")
        o_del = None
        if len(rem) >= 2:
            try:
                o_del = one_factor(df, rem)["omega"]
            except Exception:
                o_del = None
        d = describe_var(X[:, j])
        rows.append({"item": it, "r_ir": r_ir, "alpha_del": a_del, "omega_del": o_del, "loading": of["loadings"][j] if of else None,
                     "mean": d["mean"], "sd": d["sd"], "floor": d["floor"], "ceiling": d["ceiling"]})
    return {"items": items, "n": int(n), "k": int(k), "alpha": a, "alpha_lo": lo, "alpha_hi": hi,
            "omega": of["omega"] if of else float("nan"), "item_rows": rows}


def omega_bootstrap(df, items, R=300, seed=1, progress=None):
    rng = np.random.default_rng(seed)
    D = df[items].dropna().reset_index(drop=True)
    vals = []
    for r in range(R):
        idx = rng.integers(0, len(D), len(D))
        try:
            vals.append(one_factor(D.iloc[idx], items)["omega"])
        except Exception:
            pass
        if progress and r % 10 == 0:
            progress(r + 1, R)
    if len(vals) < 20:
        return None
    return float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5)), len(vals)


def validity_from_cfa(fit, scales, df):
    """CR, AVE, MSV, √AVE, factor correlations and HTMT from the CFA result."""
    spec = fit.spec
    lv = [f for f in scales if f in spec.lat]
    std_load = {f: [] for f in lv}
    for i, prm in enumerate(spec.params):
        if prm["op"] == "=~" and prm["lhs"] in std_load:
            std_load[prm["lhs"]].append(float(fit.std[i]))
    C = fit.C
    idx = [spec.idx[f] for f in lv]
    sd = np.sqrt(np.diag(C)[idx])
    phi = C[np.ix_(idx, idx)] / np.outer(sd, sd)
    out = []
    for a, f in enumerate(lv):
        l = np.array(std_load[f])
        cr = l.sum() ** 2 / (l.sum() ** 2 + (1 - l ** 2).sum())
        ave = float(np.mean(l ** 2))
        others = [phi[a, b] ** 2 for b in range(len(lv)) if b != a]
        out.append({"factor": f, "cr": float(cr), "ave": ave, "sqrt_ave": math.sqrt(max(ave, 0)), "msv": float(max(others)) if others else float("nan"),
                    "loadings": l.tolist()})
    htmt = htmt_matrix(df, {f: scales[f] for f in lv})
    return {"factors": lv, "rows": out, "phi": phi.tolist(), "htmt": htmt.tolist()}


def htmt_matrix(df, scales):
    names = list(scales)
    allitems = [i for f in names for i in scales[f]]
    R = df[allitems].corr().to_numpy()
    pos = {it: n for n, it in enumerate(allitems)}
    k = len(names)
    H = np.eye(k)

    def mono(f):
        it = scales[f]
        vals = [R[pos[a], pos[b]] for x, a in enumerate(it) for b in it[x + 1:]]
        return np.mean(vals) if vals else np.nan

    for a in range(k):
        for b in range(a + 1, k):
            het = np.mean([R[pos[i], pos[j]] for i in scales[names[a]] for j in scales[names[b]]])
            ma, mb = mono(names[a]), mono(names[b])
            H[a, b] = H[b, a] = abs(het) / math.sqrt(ma * mb) if ma > 0 and mb > 0 else np.nan
    return H
