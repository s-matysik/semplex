"""Warstwa sesji dla interfejsu: stan danych w pamięci przeglądarki i polecenia JSON.

Każda funkcja publiczna przyjmuje słownik i zwraca słownik gotowy do JSON (bez NaN).
Długie obliczenia mają postać zadań: job_start → job_step (porcjami) → job_result.
"""
import json
import math
import time
import numpy as np
import pandas as pd

from . import __version__
from . import data as D
from . import efa as E
from . import sem as S
from . import measure as M
from . import bridge as B
from . import mediation as MED

STATE = {"raw": None, "info": None, "base": None, "meta": {}, "changes": [], "work": None, "excluded": set(),
         "split": None, "split_seed": 1, "split_strata": None, "file": None, "sample_meta": None}
JOBS = {}
_JOB_SEQ = 0


# --------------------------------------------------------------------------- JSON
def _clean(o):
    if isinstance(o, dict):
        return {str(k): _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, np.ndarray):
        return _clean(o.tolist())
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        f = float(o)
        return f if math.isfinite(f) else None
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, set):
        return [_clean(v) for v in sorted(o)]
    return o


def call(name, payload_json):
    """Punkt wejścia z JavaScriptu: call('summary', '{}') → JSON."""
    t0 = time.time()
    try:
        fn = globals()[name]
        if name.startswith("_") or not callable(fn):
            raise KeyError(name)
        args = json.loads(payload_json) if payload_json else {}
        res = fn(**args)
        return json.dumps({"ok": True, "result": _clean(res), "ms": round((time.time() - t0) * 1000)}, ensure_ascii=False)
    except S.ModelError as e:
        return json.dumps({"ok": False, "kind": "model", "message": str(e)}, ensure_ascii=False)
    except Exception as e:  # komunikat techniczny trafia do „Szczegółów technicznych”
        import traceback
        return json.dumps({"ok": False, "kind": "engine", "message": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()[-3000:]}, ensure_ascii=False)


def version():
    import scipy
    return {"semplex": __version__, "numpy": np.__version__, "scipy": scipy.__version__, "pandas": pd.__version__}


# --------------------------------------------------------------------------- import
def sniff(filename, raw=None, path=None, encoding="auto", sep="auto", decimal="auto", header=True, missing_codes=None):
    if path is not None:
        with open(path, "rb") as fh:
            raw = fh.read()
    elif raw is None:
        raw = STATE.get("raw_bytes") or b""
    raw = bytes(raw) if not isinstance(raw, bytes) else raw
    info, df = D.sniff(raw, filename, encoding, sep, decimal, header)
    STATE["raw"], STATE["info"], STATE["file"] = df, info, filename
    STATE["raw_bytes"] = raw
    codes = D.DEFAULT_MISSING if missing_codes is None else missing_codes
    cols, code_counts = D.inspect(df, info, codes)
    preview = df.head(12).astype(str).values.tolist()
    pii_cols = {c["source"]: c["pii"] for c in cols if c["pii"]}
    for r in preview:
        for j, c in enumerate(df.columns):
            if c in pii_cols:
                r[j] = D.mask(r[j], pii_cols[c])
    return {"info": info, "n_rows": len(df), "n_cols": df.shape[1], "columns": cols, "code_counts": code_counts,
            "preview_header": [str(c) for c in df.columns], "preview": preview, "missing_codes": codes, "filename": filename}


def clean_source(columns):
    """Plik źródłowy bez kolumn pominiętych przy imporcie (m.in. danych osobowych) - do zapisu projektu.

    Zwraca tekst CSV (UTF-8, separator ',', wartości jak w pliku źródłowym) i ustawienia, z którymi trzeba go wczytać."""
    raw = STATE["raw"]
    keep = [c["source"] for c in columns if c.get("type") != "skip" and c["source"] in raw.columns]
    dec = STATE["info"].get("decimal", ".")
    if STATE["info"].get("kind") == "excel":
        dec = "."
    text = raw[keep].to_csv(index=False, sep=",", lineterminator="\n")
    return {"csv": text, "kept": keep, "dropped": [str(c) for c in raw.columns if c not in keep],
            "opts": {"encoding": "utf-8", "sep": ",", "decimal": dec, "header": True}}


def import_data(columns, missing_codes, reverse_scale=False, sample_meta=None):
    df, meta = D.build(STATE["raw"], columns, missing_codes, STATE["info"].get("decimal", "."), reverse_scale)
    sm = sample_meta or {}
    labels = sm.get("labels", {})
    metamap = {}
    for m in meta:
        src = m["label"]
        m["label"] = labels.get(m["name"], labels.get(src, src if src != m["name"] else ""))
        if "value_labels" not in m and m["type"] == "ordinal" and sm.get("likert"):
            m["value_labels"] = sm["likert"]
        metamap[m["name"]] = m
    scales = sm.get("scales") or D.guess_scales([m["name"] for m in meta if m["type"] in ("ordinal", "continuous")])
    STATE.update({"base": df, "meta": metamap, "changes": [], "excluded": set(), "split": None, "sample_meta": sm, "missing_codes": list(missing_codes or []),
                  "scales": {k: [i for i in v if i in df.columns] for k, v in scales.items()}, "scale_names": sm.get("scale_names", {})})
    _rebuild()
    return summary()


