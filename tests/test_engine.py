"""Testy zgodności silnika SEMplex z lavaan (wartości referencyjne z samouczka lavaan, Rosseel 2012).
Uruchom:  python -m pytest tests -q
"""
import json
import os
import sys

import numpy as np
import pandas as pd
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "public", "engine"))

from semplex import api, efa as E, sem as S, syntax  # noqa: E402

FIX = os.path.join(HERE, "fixtures")
HS_MODEL = "visual =~ x1 + x2 + x3\ntextual =~ x4 + x5 + x6\nspeed =~ x7 + x8 + x9"
PD_MODEL = """ind60 =~ x1 + x2 + x3
dem60 =~ y1 + y2 + y3 + y4
dem65 =~ y5 + y6 + y7 + y8
dem60 ~ ind60
dem65 ~ ind60 + dem60
y1 ~~ y5
y2 ~~ y4 + y6
y3 ~~ y7
y4 ~~ y8
y6 ~~ y8"""


@pytest.fixture(scope="module")
def hs():
    d = pd.read_csv(os.path.join(FIX, "holzinger_swineford39_data.csv"))
    return d[[f"x{i}" for i in range(1, 10)]]


@pytest.fixture(scope="module")
def pdem():
    d = pd.read_csv(os.path.join(FIX, "pd_data.csv"))
    return d[[c for c in d.columns if c[0] in "xy"]]


def _p(fit, lhs, op, rhs):
    for r in S.param_table(fit):
        if (r["lhs"], r["op"], r["rhs"]) == (lhs, op, rhs):
            return r
    raise KeyError((lhs, op, rhs))


def test_cfa_holzinger_fit(hs):
    f = S.fit_model(HS_MODEL, data=hs)
    assert f.converged
    ref = {"chi2": 85.306, "df": 24, "cfi": 0.931, "tli": 0.896, "rmsea": 0.092, "srmr": 0.065, "aic": 7517.490, "bic": 7595.339}
    for k, v in ref.items():
        assert f.fit[k] == pytest.approx(v, abs=1e-3 if k not in ("aic", "bic") else 0.01), k
    assert f.fit["rmsea_lo"] == pytest.approx(0.071, abs=1e-3)
    assert f.fit["rmsea_hi"] == pytest.approx(0.114, abs=1e-3)


def test_cfa_holzinger_loadings(hs):
    f = S.fit_model(HS_MODEL, data=hs)
    ref = {("visual", "x2"): (0.554, 0.100), ("visual", "x3"): (0.729, 0.109), ("textual", "x5"): (1.113, 0.065),
           ("textual", "x6"): (0.926, 0.055), ("speed", "x8"): (1.180, 0.165), ("speed", "x9"): (1.082, 0.151)}
    for (lv, it), (est, se) in ref.items():
        r = _p(f, lv, "=~", it)
        assert r["est"] == pytest.approx(est, abs=1e-3)
        assert r["se"] == pytest.approx(se, abs=1e-3)


def test_sem_political_democracy(pdem):
    f = S.fit_model(PD_MODEL, data=pdem)
    assert f.fit["chi2"] == pytest.approx(38.125, abs=1e-3)
    assert f.fit["df"] == 35
    assert f.fit["cfi"] == pytest.approx(0.995, abs=1e-3)
    for (y, x), (est, se) in {("dem60", "ind60"): (1.483, 0.399), ("dem65", "ind60"): (0.572, 0.221), ("dem65", "dem60"): (0.837, 0.098)}.items():
        r = _p(f, y, "~", x)
        assert r["est"] == pytest.approx(est, abs=1e-3)
        assert r["se"] == pytest.approx(se, abs=1e-3)


def test_mlm_scaling_is_positive(hs):
    f = S.fit_model(HS_MODEL, data=hs, estimator="MLM")
    assert f.fit["chi2_scaled"] > 0 and f.fit["scaling"] > 0
    assert f.fit["chi2"] == pytest.approx(85.306, abs=1e-3)  # oszacowania punktowe jak w ML


def test_syntax_roundtrip():
    p = syntax.parse("F =~ a*x1 + 1*x2 + x3\ny ~ b*F\nind := a*b")
    assert not p["errors"]
    assert [m["rhs"] for m in p["measurement"]] == ["x1", "x2", "x3"]
    assert p["measurement"][1]["fixed"] == 1.0 and p["measurement"][0]["label"] == "a"
    assert p["defined"][0]["expr"] == "a*b"
    assert syntax.parse("F == x")["warnings"] or syntax.parse("F == x")["errors"]


def test_efa_recovers_three_factors(hs):
    R = np.corrcoef(hs.to_numpy(float), rowvar=False)
    res = E.efa(R, 3, "minres", "oblimin")
    L = np.abs(res["loadings"])
    groups = [set(np.argmax(L[i:i + 3], 1)) for i in (0, 3, 6)]
    assert all(len(g) == 1 for g in groups)  # każda trójka pozycji na jednym czynniku
    assert E.kmo(R)[0] == pytest.approx(0.752, abs=2e-3)


