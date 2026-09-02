#!/usr/bin/env node
/*
 * rebuild_tables.js — rebuild the plots and vines tables from the combined
 * long-format CSVs the app sends.
 *
 * The app sends one file per day (one row per vine, plot fields repeated) so a
 * day's upload cannot half-arrive. This script turns any number of those files
 * back into the two analysis tables:
 *
 *   plots.csv — one row per plot, with the vine summary columns recomputed
 *   vines.csv — one row per vine
 *
 * Summary columns are NOT carried in the combined file; they are derived here
 * from the vine rows, so the tables cannot contradict their own source.
 *
 * Plots are deduped on plot_id, keeping the row with the latest updated_at, so
 * re-sent days and duplicate uploads collapse to one record.
 *
 * Usage:
 *   node tools/rebuild_tables.js <combined.csv ...> [--out DIR]
 *
 * Example:
 *   node tools/rebuild_tables.js ~/Drive/MCA_QABB_Avril/*.csv --out ./rebuilt
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- Load the app's config + schema so the column sets cannot drift ---------
function loadAppModules() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  for (const f of ['js/config.js', 'js/schema.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  }
  return { CONFIG: ctx.window.CONFIG, SCHEMA: ctx.window.SCHEMA };
}

// --- Minimal RFC4180 CSV parser (handles quotes, embedded commas/newlines) --
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* handled with \n */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ''));
}

function toObjects(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] == null ? '' : r[i]; });
    return o;
  });
}

const csvCell = (s) => {
  s = s == null ? '' : String(s);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toCSV = (cols, rows) =>
  [cols.map(csvCell).join(',')]
    .concat(rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')))
    .join('\r\n') + '\r\n';

// --- Summary columns, recomputed from the vine rows ------------------------
function summarise(CONFIG, vines) {
  const out = { vine_count: String(vines.length) };
  CONFIG.vineSigns.forEach((s) => {
    out['vines_with_' + s.key] = String(vines.filter((v) => v[s.key] === 'yes').length);
    if (!s.counted) return;
    const key = s.key + '_count';
    const anyCounted = vines.some((v) => v[key] !== '' && v[key] != null);
    out[s.key + '_total'] = anyCounted
      ? String(vines.reduce((sum, v) => sum + (parseInt(v[key], 10) || 0), 0))
      : '';
  });
  CONFIG.options.birdwing_species.forEach((sp) => {
    if (sp.code === 'unknown') return;
    out['vines_species_' + sp.code] = String(vines.filter((v) => v.species === sp.code).length);
  });
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : '.';
  const inputs = (outIdx >= 0 ? args.slice(0, outIdx).concat(args.slice(outIdx + 2)) : args)
    .filter((a) => !a.startsWith('--'));

  if (!inputs.length) {
    console.error('Usage: node tools/rebuild_tables.js <combined.csv ...> [--out DIR]');
    process.exit(1);
  }

  const { CONFIG, SCHEMA } = loadAppModules();
  const VINE_FIELDS = SCHEMA.VINE_FIELDS;

  // Column sets, taken from the app itself.
  const plotCols = ['plot_id', 'plot_code', 'surveyor', 'survey_date', 'farmer_name',
    'gps_lat', 'gps_lon', 'gps_accuracy', 'gps_time', 'village', 'zone', 'ward',
    'plot_notes', 'plot_type', 'garden_type', 'garden_type_other', 'garden_description',
    'year_cleared', 'garden_status', 'year_abandoned', 'forest_type', 'forest_type_other',
    'forest_description', 'fallow_age_years', 'cultivation_years', 'aristolochia_present'];
  const summaryCols = ['vine_count'];
  CONFIG.vineSigns.forEach((s) => {
    summaryCols.push('vines_with_' + s.key);
    if (s.counted) summaryCols.push(s.key + '_total');
  });
  CONFIG.options.birdwing_species.forEach((sp) => {
    if (sp.code !== 'unknown') summaryCols.push('vines_species_' + sp.code);
  });
  const tailCols = ['consent_given', 'consent_time', 'plot_status',
    'created_at', 'updated_at', 'app_version'];

  const plots = new Map();   // plot_id -> plot row (latest updated_at wins)
  const vinesBy = new Map(); // plot_id -> vine rows
  let rowsRead = 0, filesRead = 0;

  inputs.forEach((file) => {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); }
    catch (e) { console.error(`  ! skipped ${file}: ${e.message}`); return; }
    const objs = toObjects(text);
    if (!objs.length) return;
    if (!('plot_id' in objs[0])) {
      console.error(`  ! skipped ${file}: no plot_id column (not a combined export?)`);
      return;
    }
    filesRead++;
    rowsRead += objs.length;

    objs.forEach((o) => {
      const id = o.plot_id;
      if (!id) return;
      const ts = String(o.updated_at || '');
      const prev = plots.get(id);

      if (!prev) {
        plots.set(id, o);
        vinesBy.set(id, []);
      } else {
        const prevTs = String(prev.updated_at || '');
        // Every row of one upload shares the plot's updated_at, so only a
        // STRICTLY newer timestamp is a re-send that supersedes what we have.
        // Resetting on >= would discard each vine as the next row arrived.
        if (ts > prevTs) {
          plots.set(id, o);
          vinesBy.set(id, []);
        } else if (ts < prevTs) {
          return;                     // stale row from an older upload
        }
      }

      if (o.vine_no === '' || o.vine_no == null) return;   // plot with no vines
      // The same day is often uploaded more than once (Drive keeps each send as
      // a new file rather than overwriting). Those rows are identical, so a
      // vine_no already held for this plot means we have seen this row before.
      const cur = vinesBy.get(id);
      if (!cur.some((v) => v.vine_no === o.vine_no)) cur.push(o);
    });
  });

  const plotRows = [];
  const vineRows = [];
  Array.from(plots.keys()).sort().forEach((id) => {
    const p = plots.get(id);
    const vs = (vinesBy.get(id) || []).slice()
      .sort((a, b) => (parseInt(a.vine_no, 10) || 0) - (parseInt(b.vine_no, 10) || 0));

    const row = {};
    plotCols.forEach((c) => { row[c] = p[c] == null ? '' : p[c]; });
    Object.assign(row, summarise(CONFIG, vs));
    tailCols.forEach((c) => { row[c] = p[c] == null ? '' : p[c]; });
    plotRows.push(row);

    vs.forEach((v, i) => {
      const r = {
        plot_id: id, plot_code: p.plot_code, survey_date: p.survey_date,
        village: p.village, zone: p.zone, ward: p.ward, vine_no: String(i + 1),
      };
      VINE_FIELDS.forEach((f) => { r[f] = v[f] == null ? '' : v[f]; });
      vineRows.push(r);
    });
  });

  fs.mkdirSync(outDir, { recursive: true });
  const plotsOut = path.join(outDir, 'plots.csv');
  const vinesOut = path.join(outDir, 'vines.csv');
  fs.writeFileSync(plotsOut, toCSV(plotCols.concat(summaryCols, tailCols), plotRows));
  fs.writeFileSync(vinesOut,
    toCSV(['plot_id', 'plot_code', 'survey_date', 'village', 'zone', 'ward', 'vine_no']
      .concat(VINE_FIELDS), vineRows));

  console.log(`Read ${rowsRead} row(s) from ${filesRead} file(s).`);
  console.log(`Wrote ${plotsOut} — ${plotRows.length} plot(s)`);
  console.log(`Wrote ${vinesOut} — ${vineRows.length} vine(s)`);
}

main();