def _rebuild():
    df = STATE["base"].copy()
    excluded = set()
    for ch in STATE["changes"]:
        if ch["kind"] == "reverse" and ch["var"] in df.columns:
            x = df[ch["var"]]
            lo, hi = ch.get("lo", np.nanmin(STATE["base"][ch["var"]])), ch.get("hi", np.nanmax(STATE["base"][ch["var"]]))
            df[ch["var"]] = lo + hi - x
        elif ch["kind"] == "exclude":
            excluded |= set(int(r) for r in ch["rows"])
        elif ch["kind"] == "include":
            excluded -= set(int(r) for r in ch["rows"])
        elif ch["kind"] == "drop_var" and ch["var"] in df.columns:
            df = df.drop(columns=[ch["var"]])
    STATE["excluded"] = excluded
    STATE["work"] = df
    STATE["split"] = None


def set_changes(changes):
    STATE["changes"] = changes
    _rebuild()
    return summary()


def _analysis_df():
    df = STATE["work"]
    keep = [i for i in range(len(df)) if i not in STATE["excluded"]]
    return df.iloc[keep]


def _require():
    if STATE["work"] is None:
        raise S.ModelError("Wczytaj dane, zanim uruchomisz analizę.")


# --------------------------------------------------------------------------- przegląd danych
def summary():
    _require()
    df = STATE["work"]
    A = _analysis_df()
    vars_ = []
    rev = {c["var"] for c in STATE["changes"] if c["kind"] == "reverse"}
    for name in df.columns:
        m = STATE["meta"].get(name, {"type": "continuous", "label": ""})
        x = A[name].to_numpy(float)
        cats = None
        if m["type"] in ("ordinal", "binary", "nominal"):
            base = STATE["base"][name].dropna().unique()
            cats = np.sort(base)
        hist, labs = D.histogram(x, m["type"], cats)
        d = D.describe_var(x)
        vars_.append({"name": name, "label": m.get("label", ""), "type": m["type"], "hist": hist, "hist_labels": labs,
                      "missing": d.get("missing_pct", 0), "reversed": name in rev, **{k: d.get(k) for k in ("mean", "sd", "n")}})
    scales = []
    for sname, items in STATE["scales"].items():
        it = [i for i in items if i in A.columns]
        if len(it) >= 2:
            a = D.cronbach_alpha(A[it].to_numpy(float))
            ir = D.item_rest(A, it)
            scales.append({"id": sname, "name": STATE["scale_names"].get(sname, sname), "items": it, "alpha": a,
                           "flag": [k for k, v in ir.items() if v is not None and v < 0]})
    total_cells = A.shape[0] * A.shape[1]
    return {"file": STATE["file"], "n_total": len(df), "n": len(A), "n_excluded": len(STATE["excluded"]), "k": df.shape[1],
            "missing_pct": float(A.isna().to_numpy().sum() / max(total_cells, 1)), "variables": vars_, "scales": scales,
            "changes": STATE["changes"], "excluded": sorted(STATE["excluded"]), "complete_cases": int(A.dropna().shape[0])}


def rows(offset=0, limit=200, vars=None):
    _require()
    df = STATE["work"]
    cols = vars or list(df.columns)
    sub = df.iloc[offset:offset + limit][cols]
    return {"offset": offset, "columns": cols, "rows": [[None if (isinstance(v, float) and math.isnan(v)) else v for v in r] for r in sub.to_numpy().tolist()],
            "ids": list(range(offset + 1, offset + 1 + len(sub))), "total": len(df)}


