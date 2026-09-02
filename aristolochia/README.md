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
| Garden type + description | type from `CONFIG.gardenTypes`, plus free text |
| Year cleared | |
| Garden status | abandoned (in fallow) / still being gardened |
| Year abandoned | asked only if abandoned |
| Fallow age | **calculated**, not typed: current year − year abandoned |
| Years gardened | **calculated**: year abandoned − year cleared |
| Aristolochia present | yes / no |

Per vine, when Aristolochia is present:

| Field | Notes |
| --- | --- |
| Host tree species | free text by default (see `CONFIG.hostTrees` below) |
| Tree DBH (cm) | |
| Caterpillar seen | yes/no, plus an optional count |
| Egg seen | yes/no, plus an optional count |
| Signs of leaves eaten | yes/no |
| Butterfly species | *O. priamus* / *O. alexandrae* / other / not identified — asked only where a caterpillar, egg or feeding sign was recorded |
| Notes | |

Species is recorded only where it can be told. A caterpillar or egg that was not
identified stays `unknown` rather than being forced to a species.

## Export and daily upload

Uploading is manual. **Export today's data** writes two CSVs, linked by
`plot_id`:

- `mca_aristolochia_plots_named_<date>.csv` — one row per plot, including the
  derived fallow age and per-plot vine summary counts.
- `mca_aristolochia_vines_<date>.csv` — one row per vine, with the plot's
  identifiers denormalised onto it so the file stands alone in analysis.

Save both into the Google Drive folder linked from the home screen
(`CONFIG.driveFolderUrl`). The home screen shows how many of today's plots are
still unexported, and warns when completed plots from earlier days have not been
sent.

Only plots marked **Complete** are exported; an in-progress plot is held back so
a half-entered record is never filed as data.

Survey data must never be committed to this repo — it is public. The export
filenames are covered by `.gitignore` at the repo root.

## Configuring

`js/config.js` is the single source of truth. `js/schema.js` renders the form and
`js/export.js` builds the CSV columns from the same lists, so the three stay in
sync.

- `gardenTypes` — edit freely. `code` is what lands in the CSV, so keep codes
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
