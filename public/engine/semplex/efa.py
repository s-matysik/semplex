"""Exploratory factor analysis: correlations (Pearson, polychoric), KMO, Bartlett,
extraction (minres, ML, PAF), GPA rotations (varimax, quartimax, promax, oblimin, geomin),
number-of-factors criteria with consensus, bootstrap stability, factor scores.
MIT License. Implementation from scratch.
"""
import math
import numpy as np
from . import i18n as I18N
from scipy import optimize, stats

# --------------------------------------------------------------------------- korelacje
_GL_X, _GL_W = np.polynomial.legendre.leggauss(40)


def bvn_cdf(h, k, r):
    """P(X < h, Y < k) for the standard bivariate distribution (Sheppard's formula, Gaussian quadrature)."""
    h = np.clip(np.asarray(h, float), -12, 12)
    k = np.clip(np.asarray(k, float), -12, 12)
    base = stats.norm.cdf(h) * stats.norm.cdf(k)
    if abs(r) < 1e-12:
        return base
    a = math.asin(max(min(r, 0.999999), -0.999999))
    th = (_GL_X + 1) * a / 2
    w = _GL_W * a / 2
    s, c2 = np.sin(th), np.cos(th) ** 2
    hh, kk = h[..., None], k[..., None]
    integ = np.exp(-(hh ** 2 + kk ** 2 - 2 * hh * kk * s) / (2 * c2))
    return base + (integ * w).sum(-1) / (2 * math.pi)


def _thresholds(x, cats):
    counts = np.array([(x == c).sum() for c in cats], float)
    cum = np.cumsum(counts)[:-1] / counts.sum()
    cum = np.clip(cum, 1e-6, 1 - 1e-6)
    return np.concatenate([[-12.0], stats.norm.ppf(cum), [12.0]])


def polychoric_pair(x, y):
    cx, cy = np.unique(x), np.unique(y)
    tx, ty = _thresholds(x, cx), _thresholds(y, cy)
    tab = np.zeros((len(cx), len(cy)))
    ix = np.searchsorted(cx, x)
    iy = np.searchsorted(cy, y)
    np.add.at(tab, (ix, iy), 1)
    H1, K1 = np.meshgrid(tx[1:], ty[1:], indexing="ij")
    H0, K0 = np.meshgrid(tx[:-1], ty[:-1], indexing="ij")

    def nll(r):
        P = bvn_cdf(H1, K1, r) - bvn_cdf(H0, K1, r) - bvn_cdf(H1, K0, r) + bvn_cdf(H0, K0, r)
        return -np.sum(tab * np.log(np.clip(P, 1e-15, None)))

    r0 = np.corrcoef(x, y)[0, 1]
    res = optimize.minimize_scalar(nll, bounds=(-0.995, 0.995), method="bounded", options={"xatol": 1e-6})
    return float(res.x) if np.isfinite(res.fun) else float(r0)


def polychoric_matrix(X, nodes=16, iters=34):
    """Polychoric correlations for all pairs at once (two-step: thresholds from margins, r via golden-section method)."""
    n, p = X.shape
    cats = [np.unique(X[:, j]) for j in range(p)]
    cmax = max(len(c) for c in cats)
    T = np.full((p, cmax + 1), 12.0)
    codes = np.zeros((n, p), int)
    for j in range(p):
        t = _thresholds(X[:, j], cats[j])
        T[j, :len(t)] = t
        T[j, 0] = -12.0
        codes[:, j] = np.searchsorted(cats[j], X[:, j])
    pairs = [(i, j) for i in range(p) for j in range(i + 1, p)]
    P = len(pairs)
    tab = np.zeros((P, cmax, cmax))
    for q, (i, j) in enumerate(pairs):
        np.add.at(tab[q], (codes[:, i], codes[:, j]), 1)
    I = np.array([a for a, _ in pairs])
    J = np.array([b for _, b in pairs])
    # grid of cell vertices: (P, cmax+1, cmax+1); P(cell) from cumulative differences
    h = np.broadcast_to(T[I][:, :, None], (P, cmax + 1, cmax + 1))
    k = np.broadcast_to(T[J][:, None, :], (P, cmax + 1, cmax + 1))
    base = stats.norm.cdf(h) * stats.norm.cdf(k)
    ssq, hk = h ** 2 + k ** 2, h * k
    gx, gw = np.polynomial.legendre.leggauss(nodes)
    gt = (gx + 1) / 2

    def nll(r):
        a = np.arcsin(np.clip(r, -0.999999, 0.999999))[:, None, None]
        acc = np.zeros_like(base)
        for t, wt in zip(gt, gw):
            s = np.sin(a * t)
            acc += wt * np.exp(-(ssq - 2 * hk * s) / (2 * (1 - s * s)))
        F = base + acc * a / (4 * math.pi)
        pr = F[:, 1:, 1:] - F[:, :-1, 1:] - F[:, 1:, :-1] + F[:, :-1, :-1]
        return -(tab * np.log(np.clip(pr, 1e-15, None))).sum((1, 2))

    g = (math.sqrt(5) - 1) / 2
    lo, hi = np.full(P, -0.995), np.full(P, 0.995)
    c1, c2 = hi - g * (hi - lo), lo + g * (hi - lo)
    f1, f2 = nll(c1), nll(c2)
    for _ in range(iters):
        left = f1 < f2
        hi = np.where(left, c2, hi)
        lo = np.where(left, lo, c1)
        newpt = np.where(left, hi - g * (hi - lo), lo + g * (hi - lo))
        fnew = nll(newpt)
        c2, f2, c1, f1 = (np.where(left, c1, newpt), np.where(left, f1, fnew),
                          np.where(left, newpt, c2), np.where(left, fnew, f2))
    r = (lo + hi) / 2
    R = np.eye(p)
    R[I, J] = r
    R[J, I] = r
    return R


