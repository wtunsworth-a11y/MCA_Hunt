# Setting up the MCA Aristolochia Survey app

**For: Avril Matawan**

This app records garden and forest plots, and the *Aristolochia* vines on them. It runs on
your phone **with no internet**. You set it up **once**, and after that it works
anywhere — out in the garden or forest, in the village, with the phone in airplane mode.

Internet is needed for two things only: setting the app up the first time, and
sending each day's data to Google Drive.

Read this once before your first garden. Setting up takes about 5 minutes.

---

## Before you start

- Use an **Android phone** with the **Chrome** browser (the default on most
  phones).
- Check the phone's **date and time are set to automatic**
  (Settings → System → Date & time). The app stamps every plot with the date,
  and works out fallow age from the year — a wrong clock puts wrong dates in the
  data.
- You will be asked to allow **Location** — tap **Allow**. This app **does record
  a GPS point of every plot**. That is deliberate, and the consent script tells
  the farmer so.
- Have the **Google Drive app** installed and signed in to the account that can
  write to the **Aristolochia Survey Data** folder.

### Two apps, don't mix them up

| | Colour | Records |
| --- | --- | --- |
| MCA Hunting Survey | **green** | hunting and fishing interviews |
| MCA Aristolochia Survey | **blue** | garden plots and Aristolochia vines |

They are separate apps and keep separate saved data. Installing or updating one
never touches the other's records.

---

## Installing

### Method 1 — a link (recommended)

This is the better method. Ask your supervisor for the link before you go to the
field.

1. **While you have internet**, tap the link. The app opens in Chrome.
2. Tap the **⋮ menu** (three dots, top right) → **"Add to Home screen"** (some
   phones say **"Install app"**).
3. Confirm. You now have a blue **MCA Aristolochia** icon on your home screen.
4. Open it from that icon from now on. **You do not need internet again** until
   you send the data in.

### Method 2 — a file (`MCA_Aristolochia_Survey.html`)

Use this only if you cannot get a link.

1. Save the file to your phone. **Do not move or rename it afterwards** — if the
   file moves, the app will not find plots you already saved.
2. Open it. If the phone asks which app to use, choose **Chrome**.
3. **Test that it remembers things before you use it for real.** Record a
   pretend plot, complete it, fully close Chrome, then open the file again. If
   the pretend plot is still on the home screen, the file method works on your
   phone. **If it is gone, stop and ask for the link instead** — some phones do
   not let a file opened from storage save data.
4. Delete the pretend plot once you are satisfied.

---

## First time you open it

1. It asks for your **name or ID**. Type **Avril Matawan** and tap
   **Save and continue**. This is stored on the phone and attached to every plot
   you record.
2. You land on the **home screen**, with an empty list of plots.

### Test it offline, before your first real garden

1. Turn on **airplane mode**.
2. Record a pretend plot all the way through to **Complete plot**.
3. Close the app completely, then reopen it. The pretend plot should still be
   there.
4. Delete it with the **Delete** button on the home screen.

If that all works, the app is ready for the field.

---

## Recording a plot

1. On the home screen tap **➕ New plot**.
2. **Read the consent script aloud.** It asks permission to walk the place —
   garden or forest — and to record the farmer's name, what is there, and a GPS
   point.
   - If the farmer agrees, **tick the box** and tap **Start recording**.
   - If the farmer does not agree, tap **Declined — cancel**. Nothing is saved.
3. **Section A — Plot and farmer.** The GPS point is taken automatically when
   the plot opens. If it says *No GPS point*, move to open sky, away from thick
   canopy, and tap **Retry GPS**. Fill in the farmer's name, village, Zone and
   Ward.
   - The **plot code** (like `Z6-M46-001`) appears once you choose the Zone. You
     never type it yourself.
4. **Section B — Garden or forest.** First say whether the plot is a **garden**
   or **forest**. The rest of the section changes to match.
   - **Garden:** garden type and description, the year it was cleared, whether
     it is still gardened or abandoned, and the year abandoned. **Fallow age is
     worked out for you** and shown in the blue box — do not try to type it.
   - **Forest:** forest type and description. A forest plot is **not** asked for
     a year, and gets **no fallow age** — the box says *forest, age not
     determined*. That is correct, not a gap. Only write an age into the
     description if someone actually knows it.
   - If you pick the wrong one and change it, the answers from the other side
     are cleared. Re-enter them if you switch back.
