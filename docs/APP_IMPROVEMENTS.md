# App improvement backlog

Raised after the 16 Aug pilot (5 interviews) and practice run (13 Aug, 4).
Guiding principle stays: **soft confirmations, not hard blocks** — an interviewer
must always be able to continue past a blank answer. The only genuine hard
requirement is **consent**.

## P1 — validation & prompts (requested)

- [ ] **Confirm key fields before leaving a page.** When advancing from a module,
  if an important field is blank, show a soft confirm ("Zone is not set — the
  interview will have no ID. Go back, or continue anyway?"). Start with **Zone**
  (Module A) — a blank zone in the pilot produced a record with **no respondent
  ID**. Candidates: Zone, Sex, Age.
- [ ] **Ensure a GPS fix before moving on from Module A.** If GPS is still
  pending/missing when leaving Module A, prompt: "No GPS yet — Retry, wait, or
  continue without?" Auto-retry once on entry; keep it non-blocking (2/5 pilot
  interviews had no GPS — both on one device).
- [ ] **Record consent as data + confirm it.** Right now consent only gates
  whether the interview starts; it is **not stored as a field**. Add an explicit
  **consent tick** on the consent screen, store `consent_given` (and
  `consent_time`) in the record and CSV, show it on the Review screen, and warn
  at "Complete" if it's somehow not set. (Also: make the training notes stress
  why consent + recording it matters — see P4.)
- [ ] **Warn on incomplete share allocations.** When leaving Module F, if a trip's
  10-part split totals **1–9** (partly filled but not 10), warn: "Recent shares
  add up to 4/10 — fix or continue?" Don't warn if it's fully blank (not asked)
  or exactly 10. (One pilot interview had totals of 1 and 4.)

## P2 — from the pilot content

- [ ] **Add species: wild pig and cassowary.** Written into the "other animal"
  box in 3 of 5 pilot interviews. Consider promoting to fixed categories (config
  change; propagates to all grids + exports).
- [ ] **GPS reliability check.** One device captured no GPS on either pilot
  interview — verify Location is enabled/allowed on each phone before roll-out;
  consider surfacing a clearer "Location is OFF" hint.

## P3 — completion & review safeguards

- [ ] **Pre-complete summary of gaps.** On "Complete interview", list any soft
  flags (no Zone/ID, no GPS, consent unticked, shares ≠ 10) so the interviewer
  can fix before finalising — still overridable.
- [ ] **Highlight missing key fields on the Review screen** (Zone, consent, GPS).

## P4 — training notes / guides (keep in step with the above)

- [ ] Interviewer field guide: add/strengthen **consent importance**, **always
  pick a Zone**, **let GPS get a fix**, **watch the X/10 share total**.
- [ ] Note the practice-vs-pilot distinction and that duplicate exports are
  expected (de-dupe on `interview_id`).

## Notes / decisions

- Duplicate exports are normal (the app re-exports all completed interviews);
  merge by `interview_id`. Not a bug.
- Interview `start→end` includes pauses/backgrounding; not a measure of effort.
- Data privacy: keep survey data out of the public repo (gitignore or private
  storage) OR make the repo private only on a plan where Pages still publishes.
