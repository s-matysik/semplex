import json, os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt, matplotlib as mpl
HERE = os.path.dirname(os.path.abspath(__file__))
o = json.load(open(os.path.join(HERE, "second_example_results.json")))
mpl.rcParams.update({"font.family": "DejaVu Sans", "font.size": 7, "axes.titlesize": 8, "axes.labelsize": 7, "xtick.labelsize": 6.5, "ytick.labelsize": 7, "axes.spines.top": False, "axes.spines.right": False})
C = "#1f6f8b"; G = "#7b8794"
APP = [("sum", "Item means"), ("fscore", "Factor scores"), ("croon", "Croon correction"), ("single", "Single indicator (\u03b1)"), ("sam", "SAM (local)"), ("esem", "ESEM approximation"), ("sem", "Joint SEM")]
fig, axs = plt.subplots(1, 2, figsize=(7.1, 2.7), sharey=True, gridspec_kw={"wspace": 0.12})
for ax, (x, t), L in zip(axs, (("OrgPres", "Prestige \u2192 commitment (OrgPres \u2192 AffLove)"), ("OrgIden", "Identification \u2192 commitment (OrgIden \u2192 AffLove)")), "ab"):
    rows = {r["id"]: r for r in o["compare_" + x]}; ref = rows["sem"]
    ax.axvspan(ref["lo"], ref["hi"], color="#e8f1f4", zorder=0)
    for j, (a, lab) in enumerate(APP):
        r = rows[a]; ok = r["ci_available"]
        if ok: ax.plot([r["lo"], r["hi"]], [j, j], color=C, lw=1.1)
        ax.plot(r["est"], j, "o", color=C, ms=4, mfc=C if ok else "white")
    ax.axvline(0, color=G, lw=0.6, zorder=0); ax.set_title(t, loc="left"); ax.set_xlim(-0.05, 0.95)
    ax.text(-0.12, 1.06, L, transform=ax.transAxes, fontsize=10, fontweight="bold", va="bottom")
nv = {r["id"]: r["n_valid"] for r in o["compare_OrgIden"]}
axs[0].set_yticks(range(len(APP))); axs[0].set_yticklabels([f"{lab} ({nv[a]})" if nv[a] < o["R"] else lab for a, lab in APP]); axs[0].set_ylim(len(APP) - 0.5, -0.5)
fig.supxlabel("Standardized \u03b2 with 95% percentile bootstrap interval (500 resamples, seed 1)", fontsize=7, y=0.04)
fig.subplots_adjust(left=0.2, right=0.99, top=0.86, bottom=0.2)
fig.savefig(os.path.join(HERE, "second_example_comparison.pdf")); fig.savefig(os.path.join(HERE, "second_example_comparison.png"), dpi=200)
print("ok")
