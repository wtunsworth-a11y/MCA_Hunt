# Received data → stored in Google Drive (not in this repo)

Survey data is **not** kept in this public repository. It lives in the private
Google Drive folder **"Hunting Data"**:

- **Pilot/** — pilot-round exports (16 Aug 2026 onward).
- **Survey Data/** — the main survey data (once collection begins).

De-duplicate on `interview_id` when merging (the app re-exports all completed
interviews each time, so the same interview can appear in more than one file).

## Why not in the repo?

This repository is public, and exports can contain the interview GPS (and,
optionally, respondent names). Keeping the data in Drive keeps it private while
the app code stays public so GitHub Pages can keep serving/updating the app.

Any `.csv`/`.json` dropped into this folder is git-ignored (see `.gitignore`) so
data is never accidentally pushed. This folder just documents where the data
actually lives.
