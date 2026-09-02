# MCA Aristolochia Survey

Offline field app for recording garden plots and the *Aristolochia* vines on
them, with birdwing (*Ornithoptera*) occupancy recorded per vine.

It is a sibling of the hunting survey in the parent folder and shares that app's
structure and the same Zone/Ward lists (`../data/reference.json`). The two apps
are independent at runtime: separate IndexedDB databases, separate localStorage
keys, separate exports.

The interface uses a blue colour scheme so it is not mistaken for the hunting
survey on a shared device.

## Consent

`+ New plot` opens a permission and consent screen before anything is recorded.
The script (`CONFIG.consentScript`) is read aloud and covers both permission to
walk the garden and consent to record the farmer's name and answers; it names
the GPS point explicitly, since unlike the hunting survey this instrument does
record location. The surveyor's name from the device is substituted into the
script.

Recording starts only once the box is ticked. **Declining saves nothing** — no
record is written and no plot code is used up. `consent_given` and
`consent_time` are exported with every plot, the Review screen shows whether
consent was recorded, and completing a plot without it raises a warning.

`CONFIG.thankYouScript` is shown on the Review screen to be read aloud at the
end.

## What it records

Per plot:

| Field | Notes |
| --- | --- |
| Consent | `consent_given` / `consent_time`, recorded at the consent screen |
| GPS point | lat, lon, accuracy, fix time — captured when the plot is created, retryable |
| Farmer's name | stored outside the data map, so it can be left out of an export |
| Village, Zone, Ward | Zone and Ward from the shared reference lists |
| Plot type | **garden** or **forest** — gates the rest of Section B |
| Garden type + description | garden plots only; type from `CONFIG.gardenTypes`, plus free text |
| Year cleared | garden plots only |
| Garden status | garden plots only: abandoned (in fallow) / still being gardened |
| Year abandoned | garden plots only, asked if abandoned |
| Fallow age | **calculated**, not typed: current year − year abandoned. Blank for forest |
| Years gardened | **calculated**: year abandoned − year cleared. Blank for forest |
| Forest type + description | forest plots only; type from `CONFIG.forestTypes`, plus free text |
| Aristolochia present | yes / no |

### Garden or forest

Section B opens with a **garden / forest** gate. A forest plot is not asked for
a clearing year, an abandonment year or a status, and gets **no fallow age** —
its age is not determined by this instrument. `plot_type` in the export says why
those columns are blank.

Switching the gate **clears the branch no longer in use**, so a row can never
carry a forest type alongside a clearing year. Section C works the same either
way: vines are recorded on forest plots exactly as on gardens.

Per vine, when Aristolochia is present:

| Field | Notes |
| --- | --- |
| Host tree species | free text by default (see `CONFIG.hostTrees` below) |
| Tree DBH (cm) | |
| Vine planted or wild | **asked of the farmer** — people do plant Aristolochia, so a vine's presence is not evidence of natural occurrence |
| Caterpillar seen | yes/no, plus an optional count |
| Egg laid here, or caterpillar moved here | **asked of the farmer**, only when a caterpillar is present — larvae get moved between vines |
| Egg seen | yes/no, plus an optional count |
| Signs of leaves eaten | yes/no |
| Butterfly species | *O. priamus* / *O. alexandrae* / other / not identified — asked only where a caterpillar, egg or feeding sign was recorded |
| Notes | |

Species is recorded only where it can be told. A caterpillar or egg that was not
identified stays `unknown` rather than being forced to a species.

## Export and daily upload

Uploading is manual, and one tap. **Send today's data** hands **one file** to
the phone's share sheet, so it can go straight into the Drive folder; where file
sharing is unavailable (desktop, or the app opened from disk) it downloads
instead and says so.

`mca_aristolochia_named_<date>.csv` is the combined long format: **one row per
vine**, with the plot's fields repeated on each of its rows, and a plot with no
vines getting one row with the vine columns blank.

**Why one file and not two.** Two files can half-arrive, and a half-arrival is
indistinguishable from success at the sending end — `navigator.share()` resolves
when the files reach the share sheet, not when the receiving app has saved them.
That happened on the first real send: the plots file landed and the vines file
did not, while the app reported everything exported. One file either arrives or
it does not.

The plot-level summary columns (`vine_count`, `vines_with_*`, `*_total`,
`vines_species_*`) are **not** carried in the sent file. They are derived from
the vine rows, and storing them again only creates a way for the file to
contradict itself.

### Rebuilding the two tables

```
node tools/rebuild_tables.js <combined.csv ...> --out DIR
```

writes `plots.csv` (one row per plot, summary columns recomputed) and
`vines.csv` (one row per vine) from any number of daily files. Plots dedupe on
`plot_id` keeping the latest `updated_at`, and repeated uploads of the same day
collapse — Drive keeps each send as a new file rather than overwriting, so
duplicates are normal.

The two-table form is also available in the app under **Other export options →
Download as two tables**; it is never what gets sent.

The home screen links to the Google Drive folder (`CONFIG.driveFolderUrl`),
shows how many of today's plots are still unexported, and warns when completed
plots from earlier days have not been sent. Download-only variants stay under
**Other export options**, off the daily path.

Because a share resolving does not prove the file was saved, the app asks
whether it reached Drive and marks the plots exported **only on confirmation**.
Answer no and they stay pending. Records are never deleted after export, so
re-sending is always safe.

### Update notice

`build.js` writes `version.json` from the same `appVersion` stamped into
records. A running app fetches it when online; on a mismatch it shows a banner
telling the surveyor to stay online while the new build downloads, then restarts
itself — but only from the home screen, never mid-plot. A restart is attempted
at most once per version, so a `version.json` published ahead of the code cannot
cause a reload loop; the banner then asks them to close and reopen instead.

Only plots marked **Complete** are exported; an in-progress plot is held back so
a half-entered record is never filed as data.

Survey data must never be committed to this repo — it is public. The export
filenames are covered by `.gitignore` at the repo root.

## Configuring

`js/config.js` is the single source of truth. `js/schema.js` renders the form and
`js/export.js` builds the CSV columns from the same lists, so the three stay in
sync.

- `gardenTypes`, `forestTypes` — edit freely. `code` is what lands in the CSV, so keep codes
  stable once collection starts.
- `hostTrees` — **empty by default**, which makes host tree species a free-text
  field. Once the common set is known from the field, fill it in
  (`{ code: 'ficus', label: 'Ficus sp.' }`) and the field becomes a dropdown with
  an "Other (specify)" escape. No other code change is needed.
- `vineSigns` — the three observations made on every vine. `counted: true` adds
  the optional count box.
- `birdwing_species`, `driveFolderUrl`, `minYear`, `appVersion` — as named.

Zones and Wards are not here; they load from `../data/reference.json`, shared
with the hunting survey.

## Building and running

```
node build.js
```

writes `dist/MCA_Aristolochia_Survey.html` — one file with all CSS, JS, the
reference lists and the icon inlined, so it runs offline when opened straight
from disk on a phone. Re-run it after editing anything in `js/`, `css/` or
`../data/reference.json`.

To run the modular version, serve the repo root (not this folder — the reference
file is one level up) and open `/aristolochia/`.

## Naming

*Ornithoptera alexandrae* (Rothschild, 1907) is the correct binomial; the app and
exports use `alexandrae`.