def variable(name):
    _require()
    A = _analysis_df()
    m = STATE["meta"].get(name, {"type": "continuous"})
    x = A[name].to_numpy(float)
    cats = np.sort(STATE["base"][name].dropna().unique()) if m["type"] in ("ordinal", "binary", "nominal") else None
    hist, labs = D.histogram(x, m["type"], cats)
    d = D.describe_var(x)
    scale = None
    r_rest = None
    alpha = None
    alpha_rev = None
    for sname, items in STATE["scales"].items():
        if name in items:
            scale = sname
            it = [i for i in items if i in A.columns]
            r_rest = D.item_rest(A, it).get(name)
            alpha = D.cronbach_alpha(A[it].to_numpy(float))
            if r_rest is not None and r_rest < 0 and cats is not None:
                A2 = A[it].copy()
                A2[name] = cats.min() + cats.max() - A2[name]
                alpha_rev = D.cronbach_alpha(A2.to_numpy(float))
    vl = m.get("value_labels") or {}
    return {"name": name, "label": m.get("label", ""), "type": m["type"], "hist": hist, "hist_labels": labs,
            "value_labels": [{"value": k, "label": v} for k, v in vl.items()], "stats": d, "scale": scale,
            "scale_name": STATE["scale_names"].get(scale, scale), "r_rest": r_rest, "alpha": alpha, "alpha_reversed": alpha_rev,
            "lo": float(cats.min()) if cats is not None and len(cats) else None, "hi": float(cats.max()) if cats is not None and len(cats) else None}


def set_scales(scales, names=None):
    _require()
    STATE["scales"] = {k: [i for i in v if i in STATE["work"].columns] for k, v in scales.items() if v}
    if names:
        STATE["scale_names"].update(names)
    return summary()


def careless(items=None, time_var=None, ls_cut=None, time_cut=None, maha_p=0.001):
    _require()
    df = STATE["work"]
    items = items or [i for s in STATE["scales"].values() for i in s] or [c for c in df.columns if STATE["meta"].get(c, {}).get("type") == "ordinal"]
    X = df[items].to_numpy(float)
    Xraw = STATE["base"][items].to_numpy(float)  # odpowiedzi przed odwróceniem pozycji
    ls = D.longstring(Xraw)
    iv = D.irv(Xraw)
    d2, pm = D.mahalanobis(X)
    k = len(items)
    ls_cut = ls_cut or max(int(round(k * 0.75)), 6)
    t = df[time_var].to_numpy(float) if time_var and time_var in df.columns else None
    per_item = (t / k) if t is not None else None
    tcut = time_cut if time_cut is not None else (float(np.nanmedian(per_item) * 0.35) if per_item is not None else None)
    out = []
    for i in range(len(df)):
        reasons = []
        if ls[i] >= ls_cut:
            reasons.append(f"longstring {ls[i]}")
        if per_item is not None and per_item[i] < tcut:
            reasons.append(f"{per_item[i]:.1f} s na pozycję")
        if pm[i] < maha_p:
            reasons.append(f"Mahalanobis p = {pm[i]:.4f}")
        out.append({"row": i, "longstring": int(ls[i]), "irv": float(iv[i]), "d2": float(d2[i]), "p": float(pm[i]),
                    "sec_per_item": float(per_item[i]) if per_item is not None else None, "flag": bool(reasons), "reasons": reasons,
                    "both": bool(ls[i] >= ls_cut and per_item is not None and per_item[i] < tcut)})
    return {"items": items, "ls_cut": ls_cut, "time_cut": tcut, "time_var": time_var, "rows": out,
            "n_flag": sum(r["flag"] for r in out), "n_both": sum(r["both"] for r in out), "n_maha": int(np.sum(pm < maha_p))}


def missing(vars=None):
    _require()
    A = _analysis_df()
    vars = vars or [i for s in STATE["scales"].values() for i in s] or list(A.columns)
    X = A[vars].to_numpy(float)
    little = D.little_mcar(X) if np.isnan(X).any() else None
    return {"vars": vars, "patterns": D.missing_patterns(A, vars), "little": little, "complete": int((~np.isnan(X).any(1)).sum()),
            "n": len(A), "per_var": {v: float(A[v].isna().mean()) for v in vars}}


# --------------------------------------------------------------------------- opisowe
def descriptives(vars=None, method="pearson", group=None):
    _require()
    A = _analysis_df()
    vars = vars or [i for s in STATE["scales"].values() for i in s] or list(A.columns)
    rows_ = []
    for v in vars:
        m = STATE["meta"].get(v, {"type": "continuous"})
        x = A[v].to_numpy(float)
        cats = np.sort(STATE["base"][v].dropna().unique()) if m["type"] in ("ordinal", "binary") else None
        hist, _ = D.histogram(x, m["type"], cats)
        rows_.append({"var": v, "label": m.get("label", ""), "hist": hist, **D.describe_var(x)})
    R, P = M.correlations(A, vars, method)
    X = A[vars].to_numpy(float)
    mar = M.mardia(X) if X.shape[1] >= 2 and (~np.isnan(X).any(1)).sum() > X.shape[1] + 5 else None
    groups = []
    for sname, items in STATE["scales"].items():
        it = [i for i in items if i in vars]
        if it:
            groups.append({"label": sname, "vars": it})
    comp = []
    if group and group in A.columns:
        Ad = A.copy()
        vl = STATE["meta"].get(group, {}).get("value_labels")
        for sname, items in STATE["scales"].items():
            Ad[f"_{sname}"] = Ad[items].mean(axis=1)
            r = M.group_compare(Ad, f"_{sname}", group, vl)
            if r:
                comp.append({"scale": sname, "name": STATE["scale_names"].get(sname, sname), **r})
    return {"rows": rows_, "vars": vars, "r": R, "p": P, "n": len(A), "mardia": mar, "groups": groups, "compare": comp, "group": group}


