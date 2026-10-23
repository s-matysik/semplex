"""Mediation and moderation: PROCESS templates 4 (mediation, on latent variables via SEM or
on scale means), 1 (moderation with Johnson-Neyman region) and 7 (moderated mediation, path a).
Indirect effect intervals: percentile bootstrap. MIT License.
"""
import math
import numpy as np
from scipy import stats

from . import sem as semmod
from . import i18n as I18N


def _ols(y, X):
    X1 = np.column_stack([np.ones(len(y)), X])
    b, *_ = np.linalg.lstsq(X1, y, rcond=None)
    res = y - X1 @ b
    dfr = len(y) - X1.shape[1]
    s2 = res @ res / dfr
    V = s2 * np.linalg.inv(X1.T @ X1)
    r2 = 1 - (res @ res) / ((y - y.mean()) @ (y - y.mean()))
    return b, V, dfr, r2


def latent_model4_syntax(scales, x, m, y, covs=()):
    lines = [f"{f} =~ " + " + ".join(scales[f]) for f in (x, m, y) if f in scales]
    cv = "".join(f" + {c}" for c in covs)
    lines += [f"{m} ~ a*{x}{cv}", f"{y} ~ b*{m} + c*{x}{cv}", "ind := a*b", "total := c + a*b"]
    return "\n".join(lines)


class Model4Job:
    """Mediation X → M → Y on latent variables with bootstrap of the indirect effect."""

    def __init__(self, df, scales, x, m, y, R=500, seed=1, latent=True):
        self.latent = latent
        if latent:
            self.syntax = latent_model4_syntax(scales, x, m, y)
            items = [it for f in (x, m, y) for it in scales[f]]
            self.D = df[items].dropna().reset_index(drop=True)
        else:
            D = df.copy()
            for f in (x, m, y):
                D[f] = df[scales[f]].mean(axis=1) if f in scales else df[f]
            self.D = D[[x, m, y]].dropna().reset_index(drop=True)
            self.syntax = f"{m} ~ a*{x}\n{y} ~ b*{m} + c*{x}\nind := a*b\ntotal := c + a*b"
        self.fit = semmod.fit_model(self.syntax, data=self.D, se=True)
        self.R, self.seed = R, seed
        self.rng = np.random.default_rng(seed)
        self.draws = []
        self.done = 0

    def step(self, chunk=20):
        n = len(self.D)
        for _ in range(min(chunk, self.R - self.done)):
            idx = self.rng.integers(0, n, n)
            try:
                f = semmod.fit_model(self.syntax, data=self.D.iloc[idx], se=False, theta0=self.fit.theta)
                if f.converged:
                    a = {d["name"]: d for d in f.defined}
                    lab = semmod._label_values(f.spec, f.theta)
                    labs = semmod._label_values(f.spec, f.theta, f.std)
                    self.draws.append([a["ind"]["est"], a["ind"]["std"], a["total"]["est"], a["total"]["std"], lab["a"], lab["b"], lab["c"], labs["a"], labs["b"], labs["c"]])
            except Exception:
                pass
            self.done += 1
        return self.done >= self.R

    def result(self):
        f = self.fit
        pt = semmod.param_table(f)
        paths = {}
        for r in pt:
            if r["label"] in ("a", "b", "c"):
                paths[r["label"]] = r
        d = {x["name"]: x for x in f.defined}
        out = {"syntax": self.syntax, "n": len(self.D), "fit": f.fit, "paths": paths, "defined": d, "r2": f.r2,
               "R": self.R, "R_done": self.done, "R_ok": len(self.draws), "seed": self.seed, "latent": self.latent}
        if len(self.draws) >= 20:
            A = np.array(self.draws)
            pc = lambda j: [float(np.percentile(A[:, j], 2.5)), float(np.percentile(A[:, j], 97.5))]
            out["boot"] = {"ind": pc(0), "ind_std": pc(1), "total": pc(2), "total_std": pc(3), "a_std": pc(7), "b_std": pc(8), "c_std": pc(9)}
            ie = d["ind"]["est"]
            te = d["total"]["est"]
            out["prop_mediated"] = float(ie / te) if abs(te) > 1e-9 else float("nan")
        return out


