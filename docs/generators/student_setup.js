const ROOT = require('path').resolve(__dirname, '..', '..');
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  LevelFormat, BorderStyle,
} = require('docx');

const GREEN = '256D40';
const MUTED = '5C6B60';

// Ordered-list references (each list restarts at 1 by using its own reference).
const numRefs = [];
for (let i = 0; i < 12; i++) numRefs.push('ol' + i);
let olIdx = 0;
const nextOl = () => numRefs[olIdx++];

const numbering = {
  config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
    ...numRefs.map((ref) => ({
      reference: ref,
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 460, hanging: 260 } } } }],
    })),
  ],
};

// --- content helpers ---
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 100 },
  children: [new TextRun({ text: t, bold: true, color: GREEN, size: 30 })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 60 },
  children: [new TextRun({ text: t, bold: true, color: GREEN, size: 25 })] });
const P = (runs, opts = {}) => new Paragraph({ spacing: { after: 100 }, ...opts,
  children: (Array.isArray(runs) ? runs : [new TextRun(runs)]) });
const bullet = (runs) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 40 },
  children: (Array.isArray(runs) ? runs : [new TextRun(runs)]) });
const step = (ref, runs) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 40 },
  children: (Array.isArray(runs) ? runs : [new TextRun(runs)]) });
const R = (t, o = {}) => new TextRun({ text: t, ...o });
const B = (t) => new TextRun({ text: t, bold: true });
// Callout: a shaded, bordered paragraph for tips/warnings.
const note = (runs, color = GREEN) => new Paragraph({
  spacing: { before: 80, after: 120 }, shading: { type: 'clear', fill: 'EEF4EF' },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color, space: 8 } },
  indent: { left: 160 },
  children: (Array.isArray(runs) ? runs : [new TextRun(runs)]),
});
const rule = () => new Paragraph({ spacing: { before: 60, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D6DDD6' } }, children: [] });

const kids = [];

// Title block
kids.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 20 },
  children: [new TextRun({ text: 'MCA Hunting Survey app', bold: true, color: GREEN, size: 40 })] }));
kids.push(new Paragraph({ spacing: { after: 40 },
  children: [new TextRun({ text: 'Setup guide for interviewers', size: 26, color: MUTED })] }));
kids.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({
  text: 'Managalas and Oro Province Project (MOPP) — CIFOR-ICRAF · funded by the European Union (EU-FCCB Nexus Programme)',
  italics: true, size: 18, color: MUTED })] }));

kids.push(P([R('This app lets you record interviews on your phone '), B('with no internet'),
  R('. You set it up '), B('once'), R(', and after that it works anywhere — in the bush, in the village, with the phone in airplane mode. Please read this before your first interview. Setup takes about 5 minutes.')]));

kids.push(rule());
kids.push(H1('Before you start'));
kids.push(bullet([R('Use an '), B('Android phone'), R(' with the '), B('Chrome'), R(' browser (the default on most phones). This works best.')]));
kids.push(bullet([R('Check your phone’s '), B('date and time are correct'), R(' (Settings → System → Date & time → “Automatic”). The app uses the time to record when interviews happen.')]));
kids.push(bullet([R('When asked to allow '), B('Location'), R(', tap '), B('Allow'), R('. The app only records where the '), R('interview', { italics: true }), R(' takes place. '), B('It never records where anyone hunts.')]));

kids.push(H1('Setting it up'));
kids.push(P([R('Your supervisor will send you the app in '), B('one of two ways'), R('. Follow the matching steps.')]));

kids.push(H2('Method 1 — You received a LINK  (recommended)'));
let ref = nextOl();
kids.push(step(ref, [B('While you have internet'), R(', tap the link. The app opens in Chrome.')]));
kids.push(step(ref, [R('Tap the '), B('⋮ menu'), R(' (three dots, top right) → '), B('“Add to Home screen”'), R(' (some phones say '), B('“Install app”'), R(').')]));
kids.push(step(ref, [R('Confirm. You now have an '), B('MCA Hunt'), R(' icon on your home screen, like any app.')]));
kids.push(step(ref, [R('Open it from that icon from now on. '), B('You do not need internet again.')]));

kids.push(H2('Method 2 — You received a FILE  (MCA_Hunt_Survey.html)'));
ref = nextOl();
kids.push(step(ref, [R('Save the file to your phone (accept the download, or save the email attachment). Remember where it is — '), B('do not move or rename it afterwards'), R(', or the app will not find your saved interviews.')]));
kids.push(step(ref, [R('Open the file. If your phone asks which app to use, choose '), B('Chrome'), R('.')]));
kids.push(step(ref, [R('The app opens. (Optional: Chrome '), B('⋮ menu → “Add to Home screen”'), R(' makes it easier to reopen.)')]));
kids.push(note([B('Which is better? '), R('The '), B('link'), R(' method is more reliable for a multi-day field trip. Use the file method only if you cannot get the link.')]));

