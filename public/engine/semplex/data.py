"""Moduł danych: odczyt pliku z wykrywaniem kodowania i separatorów, typy zmiennych, kody braków,
dane osobowe, skale odpowiedzi tekstowych, wyniki skal, pozycje do odwrócenia, nieuważni
respondenci, odstający, wzorce braków, test MCAR Little'a, kowariancja EM.
Licencja MIT.
"""
import io
import math
import re
import unicodedata
import numpy as np
import pandas as pd
from scipy import stats

# --------------------------------------------------------------------------- odczyt pliku
_PL = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")


def decode(raw, encoding="auto"):
    if encoding != "auto":
        return raw.decode(encoding, errors="replace"), encoding
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw[3:].decode("utf-8", errors="replace"), "utf-8"
    try:
        return raw.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return raw.decode("cp1250", errors="replace"), "windows-1250"


def detect_sep(text):
    lines = [l for l in text.splitlines()[:30] if l.strip()]
    best, score = ",", -1
    for sep in [";", ",", "\t", "|"]:
        counts = [l.count(sep) for l in lines]
        if not counts or counts[0] == 0:
            continue
        mode = max(set(counts), key=counts.count)
        consistency = counts.count(mode) / len(counts)
        s = consistency * 10 + min(mode, 50) / 50
        if s > score:
            best, score = sep, s
    return best


def detect_decimal(text, sep):
    if sep == ",":
        return "."
    body = "\n".join(text.splitlines()[1:200])
    comma = len(re.findall(r"(?<![\d.,])\d+,\d+(?![\d.,])", body))
    dot = len(re.findall(r"(?<![\d.,])\d+\.\d+(?![\d.,])", body))
    return "," if comma > dot else "."


def sniff(raw, filename, encoding="auto", sep="auto", decimal="auto", header=True):
    name = filename.lower()
    if name.endswith((".xlsx", ".xlsm", ".xls")):
        df = pd.read_excel(io.BytesIO(raw), header=0 if header else None)
        return {"kind": "excel", "encoding": "—", "sep": "—", "decimal": "—", "sample": "", "replacement_chars": 0}, df
    if name.endswith((".sav", ".dta", ".sas7bdat", ".parquet")):
        raise ValueError("unsupported:" + name.rsplit(".", 1)[-1])
    text, enc = decode(raw, encoding)
    s = detect_sep(text) if sep == "auto" else ("\t" if sep == "tab" else sep)
    d = detect_decimal(text, s) if decimal == "auto" else decimal
    df = pd.read_csv(io.StringIO(text), sep=s, decimal=d, header=0 if header else None, dtype=str, keep_default_na=False, engine="python")
    sample_lines = text.splitlines()[:8]
    return {"kind": "text", "encoding": enc, "sep": s, "decimal": d, "sample": "\n".join(sample_lines)[:2000],
            "replacement_chars": text.count("\ufffd")}, df


def sanitize(name, used):
    n = unicodedata.normalize("NFKC", str(name)).translate(_PL)
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode()
    n = re.sub(r"[^A-Za-z0-9_]+", "_", n).strip("_") or "zmienna"
    if not n[0].isalpha():
        n = "v_" + n
    base, i = n[:40], 2
    n = base
    while n in used:
        n = f"{base}_{i}"
        i += 1
    used.add(n)
    return n


# --------------------------------------------------------------------------- skale tekstowe
LIKERT = [
    ["zdecydowanie się nie zgadzam", "raczej się nie zgadzam", "ani się zgadzam, ani nie zgadzam", "raczej się zgadzam", "zdecydowanie się zgadzam"],
    ["zdecydowanie nie", "raczej nie", "trudno powiedzieć", "raczej tak", "zdecydowanie tak"],
    ["zdecydowanie się nie zgadzam", "nie zgadzam się", "raczej się nie zgadzam", "ani się zgadzam, ani nie zgadzam", "raczej się zgadzam", "zgadzam się", "zdecydowanie się zgadzam"],
    ["strongly disagree", "disagree", "neither agree nor disagree", "agree", "strongly agree"],
    ["strongly disagree", "disagree", "somewhat disagree", "neither agree nor disagree", "somewhat agree", "agree", "strongly agree"],
]


def _norm_text(s):
    s = str(s).strip().lower().translate(_PL)
    return re.sub(r"[\s,;.]+", " ", s).strip()