def nearest_pd(R, eps=1e-6):
    w, V = np.linalg.eigh(R)
    if w.min() > eps:
        return R, False
    w = np.clip(w, eps, None)
    R2 = V @ np.diag(w) @ V.T
    d = np.sqrt(np.diag(R2))
    return R2 / np.outer(d, d), True


def correlation(X, kind="pearson"):
    """X: ndarray without missing values. Returns (R, smoothed?)."""
    if kind == "pearson":
        return np.corrcoef(X, rowvar=False), False
    if kind == "spearman":
        return stats.spearmanr(X).statistic if X.shape[1] > 2 else np.corrcoef(stats.rankdata(X, axis=0), rowvar=False), False
    return nearest_pd(polychoric_matrix(X))


def is_ordinal(X, max_cats=7):
    return all(len(np.unique(X[:, j])) <= max_cats and np.allclose(X[:, j], np.round(X[:, j])) for j in range(X.shape[1]))


# --------------------------------------------------------------------------- adequacy
def kmo(R):
    Ri = np.linalg.inv(R)
    d = np.sqrt(np.diag(Ri))
    P = -Ri / np.outer(d, d)
    np.fill_diagonal(P, 0)
    R0 = R.copy()
    np.fill_diagonal(R0, 0)
    r2, p2 = R0 ** 2, P ** 2
    msa = r2.sum(0) / (r2.sum(0) + p2.sum(0))
    total = r2.sum() / (r2.sum() + p2.sum())
    return float(total), msa.tolist()


def bartlett(R, n):
    p = R.shape[0]
    chi2 = -(n - 1 - (2 * p + 5) / 6) * np.linalg.slogdet(R)[1]
    df = p * (p - 1) / 2
    return float(chi2), int(df), float(stats.chi2.sf(chi2, df))


def kmo_label(v):
    for cut, lab in ((0.9, "znakomita"), (0.8, "dobra"), (0.7, I18N.T("przeciętna")), (0.6, "mierna"), (0.5, I18N.T("słaba"))):
        if v >= cut:
            return lab
    return "niedopuszczalna"


# --------------------------------------------------------------------------- ekstrakcja
def _loadings_from_psi(R, psi, k):
    w, V = np.linalg.eigh(R - np.diag(psi))
    idx = np.argsort(w)[::-1][:k]
    return V[:, idx] * np.sqrt(np.clip(w[idx], 0, None))


