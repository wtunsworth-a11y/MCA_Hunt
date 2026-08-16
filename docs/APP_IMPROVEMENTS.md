# App improvement backlog

Raised after the 16 Aug pilot (5 interviews) and practice run (13 Aug, 4).
Guiding principle stays: **soft confirmations, not hard blocks** — an interviewer
must always be able to continue past a blank answer. The only genuine hard
requirement is **consent**.

## P1 — validation & prompts (DONE)

- [x] **Confirm Zone/GPS before leaving Module A.** Soft confirm listing any
  issues ("No Zone chosen — no respondent ID"; "GPS not captured") on Next;
  interviewer can still continue.
- [x] **Consent recorded + confirmed.** Consent screen now has a required tick;
  the interview won't start without it. Stored as `consent_given` +
  `consent_time`, shown prominently on the Review screen, exported.
- [x] **Warn on incomplete share allocations** (Module F): if a trip's 10-part
  split totals 1–9, a soft confirm appears on Next. Blank or exactly-10 = no
  warning.
- [x] Review screen also flags "no ID / no GPS" so gaps are visible before
  Complete.

## Done

- [x] **Fishing section (Module J)** + a **Hunt / Fish / Both gate** in Module A.
  "Fishes" skips the hunting modules and jumps to fishing (for people — often
  women — who fish but don't hunt). Fishing captures main river, targets, and
  tools incl. destructive methods (dynamite, poisons, mosquito net). Consent
  script updated (river is a deliberate location exception).
- [x] **Sampling guidance** added to the interviewer field guide (spread across
  zones; actively seek 40+ and 60+ for trend data; include women via the fishing
  gate; quota blanks to fill in).

- [x] **Gate Modules C (tools), E (timing), G (abundance) to hunted species**
  (Module B `b_taken = yes`). Removes not-comparable "negative" data for animals
  the respondent doesn't hunt. Module H (rules) left ungated on purpose — rules
  about *not* hunting matter most for protected species nobody hunts. CSV column
  layout unchanged (gated species stay blank). Guide + paper form updated.

## P2 — from the pilot content

- [x] **Add species: wild pig and cassowary** (now 12 categories). Affordable
  because Modules C/E/G are gated to hunted species.
- [x] **"Other tool → specify"** free-text field added to Module C
  (`c_method_other_specify`).
- [x] **Added "Axe" (tool 19)**; material (stone vs metal) goes in the notes.
- [x] **Keep "Glue"** — zero pilot use, but the pilot is in Afore; glue is used
  in other areas. Retained.
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