def model1(df, scales, x, w, y, center=True, probe="sd"):
    """Moderation: Y = b0 + b1 X + b2 W + b3 XW. Returns the conditional effect and the Johnson-Neyman region."""
    D = {}
    for f in (x, w, y):
        D[f] = df[scales[f]].mean(axis=1).to_numpy() if f in scales else df[f].to_numpy(float)
    ok = ~(np.isnan(D[x]) | np.isnan(D[w]) | np.isnan(D[y]))
    X, W, Y = D[x][ok], D[w][ok], D[y][ok]
    mx, mw = (X.mean(), W.mean()) if center else (0.0, 0.0)
    Xc, Wc = X - mx, W - mw
    b, V, dfr, r2 = _ols(Y, np.column_stack([Xc, Wc, Xc * Wc]))
    tcrit = stats.t.ppf(0.975, dfr)
    se = np.sqrt(np.diag(V))
    coefs = []
    for nm, j in (("X", 1), ("W", 2), ("X×W", 3)):
        t = b[j] / se[j]
        coefs.append({"term": nm, "b": float(b[j]), "se": float(se[j]), "t": float(t), "p": float(2 * stats.t.sf(abs(t), dfr)),
                      "lo": float(b[j] - tcrit * se[j]), "hi": float(b[j] + tcrit * se[j])})
    # efekt warunkowy θ(w) = b1 + b3 (w − mw)
    grid = np.linspace(W.min(), W.max(), 41)
    pts = []
    for wv in grid:
        wc = wv - mw
        est = b[1] + b[3] * wc
        s = math.sqrt(V[1, 1] + 2 * wc * V[1, 3] + wc ** 2 * V[3, 3])
        pts.append({"w": float(wv), "est": float(est), "lo": float(est - tcrit * s), "hi": float(est + tcrit * s)})
    # Johnson-Neyman: (b1 + b3 wc)² = t² (V11 + 2 wc V13 + wc² V33)
    A = b[3] ** 2 - tcrit ** 2 * V[3, 3]
    B = 2 * (b[1] * b[3] - tcrit ** 2 * V[1, 3])
    C = b[1] ** 2 - tcrit ** 2 * V[1, 1]
    jn = []
    disc = B ** 2 - 4 * A * C
    if abs(A) > 1e-12 and disc >= 0:
        for r in ((-B - math.sqrt(disc)) / (2 * A), (-B + math.sqrt(disc)) / (2 * A)):
            wv = r + mw
            if W.min() <= wv <= W.max():
                jn.append(float(wv))
    sig_share = float(np.mean([abs(b[1] + b[3] * (wv - mw)) / math.sqrt(V[1, 1] + 2 * (wv - mw) * V[1, 3] + (wv - mw) ** 2 * V[3, 3]) > tcrit for wv in W]))
    probes = []
    sdw = W.std(ddof=1)
    vals = [(mw - sdw, I18N.T("M − 1 SD")), (W.mean(), "M"), (W.mean() + sdw, I18N.T("M + 1 SD"))] if probe == "sd" else \
        [(np.percentile(W, 16), I18N.T("16. percentyl")), (np.percentile(W, 50), "mediana"), (np.percentile(W, 84), I18N.T("84. percentyl"))]
    for wv, lab in vals:
        wc = wv - mw
        est = b[1] + b[3] * wc
        s = math.sqrt(V[1, 1] + 2 * wc * V[1, 3] + wc ** 2 * V[3, 3])
        t = est / s
        probes.append({"label": lab, "w": float(wv), "est": float(est), "se": float(s), "p": float(2 * stats.t.sf(abs(t), dfr)),
                       "lo": float(est - tcrit * s), "hi": float(est + tcrit * s)})
    hist, edges = np.histogram(W, bins=12)
    dist = [{"from": float(edges[i]), "to": float(edges[i + 1]), "count": int(hist[i])} for i in range(len(hist))]
    return {"n": int(ok.sum()), "r2": float(r2), "coefs": coefs, "points": pts, "jn": jn, "sig_share": sig_share, "probes": probes,
            "dist": dist, "skew_w": float(stats.skew(W)), "center": center}