def match_scale(values):
    vals = {_norm_text(v) for v in values if str(v).strip() != ""}
    if not vals:
        return None
    for sc in LIKERT:
        normed = [_norm_text(x) for x in sc]
        alts = set(normed) | {n.replace("ani sie zgadzam ani nie zgadzam", "trudno powiedziec") for n in normed}
        if vals <= alts and len(vals) >= 3:
            return sc
    return None


def scale_map(sc):
    m = {}
    for i, lab in enumerate(sc):
        m[_norm_text(lab)] = i + 1
    if len(sc) % 2 == 1:
        m["trudno powiedziec"] = (len(sc) + 1) // 2
    return m


# --------------------------------------------------------------------------- dane osobowe
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
_PHONE = re.compile(r"^\+?[\d\s\-()]{9,}$")
_PII_NAMES = re.compile(r"(e-?mail|mail|telefon|phone|^tel|imi[eę]|nazwisk|^name|first.?name|last.?name|adres|address|pesel|ip.?addr)", re.I)


def pii_kind(colname, values):
    v = [str(x).strip() for x in values if str(x).strip()][:200]
    if v and sum(bool(_EMAIL.match(x)) for x in v) / len(v) > 0.6:
        return "e-mail"
    if v and sum(bool(_PHONE.match(x)) for x in v) / len(v) > 0.6 and not all(re.fullmatch(r"-?\d+", x) and len(x) < 9 for x in v):
        return "telefon"
    m = _PII_NAMES.search(str(colname))
    if m:
        t = m.group(1).lower()
        if "mail" in t:
            return "e-mail"
        if "tel" in t or "phone" in t:
            return "telefon"
        if "pesel" in t:
            return "PESEL"
        if "adres" in t or "address" in t or "ip" in t:
            return "adres"
        return "imię lub nazwisko"
    return None


def mask(value, kind):
    s = str(value)
    if not s:
        return ""
    if kind == "e-mail" and "@" in s:
        a, b = s.split("@", 1)
        return a[:1] + "•••@" + b
    return s[:1] + "•" * max(len(s) - 1, 3)


# --------------------------------------------------------------------------- typy i braki
DEFAULT_MISSING = ["", "-99", "-9", "NA", "N/A", "brak", "brak odpowiedzi", "nie wiem", "odmowa"]


def to_numeric(series, decimal="."):
    s = series.astype(str).str.strip()
    if decimal == ",":
        s = s.str.replace(r"(?<=\d),(?=\d)", ".", regex=True)
    return pd.to_numeric(s.str.replace("\u2212", "-", regex=False), errors="coerce")


def infer_type(series_num, series_raw, colname=""):
    nonmiss = series_raw[series_raw.astype(str).str.strip() != ""]
    if len(nonmiss) == 0:
        return "text"
    num_ok = series_num.notna().sum() / max(len(nonmiss), 1)
    if num_ok > 0.95:
        x = series_num.dropna()
        u = np.unique(x)
        if (str(colname).lower() in ("id", "lp", "nr", "respondent", "resp_id", "record") or
                (len(u) == len(x) and len(x) > 20 and np.allclose(x, np.round(x)) and np.all(np.diff(x.to_numpy()) > 0))):
            return "id"
        if len(u) <= 2:
            return "binary"
        if np.allclose(x, np.round(x)) and len(u) <= 11:
            return "ordinal"
        return "continuous"
    head = nonmiss.head(50)
    if head.str.fullmatch(r"\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}([ T]\d{1,2}:\d{2}(:\d{2})?)?").mean() > 0.9:
        return "date"
    u = nonmiss.nunique()
    if u <= 2:
        return "binary"
    if u <= 15:
        return "nominal"
    return "text"


def inspect(df_raw, info, missing_codes):
    """Tabela zmiennych do ekranu importu."""
    used = set()
    codes = set(str(c).strip() for c in missing_codes)
    cols = []
    for col in df_raw.columns:
        raw = df_raw[col].astype(str)
        is_miss = raw.str.strip().isin(codes)
        clean = raw.where(~is_miss, "")
        num = to_numeric(clean.where(clean != "", np.nan), info.get("decimal", "."))
        t = infer_type(num, clean, col)
        numeric = bool(num.notna().sum() >= 0.95 * max((clean != "").sum(), 1))
        sc = match_scale(clean.unique()) if t in ("nominal", "text") else None
        pii = pii_kind(col, clean.unique()[:300])
        name = sanitize(col, used)
        example = [mask(x, pii) if pii else str(x) for x in clean[clean != ""].head(3).tolist()]
        cols.append({"source": str(col), "name": name, "type": "skip" if (pii or t == "id") else ("ordinal" if sc else t), "detected": t, "pii": pii,
                     "numeric": numeric,
                     "scale": sc, "missing_cells": int((is_miss & (raw.str.strip() != "")).sum()), "empty_cells": int((raw.str.strip() == "").sum()),
                     "unique": int(clean[clean != ""].nunique()), "example": example})
    code_counts = {}
    for c in codes:
        if c == "":
            continue
        code_counts[c] = int((df_raw.astype(str).apply(lambda s: s.str.strip()) == c).to_numpy().sum())
    return cols, code_counts