def extract(R, k, method="minres", n=None):
    p = R.shape[0]
    smc = 1 - 1 / np.diag(np.linalg.inv(R))
    psi0 = np.clip(1 - smc, 0.005, 0.995)
    if method == "pca":
        w, V = np.linalg.eigh(R)
        idx = np.argsort(w)[::-1][:k]
        L = V[:, idx] * np.sqrt(w[idx])
        return L, {"converged": True}
    if method == "paf":
        h2 = smc.copy()
        for it in range(500):
            Rr = R.copy()
            np.fill_diagonal(Rr, h2)
            w, V = np.linalg.eigh(Rr)
            idx = np.argsort(w)[::-1][:k]
            L = V[:, idx] * np.sqrt(np.clip(w[idx], 0, None))
            h2n = (L ** 2).sum(1)
            if np.max(np.abs(h2n - h2)) < 1e-6:
                h2 = h2n
                break
            h2 = h2n
        return L, {"converged": it < 499, "iterations": it + 1}
    if method == "ml":
        def obj(psi):
            s = 1 / np.sqrt(psi)
            Ss = R * np.outer(s, s)
            e = np.sort(np.linalg.eigvalsh(Ss))[::-1][k:]
            return -np.sum(np.log(e) - e) - k + p

        res = optimize.minimize(obj, psi0, method="L-BFGS-B", bounds=[(0.005, 1.0)] * p)
        psi = res.x
        s = np.sqrt(psi)
        Ss = R / np.outer(s, s)
        w, V = np.linalg.eigh(Ss)
        idx = np.argsort(w)[::-1][:k]
        L = s[:, None] * V[:, idx] * np.sqrt(np.clip(w[idx] - 1, 0, None))
        return L, {"converged": bool(res.success), "fmin": float(res.fun), "psi": psi}

    # minres / ULS
    def obj(psi):
        L = _loadings_from_psi(R, psi, k)
        Res = R - L @ L.T
        np.fill_diagonal(Res, 0)
        return np.sum(Res ** 2)

    res = optimize.minimize(obj, psi0, method="L-BFGS-B", bounds=[(0.005, 1.0)] * p)
    L = _loadings_from_psi(R, res.x, k)
    return L, {"converged": bool(res.success)}


# --------------------------------------------------------------------------- rotacje (GPA)
def _vgq_varimax(L):
    QL = L ** 2 - (L ** 2).mean(0)
    return -np.sum(QL ** 2) / 4, -L * QL


def _vgq_quartimax(L):
    return -np.sum(L ** 4) / 4, -L ** 3


def _vgq_oblimin(L, gamma=0.0):
    p, k = L.shape
    N = np.ones((k, k)) - np.eye(k)
    C = np.ones((p, p)) / p
    X = (np.eye(p) - gamma * C) @ (L ** 2) @ N
    return np.sum(L ** 2 * X) / 4, L * X


def _vgq_geomin(L, eps=0.01):
    k = L.shape[1]
    L2 = L ** 2 + eps
    pro = np.exp(np.log(L2).sum(1) / k)
    return np.sum(pro), (2 / k) * L / L2 * pro[:, None]


def _gpf_orth(A, vgq, maxit=1000, eps=1e-6):
    k = A.shape[1]
    T = np.eye(k)
    L = A @ T
    f, Gq = vgq(L)
    G = A.T @ Gq
    al = 1.0
    for _ in range(maxit):
        M = T.T @ G
        Sm = (M + M.T) / 2
        Gp = G - T @ Sm
        s = np.linalg.norm(Gp)
        if s < eps:
            break
        al *= 2
        for _ in range(12):
            X = T - al * Gp
            U, _, Vt = np.linalg.svd(X)
            Tt = U @ Vt
            L = A @ Tt
            ft, Gq = vgq(L)
            if ft < f - 0.5 * s ** 2 * al:
                break
            al /= 2
        T, f = Tt, ft
        G = A.T @ Gq
    return A @ T, T


def _gpf_oblq(A, vgq, maxit=1000, eps=1e-6):
    k = A.shape[1]
    T = np.eye(k)
    Ti = np.linalg.inv(T)
    L = A @ Ti.T
    f, Gq = vgq(L)
    G = -(L.T @ Gq @ Ti).T
    al = 1.0
    for _ in range(maxit):
        Gp = G - T @ np.diag(np.sum(T * G, 0))
        s = np.linalg.norm(Gp)
        if s < eps:
            break
        al *= 2
        for _ in range(12):
            X = T - al * Gp
            v = 1 / np.sqrt(np.sum(X ** 2, 0))
            Tt = X * v
            Ti = np.linalg.inv(Tt)
            L = A @ Ti.T
            ft, Gq = vgq(L)
            if ft < f - 0.5 * s ** 2 * al:
                break
            al /= 2
        T, f = Tt, ft
        G = -(L.T @ Gq @ Ti).T
    return A @ np.linalg.inv(T).T, T.T @ T


def _kaiser(A):
    h = np.sqrt((A ** 2).sum(1))
    h[h == 0] = 1
    return A / h[:, None], h