# --------------------------------------------------------------------------- próba
def split(seed=1, strata=None, frac=0.5):
    _require()
    A = _analysis_df()
    st = A[strata].fillna(-1).to_numpy() if strata and strata in A.columns else None
    mask = E.split_sample(len(A), seed, st, frac)
    STATE["split"], STATE["split_seed"], STATE["split_strata"] = mask, seed, strata
    return {"n": len(A), "n_efa": int(mask.sum()), "n_cfa": int((~mask).sum()), "seed": seed, "strata": strata}


def analysis_csv(syntax, part="all", missing="listwise"):
    """Dane dokładnie w postaci użytej w analizie modelu: po przekodowaniu, odwróceniu pozycji, wykluczeniach i wyborze
    części próby; tylko zmienne modelu, z numerem wiersza pliku źródłowego. Z tym plikiem eksportowany kod odtwarza wynik."""
    _require()
    if missing == "em":
        # EM: eksport niepełnych danych (bez wierszy całkowicie pustych); kompletne przypadki nie odtwarzają kowariancji EM
        A_ = _part(part)
        obs = S.Spec(syntax, list(A_.columns)).obs
        d = A_[obs].dropna(how="all")
    else:
        d, C, n, obs, n_complete = _model_data(syntax, part, "listwise")
    steps = []
    for ch in STATE["changes"]:
        if ch["kind"] == "reverse":
            steps.append(f"odwrócono {ch['var']} (skala {ch.get('lo')}–{ch.get('hi')})")
        elif ch["kind"] == "exclude":
            steps.append(f"wykluczono {len(ch['rows'])} wierszy")
        elif ch["kind"] == "include":
            steps.append(f"przywrócono {len(ch['rows'])} wierszy")
        elif ch["kind"] == "drop_var":
            steps.append(f"usunięto zmienną {ch['var']}")
    out = d.copy()
    out.insert(0, "row_id", out.index.astype(int) + 1)
    return {"csv": out.to_csv(index=False, lineterminator="\n"), "n": int(len(out)), "vars": list(obs), "part": part,
            "split_seed": STATE.get("split_seed") if part in ("efa", "cfa") else None, "steps": steps,
            "missing_codes": STATE.get("missing_codes"), "missing": missing}


def _part(part):
    A = _analysis_df()
    if part in ("efa", "cfa"):
        if STATE["split"] is None or len(STATE["split"]) != len(A):
            split(STATE["split_seed"], STATE["split_strata"])
        mask = STATE["split"]
        return A[mask] if part == "efa" else A[~mask]
    return A


# --------------------------------------------------------------------------- rzetelność
def reliability(scales=None, part="all"):
    _require()
    A = _part(part)
    sc = scales or STATE["scales"]
    out = []
    for sname, items in sc.items():
        it = [i for i in items if i in A.columns]
        if len(it) < 2:
            continue
        r = M.scale_reliability(A, it)
        r["id"] = sname
        r["name"] = STATE["scale_names"].get(sname, sname)
        for row in r["item_rows"]:
            row["label"] = STATE["meta"].get(row["item"], {}).get("label", "")
        out.append(r)
    validity = None
    if len(out) >= 2:
        syn = "\n".join(f"{r['id']} =~ " + " + ".join(r["items"]) for r in out)
        used = [i for r in out for i in r["items"]]
        try:
            f = S.fit_model(syn, data=A[used].dropna(), se=False)
            validity = M.validity_from_cfa(f, {r["id"]: r["items"] for r in out}, A[used].dropna())
            validity["fit"] = f.fit
        except Exception as e:
            validity = {"error": str(e)}
    return {"scales": out, "validity": validity, "n": len(A), "part": part}


