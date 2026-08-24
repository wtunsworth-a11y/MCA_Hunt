#!/usr/bin/env python3
"""Headline figures for the MCA hunting & fishing survey.

Usage:
    python analysis/summary.py <consolidated.csv>

Reports, on the v2.5.0 MAIN survey only (see ../CLAUDE.md survey phases):
  - interview count, women count, zone breakdown;
  - species named as hunted, with the count of interviews naming each
    (all 12 config categories + free-text "other animal");
  - fishing: targets, tools, and a gloss for the `dynamite` value.

Framing (../CLAUDE.md): report, don't sell. Species and takes are neutral
records; conservation status is a factual attribute, not a judgement.
Hunting/fishing are legitimate landowner resource use.

Survey data is NEVER committed to this public repo. Run against a local
consolidated file (see consolidate.py).
"""
import csv, sys
from collections import Counter

# Free-text glosses (codebook, ../CLAUDE.md)
GLOSS = {
    "dynamite": 'plant root poison (locally called "dynamite"), not an explosive',
    "Pilai": "monitor lizard",
}


def load_main(path):
    with open(path, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    return [r for r in rows if (r.get("app_version") or "") == "2.5.0"]


def multi(row, prefix):
    """Collect values from any column whose name starts with prefix and is set."""
    out = []
    for k, v in row.items():
        if k and k.startswith(prefix) and v and v.strip() not in ("", "0", "false", "No"):
            out.append((k, v.strip()))
    return out


def main(path):
    rows = load_main(path)
    n = len(rows)
    if not n:
        sys.exit("no v2.5.0 main-survey rows found")

    women = sum(1 for r in rows if (r.get("respondent_sex") or r.get("sex") or "").strip().lower().startswith("f"))
    zones = Counter((r.get("zone") or r.get("interview_zone") or "?").strip() for r in rows)

    print(f"MAIN SURVEY (app v2.5.0): {n} interviews")
    print(f"  women respondents: {women} of {n}")
    print("  by zone: " + ", ".join(f"{z} {c}" for z, c in zones.most_common()))

    # Species named as hunted — count interviews naming each.
    sp = Counter()
    for r in rows:
        for k, v in r.items():
            if k and k.startswith("h_species_") and v and v.strip().lower() in ("yes", "1", "true"):
                sp[k.replace("h_species_", "")] += 1
    if sp:
        print("\n  species named as hunted (interviews naming each):")
        for name, c in sp.most_common():
            print(f"    {name:<16} {c:>4}  ({100*c/n:.0f}% of {n})")

    other = Counter((r.get("h_species_other_text") or "").strip() for r in rows if (r.get("h_species_other_text") or "").strip())
    if other:
        print("\n  free-text 'other animal':")
        for name, c in other.most_common():
            g = GLOSS.get(name)
            print(f"    {name:<16} {c:>4}" + (f"  — {g}" if g else ""))

    # Fishing.
    ftargets = Counter()
    ftools = Counter()
    for r in rows:
        for k, v in r.items():
            if not k or not v or v.strip().lower() not in ("yes", "1", "true"):
                continue
            if k.startswith("e_fish_target_"):
                ftargets[k.replace("e_fish_target_", "")] += 1
            elif k.startswith("e_fish_tool_") or k.startswith("e_fish_method_"):
                ftools[k.split("_", 3)[-1]] += 1
    if ftargets or ftools:
        print("\n  fishing:")
        if ftargets:
            print("    targets: " + ", ".join(f"{t} {c}" for t, c in ftargets.most_common()))
        if ftools:
            parts = []
            for t, c in ftools.most_common():
                g = GLOSS.get(t)
                parts.append(f"{t} {c}" + (f" [{g}]" if g else ""))
            print("    tools: " + ", ".join(parts))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