kids.push(H1('First time you open it'));
ref = nextOl();
kids.push(step(ref, [R('It asks for your '), B('interviewer name or ID'), R(' (for example your name, or INT-03). Type it and tap '), B('Save and continue'), R('. This is stored on your phone and attached to every interview, so we know who collected what.')]));
kids.push(step(ref, [R('You land on the '), B('home screen'), R(', showing your list of interviews (empty at first).')]));
kids.push(note([B('Test it now: '), R('turn on '), B('airplane mode'), R(', then do a practice interview with a pretend respondent to check it works offline. Delete the test afterwards from the home screen.')]));

kids.push(H1('Doing an interview'));
ref = nextOl();
kids.push(step(ref, [R('On the home screen tap '), B('➕ New interview'), R('.')]));
kids.push(step(ref, [B('Read the consent script aloud.'), R(' If the person agrees, '), B('tick the consent box'), R(' and tap '), B('“Start interview”'), R(' (it won’t start without the tick). If they do not agree, tap '), B('“Declined — cancel”'), R(' — nothing is saved.')]));
kids.push(step(ref, [B('Hunt, Fish, or Both?'), R(' Choose on the profile screen. '), B('“Fishes”'), R(' skips the hunting questions and goes straight to the short fishing section — use it for people (often women) who fish but don’t hunt.')]));
kids.push(step(ref, [R('The app fills in Module A automatically:')]));
kids.push(bullet([R('It gets the '), B('GPS'), R(' for where you are sitting. If it says '), B('“GPS missing”'), R(', that’s OK — tap '), B('Retry GPS'), R(' if you have a moment, otherwise carry on. The interview is not blocked.')]));
kids.push(bullet([R('Once you pick the '), B('Zone'), R(', a '), B('Respondent ID'), R(' appears automatically (e.g. Z1-ABC-001). You never type this yourself.')]));
kids.push(step(ref, [R('Work through the modules using '), B('Next'), R('. Use '), B('Back'), R(' or the round letter buttons at the top to change anything. (If a Zone or GPS is missing, the app will ask you to confirm before moving on.)')]));
kids.push(step(ref, [B('Every question can be left blank.'), R(' If someone won’t answer or doesn’t know, just leave it and move on — the app never stops you.')]));
kids.push(step(ref, [R('At the end you reach a '), B('Review'), R(' screen. Check it, then tap '), B('Complete interview'), R('.')]));
kids.push(note([B('Your progress saves automatically after every tap. '), R('If the battery dies or you close the app mid-interview, just reopen it and tap the interview in your list to carry on where you left off.')]));

kids.push(H1('Tips for the field'));
kids.push(bullet([R('You can do '), B('many interviews on one phone'), R(' across several days before sending anything in. They all stay in your list.')]));
kids.push(bullet([R('The two big tick-grids (methods, and months) '), B('scroll sideways'), R(' — swipe left and right to see all columns. The first column (the animal) stays put.')]));
kids.push(bullet([R('In Module F you record two trips — '), B('most recent'), R(' and '), B('most successful in the last 12 months'), R('. Fill in both.')]));
kids.push(bullet([R('Some questions only appear when relevant (e.g. an “other, specify” box only shows if you chose “other”). That’s normal.')]));

kids.push(H1('Sending your interviews to the supervisor'));
kids.push(P([R('When you next have internet or can transfer files:')]));
ref = nextOl();
kids.push(step(ref, [R('Open the app → home screen.')]));
kids.push(step(ref, [R('Tap '), B('Send interviews (with names)'), R(' — or '), B('Send (no names)'), R(' if your supervisor asked for anonymised data.')]));
kids.push(step(ref, [R('Your phone’s normal '), B('share menu'), R(' pops up. Choose '), B('WhatsApp, email, Google Drive, Bluetooth'), R(' — whatever you use — and pick your supervisor. The file goes with one tap.')]));
kids.push(step(ref, [R('Your interviews '), B('stay on your phone'), R(' too (marked “exported”), so nothing is lost.')]));
kids.push(note([R('If the share menu doesn’t appear, the app instead '), B('downloads'), R(' the file — open Downloads and attach it to an email/WhatsApp yourself. Same result.')]));

kids.push(H1('If something goes wrong'));
kids.push(bullet([B('App looks empty / lists gone: '), R('make sure you opened it the '), B('same way'), R(' as before (same icon, or same file in the same place). If you used the file method and moved the file, put it back.')]));
kids.push(bullet([B('GPS never works: '), R('carry on — it’s optional and the interview is still valid, just flagged “no GPS”.')]));
kids.push(bullet([B('Not sure a change saved: '), R('it did — the app saves after every tap. When in doubt, go back a module and check.')]));
kids.push(bullet([B('Anything else: '), R('note it down and tell your supervisor. Do '), B('not'), R(' delete interviews unless you’re sure.')]));

const doc = new Document({
  numbering,
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(ROOT + '/docs/MCA_Hunt_Student_Setup.docx', buf);
  console.log('wrote docs/MCA_Hunt_Student_Setup.docx', buf.length, 'bytes');
});