# --------------------------------------------------------------------------- EFA
def efa_run(items, corr="auto", extraction="minres", rotation="oblimin", k=None, part="efa", seed=1, iters=100):
    _require()
    A = _part(part)
    X = A[items].dropna().to_numpy(float)
    n = X.shape[0]
    if n < len(items) + 5:
        raise S.ModelError(f"Za mało kompletnych przypadków do EFA: {n} przy {len(items)} pozycjach.")
    kind = ("polychoric" if E.is_ordinal(X) else "pearson") if corr == "auto" else corr
    R, smoothed = E.correlation(X, kind)
    kmo, msa = E.kmo(R)
    chi2, df, p = E.bartlett(R, n)
    nf = E.n_factors(R, n, seed=seed, iters=iters)
    kk = int(k or nf["consensus"])
    sol = E.efa(R, kk, extraction, rotation)
    L = sol["loadings"]
    # nazwy czynników z większości pozycji skali
    names = []
    inv = {i: s for s, its in STATE["scales"].items() for i in its}
    prim = np.argmax(np.abs(L), 1)
    for j in range(kk):
        members = [items[i] for i in range(len(items)) if prim[i] == j]
        cnt = {}
        for it in members:
            if it in inv:
                cnt[inv[it]] = cnt.get(inv[it], 0) + 1
        tops = sorted(cnt.items(), key=lambda kv: -kv[1])
        if tops and tops[0][1] > len(members) / 2:
            nm = tops[0][0]
        elif len(tops) >= 2:
            nm = "+".join(t[0] for t in tops[:2])
        else:
            nm = f"F{j + 1}"
        names.append(nm)
    seen = {}
    for j, nm in enumerate(names):
        if nm in seen:
            names[j] = f"{nm}{j + 1}"
        seen[nm] = 1
    props = []
    for i, it in enumerate(items):
        row = np.abs(L[i])
        o = np.argsort(-row)
        top, second = row[o[0]], (row[o[1]] if kk > 1 else 0)
        if top < 0.40:
            props.append({"item": it, "kind": "weak", "top": float(L[i, o[0]]), "factor": names[o[0]], "h2": float(sol["h2"][i])})
        elif kk > 1 and second >= 0.30 and top - second < 0.20:
            props.append({"item": it, "kind": "cross", "top": float(L[i, o[0]]), "second": float(L[i, o[1]]), "factor": names[o[0]], "factor2": names[o[1]], "h2": float(sol["h2"][i])})
    for pr in props:
        pr["label"] = STATE["meta"].get(pr["item"], {}).get("label", "")
    return {"items": items, "labels": {it: STATE["meta"].get(it, {}).get("label", "") for it in items}, "n": n, "corr": kind, "smoothed": smoothed,
            "kmo": kmo, "msa": msa, "bartlett": {"chi2": chi2, "df": df, "p": p}, "nf": nf, "k": kk, "factor_names": names,
            "loadings": L, "phi": sol["phi"], "h2": sol["h2"], "rmsr": sol["rmsr"], "var_explained": sol["var_explained"],
            "total_explained": float(np.sum(sol["var_explained"])), "extraction": extraction, "rotation": rotation, "proposals": props,
            "part": part, "split": {"n_efa": int(STATE["split"].sum()) if STATE["split"] is not None else None,
                                    "n_cfa": int((~STATE["split"]).sum()) if STATE["split"] is not None else None,
                                    "seed": STATE["split_seed"], "strata": STATE["split_strata"]}}


class _StabilityJob:
    def __init__(self, items, k, corr="auto", extraction="minres", rotation="oblimin", part="efa", B=200, seed=1):
        A = _part(part)
        self.X = A[items].dropna().to_numpy(float)
        self.kind = ("polychoric" if E.is_ordinal(self.X) else "pearson") if corr == "auto" else corr
        R, _ = E.correlation(self.X, self.kind)
        self.L = E.efa(R, k, extraction, rotation)["loadings"]
        self.k, self.ext, self.rot, self.B, self.seed = k, extraction, rotation, B, seed
        self.rng = np.random.default_rng(seed)
        self.hits = np.zeros(len(items))
        self.ok = 0
        self.done = 0
        self.prim = np.argmax(np.abs(self.L), 1)

    def step(self, chunk=5):
        n = self.X.shape[0]
        for _ in range(min(chunk, self.B - self.done)):
            idx = self.rng.integers(0, n, n)
            try:
                Rb, _ = E.correlation(self.X[idx], self.kind)
                Lb = E._match(E.efa(Rb, self.k, self.ext, self.rot)["loadings"], self.L)
                self.hits += (np.argmax(np.abs(Lb), 1) == self.prim)
                self.ok += 1
            except Exception:
                pass
            self.done += 1
        return self.done >= self.B

    def result(self):
        return {"stability": (self.hits / max(self.ok, 1)).tolist(), "B": self.B, "done": self.done, "ok": self.ok, "seed": self.seed}


# --------------------------------------------------------------------------- CFA / SEM
def _model_data(syntax, part, missing="listwise"):
    A = _part(part)
    spec = S.Spec(syntax, list(A.columns))
    sub = A[spec.obs]
    if missing == "em" and sub.isna().any().any():
        rows_any = sub.dropna(how="all")
        mu, C = D.em_cov(rows_any.to_numpy(float))
        return None, C, len(rows_any), spec.obs, len(sub.dropna())
    d = sub.dropna()
    return d, None, len(d), spec.obs, len(d)


