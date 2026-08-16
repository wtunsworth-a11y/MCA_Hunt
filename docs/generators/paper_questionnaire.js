const ROOT = require('path').resolve(__dirname, '..', '..');
/* Build the paper backup questionnaire (DOCX) from the app's own config, so it
 * matches the digital form. Landscape; tick boxes for every option; write-in
 * lines; grids as tables with rotated tool headers. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, PageOrientation,
  TextDirection, VerticalAlign, ShadingType,
} = require('docx');

// Load the real CONFIG so the paper form mirrors the app exactly.
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(ROOT + '/js/config.js', 'utf8'), sandbox, { filename: 'config.js' });
const CONFIG = sandbox.window.CONFIG;
const O = CONFIG.options;

const GREEN = '256D40', MUTED = '5C6B60', LINE = 'BBBBBB';
const BOX = '☐'; // ☐
const USABLE = 15398; // landscape A4 usable width (DXA)

const R = (t, o = {}) => new TextRun({ text: t, ...o });
const P = (children, o = {}) => new Paragraph({ spacing: { after: 60 }, ...o,
  children: Array.isArray(children) ? children : [R(children)] });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 80 },
  children: [R(t, { bold: true, color: GREEN, size: 26 })] });
const H2 = (t) => new Paragraph({ spacing: { before: 120, after: 50 }, children: [R(t, { bold: true, size: 22 })] });
const note = (t) => new Paragraph({ spacing: { after: 80 }, children: [R(t, { italics: true, color: MUTED, size: 18 })] });

// A row of tick boxes for a set of options.
const ticks = (options, o = {}) => new Paragraph({ spacing: { after: 70 }, ...o,
  children: options.flatMap((op) => [R(BOX + ' ' + op.label + '    ', { size: 20 })]) });
// Label + write-in line.
const writein = (label, lines = 1) => {
  const kids = [R(label + '  ', { bold: true, size: 20 })];
  kids.push(R(' '.repeat(60) , { }));
  return new Paragraph({ spacing: { after: lines > 1 ? 160 : 90 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } }, children: [R(label + ':  ', { bold: true, size: 20 })] });
};
const blankLine = () => new Paragraph({ spacing: { after: 140 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } }, children: [R('')] });

const noBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  left: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  right: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color: LINE },
};
const cell = (children, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 40, bottom: 40, left: 60, right: 60 },
  children: Array.isArray(children) ? children : [P(children)],
  ...o,
});
const headCell = (text, width, o = {}) => cell([P([R(text, { bold: true, size: 18 })])], width,
  { shading: { type: ShadingType.CLEAR, fill: 'EEF4EF' }, ...o });

const kids = [];

// --- Title / cover -------------------------------------------------------
kids.push(new Paragraph({ children: [R('MCA Hunting Survey', { bold: true, color: GREEN, size: 40 })] }));
kids.push(note('Paper backup form — use only if the app is unavailable. Later, enter these answers into the app or hand to the supervisor. Do NOT record where people hunt.'));
kids.push(new Paragraph({ spacing: { after: 80 }, children: [
  R('Respondent ID: ', { bold: true }), R('__________________     '),
  R('Interviewer: ', { bold: true }), R('__________________     '),
  R('Date: ', { bold: true }), R('____________     '),
  R('GPS (if known): ', { bold: true }), R('__________________'),
]}));
kids.push(P([R(BOX + ' ', { size: 24 }), R('Consent was read aloud and the respondent agreed to take part.', { bold: true })]));

// --- Module A ------------------------------------------------------------
kids.push(H1('Module A — Profile'));
kids.push(ticks(O.sex.map((x) => x), {}));
kids.push(P([R('Sex (tick one above).  ', { size: 18, color: MUTED })]));
kids.push(new Paragraph({ children: [R('Age: ', { bold: true }), ...CONFIG.ageBands.map((b) => R(BOX + ' ' + b.label + '    '))] }));
kids.push(writein('Zone'));
kids.push(writein('Ward'));
kids.push(writein('Clan'));
kids.push(P([R('Does this person:  ', { bold: true }), ...O.activity_type.map((x) => R(BOX + ' ' + x.label + '    '))]));
kids.push(note('If "Fishes" only, SKIP Modules B–I and go straight to Module J (Fishing). If "Hunts", skip Module J.'));
kids.push(P([R('Why do you hunt? (tick any that apply)  ', { bold: true }), ...O.hunt_reasons.map((x) => R(BOX + ' ' + x.label + '    '))]));
kids.push(H2('Hunting by age — for each age up to the respondent’s own: how often did they hunt, and (if they did) year-round or which season?'));
{
  const aw = 1900, fw = 2400, sw = (USABLE - aw - fw * 4);
  const header = new TableRow({ tableHeader: true, children: [
    headCell('Age', aw),
    headCell('Regular (>1/mo)', fw), headCell('Occasional (6–12/yr)', fw),
    headCell('Seldom (<6/yr)', fw), headCell('Did not hunt', fw),
    headCell('Season: Year-round / Wet / Dry', sw),
  ]});
  const rows = CONFIG.ageBands.map((b) => new TableRow({ children: [
    cell([P([R(b.label, { bold: true })])], aw),
    cell(BOX, fw), cell(BOX, fw), cell(BOX, fw), cell(BOX, fw),
    cell([P([R(BOX + ' Year-round   ' + BOX + ' Wet   ' + BOX + ' Dry', { size: 18 })])], sw),
  ]}));
  kids.push(new Table({ width: { size: USABLE, type: WidthType.DXA }, columnWidths: [aw, fw, fw, fw, fw, sw], borders: noBorders, rows: [header, ...rows] }));
}

// --- Module B ------------------------------------------------------------
kids.push(H1('Module B — Which animals, and what for'));
kids.push(note('Ever hunted? key:  Y = Yes   ·   K = Not personally but knows of it   ·   N = Never saw it   ·   O = Didn’t hunt, other reason (note it). Use questions apply only if Y. Bilas = worn; Ceremonial = used (tools, instruments, display).'));
{
  const aw = 1700, ew = 2600, uw = 1300, ow = USABLE - aw - ew - uw * 4;
  const header = new TableRow({ tableHeader: true, children: [
    headCell('Animal', aw), headCell('Ever hunted?  Y / K / N / O', ew),
    headCell('Food', uw), headCell('Bilas (worn)', uw), headCell('Ceremonial (used)', uw), headCell('Sale', uw),
    headCell('Other use / reason (note)', ow),
  ]});
  const rows = CONFIG.categories.concat([{ code: 'other', label: 'Other: __________' }]).map((c) => new TableRow({ children: [
    cell([P([R(c.label, { bold: true })])], aw),
    cell([P([R(BOX + ' Y  ' + BOX + ' K  ' + BOX + ' N  ' + BOX + ' O', { size: 18 })])], ew),
    cell(BOX, uw), cell(BOX, uw), cell(BOX, uw), cell(BOX, uw),
    cell('', ow),
  ]}));
  kids.push(new Table({ width: { size: USABLE, type: WidthType.DXA }, columnWidths: [aw, ew, uw, uw, uw, uw, ow], borders: noBorders, rows: [header, ...rows] }));
}
kids.push(writein('Notes — how has WHAT is hunted / used changed over time?', 2));
kids.push(blankLine());

// --- Module C ------------------------------------------------------------
kids.push(H1('Module C — Tools'));
kids.push(note('Fill ONLY the rows for animals marked "ever hunted = Yes" in Module B — leave the other animals’ rows blank. Tick every tool EVER used (only tick what applies).'));
{
  const aw = 1700;
  const tw = Math.floor((USABLE - aw) / CONFIG.methods.length);
  const header = new TableRow({ tableHeader: true, height: { value: 2200, rule: 'atLeast' }, children: [
    headCell('Animal', aw),
    ...CONFIG.methods.map((m) => new TableCell({
      width: { size: tw, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM,
      textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
      shading: { type: ShadingType.CLEAR, fill: 'EEF4EF' },
      children: [new Paragraph({ children: [R(m.code + '. ' + m.label, { bold: true, size: 16 })] })],
    })),
  ]});
  const rows = CONFIG.categories.map((c) => new TableRow({ children: [
    cell([P([R(c.label, { bold: true })])], aw),
    ...CONFIG.methods.map(() => cell(BOX, tw)),
  ]}));
  const widths = [aw, ...CONFIG.methods.map(() => tw)];
  kids.push(new Table({ width: { size: USABLE, type: WidthType.DXA }, columnWidths: widths, borders: noBorders, rows: [header, ...rows] }));
}
kids.push(writein('If "Other" (tool 20) ticked for any animal, specify which tool(s)'));
kids.push(P([R('Have the tools changed?  ', { bold: true }), ...O.yes_no_notsure.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('If yes, previous tool(s) used'));
kids.push(P([R('Usually hunt:  ', { bold: true }), ...O.c_usual_company.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('Preferred tool (number/name)'));
kids.push(writein('Why? (verbatim)', 2));
kids.push(writein('Notes — how have the tools changed over time?', 2));
kids.push(P([R('Any tools NOT allowed here (tambu / banned / discouraged)?  ', { bold: true }), ...O.yes_no_notsure.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('If yes, which tools and why? (verbatim)', 2));
kids.push(blankLine());

// --- Module D ------------------------------------------------------------
kids.push(H1('Module D — Tenure and limits'));
kids.push(note('Never record WHERE places are — only the kind of tenure and any limits.'));
kids.push(P([R('Main area hunted:  ', { bold: true }), ...O.d_main_area.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('If other, specify'));
kids.push(P([R('Restricted places (tick any):  ', { bold: true }), ...O.d_restricted_places.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('If other, specify'));
const limitQ = (label) => { kids.push(P([R(label + '  ', { bold: true }), ...O.yes_no_notsure.map((x) => R(BOX + ' ' + x.label + '   '))])); kids.push(writein('If yes, note')); };
limitQ('Are there seasonal limits on hunting?');
limitQ('Are there limits on how many can be taken?');
limitQ('Are there limits on how many hunting trips can be made?');

// --- Module E ------------------------------------------------------------
kids.push(H1('Module E — Timing'));
kids.push(note('Fill ONLY the rows for animals marked "ever hunted = Yes" in Module B. Tick the months each is typically hunted (only tick what applies).'));
{
  const aw = 2200;
  const mw = Math.floor((USABLE - aw) / CONFIG.months.length);
  const header = new TableRow({ tableHeader: true, children: [
    headCell('Animal', aw), ...CONFIG.months.map((m) => headCell(m.label, mw)),
  ]});
  const rows = CONFIG.categories.map((c) => new TableRow({ children: [
    cell([P([R(c.label, { bold: true })])], aw), ...CONFIG.months.map(() => cell(BOX, mw)),
  ]}));
  kids.push(new Table({ width: { size: USABLE, type: WidthType.DXA }, columnWidths: [aw, ...CONFIG.months.map(() => mw)], borders: noBorders, rows: [header, ...rows] }));
}
kids.push(writein('Notes — has the timing changed over time?', 2));
kids.push(blankLine());

// --- Module F ------------------------------------------------------------
kids.push(H1('Module F — Recent hunting (these days / last 12 months)'));
kids.push(P([R('Most of what you take comes from:  ', { bold: true }), ...O.f_source.map((x) => R(BOX + ' ' + x.label + '   '))]));
const tripBlock = (title, whenOpts) => {
  kids.push(H2(title));
  kids.push(P([R('When?  ', { bold: true }), ...whenOpts.map((x) => R(BOX + ' ' + x.label + '   '))]));
  kids.push(P([R('How long?  ', { bold: true }), ...O.f_duration.map((x) => R(BOX + ' ' + x.label + '   '))]));
  kids.push(P([R('Trip style:  ', { bold: true }), ...O.f_trip_style.map((x) => R(BOX + ' ' + x.label + '   '))]));
  // catch table
  const aw = 6000, cw = 3000;
  const header = new TableRow({ tableHeader: true, children: [headCell('Animal caught', aw), headCell('Count', cw)] });
  const blanks = Array.from({ length: 6 }, () => new TableRow({ children: [cell('', aw), cell('', cw)] }));
  kids.push(new Table({ width: { size: aw + cw, type: WidthType.DXA }, columnWidths: [aw, cw], borders: noBorders, rows: [header, ...blanks] }));
  kids.push(P([R('Of what was caught, divide into 10 parts:  ', { bold: true }),
    ...CONFIG.shareUses.map((u) => R(u.label + ' ____   '))]));
};
tripBlock('Most recent hunting trip', O.f_when_recent);
tripBlock('Most successful trip (last 12 months) — respondent decides what “successful” means', O.f_when_successful);
kids.push(P([R('These days, a typical hunting trip lasts:  ', { bold: true }), ...O.f_typical_duration.map((x) => R(BOX + ' ' + x.label + '   '))]));

// --- Module G ------------------------------------------------------------
kids.push(H1('Module G — Change over time'));
kids.push(note('Fill ONLY the rows for animals marked "ever hunted = Yes" in Module B. Write one code per cell: M = more abundant then · S = same · F = fewer then · N = not sure · X = did not hunt then. Only ages up to the respondent’s own.'));
{
  const aw = 2600, cw = 1500;
  const header = new TableRow({ tableHeader: true, children: [headCell('Animal', aw), ...CONFIG.lifeStages.map((l) => headCell(l.label, cw))] });
  const rows = CONFIG.categories.map((c) => new TableRow({ children: [cell([P([R(c.label, { bold: true })])], aw), ...CONFIG.lifeStages.map(() => cell('', cw))] }));
  kids.push(new Table({ width: { size: aw + cw * 4, type: WidthType.DXA }, columnWidths: [aw, cw, cw, cw, cw], borders: noBorders, rows: [header, ...rows] }));
}
kids.push(P([R('Are more or fewer people hunting now?  ', { bold: true }), ...O.g_people_change.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('Anything about how things have changed? (verbatim)', 2));
kids.push(blankLine());

// --- Module H ------------------------------------------------------------
kids.push(H1('Module H — Management and rules'));
kids.push(P([R('Are there rules about hunting these animals?  ', { bold: true }), ...O.yes_no_notsure.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(note('If yes, per animal score each of Food / Bilas / Sale:  0 = allowed · 1 = allowed with conditions · 2 = not allowed.'));
{
  const aw = 2600, sw = 1600, nw = USABLE - aw - sw * 3;
  const header = new TableRow({ tableHeader: true, children: [headCell('Animal', aw), headCell('Food (0/1/2)', sw), headCell('Bilas (0/1/2)', sw), headCell('Sale (0/1/2)', sw), headCell('Notes (conditions)', nw)] });
  const rows = CONFIG.categories.map((c) => new TableRow({ children: [cell([P([R(c.label, { bold: true })])], aw), cell('', sw), cell('', sw), cell('', sw), cell('', nw)] }));
  kids.push(new Table({ width: { size: USABLE, type: WidthType.DXA }, columnWidths: [aw, sw, sw, sw, nw], borders: noBorders, rows: [header, ...rows] }));
}
kids.push(P([R('Who decides the rules?  ', { bold: true }), ...O.h_who_decides.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(P([R('Have the rules changed?  ', { bold: true }), ...O.yes_no_notsure.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('If yes, how have they changed? (verbatim)', 2));
kids.push(blankLine());

// --- Module I ------------------------------------------------------------
kids.push(H1('Module I — Bilas, ceremonial and income use'));
kids.push(note('Across animals used for bilas (worn), ceremonial (used) or sale.'));
kids.push(P([R('Which parts are used?  ', { bold: true }), ...O.i_part_used.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('On what occasions?'));
kids.push(P([R('Who does this?  ', { bold: true }), ...O.i_who_does.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(P([R('Importance as income:  ', { bold: true }), ...O.i_income_importance.map((x) => R(BOX + ' ' + x.label + '   '))]));

// --- Module J — Fishing --------------------------------------------------
kids.push(H1('Module J — Fishing'));
kids.push(note('Only for people who fish (see the gate in Module A). Keep it brief.'));
kids.push(writein('Main river or water used for fishing'));
kids.push(P([R('What is caught?  ', { bold: true }), ...CONFIG.fishTargets.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('Other target (specify)'));
kids.push(P([R('Tools / methods (include destructive):  ', { bold: true }), ...CONFIG.fishTools.map((x) => R(BOX + ' ' + x.label + '   '))]));
kids.push(writein('Other tool / method (specify)'));
kids.push(writein('Notes', 2));

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
  sections: [{
    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 620, bottom: 620, left: 720, right: 720 } } },
    children: kids,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(ROOT + '/docs/MCA_Hunt_Paper_Questionnaire.docx', buf);
  console.log('wrote docs/MCA_Hunt_Paper_Questionnaire.docx', buf.length, 'bytes');
});