def test_api_end_to_end_on_sample():
    root = os.path.join(HERE, "..", "public", "samples")
    meta = json.load(open(os.path.join(root, "lojalnosc_2026.meta.json"), encoding="utf-8"))

    def call(fn, **kw):
        r = json.loads(api.call(fn, json.dumps(kw)))
        assert r["ok"], r.get("message")
        return r["result"]

    sn = call("sniff", filename="lojalnosc_2026.csv", path=os.path.join(root, "lojalnosc_2026.csv"))
    assert sn["info"]["sep"] == ";"
    assert any(c["pii"] for c in sn["columns"])  # e-mail rozpoznany jako dane osobowe
    sm = call("import_data", columns=sn["columns"], missing_codes=sn["missing_codes"], sample_meta=meta)
    assert sm["n_total"] == 524 and "email" not in [v["name"] for v in sm["variables"]]
    fr = call("fit", syntax="SAT =~ Q1 + Q2 + Q3\nLOY =~ Q4 + Q5 + Q6", estimator="ML", part="all")
    assert fr["converged"] and fr["df"] == 8
    bad = json.loads(api.call("fit", json.dumps({"syntax": "SAT =~ Q1 + NIEMA", "part": "all"})))
    assert not bad["ok"] and bad["kind"] == "model"


def test_satorra_bentler_2001_difference_matches_lavaan(hs, monkeypatch):
    # lavaan 0.7.2: anova(cfa(m + visual=~x9, estimator="MLM"), cfa(m, estimator="MLM"))
    m3 = "visual =~ x1 + x2 + x3\ntextual =~ x4 + x5 + x6\nspeed =~ x7 + x8 + x9"
    fits = {}
    for key, syn in (("m1", m3), ("m2", m3 + "\nvisual =~ x9")):
        f = S.fit_model(syn, data=hs, estimator="MLM")
        pt_ = S.param_table(f)
        fits[key] = {"fit": f.fit, "df": f.df, "n": f.n, "observed": f.spec.obs, "rows_id": "same", "converged": f.converged,
                     "heywood": f.heywood, "missing_mode": "listwise",
                     "free_params": sorted({(p["lhs"], p["op"], p["rhs"]) for p in pt_ if p["free"]})}
    monkeypatch.setattr(api, "_require", lambda: None)
    monkeypatch.setattr(api, "fit", lambda syntax, *a, **k: fits["m2" if "visual =~ x9" in syntax else "m1"])
    res = api.compare_models([{"id": "m1", "syntax": m3}, {"id": "m2", "syntax": m3 + "\nvisual =~ x9"}], estimator="MLM")
    t = res["tests"][0]
    assert t["scaled"] and t["ddf"] == 1
    assert t["dchi2"] == pytest.approx(32.229203, abs=1e-3)
    assert t["p"] == pytest.approx(1.370158575e-08, rel=1e-3)
    assert t["nesting"] == "verified" and not res["skipped"]


def test_compare_models_refuses_different_rows(hs, monkeypatch):
    m3 = "visual =~ x1 + x2 + x3\ntextual =~ x4 + x5 + x6\nspeed =~ x7 + x8 + x9"
    base = {}
    for key, syn in (("m1", m3), ("m2", m3 + "\nvisual =~ x9")):
        f = S.fit_model(syn, data=hs, estimator="MLM")
        pt_ = S.param_table(f)
        base[key] = {"fit": f.fit, "df": f.df, "n": f.n, "observed": f.spec.obs, "rows_id": key, "converged": True,
                     "heywood": [], "missing_mode": "listwise", "free_params": sorted({(p["lhs"], p["op"], p["rhs"]) for p in pt_ if p["free"]})}
    monkeypatch.setattr(api, "_require", lambda: None)
    monkeypatch.setattr(api, "fit", lambda syntax, *a, **k: base["m2" if "visual =~ x9" in syntax else "m1"])
    res = api.compare_models([{"id": "m1", "syntax": m3}, {"id": "m2", "syntax": m3 + "\nvisual =~ x9"}], estimator="MLM")
    assert not res["tests"] and res["skipped"] and "wiersze" in res["skipped"][0]["reasons"][0]


def test_standardized_ci_of_marker_loading_matches_lavaan(hs):
    # lavaan 0.7.2 standardizedSolution(cfa(HS model)): visual =~ x1 est.std 0.7718802, se 0.05497275
    f = S.fit_model("visual =~ x1 + x2 + x3\ntextual =~ x4 + x5 + x6\nspeed =~ x7 + x8 + x9", data=hs)
    row = next(p for p in S.param_table(f) if p["lhs"] == "visual" and p["rhs"] == "x1")
    assert row["std_se"] == pytest.approx(0.05497275, abs=2e-5)
    assert row["std_lo"] == pytest.approx(0.7718802 - 1.959964 * 0.05497275, abs=5e-5)
    assert row["std_hi"] == pytest.approx(0.7718802 + 1.959964 * 0.05497275, abs=5e-5)


def test_collinearity_flags_std_paths_above_one():
    rng = np.random.default_rng(3)
    n = 400
    a = rng.standard_normal(n)
    b = 0.97 * a + np.sqrt(1 - 0.97 ** 2) * rng.standard_normal(n)   # near-collinear predictors
    y = 1.2 * b - 0.7 * a + 0.4 * rng.standard_normal(n)
    cols = {}
    for name, f in (("a", a), ("b", b), ("y", y / y.std())):
        for k in range(3):
            cols[f"{name}{k}"] = 0.8 * f + 0.6 * rng.standard_normal(n)
    df = pd.DataFrame(cols)
    syn = "A =~ a0 + a1 + a2\nB =~ b0 + b1 + b2\nY =~ y0 + y1 + y2\nY ~ A + B"
    f = S.fit_model(syn, data=df)
    flags = api._collinearity(f, S.param_table(f))
    assert any(x["kind"] == "latent_r" and {x["a"], x["b"]} == {"A", "B"} for x in flags)
    assert any(x["kind"] == "std_path" and abs(x["value"]) > 1 for x in flags)
    f2 = S.fit_model("A =~ a0 + a1 + a2\nY =~ y0 + y1 + y2\nY ~ A", data=df)
    assert not [x for x in api._collinearity(f2, S.param_table(f2)) if x["kind"] == "std_path"]