def rotate(L, method="oblimin"):
    """Returns (pattern loadings, Phi). Orthogonal rotations have Phi = I."""
    k = L.shape[1]
    if k == 1 or method in ("none", None):
        return L.copy(), np.eye(k)
    if method == "varimax":  # with Kaiser normalization, like stats::varimax
        An, h = _kaiser(L)
        Lr, _ = _gpf_orth(An, _vgq_varimax)
        return Lr * h[:, None], np.eye(k)
    if method == "quartimax":  # bez normalizacji, jak GPArotation
        Lr, _ = _gpf_orth(L, _vgq_quartimax)
        return Lr, np.eye(k)
    if method == "promax":
        V, _ = rotate(L, "varimax")
        Q = V * np.abs(V) ** 3
        U = np.linalg.lstsq(V, Q, rcond=None)[0]
        d = np.diag(np.linalg.inv(U.T @ U))
        U = U @ np.diag(np.sqrt(d))
        Lr = V @ U
        Ui = np.linalg.inv(U)
        return Lr, Ui @ Ui.T
    vgq = {"oblimin": _vgq_oblimin, "quartimin": _vgq_oblimin, "geomin": _vgq_geomin}[method]
    return _gpf_oblq(L, vgq)


def tidy(L, Phi):
    """Column signs positive, order by sum of squares."""
    L = L.copy()
    Phi = Phi.copy()
    sg = np.sign(L.sum(0))
    sg[sg == 0] = 1
    L *= sg
    Phi = Phi * np.outer(sg, sg)
    ss = (L ** 2).sum(0) if np.allclose(Phi, np.eye(len(Phi))) else np.diag(Phi @ L.T @ L)
    o = np.argsort(-ss)
    return L[:, o], Phi[np.ix_(o, o)]


def efa(R, k, extraction="minres", rotation="oblimin"):
    L0, info = extract(R, k, extraction)
    L, Phi = rotate(L0, rotation if k > 1 else "none")
    L, Phi = tidy(L, Phi)
    h2 = np.einsum("ij,jk,ik->i", L, Phi, L)
    Res = R - L @ Phi @ L.T
    np.fill_diagonal(Res, 0)
    p = R.shape[0]
    rmsr = float(np.sqrt(np.sum(Res ** 2) / (p * (p - 1))))
    S = L @ Phi
    ssl = np.diag(Phi @ L.T @ L) if rotation not in ("varimax", "quartimax", "none") else (L ** 2).sum(0)
    return {"loadings": L, "phi": Phi, "h2": h2, "structure": S, "rmsr": rmsr, "ss": ssl, "var_explained": ssl / p, "info": info}


# --------------------------------------------------------------------------- number of factors
def parallel(n, p, iters=100, seed=1, pct=95):
    rng = np.random.default_rng(seed)
    ev = np.zeros((iters, p))
    for i in range(iters):
        Z = rng.standard_normal((n, p))
        ev[i] = np.sort(np.linalg.eigvalsh(np.corrcoef(Z, rowvar=False)))[::-1]
    return np.percentile(ev, pct, axis=0), ev.mean(0)


def _count_leading(a, b):
    k = 0
    for x, y in zip(a, b):
        if x > y:
            k += 1
        else:
            break
    return k


def velicer_map(R):
    p = R.shape[0]
    w, V = np.linalg.eigh(R)
    o = np.argsort(w)[::-1]
    w, V = w[o], V[:, o]
    L = V * np.sqrt(np.clip(w, 0, None))
    off = ~np.eye(p, dtype=bool)
    vals = [np.mean(R[off] ** 2)]
    for m in range(1, p - 1):
        Lm = L[:, :m]
        C = R - Lm @ Lm.T
        d = np.sqrt(np.clip(np.diag(C), 1e-12, None))
        Pm = C / np.outer(d, d)
        vals.append(np.mean(Pm[off] ** 2))
    return int(np.argmin(vals)), vals


def optimal_coordinates(ev, ref):
    p = len(ev)
    k = 0
    for i in range(p - 2):
        pred = ev[i + 1] + (ev[p - 1] - ev[i + 1]) * ((i) - (i + 1)) / ((p - 1) - (i + 1))
        if ev[i] > pred and ev[i] > ref[i]:
            k += 1
        else:
            break
    return max(k, 1)


def acceleration_factor(ev):
    p = len(ev)
    af = [ev[i + 1] - 2 * ev[i] + ev[i - 1] for i in range(1, p - 1)]
    return max(int(np.argmax(af)) + 1 - 1, 1) if af else 1


