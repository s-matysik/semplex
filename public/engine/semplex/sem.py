"""SEM engine: RAM model, ML estimation with analytic gradient, standard errors
(expected information or Satorra-Bentler sandwich), fit, standardized
solution, defined effects, modification indices, and bootstrap.

Conventions consistent with lavaan (default cfa()/sem()): sample covariance matrix with divisor N,
T = N * F_ML, first loading fixed to 1, free covariances of exogenous variables.
MIT license. From-scratch implementation.
"""
import math
import re
import numpy as np
from scipy import optimize, stats

from . import syntax
from . import i18n as I18N


class ModelError(Exception):
    """Specification error: (message, technical details)."""


# --------------------------------------------------------------------------- specyfikacja
class Spec:
    def __init__(self, text, observed_available, std_lv=False):
        p = syntax.parse(text)
        if p["errors"]:
            e = p["errors"][0]
            raise ModelError(I18N.T("Wiersz {p0}: {p1}", p0=e['line'], p1=e['message']))
        self.parsed = p
        self.warnings = list(p["warnings"])
        self.std_lv = std_lv
        lvs = []
        for m in p["measurement"]:
            if m["lhs"] not in lvs:
                lvs.append(m["lhs"])
        names = []
        for key in ("measurement", "regressions", "covariances"):
            for t in p[key]:
                for v in (t["lhs"], t["rhs"]):
                    if v not in names:
                        names.append(v)
        obs = [v for v in names if v not in lvs]
        missing = [v for v in obs if v not in observed_available]
        if missing:
            raise ModelError(I18N.T("Zmienne nie występują w danych ani nie są zdefiniowane jako latentne: ") + ", ".join(missing))
        if not obs:
            raise ModelError(I18N.T("Model nie zawiera zmiennych obserwowalnych."))
        order = [v for v in observed_available if v in obs]
        self.obs, self.lat = order, lvs
        self.vars = order + lvs
        self.idx = {v: i for i, v in enumerate(self.vars)}
        self.p, self.m = len(order), len(self.vars)
        self._build()

    def _build(self):
        P = self.parsed
        idx = self.idx
        params = []  # dicty: mat, i, j, free, value, label, op, lhs, rhs
        seen = {}

        def add(mat, i, j, op, lhs, rhs, mods, default_free=True, default_value=None):
            key = (mat, min(i, j), max(i, j)) if mat == "S" else (mat, i, j)
            if key in seen:
                prm = params[seen[key]]
                prm.update(_mods_to_fields(mods, prm["free"], prm["value"]))
                return
            fields = _mods_to_fields(mods, default_free, default_value)
            seen[key] = len(params)
            params.append({"mat": mat, "i": i, "j": j, "op": op, "lhs": lhs, "rhs": rhs, **fields})

        # loadings
        first = {}
        for m in P["measurement"]:
            lv, ind = m["lhs"], m["rhs"]
            mods = {k: m[k] for k in ("label", "fixed", "free", "start") if k in m}
            is_first = lv not in first
            if is_first:
                first[lv] = ind
            marker = is_first and not self.std_lv and "fixed" not in mods and "free" not in mods
            add("A", idx[ind], idx[lv], "=~", lv, ind, mods, default_free=not marker, default_value=1.0 if marker else None)
        # regresje
        for r in P["regressions"]:
            mods = {k: r[k] for k in ("label", "fixed", "free", "start") if k in r}
            add("A", idx[r["lhs"]], idx[r["rhs"]], "~", r["lhs"], r["rhs"], mods)
        # kowariancje podane
        for c in P["covariances"]:
            mods = {k: c[k] for k in ("label", "fixed", "free", "start") if k in c}
            add("S", idx[c["lhs"]], idx[c["rhs"]], "~~", c["lhs"], c["rhs"], mods)

        # role zmiennych
        lhs_reg = {r["lhs"] for r in P["regressions"]}
        rhs_reg = {r["rhs"] for r in P["regressions"]}
        indicators = {m["rhs"] for m in P["measurement"]}
        self.endog = set(lhs_reg) | indicators
        exo = [v for v in self.vars if v not in self.endog]
        self.exogenous = exo
        # wariancje
        for v in self.vars:
            i = idx[v]
            if ("S", i, i) in seen:
                continue
            if v in self.lat and self.std_lv and v not in lhs_reg:
                add("S", i, i, "~~", v, v, {}, default_free=False, default_value=1.0)
            else:
                add("S", i, i, "~~", v, v, {})
        # kowariancje egzogenicznych (latentnych i obserwowalnych)
        for a in range(len(exo)):
            for b in range(a + 1, len(exo)):
                i, j = idx[exo[a]], idx[exo[b]]
                if ("S", min(i, j), max(i, j)) not in seen:
                    add("S", i, j, "~~", exo[a], exo[b], {})
        # residual covariances of pure dependent variables (only on the left side of ~)
        pure_y = [v for v in self.vars if v in lhs_reg and v not in rhs_reg and v not in indicators]
        for a in range(len(pure_y)):
            for b in range(a + 1, len(pure_y)):
                i, j = idx[pure_y[a]], idx[pure_y[b]]
                if ("S", min(i, j), max(i, j)) not in seen:
                    add("S", i, j, "~~", pure_y[a], pure_y[b], {})

        # mapping of free parameters (shared labels = equality constraint)
        free_index, labels = {}, {}
        k = 0
        for prm in params:
            if prm["free"]:
                lab = prm.get("label")
                if lab and lab in labels:
                    prm["k"] = labels[lab]
                else:
                    prm["k"] = k
                    if lab:
                        labels[lab] = k
                    k += 1
            else:
                prm["k"] = None
                if prm.get("label"):
                    labels.setdefault(prm["label"], None)
        self.params = params
        self.q = k
        self.labels = labels
        self.defined = P["defined"]
        self.F = np.zeros((self.p, self.m))
        for i in range(self.p):
            self.F[i, i] = 1.0

    # matrices from the parameter vector
    def matrices(self, theta):
        A = np.zeros((self.m, self.m))
        S = np.zeros((self.m, self.m))
        for prm in self.params:
            v = theta[prm["k"]] if prm["k"] is not None else prm["value"]
            if prm["mat"] == "A":
                A[prm["i"], prm["j"]] = v
            else:
                S[prm["i"], prm["j"]] = v
                S[prm["j"], prm["i"]] = v
        return A, S

    def df(self):
        return self.p * (self.p + 1) // 2 - self.q


