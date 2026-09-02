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

- **Practice data — exclude from analysis.** Records collected by Avril **in
  Popondetta town** (GPS around −8.76, 148.24) are practice on the app, not
  survey data. Real plots are on the Managalas plateau, so the GPS point
  separates them. Keep them for provenance; never pool them with results.
  - This applies to **this app only** — it says nothing about the hunting
    survey's phases.
  - The GPS point is the only marker. A practice record with no fix, or one
    recorded in a survey village, cannot be caught this way — check the plot
    against its recorded village and zone if anything looks off.

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
