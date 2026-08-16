# Supervisor guide — MCA Hunting Survey app

This is for whoever prepares the app, hands it to the interviewers, and collects
the data. No programming is needed for the day-to-day parts. The one-time
technical setup (hosting) is a short, well-signposted process.

---

## 1. Before the pilot: put in the real Zone & Ward lists

The app ships with **placeholder** zones and wards. Replace them:

1. Open [`data/reference.json`](../data/reference.json).
2. Replace the `zones` and `wards` lists with the real ones. Each entry looks
   like:
   ```json
   { "code": "z01", "label": "Managalas Plateau" }
   ```
   - `label` is what the interviewer sees.
   - `code` is short, stable, and used in the exported data and in the
     respondent ID prefix. Keep codes short (2–4 characters) and don't reuse or
     rename them later, or old and new data won't line up.
   - *(Optional)* to show only the wards belonging to a zone, add a `zone` key to
     a ward: `{ "code": "w05", "label": "Afore", "zone": "z01" }`. Wards with no
     `zone` show for every zone.
3. If you distribute the **single file**, re-generate it after editing:
   ```bash
   node build.js
   ```
   (If you distribute a **link**, just commit/redeploy — see section 3.)

You can adjust the **species categories**, **method codes** and the **consent
script** the same way, in [`js/config.js`](../js/config.js). The whole form and
the export columns update automatically.

---

## 2. Choose how to give it to the 4 interviewers

Both options are the same app. See the comparison table in the
[README](../README.md#two-ways-to-run-it).

- **Link (recommended):** host it once (section 3), send everyone the link. They
  "Add to Home Screen" while online, once, then work fully offline. Most reliable
  for real fieldwork.
- **File:** send `dist/MCA_Hunt_Survey.html` as an email/WhatsApp attachment.
  Easiest to send, but the interviewer must not move/rename the file after
  saving it, or their saved interviews won't be found.

Give every interviewer the [`STUDENT_SETUP.md`](STUDENT_SETUP.md) instructions.

> **Each phone is independent.** Interviews live only on the phone that created
> them until that interviewer exports and sends you a CSV. The respondent ID
> includes a per-device code so IDs never collide between the 4 phones, even
> though they're all offline.

---

## 3. Hosting the link (one-time, free) — GitHub Pages

The project is already on GitHub, so the free host is GitHub Pages. **Switching
Pages on for the first time can only be done by the repo owner (you) — it can't
be automated.** It takes about five clicks, once.

**Do this once:**

1. Go to the repository on GitHub:
   `https://github.com/wtunsworth-a11y/MCA_Hunt`
2. Click **Settings** (top of the repo) → **Pages** (left sidebar).
3. Under **"Build and deployment" → Source**, choose **"Deploy from a branch"**.
4. In **Branch**, select **`claude/new-session-aeipuc`** (the branch with the
   app) and folder **`/ (root)`**, then click **Save**.
5. Wait about a minute, then refresh. GitHub shows your live link at the top of
   the Pages screen. It will be:

   **`https://wtunsworth-a11y.github.io/MCA_Hunt/`**

6. Open that link once to confirm it loads, then send it to the interviewers
   with the student setup sheet.

That's it. Each time you push updated code (new zone list, refined categories),
Pages redeploys within a minute. Interviewers who installed it pick up changes
next time they open it online; **their saved interviews are never affected.**

> **Later, if you merge this into your `main` branch**, just change the Pages
> **Branch** setting to `main` and the same link keeps working.

> **A note on the "Deploy PWA to GitHub Pages" Actions workflow in the repo:**
> it's an *optional* alternative and is set to manual-only, so you can ignore
> it. The branch method above is simpler and needs no Actions.

*(Any static host works — Netlify, a shared drive served over HTTP, etc. It just
needs to serve the files over `http(s)`, not be opened from disk.)*

---

## 4. Collecting the data

1. Interviewers export a **CSV** from their phone and send it to you (one file
   per phone, per export).
2. Each CSV has the **same columns** (645 for the current 12 categories / 18
   methods), so you can stack all four phones' files together — keep the header
   from one, append the data rows from the others.
3. Columns follow the flat, coded naming in Section 4 of the handover, matching
   the style of the existing household survey data, so it merges with minimal
   rework.

### Understanding the export

- One **row per completed interview**.
- `resp_id_code` is the anonymised key to analyse on. `resp_name` is a separate
  column you can delete before analysis (or ask interviewers to use the
  **"Export CSV (without names)"** button, which leaves it blank).
- Tick-boxes export as `1`/`0` (blank = not ticked/answered).
- Multi-answer questions are `;`-joined codes in one cell
  (e.g. `feathers;teeth_claws`).
- Module F catch counts are per category: `f_recent_catch_pigeon`,
  `f_successful_catch_bats`, etc.
- `gps_lat` / `gps_lon` are the **interview** location only. There is **no**
  hunting-location column anywhere, by design.
- Metadata columns at the end: `interviewer_id`, start/end times,
  `interview_status`, `sync_status`, `app_version`.

---

## 5. Privacy checklist

- The app captures **no hunting location** — ever.
- Names are optional and separable; prefer the anonymised export for analysis.
- Nothing is uploaded anywhere automatically. Data moves only when an
  interviewer taps Export and shares the file. Handle those CSVs according to
  your project's data-protection rules.

---

## 6. Quick technical checks (optional)

If you have Node installed and want to re-verify things after editing config:

```bash
node build.js          # regenerate the single-file build
```

The repository's [README](../README.md#testing) describes the automated export
and end-to-end tests used during development.