def build(df_raw, columns, missing_codes, decimal=".", reverse_scale=False):
    codes = set(str(c).strip() for c in missing_codes)
    out, meta = {}, []
    for c in columns:
        if c["type"] == "skip":
            continue
        raw = df_raw[c["source"]].astype(str)
        raw = raw.where(~raw.str.strip().isin(codes), "")
        if c.get("scale"):
            m = scale_map(c["scale"])
            vals = raw.map(lambda v: m.get(_norm_text(v), np.nan) if str(v).strip() else np.nan).astype(float)
            if reverse_scale:
                vals = len(c["scale"]) + 1 - vals
            out[c["name"]] = vals
            labels = {str(i + 1): lab for i, lab in enumerate(c["scale"][::-1] if reverse_scale else c["scale"])}
            meta.append({"name": c["name"], "label": c["source"], "type": "ordinal", "value_labels": labels})
        elif c["type"] in ("continuous", "ordinal", "binary", "nominal") and c.get("numeric"):
            out[c["name"]] = to_numeric(raw.where(raw.str.strip() != "", np.nan), decimal)
            meta.append({"name": c["name"], "label": c["source"], "type": c["type"]})
        else:
            s = raw.where(raw.str.strip() != "", None)
            if c["type"] in ("nominal", "binary"):
                cats = sorted([x for x in s.dropna().unique()])
                codes_map = {k: i + 1 for i, k in enumerate(cats)}
                out[c["name"]] = s.map(lambda v: codes_map.get(v, np.nan) if v is not None else np.nan).astype(float)
                meta.append({"name": c["name"], "label": c["source"], "type": c["type"], "value_labels": {str(v): k for k, v in codes_map.items()}})
            # tekst i daty pomijamy w danych analitycznych
    df = pd.DataFrame(out)
    return df, meta


# --------------------------------------------------------------------------- skale i pozycje
def guess_scales(names):
    """Grupuje pozycje po wspólnym przedrostku literowym (SAT1, SAT2 → SAT)."""
    groups = {}
    for n in names:
        m = re.match(r"^([A-Za-z]+?)_?(\d+)[a-zA-Z]?$", n)
        if m:
            groups.setdefault(m.group(1).upper(), []).append(n)
    return {k: v for k, v in groups.items() if len(v) >= 2}


def item_rest(df, items):
    X = df[items]
    tot = X.sum(axis=1, min_count=len(items))
    out = {}
    for it in items:
        rest = tot - X[it]
        ok = X[it].notna() & rest.notna()
        out[it] = float(np.corrcoef(X[it][ok], rest[ok])[0, 1]) if ok.sum() > 3 else float("nan")
    return out


def cronbach_alpha(X):
    X = X[~np.isnan(X).any(1)]
    k = X.shape[1]
    if k < 2 or X.shape[0] < 3:
        return float("nan")
    v = X.var(0, ddof=1).sum()
    t = X.sum(1).var(ddof=1)
    return float(k / (k - 1) * (1 - v / t)) if t > 0 else float("nan")


def reverse_value(x, lo, hi):
    return lo + hi - x


# --------------------------------------------------------------------------- nieuważni i odstający
def longstring(X):
    out = np.zeros(X.shape[0], int)
    for r in range(X.shape[0]):
        best = cur = 1
        row = X[r]
        for j in range(1, len(row)):
            if not np.isnan(row[j]) and row[j] == row[j - 1]:
                cur += 1
                best = max(best, cur)
            else:
                cur = 1
        out[r] = best
    return out


def irv(X):
    return np.nanstd(X, axis=1, ddof=1)


