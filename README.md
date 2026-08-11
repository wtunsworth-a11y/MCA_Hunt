# MCA Hunting & Wild Resource Use Survey — Offline PWA

A fully offline, installable web app that digitises the **MCA Hunting and Wild
Resource Use Interview Questionnaire (v2)** for field use in the Managalas
Conservation Area, Oro Province, Papua New Guinea.

Built for the Managalas and Oro Province Project (MOPP) — CIFOR-ICRAF, funded by
the European Union under the EU-FCCB Nexus Programme.

- **No internet needed during an interview.** Everything runs on the device.
- **No backend, no login, no accounts.** Data stays on the phone until someone
  exports it deliberately.
- **No build tools required to run it.** It is plain HTML/CSS/JavaScript.

> **New here?** If you are an interviewer, read
> [`docs/STUDENT_SETUP.md`](docs/STUDENT_SETUP.md). If you are the supervisor
> setting it up and collecting the data, read
> [`docs/SUPERVISOR_GUIDE.md`](docs/SUPERVISOR_GUIDE.md).

---

## Two ways to run it

There are two builds of the exact same app. Choose based on how you distribute it.

| | **Hosted (recommended for fieldwork)** | **Single file (easy to email)** |
|---|---|---|
| What you share | A web link (e.g. GitHub Pages) | One file: `dist/MCA_Hunt_Survey.html` |
| First use | Open the link once **while online**, then "Add to Home Screen" | Open the file in a phone browser |
| Offline after that | Yes — installs like an app, icon on home screen | Yes |
| Storage reliability | Most reliable (proper `https://` origin) | Reliable **as long as the file is not moved/renamed** |
| Best for | The real multi-day field trips | Quick demos, a backup copy |

Both store completed interviews locally (IndexedDB) and both export the same CSV.

### Run the hosted build locally (for testing)

```bash
# any static file server works; e.g.
npx http-server -p 8123 -c-1
# then open http://127.0.0.1:8123/
```

### Rebuild the single file

`dist/MCA_Hunt_Survey.html` is generated from the source in `js/`, `css/` and
`data/reference.json`. Regenerate it whenever you edit those (for example after
dropping in the real Zone/Ward lists):

```bash
node build.js
```

---

## What to change before piloting (the open items from the handover)

Everything below is designed to be edited **without touching the app logic**.

1. **Zone & Ward lists** — edit [`data/reference.json`](data/reference.json).
   Replace the placeholder entries with the real lists. Each entry is
   `{ "code": "...", "label": "..." }`. Wards can optionally be scoped to a zone
   by adding `"zone": "z01"`. Then re-run `node build.js` if you use the single
   file.
2. **Species categories & method codes** — edit the `categories` and `methods`
   arrays near the top of [`js/config.js`](js/config.js). These are pilot-
   refinable; add/rename/remove freely. Every grid and every CSV column updates
   automatically.
3. **Respondent ID format** — currently `ZONE-DEVICE-SEQ`
   (e.g. `Z01-ABC-001`). The zone prefix comes from the chosen zone, `DEVICE` is
   a random 3-character code created once per device (prevents collisions when
   4 devices generate IDs offline), and `SEQ` is a per-device counter. Change the
   `makeRespIdCode` function in [`js/app.js`](js/app.js) if a different format is
   agreed.
4. **Consent script** — edit `consentScript` in
   [`js/config.js`](js/config.js).
5. **Interviewer identity** — on first launch each device asks for an
   interviewer name/ID, stored on the device and written into every record as
   `interviewer_id`. No change needed unless you want a fixed list.
6. **Language** — UI is English, as specified. Verbatim/write-in fields are for
   English notes regardless of the spoken language.

---

## How the data is structured

- One IndexedDB record per interview: metadata + a flat `data` map of
  `field_name → value`, plus the respondent's optional `resp_name` kept **outside**
  `data` so it can be excluded from exports.
- Field names follow the flat, coded-column convention in Section 4 of the
  handover, so the CSV sits alongside the project's existing household survey
  data (`wild_forest_products.csv` etc.) with minimal rework.
- The full canonical column list (499 columns for the current 10 categories /
  15 methods) is generated in [`js/export.js`](js/export.js) from the same
  reference lists the form uses, so **headers and collected fields can never
  drift apart.**

### Export conventions

- **CSV is the priority format** (JSON is offered as a raw secondary option).
- Booleans (grid cells, use flags) export as `1`/`0`; untouched = blank.
- Multi-select answers export as a single `;`-joined coded value
  (e.g. `tambu_sacred;other`).
- The Module F catch list exports as one integer count column per category and
  trip: `f_recent_catch_<category>`, `f_successful_catch_<category>`.
- Two CSV buttons: **with names** and **without names** (anonymised). The
  `resp_name` column always exists in the header; the anonymised export just
  leaves it blank.

---

## Privacy & design rules honoured (hard rules from the handover)

- **No hunting/fishing/gathering location is ever captured** — there is no such
  field anywhere in the app or the export.
- The **only** location captured is the device GPS at the **start of Module A**
  (`gps_lat/lon/accuracy/time`), recording where the *interview* happens. It is
  attempted automatically, is retriable, and the interview proceeds and is
  flagged if GPS fails.
- The respondent **name is optional** and separable from analysis data.
- **No cloud sync, analytics or telemetry.** Data leaves the device only when
  someone taps Export and shares the file.

---

## Project layout

```
index.html              Hosted-build entry point
manifest.webmanifest    PWA manifest (installable / add-to-home-screen)
sw.js                   Service worker (offline caching, hosted build only)
build.js                Generates dist/MCA_Hunt_Survey.html (single file)
css/styles.css          Mobile-first UI, large touch targets, scrollable grids
data/reference.json     Zone & Ward pick-lists (EDIT THIS with the real lists)
icons/icon.svg          App icon
js/config.js            Reference lists, option sets, consent script (EDIT categories/methods here)
js/db.js                IndexedDB storage
js/schema.js            Declarative form definition, Modules A–I
js/export.js            Canonical CSV/JSON column list + export
js/app.js               Controller, router, renderer, autosave, GPS, ID codes
dist/MCA_Hunt_Survey.html  Generated single-file build (email this)
docs/                   Setup guides
```

---

## Testing

Two automated checks were used during development and can be re-run:

- **Export logic** (headless, no browser): verifies the 499-column layout,
  grid counts (150/120/40/40/20), field names against Section 4, boolean/multi/
  catch encoding, CSV escaping.
- **End-to-end** (Playwright): full interview offline, GPS-failure tolerance,
  autosave/resume after reload, catch list, completion and CSV download —
  against both the hosted build and the `file://` single-file build.

The acceptance criteria in Section 8 of the handover are all met: a full
interview can be completed in airplane mode, closing/reopening resumes without
loss, GPS is automatic and non-blocking, a CSV opens in a spreadsheet with
Section-4 headers, and no screen records a hunting location.