def _mods_to_fields(mods, default_free, default_value):
    f = {"free": default_free, "value": default_value if default_value is not None else 0.0, "label": None, "start": None}
    if "fixed" in mods:
        f["free"], f["value"] = False, mods["fixed"]
    if mods.get("free"):
        f["free"] = True
    if "label" in mods:
        f["label"] = mods["label"]
    if "start" in mods:
        f["start"] = mods["start"]
    return f


# --------------------------------------------------------------------------- algebra
def implied(spec, theta):
    A, S = spec.matrices(theta)
    I = np.eye(spec.m)
    B = np.linalg.inv(I - A)
    FB = spec.F @ B
    Sigma = FB @ S @ FB.T
    return Sigma, A, S, B


def _fml(spec, theta, Sobs, logdetS):
    Sigma, A, S, B = implied(spec, theta)
    try:
        L = np.linalg.cholesky(Sigma)
    except np.linalg.LinAlgError:
        return 1e10, np.zeros(spec.q)
    logdet = 2 * np.sum(np.log(np.diag(L)))
    Si = np.linalg.inv(Sigma)
    f = logdet + np.trace(Sobs @ Si) - logdetS - spec.p
    W = Si - Si @ Sobs @ Si
    FB = spec.F @ B
    GA = 2 * (FB.T @ W @ FB @ S @ B.T)  # dF/dA
    GS = FB.T @ W @ FB                  # dF/dS (symetryczne)
    g = np.zeros(spec.q)
    for prm in spec.params:
        k = prm["k"]
        if k is None:
            continue
        i, j = prm["i"], prm["j"]
        if prm["mat"] == "A":
            g[k] += GA[i, j]
        else:
            g[k] += GS[i, j] if i == j else 2 * GS[i, j]
    return f, g


