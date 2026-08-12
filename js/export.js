/*
 * export.js — flatten stored interviews to the canonical, flat coded-column
 * layout of Section 4 and emit CSV (priority) or JSON (secondary/raw).
 *
 * The column list here is the authoritative export contract. Repeated columns
 * (grids, per-category blocks, trip catch) are generated with the same NAMES
 * helpers the form renderer uses, so headers always match the fields collected.
 *
 * Design rules honoured:
 *  - resp_name lives outside `data` and can be excluded from an export (3.7).
 *  - No location field exists anywhere (3.2 / 3.7).
 *  - Booleans export as 1/0; multi-selects as ';'-joined codes; catch lists as
 *    per-category integer counts (f_<trip>_catch_<category>).
 */

const EXPORTER = (function () {
  const cats = () => CONFIG.categories.map((c) => c.code);
  const methods = () => CONFIG.methods.map((m) => m.code);
  const months = () => CONFIG.months.map((m) => m.code);
  const lifeStages = () => CONFIG.lifeStages.map((l) => l.code);

  // Column descriptors: { name, source } where source tells the flattener where
  // to read the value from a record. Built once per export (categories/methods
  // are config-driven so this reflects any pilot refinement automatically).
  function buildColumns() {
    const cols = [];
    const add = (name, source) => cols.push({ name, source: source || 'data' });

    // Module A + record-level identifiers
    add('interview_id', 'record');
    add('resp_id_code', 'record');
    add('resp_name', 'name');
    add('gps_lat', 'gps'); add('gps_lon', 'gps');
    add('gps_accuracy', 'gps'); add('gps_time', 'gps');
    add('sex'); add('age_band'); add('zone'); add('ward'); add('clan');
    // Module A — per age: frequency + season
    ['under_25', '25_39', '40_59', '60_plus'].forEach((b) => {
      add(NAMES.activity(b)); add(NAMES.season(b));
    });

    // Module B
    cats().forEach((c) => {
      add(NAMES.bTaken(c));
      add(NAMES.bTakenReason(c));
      add(NAMES.bUseFood(c), 'bool');
      add(NAMES.bUseBilas(c), 'bool');
      add(NAMES.bUseCustomary(c), 'bool');
      add(NAMES.bUseSale(c), 'bool');
      add(NAMES.bUseOther(c));
    });
    add('b_other_category_name');
    add('b_other_category_taken');
    add('b_other_category_use_food', 'bool');
    add('b_other_category_use_bilas', 'bool');
    add('b_other_category_use_customary', 'bool');
    add('b_other_category_use_sale', 'bool');
    add('b_other_category_use_other');
    add('b_changes_notes');

    // Module C grid + trip questions (c_trip_style removed)
    cats().forEach((c) => methods().forEach((m) => add(NAMES.method(c, m), 'bool')));
    add('c_method_changed');
    add('c_method_changed_previous', 'multi');
    add('c_usual_company');
    add('c_preferred_method');
    add('c_preferred_method_why');
    add('c_changes_notes');

    // Module D
    add('d_main_area');
    add('d_main_area_other');
    add('d_restricted_places', 'multi');
    add('d_restricted_places_other');
    add('d_seasonal_limits');
    add('d_seasonal_limits_text');
    add('d_number_limits');
    add('d_number_limits_text');
    add('d_trip_limits');
    add('d_trip_limits_text');

    // Module E grid
    cats().forEach((c) => months().forEach((mo) => add(NAMES.month(c, mo), 'bool')));
    add('e_changes_notes');

    // Module F (f_typical_frequency removed; shares are integer parts 0..10)
    add('f_source');
    ['recent', 'successful'].forEach((trip) => {
      add(NAMES.fTrip(trip, 'when'));
      add(NAMES.fTrip(trip, 'duration'));
      add(NAMES.fTrip(trip, 'style'));
      cats().forEach((c) => add(NAMES.catch(trip, c), 'catch'));
      add(NAMES.fTrip(trip, 'share_eaten'));
      add(NAMES.fTrip(trip, 'share_given'));
      add(NAMES.fTrip(trip, 'share_bilas'));
      add(NAMES.fTrip(trip, 'share_sold'));
    });
    add('f_typical_duration');

    // Module G grid
    cats().forEach((c) => lifeStages().forEach((l) => add(NAMES.abundance(c, l))));
    add('g_people_change');
    add('g_change_text');

    // Module H
    add('h_rules_exist');
    cats().forEach((c) => {
      add(NAMES.hFood(c)); add(NAMES.hBilas(c)); add(NAMES.hSale(c)); add(NAMES.hNotes(c));
    });
    add('h_who_decides');
    add('h_who_decides_other');
    add('h_rules_changed');
    add('h_rules_changed_text');

    // Module I
    add('i_part_used', 'multi');
    add('i_part_used_other');
    add('i_occasion');
    add('i_who_does');
    add('i_who_does_other');
    add('i_income_importance');

    // Metadata
    add('interviewer_id', 'record');
    add('interview_start_time', 'record');
    add('interview_end_time', 'record');
    add('interview_status', 'record');
    add('sync_status', 'record');
    add('app_version', 'record');

    return cols;
  }

  // Read a single column value from a record, as a string suitable for CSV.
  function valueFor(record, col, includeName) {
    const data = record.data || {};
    switch (col.source) {
      case 'record':
        return record[col.name] == null ? '' : String(record[col.name]);
      case 'name':
        return includeName && record.resp_name ? String(record.resp_name) : '';
      case 'gps': {
        const g = record.gps || {};
        const map = { gps_lat: 'lat', gps_lon: 'lon', gps_accuracy: 'accuracy', gps_time: 'time' };
        const v = g[map[col.name]];
        return v == null ? '' : String(v);
      }
      case 'bool': {
        const v = data[col.name];
        if (v === true) return '1';
        if (v === false) return '0';
        return v == null ? '' : String(v);
      }
      case 'multi': {
        const v = data[col.name];
        return Array.isArray(v) ? v.join(';') : (v == null ? '' : String(v));
      }
      case 'catch': {
        // col.name = f_<trip>_catch_<category>; sum counts from the trip's list.
        const m = col.name.match(/^f_(recent|successful)_catch_(.+)$/);
        if (!m) return '';
        const list = data[`f_${m[1]}_catch`];
        if (!Array.isArray(list)) return '';
        const total = list
          .filter((row) => row && row.category === m[2])
          .reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);
        return total ? String(total) : '';
      }
      default: {
        const v = data[col.name];
        if (v === true) return '1';
        if (v === false) return '0';
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

  // Build a CSV string for the given records. includeName controls whether the
  // resp_name column carries values (the column header is always present).
  function toCSV(records, includeName) {
    const cols = buildColumns();
    const header = cols.map((c) => csvCell(c.name)).join(',');
    const lines = [header];
    records.forEach((r) => {
      lines.push(cols.map((c) => csvCell(valueFor(r, c, includeName))).join(','));
    });
    return lines.join('\r\n');
  }

  function toJSON(records, includeName) {
    const clean = records.map((r) => {
      const copy = JSON.parse(JSON.stringify(r));
      if (!includeName) delete copy.resp_name;
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

  return { buildColumns, valueFor, toCSV, toJSON, download, timestamp };
})();

window.EXPORTER = EXPORTER;
