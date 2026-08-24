# analysis/

Reusable scripts for the MCA hunting & fishing survey. They read a local
consolidated CSV and print / plot summaries.

**Survey data is never committed to this public repo.** The raw device
exports (`mca_hunt_named_*.csv`) and any consolidated file live only in the
Google Drive **Survey Data** folder and in chat transfers. `.gitignore`
blocks them (and `analysis/data/`, and `*.pdf` deliverables that carry
verbatim quotes). Download a working copy locally, run the scripts against
it, and keep the outputs out of git.

## Scripts

| script | what it does |
|---|---|
| `consolidate.py` | dedupe device exports on `interview_id` (last wins), **exclude 13 Aug practice**, align to the widest/newest header, flag v2.5.0 main-survey rows. `python analysis/consolidate.py <in_dir> <out.csv>` |
| `summary.py` | headline figures on the v2.5.0 main survey: interviews, women, zones, species named, fishing. `python analysis/summary.py <consolidated.csv>` |
| `heatmap_tool_cohort.py` | hunting-method × zone (or age cohort) heatmap, column-normalised. `python analysis/heatmap_tool_cohort.py <consolidated.csv> <out.png> [zone|cohort]` |

## Survey phases (all analysis)

- **13 Aug — practice. Excluded entirely, now and forever.** Not real data.
- **15–16 Aug — pilot** (app v2.0.0–2.3.0, mostly Zone 7B). Kept for
  provenance, reported separately, never pooled. Zone 7B re-collected on v2.5.0.
- **Main survey — app v2.5.0 (17 Aug onward).** Paper results run on v2.5.0
  only (removes the app-version confound).

## Framing (see ../CLAUDE.md)

Report; don't sell. Hunting and fishing are legitimate landowner resource
use — the communities own the land and its resources. Species records and
takes are neutral data; conservation status is a factual attribute, not a
judgement. Methods are method-and-place observations, never a group's fault.

## Codebook glosses

- `dynamite` (fishing) = local name for a **plant root fish poison**, not an
  explosive. Keep the recorded value; gloss it in every output.
- `Pilai` (other animal) = monitor lizard.
- Zone 6 echidna (other animal) = long-beaked echidna (*Zaglossus*; confirm
  species with a specialist before publishing a name).
