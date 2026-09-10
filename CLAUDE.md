# MCA Hunting Survey — working notes for Claude

## Writing for research & survey outputs
This is a scientific project. In every deliverable — briefs, reports, papers,
data summaries, chat replies about the data — **report; do not sell.**

- **No booster or self-congratulatory language.** Changing the instrument and
  getting different data is not a finding. Don't celebrate coverage, effort, or
  the survey itself.
- **No confirmation-bias framing.** We collect data to find out, never to source
  or confirm what we hoped to see. Never call a result "exactly what we're
  looking for" or "what the project exists to understand."
- **Don't project analytical frameworks onto people.** The 4 T's
  (Target / Tool / Tenure / Timing) is an external comparative framework
  (Pattiselanno et al., 2024), not an indigenous system — the ancestors did not
  organise their lives around it. Name it as a researcher's lens and its source;
  don't narrate what people "set out to" do.
- **Cut the narration.** State the fact and stop. No throat-clearing, no
  editorial framing around quotes, no explaining the significance of a change.
- **State sample size and uncertainty plainly.** Prefer "X of Y report…" to
  adjectives. Percentages carry their denominator.
- **No group attribution as blame or virtue.** Fishing/hunting methods are
  method-and-place observations only — never framed as a group's habit or fault
  (this discourages interviewers from recording faithfully).
- **Hunting and fishing are legitimate resource use by the landowners.** The
  communities own the land and its resources; the take is theirs to make. Never
  frame hunting, or the take of any species — including rare or IUCN-listed ones
  — as bad, alarming, or a problem. Species and takes are neutral records;
  conservation status is a factual attribute, not a judgement. Disapproving or
  hand-wringing framing looks down on partners, alienates them, and stops data
  flowing.
- **Quotes verbatim, anonymised to zone.** No editorialising around them.

If a draft slips into any of the above, cut it without being asked.

## Reporting times
Report every time and date in the user's **local time**, not UTC — timestamps
read out of files, Drive metadata, git history, CI, anything. Say the zone when
it could be ambiguous.

- The user is in **Papua New Guinea: UTC+10, no daylight saving** (so UTC+10 all
  year). Convert before reporting; don't hand over a raw `Z` timestamp.
- Data itself stays as recorded — exports and stored fields keep their ISO/UTC
  form. This is about what is said in chat and written in prose, not about
  rewriting values in files.

## Data handling
- The GitHub repo is **public** — survey data (the `mca_hunt_named_*.csv` exports
  and any consolidated file) must **never** be committed here. It lives only in
  the user's Google Drive **Survey Data** folder and in chat file transfers.
- Consolidated datasets: dedupe on `interview_id`, align columns by name to the
  current canonical layout (see `js/export.js`), keep the newest app-version
  header.
