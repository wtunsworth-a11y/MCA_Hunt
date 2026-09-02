/*
 * export.js — flatten stored plots to two flat CSVs and emit them.
 *
 * Two tables, linked by plot_id:
 *   plots — one row per garden plot, including the derived fallow age and
 *           per-plot vine summary counts.
 *   vines — one row per Aristolochia vine, with the plot's identifiers
 *           denormalised onto it so the file stands alone in analysis.
 *
 * The column lists here are the authoritative export contract. Vine columns are
 * generated from SCHEMA.VINE_FIELDS, and the sign/count columns from
 * CONFIG.vineSigns, so a change in config flows through to the export.
 *
 * Design rules honoured:
 *  - farmer_name lives outside `data` and can be excluded from an export.
 *  - Booleans export as 1/0; blanks stay blank rather than becoming 0.
 */

const EXPORTER = (function () {

  // --- Plot columns --------------------------------------------------------
  function buildPlotColumns() {
    const cols = [];
    const add = (name, source) => cols.push({ name, source: source || 'data' });

    add('plot_id', 'record');
    add('plot_code', 'record');
    add('surveyor', 'record');
    add('survey_date', 'record');
    add('farmer_name', 'name');
    add('gps_lat', 'gps'); add('gps_lon', 'gps');
    add('gps_accuracy', 'gps'); add('gps_time', 'gps');

    add('village'); add('zone'); add('ward'); add('plot_notes');

    add('plot_type');
    add('garden_type'); add('garden_type_other'); add('garden_description');
    add('year_cleared'); add('garden_status'); add('year_abandoned');
    add('forest_type'); add('forest_type_other'); add('forest_description');
    add('fallow_age_years', 'derived');
    add('cultivation_years', 'derived');

    add('aristolochia_present');
    add('vine_count', 'summary');
    CONFIG.vineSigns.forEach((s) => {
      add('vines_with_' + s.key, 'summary');
      if (s.counted) add(s.key + '_total', 'summary');
    });
    CONFIG.options.birdwing_species.forEach((sp) => {
      if (sp.code === 'unknown') return;
      add('vines_species_' + sp.code, 'summary');
    });

    add('consent_given', 'record');
    add('consent_time', 'record');
    add('plot_status', 'record');
    add('created_at', 'record');
    add('updated_at', 'record');
    add('app_version', 'record');
    return cols;
  }

  // --- Vine columns --------------------------------------------------------
  function buildVineColumns() {
    // Plot identifiers denormalised onto each vine row, then the vine's own
    // fields in SCHEMA.VINE_FIELDS order.
    return ['plot_id', 'plot_code', 'survey_date', 'village', 'zone', 'ward', 'vine_no']
      .concat(SCHEMA.VINE_FIELDS);
  }

  function vinesOf(record) {
    const v = (record.data || {}).vines;
    return Array.isArray(v) ? v : [];
  }

  // A vine counts as recorded once anything has been entered on it, so an
  // untouched blank row added by mistake does not inflate the counts.
  function vineHasContent(v) {
    return SCHEMA.VINE_FIELDS.some((k) => v && v[k] !== '' && v[k] != null);
  }

  function realVines(record) {
    return vinesOf(record).filter(vineHasContent);
  }

  function summaryValue(record, name) {
    const vines = realVines(record);
    if (name === 'vine_count') return String(vines.length);

    let m = name.match(/^vines_with_(.+)$/);
    if (m) return String(vines.filter((v) => v[m[1]] === 'yes').length);

    m = name.match(/^(.+)_total$/);
    if (m) {
      const key = m[1] + '_count';
      const total = vines.reduce((sum, v) => sum + (parseInt(v[key], 10) || 0), 0);
      // Blank rather than 0 when nothing was counted at all, so "not counted"
      // and "counted zero" stay distinguishable.
      const anyCounted = vines.some((v) => v[key] !== '' && v[key] != null);
      return anyCounted ? String(total) : '';
    }

    m = name.match(/^vines_species_(.+)$/);
    if (m) return String(vines.filter((v) => v.species === m[1]).length);

    return '';
  }

  function plotValue(record, col, includeName) {
    const data = record.data || {};
    switch (col.source) {
      case 'record':
        return record[col.name] == null ? '' : String(record[col.name]);
      case 'name':
        return includeName && record.farmer_name ? String(record.farmer_name) : '';
      case 'gps': {
        const g = record.gps || {};
        const map = { gps_lat: 'lat', gps_lon: 'lon', gps_accuracy: 'accuracy', gps_time: 'time' };
        const v = g[map[col.name]];
        return v == null ? '' : String(v);
      }
      case 'derived':
        return col.name === 'fallow_age_years'
          ? SCHEMA.DERIVED.fallowAge(data)
          : SCHEMA.DERIVED.cultivationYears(data);
      case 'summary':
        return summaryValue(record, col.name);
      default: {
        const v = data[col.name];
        if (v === true) return '1';
        if (v === false) return '0';
        return v == null ? '' : String(v);
      }
    }
  }

  function vineValue(record, vine, idx, name) {
    switch (name) {
      case 'plot_id':     return String(record.plot_id || '');
      case 'plot_code':   return String(record.plot_code || '');
      case 'survey_date': return String(record.survey_date || '');
      case 'village':     return String((record.data || {}).village || '');
      case 'zone':        return String((record.data || {}).zone || '');
      case 'ward':        return String((record.data || {}).ward || '');
      case 'vine_no':     return String(idx + 1);
      default: {
        const v = vine[name];
        return v == null ? '' : String(v);
      }
    }
  }

  function csvCell(s) {
    if (s == null) s = '';
    s = String(s);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function plotsCSV(records, includeName) {
    const cols = buildPlotColumns();
    const lines = [cols.map((c) => csvCell(c.name)).join(',')];
    records.forEach((r) => {
      lines.push(cols.map((c) => csvCell(plotValue(r, c, includeName))).join(','));
    });
    return lines.join('\r\n');
  }

  function vinesCSV(records) {
    const cols = buildVineColumns();
    const lines = [cols.map(csvCell).join(',')];
    records.forEach((r) => {
      realVines(r).forEach((v, i) => {
        lines.push(cols.map((c) => csvCell(vineValue(r, v, i, c))).join(','));
      });
    });
    return lines.join('\r\n');
  }

  function toJSON(records, includeName) {
    const clean = records.map((r) => {
      const copy = JSON.parse(JSON.stringify(r));
      if (!includeName) delete copy.farmer_name;
      return copy;
    });
    return JSON.stringify(clean, null, 2);
  }

  function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  // Trigger a client-side file download (works offline; no backend).
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  }

  return {
    buildPlotColumns, buildVineColumns, plotValue, summaryValue,
    realVines, vineHasContent,
    plotsCSV, vinesCSV, toJSON, download, timestamp,
  };
})();

window.EXPORTER = EXPORTER;