def ekc(ev, n):
    p = len(ev)
    k = 0
    for j in range(p):
        ref = max(((1 + math.sqrt(p / n)) ** 2) * (p - sum(ev[:j])) / (p - j), 1)
        if ev[j] > ref:
            k += 1
        else:
            break
    return max(k, 1)


def _ml_stats(R, k, n):
    p = R.shape[0]
    if k == 0:
        F = -np.linalg.slogdet(R)[1]
    else:
        L, info = extract(R, k, "ml")
        Sig = L @ L.T + np.diag(np.clip(1 - (L ** 2).sum(1), 0.005, None))
        F = np.linalg.slogdet(Sig)[1] + np.trace(R @ np.linalg.inv(Sig)) - np.linalg.slogdet(R)[1] - p
    df = ((p - k) ** 2 - (p + k)) / 2
    chi2 = (n - 1 - (2 * p + 5) / 6 - 2 * k / 3) * F
    return float(chi2), float(df)


def bic_k(R, n, kmax):
    best, vals = None, {}
    for k in range(1, kmax + 1):
        chi2, df = _ml_stats(R, k, n)
        if df < 0:
            break
        vals[k] = chi2 - df * math.log(n)
        if best is None or vals[k] < vals[best]:
            best = k
    return best or 1, vals


def hull(R, n, kmax):
    p = R.shape[0]
    chi0, df0 = _ml_stats(R, 0, n)
    pts = [(0, 0.0, 0.0)]
    for k in range(1, kmax + 1):
        chi2, df = _ml_stats(R, k, n)
        if df < 0:
            break
        cfi = 1 - max(chi2 - df, 0) / max(chi0 - df0, chi2 - df, 1e-12)
        npar = p * k - k * (k - 1) / 2
        pts.append((k, npar, cfi))
    # only increasing fit
    mono = [pts[0]]
    for pt in pts[1:]:
        if pt[2] > mono[-1][2]:
            mono.append(pt)
    # upper convex hull
    changed = True
    while changed and len(mono) > 2:
        changed = False
        for i in range(1, len(mono) - 1):
            (k0, x0, y0), (k1, x1, y1), (k2, x2, y2) = mono[i - 1], mono[i], mono[i + 1]
            ylin = y0 + (y2 - y0) * (x1 - x0) / (x2 - x0)
            if y1 <= ylin:
                mono.pop(i)
                changed = True
                break
    if len(mono) < 3:
        return mono[-1][0] if len(mono) > 1 else 1
    st = []
    for i in range(1, len(mono) - 1):
        (k0, x0, y0), (k1, x1, y1), (k2, x2, y2) = mono[i - 1], mono[i], mono[i + 1]
        a = (y1 - y0) / (x1 - x0)
        b = (y2 - y1) / (x2 - x1)
        st.append((a / b if b > 0 else np.inf, k1))
    return max(st)[1]


def vss1(R, kmax):
    off = ~np.eye(R.shape[0], dtype=bool)
    best, bk = -1, 1
    for k in range(1, kmax + 1):
        L = efa(R, k, "minres", "varimax")["loadings"]
        Ls = np.zeros_like(L)
        j = np.argmax(np.abs(L), 1)
        Ls[np.arange(L.shape[0]), j] = L[np.arange(L.shape[0]), j]
        Res = R - Ls @ Ls.T
        v = 1 - np.sum(Res[off] ** 2) / np.sum(R[off] ** 2)
        if v > best:
            best, bk = v, k
    return bk


CRITERIA_META = [
    ("pa", "Analiza równoległa", "Horn (1965)", "rec"),
    ("hull", "Metoda Hulla", "Lorenzo-Seva i in. (2011)", "rec"),
    ("ekc", "Empiryczne kryterium Kaisera", "Braeken i van Assen (2017)", "std"),
    ("oc", "Współrzędne optymalne", "Raîche i in. (2013)", "std"),
    ("map", "MAP Velicera", "Velicer (1976)", "std"),
    ("bic", "BIC modeli EFA", "Schwarz (1978)", "std"),
    ("kaiser", "Kryterium Kaisera", "Kaiser (1960)", "aux"),
    ("vss", "VSS, złożoność 1", "Revelle i Rocklin (1979)", "aux"),
    ("af", "Czynnik przyspieszenia", "Raîche i in. (2013)", "aux"),
]