def dsigma(spec, theta):
    """Derivatives of Σ with respect to each free parameter: array (q, p, p)."""
    A, S = spec.matrices(theta)
    B = np.linalg.inv(np.eye(spec.m) - A)
    FB = spec.F @ B
    C = B @ S @ B.T
    D = np.zeros((spec.q, spec.p, spec.p))
    for prm in spec.params:
        k = prm["k"]
        if k is None:
            continue
        i, j = prm["i"], prm["j"]
        if prm["mat"] == "A":
            # dΣ/dA_ij = F B E_ij B S B' F' + transpozycja
            M = np.outer(FB[:, i], C[j, :] @ spec.F.T)
            D[k] += M + M.T
        else:
            if i == j:
                D[k] += np.outer(FB[:, i], FB[:, i])
            else:
                M = np.outer(FB[:, i], FB[:, j])
                D[k] += M + M.T
    return D


def candidate_dsigma(spec, theta, cands):
    A, S = spec.matrices(theta)
    B = np.linalg.inv(np.eye(spec.m) - A)
    FB = spec.F @ B
    C = B @ S @ B.T
    out = np.zeros((len(cands), spec.p, spec.p))
    for n, (mat, i, j) in enumerate(cands):
        if mat == "A":
            M = np.outer(FB[:, i], C[j, :] @ spec.F.T)
            out[n] = M + M.T
        else:
            M = np.outer(FB[:, i], FB[:, j])
            out[n] = M + M.T if i != j else M
    return out


# --------------------------------------------------------------------------- starting values
def start_values(spec, Sobs):
    th = np.zeros(spec.q)
    set_ = np.zeros(spec.q, bool)
    obs_i = {v: i for i, v in enumerate(spec.obs)}
    by_lv = {}
    for prm in spec.params:
        if prm["mat"] == "A" and prm["op"] == "=~":
            by_lv.setdefault(prm["lhs"], []).append(prm)

    lam = {}
    lv_var = {}
    for lv, ps in by_lv.items():
        inds = [p["rhs"] for p in ps]
        mk = None
        for p in ps:
            if not p["free"]:
                mk = p["rhs"]
                break
        for p in ps:
            ind = p["rhs"]
            if p["k"] is None:
                lam[(lv, ind)] = p["value"]
                continue
            if mk is None or ind == mk:
                lam[(lv, ind)] = math.sqrt(max(Sobs[obs_i[ind], obs_i[ind]] * 0.6, 1e-3)) if ind in obs_i else 1.0
                continue
            others = [o for o in inds if o not in (ind, mk) and o in obs_i]
            r = []
            for o in others:
                den = Sobs[obs_i[mk], obs_i[o]]
                if abs(den) > 1e-6:
                    r.append(Sobs[obs_i[ind], obs_i[o]] / den)
            val = float(np.median(r)) if r else 1.0
            lam[(lv, ind)] = val if abs(val) < 10 else 1.0
        if mk is not None and mk in obs_i:
            pairs = [Sobs[obs_i[mk], obs_i[o]] / lam[(lv, o)] for o in inds if o != mk and o in obs_i and abs(lam[(lv, o)]) > 1e-3]
            lv_var[lv] = max(float(np.median(pairs)) if pairs else 0.5 * Sobs[obs_i[mk], obs_i[mk]], 0.05)
        else:
            lv_var[lv] = 1.0

    for prm in spec.params:
        k = prm["k"]
        if k is None or set_[k]:
            continue
        if prm.get("start") is not None:
            th[k] = prm["start"]
        elif prm["mat"] == "A" and prm["op"] == "=~":
            th[k] = lam.get((prm["lhs"], prm["rhs"]), 1.0)
        elif prm["mat"] == "A":
            th[k] = 0.0
        else:
            a, b = prm["lhs"], prm["rhs"]
            if a == b:
                if a in obs_i:
                    s = Sobs[obs_i[a], obs_i[a]]
                    th[k] = 0.5 * s if a in spec.endog else s
                else:
                    th[k] = lv_var.get(a, 0.5) * (0.8 if a in spec.endog else 1.0)
            elif a in obs_i and b in obs_i and a in spec.exogenous and b in spec.exogenous:
                th[k] = Sobs[obs_i[a], obs_i[b]]
            else:
                th[k] = 0.0
        set_[k] = True
    return th


