#!/usr/bin/env python3
"""Tool-use heatmap: hunting method (rows) x zone or age cohort (columns).

Usage:
    python analysis/heatmap_tool_cohort.py <consolidated.csv> <out.png> [by]
    # by = "zone" (default) or "cohort"

Cells are the share of interviews in that column that name the method
(column-normalised), so columns with different interview counts stay
comparable. v2.5.0 main survey only.

Framing (../CLAUDE.md): a method-and-place record, never a group's habit or
fault. Report; don't sell.

Survey data is NEVER committed to this public repo. Run against a local
consolidated file (see consolidate.py).
"""
import csv, sys
from collections import defaultdict, Counter

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

FOREST = LinearSegmentedColormap.from_list(
    "forest", ["#F4F7F0", "#BFD6B4", "#7DAE80", "#3F7A4E", "#1E3D2C"]
)


def cohort(row):
    try:
        a = int(float(row.get("respondent_age") or row.get("age") or ""))
    except (ValueError, TypeError):
        return "unknown"
    if a < 30:
        return "<30"
    if a < 45:
        return "30-44"
    if a < 60:
        return "45-59"
    return "60+"


def main(path, out, by="zone"):
    with open(path, newline="", encoding="utf-8-sig") as fh:
        rows = [r for r in csv.DictReader(fh) if (r.get("app_version") or "") == "2.5.0"]
    if not rows:
        sys.exit("no v2.5.0 main-survey rows found")

    keyfn = (lambda r: (r.get("zone") or r.get("interview_zone") or "?").strip()) if by == "zone" else cohort
    col_n = Counter(keyfn(r) for r in rows)
    counts = defaultdict(Counter)  # method -> col -> interviews naming it
    for r in rows:
        col = keyfn(r)
        for k, v in r.items():
            if k and k.startswith("c_method_") and v and v.strip().lower() in ("yes", "1", "true"):
                counts[k.replace("c_method_", "")][col] += 1

    if not counts:
        sys.exit("no hunting-method columns (c_method_*) found")

    methods = sorted(counts, key=lambda m: -sum(counts[m].values()))
    cols = [c for c, _ in col_n.most_common()]
    M = np.array([[counts[m][c] / col_n[c] if col_n[c] else 0 for c in cols] for m in methods])

    fig, ax = plt.subplots(figsize=(1.4 + 0.7 * len(cols), 1.0 + 0.35 * len(methods)))
    im = ax.imshow(M, cmap=FOREST, vmin=0, vmax=1, aspect="auto")
    ax.set_xticks(range(len(cols)))
    ax.set_xticklabels([f"{c}\n(n={col_n[c]})" for c in cols], fontsize=8)
    ax.set_yticks(range(len(methods)))
    ax.set_yticklabels(methods, fontsize=8)
    for i in range(len(methods)):
        for j in range(len(cols)):
            if M[i, j] > 0:
                ax.text(j, i, f"{M[i,j]*100:.0f}", ha="center", va="center",
                        fontsize=7, color="white" if M[i, j] > 0.5 else "#1E3D2C")
    ax.set_title(f"Hunting methods by {by} (% of interviews naming the method)", fontsize=10)
    fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02, label="share of interviews")
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    print(f"wrote {out} ({len(methods)} methods x {len(cols)} {by}s)")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) == 4 else "zone")