def n_factors(R, n, seed=1, iters=100):
    p = R.shape[0]
    ev = np.sort(np.linalg.eigvalsh(R))[::-1]
    pa95, pamean = parallel(n, p, iters=iters, seed=seed)
    k_pa = max(_count_leading(ev, pa95), 1)
    kmax = int(min(max(k_pa + 3, 6), p - 2)) or 1
    res = {
        "pa": k_pa,
        "kaiser": max(int(np.sum(ev > 1)), 1),
        "map": max(velicer_map(R)[0], 1),
        "oc": optimal_coordinates(ev, pamean),
        "af": acceleration_factor(ev),
        "ekc": ekc(ev, n),
    }
    try:
        res["bic"] = bic_k(R, n, kmax)[0]
    except Exception:
        pass
    try:
        res["hull"] = hull(R, n, kmax)
    except Exception:
        pass
    try:
        res["vss"] = vss1(R, kmax)
    except Exception:
        pass
    weights = {"rec": 2.0, "std": 1.0, "aux": 0.5}
    votes = {}
    crit = []
    for cid, name, src, kind in CRITERIA_META:
        if cid not in res:
            continue
        k = int(res[cid])
        votes[k] = votes.get(k, 0) + weights[kind]
        crit.append({"id": cid, "name": I18N.T(name), "source": I18N.T(src), "k": k, "recommended": kind == "rec", "aux": kind == "aux"})
    best = sorted(votes.items(), key=lambda kv: (-kv[1], abs(kv[0] - k_pa)))[0][0]
    agree = sum(1 for c in crit if c["k"] == best)
    agree_rec = sum(1 for c in crit if c["k"] == best and c["recommended"])
    return {"eigenvalues": ev.tolist(), "parallel": pa95.tolist(), "criteria": crit, "consensus": int(best),
            "agree": agree, "agree_rec": agree_rec, "n_rec": sum(1 for c in crit if c["recommended"]), "seed": seed}


# --------------------------------------------------------------------------- stability and scores
def _match(Lb, L):
    """Permutation and column signs of Lb that best match L (Tucker's congruence)."""
    k = L.shape[1]
    num = L.T @ Lb
    den = np.sqrt(np.outer((L ** 2).sum(0), (Lb ** 2).sum(0)))
    C = num / np.where(den == 0, 1, den)
    from itertools import permutations
    best, bp = -1, None
    if k <= 7:
        for perm in permutations(range(k)):
            s = sum(abs(C[i, perm[i]]) for i in range(k))
            if s > best:
                best, bp = s, perm
    else:
        bp = tuple(np.argmax(np.abs(C), 1))
    out = np.zeros_like(Lb)
    for i in range(k):
        out[:, i] = Lb[:, bp[i]] * (1 if C[i, bp[i]] >= 0 else -1)
    return out


def stability(X, k, L, kind="pearson", extraction="minres", rotation="oblimin", B=200, seed=1, progress=None):
    rng = np.random.default_rng(seed)
    n = X.shape[0]
    prim = np.argmax(np.abs(L), 1)
    hits = np.zeros(L.shape[0])
    ok = 0
    for b in range(B):
        idx = rng.integers(0, n, n)
        try:
            Rb, _ = correlation(X[idx], kind)
            Lb = efa(Rb, k, extraction, rotation)["loadings"]
            Lb = _match(Lb, L)
            hits += (np.argmax(np.abs(Lb), 1) == prim)
            ok += 1
        except Exception:
            pass
        if progress and (b % 5 == 0 or b == B - 1):
            progress(b + 1, B)
    return (hits / max(ok, 1)).tolist(), ok


def factor_scores(Z, R, L, Phi, method="regression"):
    if method == "bartlett":
        h2 = np.einsum("ij,jk,ik->i", L, Phi, L)
        Ui = np.diag(1 / np.clip(1 - h2, 1e-3, None))
        W = Ui @ L @ np.linalg.inv(L.T @ Ui @ L)
        return Z @ W
    W = np.linalg.solve(R, L @ Phi)
    return Z @ W


def split_sample(n, seed=1, strata=None, frac=0.5):
    rng = np.random.default_rng(seed)
    a = np.zeros(n, bool)
    if strata is None:
        idx = rng.permutation(n)
        a[idx[: int(round(n * frac))]] = True
    else:
        strata = np.asarray(strata)
        for s in np.unique(strata):
            ids = np.where(strata == s)[0]
            ids = rng.permutation(ids)
            a[ids[: int(round(len(ids) * frac))]] = True
    return a
