const ROOT = require('path').resolve(__dirname, '..', '..');
/* Interviewer field guide (DOCX) — how to administer the MCA Hunting Survey,
 * module by module. Definitions pulled from the app config where possible. */
const fs = require('fs');
const vm = require('vm');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  LevelFormat, BorderStyle, ShadingType,
} = require('docx');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(ROOT + '/js/config.js', 'utf8'), sandbox, { filename: 'config.js' });
const CONFIG = sandbox.window.CONFIG;

const GREEN = '256D40', MUTED = '5C6B60';
const numRefs = []; for (let i = 0; i < 12; i++) numRefs.push('ol' + i);
let olIdx = 0; const nextOl = () => numRefs[olIdx++];
const numbering = { config: [
  { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
  ...numRefs.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] })),
]};

const R = (t, o = {}) => new TextRun({ text: t, ...o });
const B = (t) => new TextRun({ text: t, bold: true });
const P = (runs, o = {}) => new Paragraph({ spacing: { after: 100 }, ...o, children: Array.isArray(runs) ? runs : [R(runs)] });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 220, after: 90 }, children: [R(t, { bold: true, color: GREEN, size: 28 })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 160, after: 50 }, children: [R(t, { bold: true, color: GREEN, size: 23 })] });
const bullet = (runs) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 40 }, children: Array.isArray(runs) ? runs : [R(runs)] });
const step = (ref, runs) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 40 }, children: Array.isArray(runs) ? runs : [R(runs)] });
const note = (runs) => new Paragraph({ spacing: { before: 80, after: 120 }, shading: { type: ShadingType.CLEAR, fill: 'EEF4EF' }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: GREEN, space: 8 } }, indent: { left: 160 }, children: Array.isArray(runs) ? runs : [R(runs)] });
const rule = () => new Paragraph({ spacing: { before: 60, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D6DDD6' } }, children: [] });

const freq = CONFIG.options.activity.map((o) => o.label).join(' · ');
const k = [];

k.push(new Paragraph({ spacing: { after: 20 }, children: [R('MCA Hunting Survey', { bold: true, color: GREEN, size: 40 })] }));
k.push(new Paragraph({ spacing: { after: 40 }, children: [R('Interviewer’s field guide — how to run the interview', { size: 26, color: MUTED })] }));
k.push(new Paragraph({ spacing: { after: 160 }, children: [R('Managalas and Oro Province Project (MOPP) — CIFOR-ICRAF · funded by the European Union', { italics: true, size: 18, color: MUTED })] }));
k.push(P([R('This guide explains how to ask each question. Keep it with you. Use it with the app (or the paper form if the app is unavailable). The survey is about '), B('hunting only'), R(' — the taking of animals.')]));

k.push(H1('Golden rules (read first)'));
k.push(bullet([B('Consent first. '), R('Read the consent aloud. Only start if the person agrees. If they decline, cancel — nothing is saved.')]));
k.push(bullet([B('Never ask or record WHERE anyone hunts. '), R('The app records GPS of where you are sitting only. No hunting locations, ever.')]));
k.push(bullet([B('Any question can be left blank. '), R('If they don’t know or don’t want to answer, leave it and move on. Never pressure.')]));
k.push(bullet([B('Write notes in English, in their words. '), R('For “verbatim” fields, write what they say — don’t summarise or tidy it.')]));
k.push(bullet([B('Tick only what applies. '), R('In the big grids, tick a box only if it’s true; leave the rest blank.')]));
k.push(bullet([B('It saves as you go. '), R('If the phone dies, reopen and tap the interview to continue.')]));
k.push(rule());

k.push(H1('Module A — Profile'));
k.push(bullet([R('The '), B('Respondent ID'), R(' and '), B('GPS'), R(' are captured automatically. If GPS shows “missing”, carry on — it’s optional.')]));
k.push(bullet([R('Record '), B('sex, age band, zone, ward, clan'), R('. The ID appears once you choose the zone.')]));
k.push(H2('Hunting by age'));
k.push(P([R('Ask, for each age band '), B('up to the respondent’s own age'), R(' (older bands are hidden): “At that age, how often did you hunt?”')]));
k.push(note([B('Frequency — read the definitions: '), R(freq, {})]));
k.push(bullet([R('If they hunted at that age, then ask: “Was it '), B('year-round'), R(', or mainly the '), B('wet'), R(' or '), B('dry'), R(' season?”')]));
k.push(bullet([R('If they answer '), B('Did not hunt'), R(' for an age, skip the season question for that age.')]));
k.push(rule());

k.push(H1('Module B — Which animals, and what for'));
k.push(P([R('Go through '), B('every animal'), R('. First ask: “Have you '), B('ever'), R(' hunted this animal?”')]));
k.push(bullet([B('Yes'), R(' — they have hunted it themselves.')]));
k.push(bullet([B('Not personally, but knows of it'), R(' — others hunt it; they haven’t.')]));
k.push(bullet([B('Never saw it'), R(' — unfamiliar with it.')]));
k.push(bullet([B('Didn’t hunt it, for other reasons'), R(' — then write the reason (e.g. tambu, not worth it).')]));
k.push(P([R('Only if '), B('Yes'), R(', ask what it is used for — tick any that apply:')]));
k.push(bullet([B('Food'), R('; '), B('Bilas (worn)'), R(' — items that are worn as adornment; '), B('Ceremonial (used)'), R(' — tools, instruments, display; '), B('Sale'), R('; or write an '), B('Other'), R(' use.')]));
k.push(note([B('Prompt change over time '), R('and write it in the notes box: has what people hunt, or what they use it for, changed?')]));
k.push(rule());

k.push(H1('Module C — Tools'));
k.push(bullet([R('For each animal, tick '), B('every tool ever used'), R(' to hunt it. The tool names are the column headers (turned sideways) — no codes to look up.')]));
k.push(bullet([R('Ask the '), B('preferred tool'), R(' and '), B('why'), R(' (write their words). Ask whether tools have '), B('changed'), R(', and if so which were used before.')]));
k.push(bullet([R('Ask whether they usually hunt '), B('alone or with others'), R('. Note any change over time.')]));
k.push(rule());

k.push(H1('Module D — Tenure and limits'));
k.push(bullet([R('Ask which '), B('area'), R(' they mainly hunt (own clan land, with permission, shared/open, other) — '), B('never where'), R('.')]));
k.push(bullet([R('Ask about '), B('restricted places'), R(' (tambu/sacred, clan no-take, none, other) — again, the '), B('kind'), R(', never the location.')]));
k.push(bullet([R('Ask about limits: are there '), B('seasonal'), R(' limits, limits on the '), B('number taken'), R(', or limits on the '), B('number of trips'), R('? For each, Yes/No/Not sure and a note if yes.')]));
k.push(rule());

k.push(H1('Module E — Timing'));
k.push(bullet([R('For each animal, tick the '), B('months'), R(' it is typically hunted (ever). Tick only what applies.')]));
k.push(bullet([R('Note any change in timing over time.')]));
k.push(rule());

k.push(H1('Module F — Recent hunting (these days)'));
k.push(P([R('These questions are about their hunting '), B('now / the last 12 months'), R('.')]));
k.push(bullet([R('Ask where most of their take comes from: mostly '), B('dedicated'), R(' hunting trips, mostly '), B('incidental'), R(', or half and half.')]));
k.push(bullet([R('For the '), B('most recent trip'), R(' and the '), B('most successful trip'), R(' (let them decide what “successful” means): when, how long, targeted or general, and '), B('what was caught'), R(' (add a row per animal with a count).')]));
k.push(note([B('Shares — “divide into 10 parts.” '), R('Of everything caught on that trip, split 10 parts across '), B('Eaten, Given away, Bilas/ceremonial, Sold'), R('. Use the + / − buttons; the total should read 10 / 10. (If they’re unsure, it’s fine to leave it.)')]));
k.push(bullet([R('Ask how long a '), B('typical'), R(' trip lasts these days (or “no longer hunt”).')]));
k.push(rule());

k.push(H1('Module G — Change over time'));
k.push(P([R('For each animal, at each age '), B('up to their own'), R(', ask how abundant it was '), B('then compared with today'), R('. Enter one code:')]));
k.push(note(CONFIG.abundanceCodes.map((c, i) => R((i ? '   ' : '') + c.label))));
k.push(bullet([R('Ask whether '), B('more or fewer people'), R(' hunt now.')]));
k.push(bullet([R('Write any story about change '), B('verbatim'), R('. Do '), B('not'), R(' convert time references like “before the road” into dates.')]));
k.push(rule());

k.push(H1('Module H — Management and rules'));
k.push(note([B('Rules often change the most — prompt discussion and use the notes freely (no length limit).')]));
k.push(bullet([R('Ask if there are '), B('rules'), R(' about hunting these animals. If yes, for each animal score '), B('Food, Bilas, Sale'), R(' as '), B('0'), R(' = allowed, '), B('1'), R(' = allowed with conditions, '), B('2'), R(' = not allowed. Note any condition behind a “1”.')]));
k.push(bullet([R('Ask '), B('who decides'), R(' the rules, and whether the rules have '), B('changed'), R(' (write how).')]));
k.push(rule());

k.push(H1('Module I — Bilas, ceremonial and income use'));
k.push(bullet([R('Asked '), B('once'), R(', across the animals used for bilas, ceremonial or sale.')]));
k.push(bullet([R('Which '), B('parts'), R(' are used; on what '), B('occasions'), R('; '), B('who'), R(' does it; and how important it is as '), B('income'), R('.')]));
k.push(rule());

k.push(H1('Finishing the interview'));
let r = nextOl();
k.push(step(r, [R('Reach the '), B('Review'), R(' screen and glance over the answers.')]));
k.push(step(r, [R('Tap '), B('Complete interview'), R('. It’s saved on the phone.')]));
k.push(step(r, [R('Thank the respondent.')]));
k.push(step(r, [R('Later, when you have signal or can transfer files, tap '), B('Send interviews'), R(' and share the file with your supervisor.')]));

k.push(H1('Quick reference'));
k.push(P([B('How often (Module A): '), R(freq)]));
k.push(P([B('Abundance codes (Module G): '), R(CONFIG.abundanceCodes.map((c) => c.label).join(' · '))]));
k.push(P([B('Bilas vs ceremonial (Modules B, I): '), R('Bilas = items that are worn. Ceremonial = items that are used (tools, instruments, display).')]));
k.push(P([B('Shares (Module F): '), R('divide the catch into 10 parts across Eaten / Given / Bilas / Sold.')]));
k.push(P([B('Rule scores (Module H): '), R('0 = allowed · 1 = allowed with conditions · 2 = not allowed.')]));
k.push(P([B('Remember: '), R('no hunting locations, ever · any question may be left blank · notes in English, verbatim.')]));

const doc = new Document({
  numbering,
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 850, bottom: 850, left: 1000, right: 1000 } } }, children: k }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(ROOT + '/docs/MCA_Hunt_Interviewer_Guide.docx', buf);
  console.log('wrote docs/MCA_Hunt_Interviewer_Guide.docx', buf.length, 'bytes');
});
