#!/usr/bin/env python3
"""Consolidate MCA survey device exports into one deduplicated dataset.

Usage:
    python analysis/consolidate.py <input_dir_with_csvs> <output.csv>

Rules (see ../CLAUDE.md):
  - dedupe on interview_id (last occurrence wins);
  - exclude the 13 Aug practice day entirely (not real data);
  - align every row to the canonical column order (the widest header found,
    which is the newest app version);
  - pilot records (15-16 Aug, app <2.5.0) are kept but flagged by app_version
    so analysis can report them separately from the v2.5.0 main survey.

Survey data is NEVER committed to this public repo. Run this against local
copies of the exports (e.g. downloaded from the Survey Data Drive folder).
"""
import csv, glob, os, sys

PRACTICE_DAY = "2026-08-13"

def day(r):
    return (r.get("interview_start_time") or r.get("interview_end_time") or "")[:10]

def main(indir, outpath):
    files = sorted(glob.glob(os.path.join(indir, "*.csv")))
    if not files:
        sys.exit(f"no CSVs found in {indir}")
    rows, header = {}, None
    for f in files:
        with open(f, newline="", encoding="utf-8-sig") as fh:
            rdr = csv.DictReader(fh)
            if rdr.fieldnames and (header is None or len(rdr.fieldnames) > len(header)):
                header = rdr.fieldnames
            for r in rdr:
                iid = (r.get("interview_id") or "").strip()
                if iid:
                    rows[iid] = r          # last export wins
    keep = [i for i in rows if day(rows[i]) != PRACTICE_DAY]
    keep.sort(key=lambda i: (rows[i].get("interview_start_time") or ""))
    with open(outpath, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header, extrasaction="ignore")
        w.writeheader()
        for i in keep:
            w.writerow({k: (rows[i].get(k, "") or "") for k in header})
    main_n = sum(1 for i in keep if (rows[i].get("app_version") or "") == "2.5.0")
    print(f"{len(keep)} interviews -> {outpath} "
          f"({len(header)} cols; 13 Aug excluded; {main_n} main-survey v2.5.0)")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