def mahalanobis(X):
    ok = ~np.isnan(X).any(1)
    d2 = np.full(X.shape[0], np.nan)
    Xo = X[ok]
    if Xo.shape[0] <= X.shape[1] + 1:
        return d2, np.full(X.shape[0], np.nan)
    mu = Xo.mean(0)
    Si = np.linalg.pinv(np.cov(Xo, rowvar=False))
    D = Xo - mu
    d2[ok] = np.einsum("ij,jk,ik->i", D, Si, D)
    p = np.full(X.shape[0], np.nan)
    p[ok] = stats.chi2.sf(d2[ok], X.shape[1])
    return d2, p


# --------------------------------------------------------------------------- braki
def missing_patterns(df, vars_, top=8):
    M = df[vars_].isna()
    pats = M.apply(lambda r: tuple(np.array(vars_)[r.to_numpy()]), axis=1)
    vc = pats.value_counts()
    out = []
    for pat, cnt in vc.head(top).items():
        out.append({"missing": list(pat), "count": int(cnt), "label": "komplet" if not pat else None})
    return out


def em_cov(X, maxit=200, tol=1e-6):
    n, p = X.shape
    mu = np.nanmean(X, 0)
    S = np.diag(np.nanvar(X, 0))
    miss = np.isnan(X)
    for it in range(maxit):
        Xh = np.where(miss, 0, X).astype(float)
        C = np.zeros((p, p))
        for i in range(n):
            m = miss[i]
            if not m.any():
                continue
            o = ~m
            if o.any():
                Soo = S[np.ix_(o, o)]
                Smo = S[np.ix_(m, o)]
                B = Smo @ np.linalg.pinv(Soo)
                Xh[i, m] = mu[m] + B @ (X[i, o] - mu[o])
                C[np.ix_(m, m)] += S[np.ix_(m, m)] - B @ Smo.T
            else:
                Xh[i, m] = mu[m]
                C[np.ix_(m, m)] += S[np.ix_(m, m)]
        mu_n = Xh.mean(0)
        D = Xh - mu_n
        S_n = (D.T @ D + C) / n
        if np.max(np.abs(S_n - S)) < tol and np.max(np.abs(mu_n - mu)) < tol:
            mu, S = mu_n, S_n
            break
        mu, S = mu_n, S_n
    return mu, S


def little_mcar(X):
    n, p = X.shape
    miss = np.isnan(X)
    if not miss.any():
        return None
    mu, S = em_cov(X)
    keys = [tuple(r) for r in miss]
    groups = {}
    for i, k in enumerate(keys):
        groups.setdefault(k, []).append(i)
    d2, df = 0.0, 0
    for k, rows in groups.items():
        o = ~np.array(k)
        if not o.any():
            continue
        xo = np.nanmean(X[np.ix_(rows, np.where(o)[0])], 0)
        diff = xo - mu[o]
        d2 += len(rows) * diff @ np.linalg.pinv(S[np.ix_(o, o)]) @ diff
        df += o.sum()
    df -= p
    if df <= 0:
        return None
    return {"chi2": float(d2), "df": int(df), "p": float(stats.chi2.sf(d2, df))}


# --------------------------------------------------------------------------- opis zmiennej
def histogram(x, kind, cats=None):
    x = x[~np.isnan(x)]
    if len(x) == 0:
        return [], []
    if kind in ("ordinal", "binary", "nominal"):
        cats = cats if cats is not None else np.unique(x)
        return [int((x == c).sum()) for c in cats], [fmt_cat(c) for c in cats]
    counts, edges = np.histogram(x, bins=min(12, max(5, int(math.sqrt(len(x))))))
    return counts.astype(int).tolist(), [f"{edges[i]:.3g}" for i in range(len(counts))]


def fmt_cat(c):
    return str(int(c)) if float(c).is_integer() else str(c)


def describe_var(x):
    xs = x[~np.isnan(x)]
    n = len(xs)
    if n == 0:
        return {"n": 0}
    return {"n": int(n), "missing": int(np.isnan(x).sum()), "missing_pct": float(np.isnan(x).mean()),
            "mean": float(xs.mean()), "sd": float(xs.std(ddof=1)) if n > 1 else float("nan"), "median": float(np.median(xs)),
            "min": float(xs.min()), "max": float(xs.max()),
            "skew": float(stats.skew(xs, bias=False)) if n > 2 else float("nan"),
            "kurt": float(stats.kurtosis(xs, bias=False)) if n > 3 else float("nan"),
            "floor": float((xs == xs.min()).mean()), "ceiling": float((xs == xs.max()).mean())}