# --------------------------------------------------------------------------- dopasowanie
class Fit:
    pass


def _duplication(p):
    pairs = [(i, j) for j in range(p) for i in range(j, p)]
    D = np.zeros((p * p, len(pairs)))
    for c, (i, j) in enumerate(pairs):
        D[i * p + j, c] = 1
        D[j * p + i, c] = 1
    return D, pairs


def _vech(M, pairs):
    return np.array([M[i, j] for i, j in pairs])


def _gamma(X, pairs):
    Xc = X - X.mean(0)
    d = np.stack([Xc[:, i] * Xc[:, j] for i, j in pairs], 1)
    d = d - d.mean(0)
    return d.T @ d / X.shape[0]


def fit_model(text, data=None, cov=None, n=None, estimator="ML", std_lv=False, se=True, theta0=None, mi=False, names=None):
    """Estimates the model. data: DataFrame (complete cases) or cov + n."""
    if data is not None:
        avail = list(data.columns)
    else:
        avail = list(names)
    spec = Spec(text, avail, std_lv=std_lv)
    X = None
    if data is not None:
        X = data[spec.obs].dropna().to_numpy(float)  # przypadki kompletne (listwise)
        n = X.shape[0]
        Sobs = np.cov(X, rowvar=False, bias=True)
    else:
        idx = [avail.index(v) for v in spec.obs]
        Sobs = np.asarray(cov, float)[np.ix_(idx, idx)]
    Sobs = np.atleast_2d(Sobs)
    if spec.df() < 0:
        raise ModelError(I18N.T("Model nie jest identyfikowany: {p0} parametrów przy {p1} momentach (df = {p2}).", p0=spec.q, p1=spec.p * (spec.p + 1) // 2, p2=spec.df()))
    sign, logdetS = np.linalg.slogdet(Sobs)
    if sign <= 0:
        raise ModelError(I18N.T("Macierz kowariancji próby nie jest dodatnio określona (np. zmienna stała albo liniowo zależne zmienne)."))
    th0 = start_values(spec, Sobs) if theta0 is None else np.array(theta0, float)
    fun = lambda t: _fml(spec, t, Sobs, logdetS)
    res = optimize.minimize(fun, th0, jac=True, method="L-BFGS-B", options={"maxiter": 10000, "ftol": 1e-14, "gtol": 1e-9, "maxcor": 30})
    if not res.success or np.max(np.abs(res.jac)) > 1e-4:
        res2 = optimize.minimize(fun, res.x, jac=True, method="BFGS", options={"maxiter": 5000, "gtol": 1e-8})
        if res2.fun <= res.fun + 1e-12:
            res = res2
    theta = res.x
    f = fun(theta)[0]
    out = Fit()
    out.spec, out.theta, out.n, out.S, out.estimator = spec, theta, n, Sobs, estimator
    out.converged = bool(f < 1e9 and np.max(np.abs(fun(theta)[1])) < 1e-3)
    out.iterations = int(res.nit)
    out.fmin = float(f)
    Sigma, A, Smat, B = implied(spec, theta)
    out.Sigma = Sigma
    out.C = B @ Smat @ B.T
    p, q, N = spec.p, spec.q, n
    T = N * f
    dfm = spec.df()
    # baseline model (independence)
    Tb = N * (np.sum(np.log(np.diag(Sobs))) - logdetS)
    dfb = p * (p - 1) // 2
    out.chi2, out.df, out.chi2_base, out.df_base = float(T), int(dfm), float(Tb), int(dfb)
    out.pvalue = float(stats.chi2.sf(T, dfm)) if dfm > 0 else float("nan")
    ll = -N / 2 * (p * math.log(2 * math.pi) + np.linalg.slogdet(Sigma)[1] + np.trace(Sobs @ np.linalg.inv(Sigma)))
    out.loglik = float(ll)
    out.npar = q
    out.aic = float(-2 * ll + 2 * q)
    out.bic = float(-2 * ll + q * math.log(N))
    out.abic = float(-2 * ll + q * math.log((N + 2) / 24))

    Si = np.linalg.inv(Sigma)
    D = dsigma(spec, theta) if q else np.zeros((0, p, p))
    M = np.einsum("ab,kbc->kac", Si, D)
    Info = 0.5 * np.einsum("kab,lba->kl", M, M)  # information per observation
    out.info = Info
    scale = 1.0
    acov = None
    if se and q:
        try:
            Iinv = np.linalg.inv(Info)
        except np.linalg.LinAlgError:
            Iinv = np.linalg.pinv(Info)
            out.warnings_se = I18N.T("Macierz informacji jest osobliwa - model może być nieidentyfikowany empirycznie.")
        acov = Iinv / N
        if estimator in ("MLM", "MLR") and X is not None:
            Dup, pairs = _duplication(p)
            V = 0.5 * Dup.T @ np.kron(Si, Si) @ Dup
            Delta = np.stack([_vech(D[k], pairs) for k in range(q)], 1)
            G = _gamma(X, pairs)
            Iv = Delta.T @ V @ Delta
            Ivi = np.linalg.inv(Iv)
            acov = Ivi @ Delta.T @ V @ G @ V @ Delta @ Ivi / N
            if dfm > 0:
                U = V - V @ Delta @ Ivi @ Delta.T @ V
                scale = float(np.trace(U @ G) / dfm)
            # skalowanie modelu bazowego
            Sb = np.diag(np.diag(Sobs))
            Sbi = np.linalg.inv(Sb)
            Vb = 0.5 * Dup.T @ np.kron(Sbi, Sbi) @ Dup
            Db = np.stack([_vech(np.diag(np.eye(p)[k]), pairs) for k in range(p)], 1)
            Ub = Vb - Vb @ Db @ np.linalg.inv(Db.T @ Vb @ Db) @ Db.T @ Vb
            out.scale_base = float(np.trace(Ub @ G) / dfb)
    out.acov = acov
    out.se = np.sqrt(np.clip(np.diag(acov), 0, None)) if acov is not None else np.full(q, np.nan)
    out.scale = scale
    _fit_indices(out)
    out.std = standardized(spec, theta)
    out.std_se = _std_se(out) if acov is not None else None
    out.defined = _defined(out)
    out.r2 = _r2(out)
    out.heywood = _heywood(out)
    if mi:
        out.mi = modification_indices(out)
    return out


def _rmsea_ci(T, df, N, level=0.90):
    if df <= 0:
        return (float("nan"), float("nan"))
    def lam_for(prob):
        if stats.chi2.cdf(T, df) < prob:
            return 0.0
        f = lambda lam: stats.ncx2.cdf(T, df, lam) - prob if lam > 0 else stats.chi2.cdf(T, df) - prob
        hi = max(T, 1.0)
        while f(hi) > 0:
            hi *= 2
            if hi > 1e7:
                break
        return optimize.brentq(f, 1e-10, hi)
    lo = lam_for((1 + level) / 2)
    up = lam_for((1 - level) / 2)
    return (math.sqrt(lo / (N * df)), math.sqrt(up / (N * df)))


def _fit_indices(o):
    T, df, Tb, dfb, N = o.chi2, o.df, o.chi2_base, o.df_base, o.n

    def block(T, Tb):
        cfi = 1 - max(T - df, 0) / max(T - df, Tb - dfb, 1e-12) if Tb - dfb > 0 or T - df > 0 else 1.0
        tli = ((Tb / dfb) - (T / df)) / ((Tb / dfb) - 1) if df > 0 and dfb > 0 else float("nan")
        rmsea = math.sqrt(max(T - df, 0) / (df * N)) if df > 0 else 0.0
        return min(cfi, 1.0), tli, rmsea

    cfi, tli, rmsea = block(T, Tb)
    lo, hi = _rmsea_ci(T, df, N)
    pclose = float(1 - stats.ncx2.cdf(T, df, 0.05 ** 2 * N * df)) if df > 0 else float("nan")
    s, sig = o.S, o.Sigma
    d = np.sqrt(np.diag(s))
    R = (s - sig) / np.outer(d, d)
    iu = np.tril_indices(len(d))
    srmr = float(np.sqrt(np.mean(R[iu] ** 2)))
    o.fit = {"chi2": T, "df": df, "pvalue": o.pvalue, "cfi": cfi, "tli": tli, "rmsea": rmsea, "rmsea_lo": lo, "rmsea_hi": hi,
             "pclose": pclose, "srmr": srmr, "aic": o.aic, "bic": o.bic, "abic": o.abic, "loglik": o.loglik, "npar": o.npar,
             "chi2_base": Tb, "df_base": dfb, "n": N}
    if o.estimator in ("MLM", "MLR") and getattr(o, "scale_base", None):
        Ts, Tbs = T / o.scale, Tb / o.scale_base
        cfis, tlis, rmseas = block(Ts, Tbs)
        los, his = _rmsea_ci(Ts, df, N)
        o.fit.update({"chi2_scaled": Ts, "scaling": o.scale, "pvalue_scaled": float(stats.chi2.sf(Ts, df)) if df > 0 else float("nan"),
                      "cfi_scaled": cfis, "tli_scaled": tlis, "rmsea_scaled": rmseas, "rmsea_lo_scaled": los, "rmsea_hi_scaled": his})


def standardized(spec, theta):
    Sigma, A, S, B = implied(spec, theta)
    C = B @ S @ B.T
    sd = np.sqrt(np.clip(np.diag(C), 1e-12, None))
    out = []
    for prm in spec.params:
        i, j = prm["i"], prm["j"]
        v = theta[prm["k"]] if prm["k"] is not None else prm["value"]
        if prm["mat"] == "A":
            out.append(v * sd[j] / sd[i])
        elif i == j:
            out.append(v / (sd[i] * sd[j]))
        else:
            # covariance between residuals (or exogenous variables): divide by the residual (variance-parameter)
            # standard deviations, as lavaan std.all does; for exogenous variables these equal the total SDs
            d = S[i, i] * S[j, j]
            out.append(v / np.sqrt(d) if d > 0 else float("nan"))
    return np.array(out)


def _num_jac(fn, theta, eps=1e-6):
    f0 = np.atleast_1d(fn(theta))
    J = np.zeros((f0.size, theta.size))
    for k in range(theta.size):
        h = eps * max(1.0, abs(theta[k]))
        tp, tm = theta.copy(), theta.copy()
        tp[k] += h
        tm[k] -= h
        J[:, k] = (np.atleast_1d(fn(tp)) - np.atleast_1d(fn(tm))) / (2 * h)
    return J


def _std_se(o):
    J = _num_jac(lambda t: standardized(o.spec, t), o.theta)
    V = J @ o.acov @ J.T
    return np.sqrt(np.clip(np.diag(V), 0, None))


def _label_values(spec, theta, std=None):
    vals = {}
    for n, prm in enumerate(spec.params):
        lab = prm.get("label")
        if lab:
            vals[lab] = (std[n] if std is not None else (theta[prm["k"]] if prm["k"] is not None else prm["value"]))
    return vals


_SAFE = re.compile(r"^[A-Za-z0-9_.+\-*/() ]+$")


def eval_expr(expr, values):
    if not _SAFE.match(expr):
        raise ModelError(I18N.T("Niedozwolone znaki w wyrażeniu efektu."))
    names = re.findall(r"[A-Za-z_][A-Za-z0-9_.]*", expr)
    for nm in names:
        if nm not in values:
            raise ModelError(I18N.T("Etykieta „{p0}” z wyrażenia nie występuje w modelu.", p0=nm))
    safe = expr
    for nm in sorted(set(names), key=len, reverse=True):
        safe = re.sub(rf"(?<![A-Za-z0-9_.]){re.escape(nm)}(?![A-Za-z0-9_.])", f"__v['{nm}']", safe)
    return float(eval(safe, {"__builtins__": {}}, {"__v": values}))


def _defined(o):
    out = []
    for d in o.spec.defined:
        f = lambda t: eval_expr(d["expr"], _label_values(o.spec, t))
        fs = lambda t: eval_expr(d["expr"], _label_values(o.spec, t, standardized(o.spec, t)))
        est = f(o.theta)
        se = float("nan")
        std = fs(o.theta)
        std_se = float("nan")
        if o.acov is not None:
            J = _num_jac(f, o.theta)
            se = float(np.sqrt(max((J @ o.acov @ J.T)[0, 0], 0)))
            Js = _num_jac(fs, o.theta)
            std_se = float(np.sqrt(max((Js @ o.acov @ Js.T)[0, 0], 0)))
        out.append({"name": d["name"], "expr": d["expr"], "est": est, "se": se, "std": std, "std_se": std_se})
    return out


def _r2(o):
    spec = o.spec
    Sigma, A, S, B = implied(spec, o.theta)
    C = B @ S @ B.T
    r2 = {}
    for v in spec.vars:
        if v in spec.endog:
            i = spec.idx[v]
            r2[v] = float(1 - S[i, i] / C[i, i]) if C[i, i] > 0 else float("nan")
    return r2


def _heywood(o):
    spec = o.spec
    A, S = spec.matrices(o.theta)
    issues = []
    for v in spec.vars:
        i = spec.idx[v]
        if S[i, i] < 0:
            issues.append({"var": v, "value": float(S[i, i]), "kind": "negative_variance"})
    for n, prm in enumerate(spec.params):
        if prm["mat"] == "A" and prm["op"] == "=~" and abs(o.std[n]) > 1:
            issues.append({"var": prm["rhs"], "value": float(o.std[n]), "kind": "std_loading_gt1"})
    # covariance matrices that are not positive definite (as lavaan's post-estimation check): the model-implied
    # covariance matrix of the latent variables, and the residual covariance matrix of the observed variables
    for kind, ids, M in (("latent_cov_not_pd", [spec.idx[v] for v in spec.lat], o.C), ("residual_cov_not_pd", [spec.idx[v] for v in spec.obs], S)):
        if len(ids) > 1:
            Mb = M[np.ix_(ids, ids)]
            if np.count_nonzero(Mb - np.diag(np.diag(Mb))) or kind == "latent_cov_not_pd":
                ev = float(np.linalg.eigvalsh((Mb + Mb.T) / 2).min())
                if ev < -1e-8 * max(1.0, float(np.abs(np.diag(Mb)).max())):
                    issues.append({"var": None, "value": ev, "kind": kind})
    return issues


def param_table(o, ci_level=0.95):
    z = stats.norm.ppf(0.5 + ci_level / 2)
    rows = []
    for n, prm in enumerate(o.spec.params):
        k = prm["k"]
        est = o.theta[k] if k is not None else prm["value"]
        se = o.se[k] if k is not None else float("nan")
        zval = est / se if k is not None and se > 0 else float("nan")
        p = 2 * stats.norm.sf(abs(zval)) if k is not None and se > 0 else float("nan")
        std = o.std[n]
        sse = o.std_se[n] if o.std_se is not None else float("nan")
        rows.append({"lhs": prm["lhs"], "op": prm["op"], "rhs": prm["rhs"], "label": prm.get("label") or "",
                     "free": k is not None, "est": float(est), "se": float(se), "z": float(zval), "p": float(p),
                     "ci_lo": float(est - z * se) if k is not None else float(est), "ci_hi": float(est + z * se) if k is not None else float(est),
                     "std": float(std), "std_se": float(sse),
                     # a standardized parameter has its own uncertainty even when the unstandardized version is fixed
                     # (e.g. marker loading = 1); CI = std ± z·SE(std), like standardizedSolution() in lavaan
                     "std_lo": float(std - z * sse) if np.isfinite(sse) and sse > 1e-10 else float(std),
                     "std_hi": float(std + z * sse) if np.isfinite(sse) and sse > 1e-10 else float(std)})
    return rows


# --------------------------------------------------------------------------- indeksy modyfikacji
def modification_indices(o, min_mi=3.84, limit=30):
    spec = o.spec
    cands, meta = [], []
    present = {(p["mat"], p["i"], p["j"]) for p in spec.params} | {(p["mat"], p["j"], p["i"]) for p in spec.params if p["mat"] == "S"}
    loads = {}
    for p in spec.params:
        if p["op"] == "=~":
            loads.setdefault(p["lhs"], set()).add(p["rhs"])
    indicators = sorted({p["rhs"] for p in spec.params if p["op"] == "=~"}, key=lambda v: spec.idx[v])
    for lv in spec.lat:
        if lv not in loads:
            continue
        for ind in indicators:
            if ind in loads[lv]:
                continue
            key = ("A", spec.idx[ind], spec.idx[lv])
            if key not in present:
                cands.append(key)
                meta.append({"lhs": lv, "op": "=~", "rhs": ind})
    for a in range(len(indicators)):
        for b in range(a + 1, len(indicators)):
            i, j = spec.idx[indicators[a]], spec.idx[indicators[b]]
            if ("S", i, j) not in present:
                cands.append(("S", i, j))
                meta.append({"lhs": indicators[a], "op": "~~", "rhs": indicators[b]})
    if not cands or spec.q == 0:
        return []
    Si = np.linalg.inv(o.Sigma)
    W = Si - Si @ o.S @ Si
    Dc = candidate_dsigma(spec, o.theta, cands)
    D = dsigma(spec, o.theta)
    g = np.einsum("ab,kba->k", W, Dc)
    Mc = np.einsum("ab,kbc->kac", Si, Dc)
    Mf = np.einsum("ab,kbc->kac", Si, D)
    Icc = 0.5 * np.einsum("kab,kba->k", Mc, Mc)
    Icf = 0.5 * np.einsum("kab,lba->kl", Mc, Mf)
    Iff_inv = np.linalg.pinv(o.info)
    eff = Icc - np.einsum("kl,lm,km->k", Icf, Iff_inv, Icf)
    N = o.n
    out = []
    for n in range(len(cands)):
        if eff[n] <= 1e-10:
            continue
        mi = N * g[n] ** 2 / (4 * eff[n])
        epc = -g[n] / (2 * eff[n])
        mat, i, j = cands[n]
        C = o.C
        sd_i, sd_j = math.sqrt(max(C[i, i], 1e-12)), math.sqrt(max(C[j, j], 1e-12))
        if mat == "A":
            sepc = epc * sd_j / sd_i
        else:
            A, S = spec.matrices(o.theta)
            sepc = epc / math.sqrt(max(S[i, i] * S[j, j], 1e-12))
        if mi >= min_mi:
            out.append({**meta[n], "mi": float(mi), "epc": float(epc), "sepc": float(sepc)})
    out.sort(key=lambda r: -r["mi"])
    return out[:limit]


# --------------------------------------------------------------------------- bootstrap
def bootstrap(text, data, R=500, seed=1, estimator="ML", std_lv=False, progress=None, targets=None):
    """Nonparametric bootstrap: returns percentile 95% CIs for parameters and effects."""
    base = fit_model(text, data=data, estimator="ML", std_lv=std_lv, se=False)
    rng = np.random.default_rng(seed)
    X = data.reset_index(drop=True)
    nrow = len(X)
    draws_std, draws_def, draws_raw = [], [], []
    ok = 0
    for r in range(R):
        idx = rng.integers(0, nrow, nrow)
        try:
            f = fit_model(text, data=X.iloc[idx], std_lv=std_lv, se=False, theta0=base.theta)
            if f.converged:
                draws_raw.append([f.theta[p["k"]] if p["k"] is not None else p["value"] for p in f.spec.params])
                draws_std.append(f.std)
                draws_def.append([d["est"] for d in f.defined] + [d["std"] for d in f.defined])
                ok += 1
        except Exception:
            pass
        if progress and (r % 10 == 0 or r == R - 1):
            progress(r + 1, R)
    res = {"R": R, "ok": ok, "seed": seed}
    if ok >= 20:
        q = lambda a: (np.percentile(a, 2.5, axis=0).tolist(), np.percentile(a, 97.5, axis=0).tolist())
        res["raw"] = q(np.array(draws_raw))
        res["std"] = q(np.array(draws_std))
        if base.defined:
            res["defined"] = q(np.array(draws_def))
    return res
