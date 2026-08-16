# Received data

This folder holds **survey data exported from the app** (the CSV/JSON files that
interviewers send back from their phones). Keep raw exports here, grouped by
collection round in subfolders.

## Subfolders

- [`pilot/`](pilot/) — data from the pilot round.
- (add a new subfolder per round later, e.g. `round_2025_09/`.)

## Suggested file naming

`<subfolder>/<YYYY-MM-DD>_<interviewer>_<n-interviews>.csv`
e.g. `pilot/2026-08-15_INT-03_12.csv` — so files from the four phones don't
clash and are easy to sort.

## ⚠️ Privacy — read before committing data here

**This repository is currently PUBLIC.** Anything committed here is visible to
anyone.

- Survey CSVs can include the optional **respondent name** column (`resp_name`)
  and the **interview GPS** (`gps_lat`/`gps_lon` — the interview location, never
  hunting sites, but still potentially identifying).
- **Do not commit exports containing respondent names to a public repo.** Prefer
  the app's plain export with names left blank, or strip the `resp_name` column
  first, or make the repository **private** before adding real data.
- Analysis should run on the anonymous `resp_id_code`, not names (see the
  project's privacy rules).

If you want, the repo can be made private, or this folder can be `.gitignore`d
so data is kept locally but not pushed — ask and it'll be set up.