def _collinearity(f, pt, r_cut=0.90):
    """Latent correlations >= r_cut and standardized paths with |beta| > 1 (suppression / multicollinearity)."""
    out = []
    lat = list(f.spec.lat)
    if not lat:
        return out
    C = np.asarray(f.C)
    idx = f.spec.idx
    sd = {v: float(np.sqrt(max(C[idx[v], idx[v]], 1e-12))) for v in lat}
    for i, a in enumerate(lat):
        for b in lat[i + 1:]:
            r = float(C[idx[a], idx[b]] / (sd[a] * sd[b]))
            if abs(r) >= r_cut:
                out.append({"kind": "latent_r", "a": a, "b": b, "r": r})
    for p in pt:
        if p["op"] == "~" and p.get("std") is not None and abs(p["std"]) > 1:
            preds = [q["rhs"] for q in pt if q["op"] == "~" and q["lhs"] == p["lhs"] and q["rhs"] != p["rhs"]]
            rs = [(q, float(C[idx[p["rhs"]], idx[q]] / np.sqrt(C[idx[p["rhs"]], idx[p["rhs"]]] * C[idx[q], idx[q]]))) for q in preds if q in idx]
            partner = max(rs, key=lambda t: abs(t[1])) if rs else (None, None)
            out.append({"kind": "std_path", "lhs": p["lhs"], "rhs": p["rhs"], "value": float(p["std"]), "partner": partner[0], "r": partner[1]})
    return out


def fit(syntax, estimator="ML", part="cfa", missing="listwise", mi=True, std_lv=False):
    _require()
    d, C, n, obs, n_complete = _model_data(syntax, part, missing)
    est = estimator if d is not None else "ML"
    import hashlib
    rows_id = hashlib.sha1(",".join(map(str, d.index.tolist())).encode()).hexdigest()[:16] if d is not None else None
    if d is not None:
        f = S.fit_model(syntax, data=d, estimator=est, mi=mi, std_lv=std_lv)
    else:
        f = S.fit_model(syntax, cov=C, n=n, names=obs, estimator="ML", mi=mi, std_lv=std_lv)
    pt = S.param_table(f)
    for r in pt:
        r["label_text"] = STATE["meta"].get(r["rhs"], {}).get("label", "")
    nodes = [{"id": v, "kind": "latent" if v in f.spec.lat else "observed", "label": STATE["meta"].get(v, {}).get("label", "")} for v in f.spec.vars]
    return {"syntax": syntax, "estimator": est, "requested_estimator": estimator, "missing": missing, "n": n, "n_complete": n_complete,
            "part": part, "fit": f.fit, "params": pt, "r2": f.r2, "defined": f.defined, "mi": getattr(f, "mi", []),
            "converged": f.converged, "iterations": f.iterations, "heywood": f.heywood, "nodes": nodes,
            "latent": f.spec.lat, "observed": f.spec.obs, "rows_id": rows_id, "missing_mode": missing,
            "split_seed": STATE.get("split_seed") if part in ("efa", "cfa") else None,
            "free_params": sorted({(p["lhs"], p["op"], p["rhs"]) for p in pt if p["free"]}), "df": f.df, "npar": f.npar, "warnings": f.spec.warnings, "collinearity": _collinearity(f, pt),
            "scales_used": {lv: [p["rhs"] for p in f.spec.params if p["op"] == "=~" and p["lhs"] == lv] for lv in f.spec.lat}}