- **Device exports are NOT reliably cumulative — consolidate the UNION OF ALL
  files, never "the latest file per surveyor."** An export holds only what is on
  the device now; a reset/reinstall truncates it, so later files can lose earlier
  interviews (which survive only in that device's older files). Bani's device
  reset ~26 Aug: the 10 Sep file spans only 26 Aug onward; 19–25 Aug interviews
  live in the 25 Aug file. Always fetch and dedupe **every** raw CSV in the folder;
  a shrinking zone/interview count between consolidations is the red flag.
- **The raw device exports in the Drive Survey Data folder are the lodged data
  (source of truth).** Do not maintain a stored consolidated file in the Drive —
  **regenerate the consolidated dataset on request** (from the raw exports) and
  hand it over / use it for that task. Keep the folder's `_DATA_MANIFEST.md`
  provenance record current when data materially changes.
- **Survey phases** (apply to every analysis):
  - **13 Aug = practice — exclude entirely.** Not real data.
  - **15–16 Aug = pilot** (instrument development, app v2.0.0–2.3.0, mostly Zone
    7B). Keep the records for provenance but report them separately from results,
    never pooled with the main survey. Zone 7B is being re-collected on v2.5.0.
    **Do not report the pilot data unless the user explicitly asks.** Default all
    updates, highlights, figures and deliverables to the v2.5.0 main survey only;
    consolidate/keep the pilot rows silently for provenance.
  - **Main survey = app v2.5.0 (17 Aug onward).** Main analysis and paper results
    run on v2.5.0 records only; this removes the app-version confound.
- **Codebook notes** (local meaning of recorded values):
  - Fishing method `dynamite` is the **local name for a plant root fish poison**
    (an ichthyotoxic plant), **not an explosive**. Keep the recorded value
    `dynamite`; in every output gloss it as *plant root poison (locally called
    "dynamite")*, and treat it as a plant-poison method, not blast fishing.
  - `Pilai` (free-text "other animal") = **monitor lizard**.
  - Echidna in Zone 6 (free-text "other animal") = **long-beaked echidna
    (*Zaglossus*; likely *Z. bartoni* for mainland Oro — confirm species with a
    specialist before publishing a name).**

## Aristolochia survey (`aristolochia/`)
A separate app and a separate dataset — the rules above are the hunting
survey's and do not carry over. Sole surveyor: Avril Matawan.

- **Exports go to the Drive folder `MCA_QABB_Avril`, one combined CSV per day**
  (`mca_aristolochia_named_<date>.csv`, app v1.2.0 onward): long format, one row
  per vine, plot fields repeated on each of that plot's rows, a plot with no
  vines getting one row with the vine columns blank.
  - Rebuild the two analysis tables with
    `node aristolochia/tools/rebuild_tables.js <files> --out DIR` — it dedupes
    plots on `plot_id` (latest `updated_at` wins) and recomputes the vine
    summary columns, which are deliberately absent from the sent file.
  - **Duplicate uploads are normal.** Drive keeps each send as a new file rather
    than overwriting, and the app asks the surveyor to re-send when unsure a
    file arrived. The rebuild collapses them; never treat a repeat as new data.
  - Earlier practice files from v1.0.0/v1.1.0 are the older two-file shape
    (`..._plots_*.csv` + `..._vines_*.csv`).

- **Survey phases** (this app only — nothing here bears on the hunting
  survey's phases):
  - **2 Sep 2026 = practice — exclude from analysis.** Recorded in Popondetta
    town (GPS around −8.76, 148.24) while the instrument was being built, on
    app v1.0.0–1.3.0. Plots `Z7B-EX6-003`, `Z8-EX6-004`, `Z8-EX6-005`. Keep for
    provenance; never pool with results.
  - **Main survey = 3 Sep 2026 onward**, on the Managalas plateau, app v1.3.1
    onward. This is real data.
  - Practice is bounded by **date**, not by location. The Popondetta GPS
    happens to separate the 2 Sep records, but plateau coordinates no longer
    imply real data on their own — if practice is ever repeated in the field,
    it must be marked explicitly, not inferred from the fix.

- **One record per fallow age.** The unit of observation is a **garden**, not a
  transect. A transect that crosses two fallows is two gardens and must be two
  plot records — one clearing year, one abandonment year, one fallow age each.
  A plot spanning several fallow ages stamps one age onto vines that were in
  another, and its own year fields then describe neither garden.
  - App v1.4.0 asks this before the year questions and records the answer as
    `single_fallow`. **Exclude `single_fallow = no` records from any
    fallow-age analysis** until they are split.
  - Records from before v1.4.0 have no such column — check `plot_notes` for more
    than one year (`Z7A-EX6-017`, `Z7A-EX6-018` are the known cases).

- **Split pending — `Z7A-EX6-017` and `Z7A-EX6-018` (Kawoki, 4 Sep).** Each
  transect crossed two fallows, so each is two gardens recorded as one plot.
  Vine positions are largely recorded; the years are not resolved.
  - `017` — plot notes name *"Fallow 2017 and fallow 2020"*; recorded
    `year_abandoned` 2019 is neither. Vine 2 is noted in the 2020 area; vine 1
    is unplaced.
  - `018` — plot notes name *"fallow areas of 2022 and 2026"*; recorded
    `year_abandoned` 2024 is neither. Both vines are noted at the end of the
    transect in the **2026** portion, at the edge of a still-active garden; the
    2022 portion has no vines recorded.
  - In both, the recorded abandonment year sits between the two note years —
    possibly a middle value rather than one garden's. **Do not reconstruct the
    split without confirming with the surveyor**: which note year belongs to
    which garden, where 017 vine 1 sat, and whether 018's 2022 portion was
    actually searched (a zero only counts if it was walked).
  - Hold both out of fallow-age analysis meanwhile. The clean set is then
    `013`, `014`, `015`, `019`, `020` — n=5.

- **Flagged point — `Z7A-EX6-012` (Kujina, 3 Sep).** Longitude 148.9677, about
  60 km east of the three plots recorded around it the same day (148.42), while
  reporting ±100 m accuracy. Retained pending checking against Kujina's actual
  position. Do not use this point for distance, area or mapping work without
  confirming it; the rest of the record is unaffected.

## App
- Config-driven: `js/config.js` (species, methods, options, appVersion) is the
  single source of truth; `js/schema.js` renders the form; `js/export.js` builds
  the CSV columns. Keep the three in sync. Rebuild the single file with
  `node build.js`. Docs are generated from `docs/generators/*.js`.
- The Aristolochia app has its own `aristolochia/js/config.js`, `schema.js` and
  `export.js` on the same contract, and its own `aristolochia/build.js`.
- **Bump `appVersion` on every change that alters what the app does or records**
  — schema, export columns, or collection/export behaviour. It is written into
  every record as `app_version`, so a version that does not move makes two
  different instruments indistinguishable in the data. Rebuild (`node build.js`)
  in the same commit so the single-file build carries the new version too.
  - `app_version` is stamped when a record is **created**, not when it is
    exported. A plot started before an update keeps the old version — that is
    the intended provenance, and it means a bump never rewrites existing rows.