5. **Section C — Aristolochia.** Answer whether Aristolochia is present.
   - If **yes**, tap **➕ Add vine** for **each vine you find**. For every vine
     record the tree it is climbing, that tree's DBH in centimetres, and whether
     there is a caterpillar, an egg, or signs of leaves being eaten. A count box
     appears when you answer **Yes** — fill it in if you can count them, leave it
     blank if you cannot.
   - The **butterfly species** question only appears once you have recorded a
     caterpillar, egg or feeding sign. **Only choose *O. priamus* or
     *O. alexandrae* if you are sure.** If you are not sure, leave it as
     *not identified*. A wrong identification is worse than none.
6. Tap **Review**. Check what is recorded, read the thank-you aloud, then tap
   **Complete plot**.

Any question can be left blank, and your work saves as you go. If the app warns
you about something at the bottom of a section — a year that does not make
sense, or Aristolochia marked present with no vines entered — fix it if you can.

---

## Sending the day's data to Drive — do this every evening

You need internet for this step.

1. Open the app. The home screen shows **Today**, with how many plots are
   completed and how many are **not yet exported**.
2. Tap **Send today's data**. That is the only button you need.
3. The phone's share sheet opens. Choose **Drive**, pick the
   **Aristolochia Survey Data** folder, and save.
4. Check the home screen now says **0 not yet exported**.

Two files are sent together in that one tap:

- `mca_aristolochia_plots_<date>.csv` — one row per plot
- `mca_aristolochia_vines_<date>.csv` — one row per vine

They are separate because a plot can have any number of vines. Keep both — the
office needs the pair.

**The share sheet needs the link install.** Android only offers it to a page
served over the internet, so if you installed from the **file** it will not
appear — the app downloads the two files instead and tells you so. Then upload
them to the folder from your **Downloads** with the Google Drive app. This is the
main reason to prefer the link.

Only plots you marked **Complete** are exported. A plot still in progress is
held back until you finish it.

If you were out of signal for a few days, the home screen tells you how many
older plots have not been sent. Use **Other export options → Export everything
not yet sent** to catch up.

---

## Protecting the data

The plots live **only on your phone** until you export them. So:

- **Export every day** you record anything. If the phone is lost or broken
  before you export, that data is gone.
- **Never use Chrome's "Clear browsing data" or "Clear site data"** while there
  are plots you have not exported. It deletes the saved plots.
- **Do not uninstall the app** or delete the file before exporting.
- Deleting a plot with the **Delete** button cannot be undone.

---

## If something goes wrong

**GPS says "No GPS point".**
Check Location is switched on in the phone's settings. Move out from under thick
canopy to open sky and tap **Retry GPS**. If it says permission is blocked, tap
the padlock or ⋮ in Chrome's address bar → Permissions → Location → Allow, then
Retry. You can still record the rest of the plot without a point — it is flagged
at Review so the office knows.

**The app opens but my plots are gone.**
Most often the app was opened a different way than usual — from a different link,
or a file that was moved. Open it exactly the way you did before. If you used the
file method and the file was moved or renamed, move it back.

**The list shows "in progress" on a plot I finished.**
Open it, tap through to **Review**, and tap **Complete plot**. Only completed
plots export.

**Export did nothing / only one file arrived.**
Two files download a moment apart. Check the Downloads folder for both. If a
plot is still in progress, it will not be in the export.

---

## For the supervisor — getting the link (one-time)

The app is on the branch `claude/daily-data-upload-app-1aq36f`. **The repository's
default branch does not have it yet**, so if GitHub Pages is already publishing
the default branch, this app will not appear on the live site until one of these
is done:

- merge `claude/daily-data-upload-app-1aq36f` into the default branch
  (`claude/new-session-aeipuc`), **or**
- point Pages at `claude/daily-data-upload-app-1aq36f` instead. That branch is
  the default branch plus this app, so the hunting survey link keeps working
  unchanged.

To switch Pages on, or change which branch it serves: repo → **Settings** →
**Pages** → Source **"Deploy from a branch"** → pick the branch and folder
**`/ (root)`** → **Save**. After about a minute the two apps are at:

- hunting: `https://wtunsworth-a11y.github.io/MCA_Hunt/`
- Aristolochia: `https://wtunsworth-a11y.github.io/MCA_Hunt/aristolochia/`

Send Avril the second link. Pushing updated code redeploys within a minute;
plots already saved on her phone are never affected by an update.
