"""Parser składni lavaan (podzbiór): =~, ~, ~~, := oraz modyfikatory etykiet i wartości stałych.

Licencja MIT. Implementacja od zera, bez kodu lavaan.
"""
import re

_NAME = r"[A-Za-z_.][A-Za-z0-9_.]*"
_OPS = [":=", "=~", "~~", "~"]


class SyntaxIssue(Exception):
    pass


def _strip_comment(line):
    for ch in ("#", "!"):
        i = line.find(ch)
        if i >= 0:
            line = line[:i]
    return line.strip()


def _statements(text):
    """Łączy wiersze kontynuowane plusem i zwraca listę (nr_wiersza, instrukcja)."""
    out = []
    for no, raw in enumerate(text.splitlines(), start=1):
        for part in _strip_comment(raw).split(";"):
            s = part.strip()
            if not s:
                continue
            if out and (s.startswith("+") or out[-1][1].rstrip().endswith(("+", "=~", "~", "~~", "*"))):
                out[-1] = (out[-1][0], out[-1][1] + " " + s)
            else:
                out.append((no, s))
    return out


def _term(term, line):
    """'a*Q1' -> (Q1, {'label': 'a'}), '1*Q1' -> (Q1, {'fixed': 1.0}), 'NA*Q1' -> free."""
    term = term.strip()
    mods = {}
    while "*" in term:
        mod, term = term.split("*", 1)
        mod, term = mod.strip(), term.strip()
        if re.fullmatch(r"[-+]?\d*\.?\d+(e[-+]?\d+)?", mod, re.I):
            mods["fixed"] = float(mod)
        elif mod.upper() == "NA":
            mods["free"] = True
        elif re.fullmatch(r"start\(([-+]?\d*\.?\d+)\)", mod):
            mods["start"] = float(re.fullmatch(r"start\(([-+]?\d*\.?\d+)\)", mod).group(1))
        elif re.fullmatch(_NAME, mod):
            mods["label"] = mod
        else:
            raise SyntaxIssue((line, f"Nie rozpoznano modyfikatora „{mod}”."))
    if term == "1":
        return None, mods  # wyraz wolny — struktura średnich nie jest obsługiwana
    if not re.fullmatch(_NAME, term):
        raise SyntaxIssue((line, f"„{term}” nie jest poprawną nazwą zmiennej."))
    return term, mods


def parse(text):
    """Zwraca słownik: lines (lista instrukcji), defined, errors, warnings."""
    res = {"measurement": [], "regressions": [], "covariances": [], "defined": [], "errors": [], "warnings": []}
    for line, st in _statements(text or ""):
        op = None
        for o in _OPS:
            if o in st:
                op = o
                break
        if op is None:
            if any(c in st for c in ("==", "<", ">")):
                res["warnings"].append({"line": line, "message": "Ograniczenia nierówności i równości wyrażeń nie są jeszcze obsługiwane — wiersz pominięto.", "level": "warn"})
            else:
                res["errors"].append({"line": line, "message": "Brak operatora: użyj =~ (pomiar), ~ (regresja), ~~ (kowariancja) albo := (efekt)."})
            continue
        lhs, rhs = st.split(op, 1)
        lhs, rhs = lhs.strip(), rhs.strip()
        if op == ":=":
            if not re.fullmatch(_NAME, lhs):
                res["errors"].append({"line": line, "message": f"Nazwa efektu „{lhs}” jest niepoprawna."})
                continue
            if not re.fullmatch(r"[A-Za-z0-9_.+\-*/() ]+", rhs):
                res["errors"].append({"line": line, "message": "Wyrażenie efektu może zawierać tylko etykiety, liczby i + − * / ( )."})
                continue
            res["defined"].append({"name": lhs, "expr": rhs, "line": line})
            continue
        if not re.fullmatch(_NAME, lhs):
            res["errors"].append({"line": line, "message": f"„{lhs}” nie jest poprawną nazwą zmiennej."})
            continue
        if not rhs:
            res["errors"].append({"line": line, "message": "Po operatorze brakuje zmiennych."})
            continue
        try:
            terms = [_term(t, line) for t in rhs.split("+") if t.strip()]
        except SyntaxIssue as e:
            ln, msg = e.args[0]
            res["errors"].append({"line": ln, "message": msg})
            continue
        for name, mods in terms:
            if name is None:
                res["warnings"].append({"line": line, "message": "Wyrazy wolne (~ 1) są pomijane — model nie ma struktury średnich.", "level": "warn"})
                continue
            item = {"lhs": lhs, "rhs": name, "line": line, **mods}
            key = {"=~": "measurement", "~": "regressions", "~~": "covariances"}[op]
            res[key].append(item)
    return res


def print_model(measurement, regressions=(), covariances=(), defined=()):
    """Odwrotność parse: model jako tekst w sekcjach."""
    out = []
    if measurement:
        out.append("# model pomiarowy")
        by = {}
        for m in measurement:
            by.setdefault(m["lhs"], []).append(m)
        for lv, ms in by.items():
            out.append(f"{lv} =~ " + " + ".join(_fmt(m) for m in ms))
    if regressions:
        out.append("# model strukturalny")
        by = {}
        for r in regressions:
            by.setdefault(r["lhs"], []).append(r)
        for y, rs in by.items():
            out.append(f"{y} ~ " + " + ".join(_fmt(r) for r in rs))
    if covariances:
        out.append("# kowariancje")
        for c in covariances:
            out.append(f"{c['lhs']} ~~ {_fmt(c)}")
    if defined:
        out.append("# efekty")
        for d in defined:
            out.append(f"{d['name']} := {d['expr']}")
    return "\n".join(out)


def _fmt(t):
    if "label" in t:
        return f"{t['label']}*{t['rhs']}"
    if "fixed" in t:
        v = t["fixed"]
        return f"{int(v) if float(v).is_integer() else v}*{t['rhs']}"
    return t["rhs"]