class Model7Job:
    """Moderated mediation (W moderates path a) at scale means; index of moderated mediation (Hayes, 2015)."""

    def __init__(self, df, scales, x, m, y, w, R=1000, seed=1):
        cols = {}
        for f in (x, m, y, w):
            cols[f] = df[scales[f]].mean(axis=1) if f in scales else df[f]
        D = np.column_stack([cols[f].to_numpy(float) for f in (x, m, y, w)])
        self.D = D[~np.isnan(D).any(1)]
        self.R, self.seed, self.rng = R, seed, np.random.default_rng(seed)
        self.point = self._est(self.D)
        self.draws, self.done = [], 0

    @staticmethod
    def _est(D):
        X, M, Y, W = D.T
        Xc, Wc = X - X.mean(), W - W.mean()
        a, *_ = _ols(M, np.column_stack([Xc, Wc, Xc * Wc]))
        bb, *_ = _ols(Y, np.column_stack([M, Xc]))
        sd = W.std(ddof=1)
        b = bb[1]
        return {"a1": a[1], "a3": a[3], "b": b, "c": bb[2], "index": a[3] * b,
                "ind_lo": (a[1] - a[3] * sd) * b, "ind_m": a[1] * b, "ind_hi": (a[1] + a[3] * sd) * b}

    def step(self, chunk=100):
        n = len(self.D)
        for _ in range(min(chunk, self.R - self.done)):
            self.draws.append(self._est(self.D[self.rng.integers(0, n, n)]))
            self.done += 1
        return self.done >= self.R

    def result(self):
        out = {"n": len(self.D), "point": {k: float(v) for k, v in self.point.items()}, "R": self.R, "R_done": self.done, "seed": self.seed}
        if len(self.draws) >= 20:
            out["ci"] = {k: [float(np.percentile([d[k] for d in self.draws], 2.5)), float(np.percentile([d[k] for d in self.draws], 97.5))] for k in self.point}
        return out


class Model14Job:
    """Second-stage moderated mediation (W moderates path b; PROCESS 14) at scale means.
    Index of moderated mediation = a·b3 (Hayes, 2015)."""

    def __init__(self, df, scales, x, m, y, w, R=1000, seed=1):
        cols = {}
        for f in (x, m, y, w):
            cols[f] = df[scales[f]].mean(axis=1) if f in scales else df[f]
        D = np.column_stack([cols[f].to_numpy(float) for f in (x, m, y, w)])
        self.D = D[~np.isnan(D).any(1)]
        self.R, self.seed, self.rng = R, seed, np.random.default_rng(seed)
        self.point = self._est(self.D)
        self.draws, self.done = [], 0

    @staticmethod
    def _est(D):
        X, M, Y, W = D.T
        Xc, Mc, Wc = X - X.mean(), M - M.mean(), W - W.mean()
        a, *_ = _ols(M, Xc[:, None])
        bb, *_ = _ols(Y, np.column_stack([Mc, Xc, Wc, Mc * Wc]))
        sd = W.std(ddof=1)
        b1, b3 = bb[1], bb[4]
        return {"a1": a[1], "a3": b3, "b": b1, "c": bb[2], "index": a[1] * b3,
                "ind_lo": a[1] * (b1 - b3 * sd), "ind_m": a[1] * b1, "ind_hi": a[1] * (b1 + b3 * sd)}

    def step(self, chunk=100):
        n = len(self.D)
        for _ in range(min(chunk, self.R - self.done)):
            self.draws.append(self._est(self.D[self.rng.integers(0, n, n)]))
            self.done += 1
        return self.done >= self.R

    def result(self):
        out = {"n": len(self.D), "point": {k: float(v) for k, v in self.point.items()}, "R": self.R, "R_done": self.done, "seed": self.seed, "stage": "b"}
        if len(self.draws) >= 20:
            out["ci"] = {k: [float(np.percentile([d[k] for d in self.draws], 2.5)), float(np.percentile([d[k] for d in self.draws], 97.5))] for k in self.point}
        return out