def identification(syntax):
    _require()
    try:
        spec = S.Spec(syntax, list(STATE["work"].columns))
        return {"ok": spec.df() >= 0, "p": spec.p, "moments": spec.p * (spec.p + 1) // 2, "params": spec.q, "df": spec.df(), "errors": [], "warnings": spec.warnings}
    except S.ModelError as e:
        return {"ok": False, "errors": [str(e)]}


class _BootJob:
    def __init__(self, syntax, part="cfa", R=500, seed=1):
        d, C, n, obs, _ = _model_data(syntax, part, "listwise")
        self.syntax, self.D, self.R, self.seed = syntax, d.reset_index(drop=True), R, seed
        self.base = S.fit_model(syntax, data=self.D, se=False)
        self.rng = np.random.default_rng(seed)
        self.std, self.defs = [], []
        self.done = 0

    def step(self, chunk=10):
        n = len(self.D)
        for _ in range(min(chunk, self.R - self.done)):
            idx = self.rng.integers(0, n, n)
            try:
                f = S.fit_model(self.syntax, data=self.D.iloc[idx], se=False, theta0=self.base.theta)
                if f.converged:
                    self.std.append(f.std)
                    self.defs.append([x["est"] for x in f.defined] + [x["std"] for x in f.defined])
            except Exception:
                pass
            self.done += 1
        return self.done >= self.R

    def result(self):
        out = {"R": self.R, "done": self.done, "ok": len(self.std), "seed": self.seed}
        if len(self.std) >= 20:
            A = np.array(self.std)
            out["std_lo"] = np.percentile(A, 2.5, 0).tolist()
            out["std_hi"] = np.percentile(A, 97.5, 0).tolist()
            if self.defs and self.defs[0]:
                Dd = np.array(self.defs)
                k = Dd.shape[1] // 2
                out["defined"] = [{"name": self.base.defined[i]["name"], "lo": float(np.percentile(Dd[:, i], 2.5)), "hi": float(np.percentile(Dd[:, i], 97.5)),
                                   "std_lo": float(np.percentile(Dd[:, k + i], 2.5)), "std_hi": float(np.percentile(Dd[:, k + i], 97.5))} for i in range(k)]
        return out


# --------------------------------------------------------------------------- porównanie modeli
def compare_models(models, part="cfa", estimator="ML"):
    """Porównanie modeli zagnieżdżonych: Δχ² (dla MLM skalowane metodą Satorry–Bentlera, 2001), ΔCFI, AIC, BIC.

    Test liczy się tylko dla par z tymi samymi zmiennymi obserwowalnymi i tymi samymi wierszami danych, z rozwiązaniami
    zbieżnymi i dopuszczalnymi. Zagnieżdżenie sprawdzane jest przez zawieranie zbiorów wolnych parametrów; gdy nie da się
    go stwierdzić (np. ograniczenia równości), para jest pomijana i porównuje się tylko indeksy dopasowania."""
    _require()
    from scipy import stats as st
    fits = []
    for m in models:
        try:
            r = fit(m["syntax"], estimator, part, mi=False)
            fits.append({"id": m["id"], "name": m.get("name", m["id"]), "fit": r["fit"], "df": r["df"], "ok": True, "n": r["n"],
                         "observed": sorted(r["observed"]), "rows_id": r["rows_id"], "converged": r["converged"],
                         "admissible": not r["heywood"], "free": set(map(tuple, r["free_params"])), "missing_mode": r["missing_mode"]})
        except Exception as e:
            fits.append({"id": m["id"], "name": m.get("name", m["id"]), "ok": False, "error": str(e)})
    tests, skipped = [], []
    ok = [f for f in fits if f["ok"]]
    for a in ok:
        for b in ok:
            if not a["df"] > b["df"]:
                continue
            reasons = []
            if a["observed"] != b["observed"]:
                reasons.append("różne zmienne obserwowalne")
            if a["rows_id"] is None or a["rows_id"] != b["rows_id"]:
                reasons.append("różne wiersze danych albo tryb EM")
            if not (a["converged"] and b["converged"]):
                reasons.append("rozwiązanie niezbieżne")
            if not (a["admissible"] and b["admissible"]):
                reasons.append("rozwiązanie niedopuszczalne (przypadek Heywooda)")
            if not reasons and not (a["free"] <= b["free"]):
                # bez potwierdzonego zagnieżdżenia Δχ² nie jest testem modeli zagnieżdżonych - porównujemy tylko indeksy
                reasons.append("nie potwierdzono zagnieżdżenia (zbiory wolnych parametrów); porównaj CFI, AIC i BIC")
            if reasons:
                skipped.append({"restricted": a["id"], "general": b["id"], "reasons": reasons})
                continue
            nested = a["free"] <= b["free"]
            d = a["fit"]["chi2"] - b["fit"]["chi2"]
            ddf = a["df"] - b["df"]
            t = {"restricted": a["id"], "general": b["id"], "dchi2": d, "ddf": ddf, "p": float(st.chi2.sf(max(d, 0), ddf)),
                 "dcfi": a["fit"]["cfi"] - b["fit"]["cfi"], "scaled": False, "nesting": "verified" if nested else "unverified",
                 "warnings": [] if nested else ["Nie stwierdzono zawierania wolnych parametrów - upewnij się, że modele są zagnieżdżone."]}
            ca, cb = a["fit"].get("scaling"), b["fit"].get("scaling")
            if ca and cb:
                # Satorra-Bentler (2001) scaled difference, as lavaan::anova() for MLM
                cd = (a["df"] * ca - b["df"] * cb) / ddf
                if cd > 0:
                    ds = d / cd
                    t.update({"dchi2": ds, "dchi2_ml": d, "cd": cd, "p": float(st.chi2.sf(max(ds, 0), ddf)), "scaled": True,
                              "method": "Satorra-Bentler 2001"})
                else:
                    # niedodatni czynnik skalujący: test skalowany nie istnieje; nie podstawiamy wyniku ML
                    t.update({"dchi2": float("nan"), "dchi2_ml": d, "cd": cd, "p": float("nan"), "scaled": False, "invalid": True,
                              "method": "Satorra-Bentler 2001"})
                    t["warnings"].append("Czynnik skalujący różnicy jest niedodatni - skalowanego testu Δχ² nie można obliczyć "
                                         "(rozważ test Satorry–Bentlera, 2010).")
                if "cfi_scaled" in a["fit"] and "cfi_scaled" in b["fit"]:
                    t["dcfi"] = a["fit"]["cfi_scaled"] - b["fit"]["cfi_scaled"]
            tests.append(t)
    for f in fits:
        f.pop("free", None)
    return {"models": fits, "tests": tests, "skipped": skipped}


# --------------------------------------------------------------------------- mediacja / most
def moderation(x, w, y, center=True, probe="sd"):
    _require()
    return MED.model1(_analysis_df(), STATE["scales"], x, w, y, center, probe)


def job_start(kind, params):
    _require()
    global _JOB_SEQ
    _JOB_SEQ += 1
    jid = f"{kind}-{_JOB_SEQ}"
    if kind == "compare":
        A = _part(params.get("part", "all"))
        job = B.CompareJob(A, STATE["scales"], params["y"], params["xs"], R=params.get("R", 200), seed=params.get("seed", 1))
    elif kind == "med4":
        A = _part(params.get("part", "all"))
        job = MED.Model4Job(A, STATE["scales"], params["x"], params["m"], params["y"], R=params.get("R", 500), seed=params.get("seed", 1), latent=params.get("latent", True))
    elif kind == "med7":
        job = MED.Model7Job(_analysis_df(), STATE["scales"], params["x"], params["m"], params["y"], params["w"], R=params.get("R", 1000), seed=params.get("seed", 1))
    elif kind == "med14":
        job = MED.Model14Job(_analysis_df(), STATE["scales"], params["x"], params["m"], params["y"], params["w"], R=params.get("R", 1000), seed=params.get("seed", 1))
    elif kind == "boot":
        job = _BootJob(params["syntax"], params.get("part", "cfa"), params.get("R", 500), params.get("seed", 1))
    elif kind == "stability":
        job = _StabilityJob(params["items"], params["k"], params.get("corr", "auto"), params.get("extraction", "minres"), params.get("rotation", "oblimin"),
                            params.get("part", "efa"), params.get("B", 200), params.get("seed", 1))
    elif kind == "omega":
        job = _OmegaJob(params.get("scales") or STATE["scales"], params.get("part", "all"), params.get("R", 300), params.get("seed", 1))
    else:
        raise KeyError(kind)
    JOBS[jid] = {"job": job, "kind": kind, "params": params, "t0": time.time()}
    total = getattr(job, "R", getattr(job, "B", 1))
    return {"id": jid, "total": total, "preview": job.result()}


def job_step(id, chunk=10):
    j = JOBS[id]
    done = j["job"].step(chunk)
    total = getattr(j["job"], "R", getattr(j["job"], "B", 1))
    return {"id": id, "done": getattr(j["job"], "done", total), "total": total, "finished": bool(done), "elapsed": time.time() - j["t0"]}


def job_result(id, xi=0):
    job = JOBS[id]["job"]
    if isinstance(job, B.CompareJob):
        return job.result(xi)
    return job.result()


def job_drop(id):
    JOBS.pop(id, None)
    return {"dropped": id}


class _OmegaJob:
    def __init__(self, scales, part, R, seed):
        self.A = _part(part)
        self.scales = {k: [i for i in v if i in self.A.columns] for k, v in scales.items()}
        self.R, self.seed = R, seed
        self.rng = np.random.default_rng(seed)
        self.vals = {k: [] for k in self.scales}
        self.alphas = {k: [] for k in self.scales}
        self.done = 0
        self.Ds = {k: self.A[v].dropna().reset_index(drop=True) for k, v in self.scales.items() if len(v) >= 2}

    def step(self, chunk=5):
        for _ in range(min(chunk, self.R - self.done)):
            for k, Dk in self.Ds.items():
                idx = self.rng.integers(0, len(Dk), len(Dk))
                try:
                    Db = Dk.iloc[idx]
                    self.vals[k].append(M.one_factor(Db, list(Dk.columns))["omega"])
                    self.alphas[k].append(D.cronbach_alpha(Db.to_numpy(float)))
                except Exception:
                    pass
            self.done += 1
        return self.done >= self.R

    def result(self):
        out = {}
        for k in self.Ds:
            v, a = self.vals[k], self.alphas[k]
            if len(v) >= 20:
                out[k] = {"omega_lo": float(np.percentile(v, 2.5)), "omega_hi": float(np.percentile(v, 97.5)),
                          "alpha_lo": float(np.percentile(a, 2.5)), "alpha_hi": float(np.percentile(a, 97.5))}
        return {"ci": out, "R": self.R, "done": self.done, "seed": self.seed}
