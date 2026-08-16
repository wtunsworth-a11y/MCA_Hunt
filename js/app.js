/*
 * app.js — controller, router and renderer for the MCA Hunting survey PWA.
 *
 * Fully client-side and offline-first: reference lists load from a bundled JSON
 * file, all state lives in IndexedDB (js/db.js), and every field change
 * autosaves. No network call is made at the point of data entry.
 */
(function () {
  'use strict';

  const $app = () => document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // --- Local device / interviewer identity (localStorage) ------------------
  const LS = {
    interviewer: 'mca_interviewer_id',
    device: 'mca_device_prefix',
    seq: 'mca_seq',
  };

  function devicePrefix() {
    let p = localStorage.getItem(LS.device);
    if (!p) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      p = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      localStorage.setItem(LS.device, p);
    }
    return p;
  }
  function nextSeq() {
    const n = (parseInt(localStorage.getItem(LS.seq), 10) || 0) + 1;
    localStorage.setItem(LS.seq, String(n));
    return n;
  }
  function interviewerId() { return localStorage.getItem(LS.interviewer) || ''; }

  // Build a respondent ID code: <ZONE>-<DEVICE>-<SEQ> (see 3.5). Generated
  // locally, collision-safe via the per-device prefix, never typed by hand.
  function makeRespIdCode(zoneCode, seq) {
    const zone = (zoneCode || 'ZZ').toUpperCase();
    return `${zone}-${devicePrefix()}-${String(seq).padStart(3, '0')}`;
  }

  // --- App state -----------------------------------------------------------
  const state = { view: 'home', current: null, step: 0 };

  // --- Reference list loading (zones/wards) --------------------------------
  async function loadReference() {
    // Single-file build inlines the reference data on window.__MCA_REFERENCE__,
    // so it works when opened directly from disk (file://) with no fetch.
    if (window.__MCA_REFERENCE__) {
      const ref = window.__MCA_REFERENCE__;
      CONFIG.zones = Array.isArray(ref.zones) ? ref.zones : [];
      CONFIG.wards = Array.isArray(ref.wards) ? ref.wards : [];
      return;
    }
    try {
      const res = await fetch('data/reference.json', { cache: 'no-cache' });
      const ref = await res.json();
      CONFIG.zones = Array.isArray(ref.zones) ? ref.zones : [];
      CONFIG.wards = Array.isArray(ref.wards) ? ref.wards : [];
    } catch (e) {
      // Offline-safe: if the file can't be read, dropdowns simply show empty.
      CONFIG.zones = CONFIG.zones || [];
      CONFIG.wards = CONFIG.wards || [];
    }
  }

  // --- Interview model -----------------------------------------------------
  function newInterview() {
    const now = new Date().toISOString();
    return {
      interview_id: (crypto.randomUUID ? crypto.randomUUID()
        : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
      resp_id_code: '',
      resp_name: '',
      consent_given: '',
      consent_time: '',
      gps: null,
      gps_status: 'pending',
      gps_error: '',
      data: {},
      _seq: null,
      interviewer_id: interviewerId(),
      interview_start_time: now,
      interview_end_time: '',
      interview_status: 'in_progress',
      sync_status: 'not_exported',
      app_version: CONFIG.appVersion,
      created_at: now,
      updated_at: now,
      _step: 0,
    };
  }

  let saveTimer = null;
  // Immediate persist — used for every discrete choice (radio, checkbox, grid
  // cell, select) and navigation, so at most the current unsaved keystroke can
  // ever be lost if the app is killed (5. autosave).
  function save() {
    if (state.current) DB.put(state.current);
  }
  // Debounced persist — only for live free-text typing, to avoid a write per
  // keystroke. Flushes 250ms after typing stops.
  function saveDebounced() {
    if (!state.current) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (state.current) DB.put(state.current); }, 250);
  }

  function setData(field, value) {
    state.current.data[field] = value;
    // Regenerate the respondent ID whenever the zone is (re)selected.
    if (field === 'zone') {
      if (state.current._seq == null) state.current._seq = nextSeq();
      state.current.resp_id_code = makeRespIdCode(value, state.current._seq);
    }
    save();
  }

  // --- GPS capture (3.2) ---------------------------------------------------
  function captureGPS() {
    if (!state.current) return;
    state.current.gps_status = 'pending';
    state.current.gps_error = '';
    // Show "Getting GPS…" immediately so the Retry button visibly responds.
    if (state.view === 'module') renderModule(true);
    if (!navigator.geolocation) {
      state.current.gps_status = 'missing';
      state.current.gps_error = 'This browser can’t get location. Try opening the app from the web link.';
      save(); if (state.view === 'module') renderModule(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.current.gps = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          time: new Date(pos.timestamp).toISOString(),
        };
        state.current.gps_status = 'ok';
        state.current.gps_error = '';
        save();
        if (state.view === 'module') renderModule(true);
      },
      (err) => {
        state.current.gps_status = 'missing';
        // err.code: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT.
        if (err && err.code === 1) {
          state.current.gps_error = 'Location permission is blocked. Turn on Location, then allow it for this app in the browser’s site settings (tap the padlock/⋮ in the address bar → Permissions → Location → Allow), then Retry.';
        } else if (err && err.code === 3) {
          state.current.gps_error = 'Timed out getting a fix. Move to open sky (away from thick canopy or indoors) and Retry.';
        } else {
          state.current.gps_error = 'Could not get a location fix. Check Location is turned on, then Retry.';
        }
        save();
        if (state.view === 'module') renderModule(true);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  // --- showIf evaluation ---------------------------------------------------
  function visible(field, data) {
    const c = field.showIf;
    if (!c) return true;
    const v = data[c.field];
    if (c.equals != null) return v === c.equals;
    if (c.notEquals != null) return v !== c.notEquals;
    if (c.notEmpty) return !!(v && String(v).trim());
    if (c.includes) return Array.isArray(v) && v.includes(c.includes);
    return true;
  }

  // Soft, non-blocking warnings shown when leaving a module (the interviewer
  // can still continue). Module A: Zone (drives the ID) and GPS. Module F:
  // share allocations that were partly filled but don't total 10.
  function moduleWarnings(mod) {
    const w = [];
    const d = state.current.data;
    if (mod.id === 'A') {
      if (!(d.zone && String(d.zone).trim())) w.push('No Zone chosen — this interview will have NO respondent ID.');
      if (state.current.gps_status !== 'ok') w.push('GPS not captured yet — the interview location will be missing.');
    }
    if (mod.id === 'F') {
      ['recent', 'successful'].forEach((trip) => {
        const total = CONFIG.shareUses.reduce((s, u) => s + (parseInt(d[`f_${trip}_share_${u.key}`], 10) || 0), 0);
        if (total > 0 && total !== CONFIG.shareTotal) {
          w.push(`${trip === 'recent' ? 'Most recent' : 'Most successful'} trip shares add up to ${total}/${CONFIG.shareTotal}, not ${CONFIG.shareTotal}.`);
        }
      });
    }
    return w;
  }

  // Whole-interview gaps, gathered for the final check on "Complete".
  function completeWarnings() {
    const r = state.current, d = r.data, w = [];
    if (r.consent_given !== 'yes') w.push('Consent not recorded');
    if (!r.resp_id_code) w.push('No respondent ID (Zone was blank)');
    if (r.gps_status !== 'ok') w.push('No GPS captured');
    ['recent', 'successful'].forEach((trip) => {
      const total = CONFIG.shareUses.reduce((s, u) => s + (parseInt(d[`f_${trip}_share_${u.key}`], 10) || 0), 0);
      if (total > 0 && total !== CONFIG.shareTotal) {
        w.push(`${trip === 'recent' ? 'Most recent' : 'Most successful'} trip shares = ${total}/${CONFIG.shareTotal}`);
      }
    });
    return w;
  }

  // Modules active for this interview, based on the Hunt/Fish/Both gate
  // (activity_type in Module A). Profile is always shown; hunting modules are
  // hidden for "Fishes"; the fishing module shows only when the person fishes.
  function activeModules() {
    const t = state.current ? state.current.data.activity_type : '';
    return SCHEMA.modules.filter((m) => {
      const g = m.group || 'hunting';
      if (g === 'profile') return true;
      if (g === 'fishing') return t === 'fish' || t === 'hunt_and_fish';
      return t !== 'fish'; // hunting modules: shown unless fish-only
    });
  }

  // Fields whose change must re-render the module (they gate other fields, or
  // drive the age-based grids / the respondent ID).
  function triggerFields(module) {
    const set = new Set(['age_band', 'zone']);
    module.fields.forEach((f) => { if (f.showIf) set.add(f.showIf.field); });
    return set;
  }

  // --- Field renderers (return HTML strings) -------------------------------
  function radioGroup(field, options, current) {
    return `<div class="options">` + options.map((o) => `
      <label class="opt ${current === o.code ? 'sel' : ''}">
        <input type="radio" name="${esc(field)}" value="${esc(o.code)}"
          data-field="${esc(field)}" ${current === o.code ? 'checked' : ''}>
        <span>${esc(o.label)}</span>
      </label>`).join('') + `</div>`;
  }

  function multiGroup(field, options, currentArr) {
    const cur = Array.isArray(currentArr) ? currentArr : [];
    return `<div class="options">` + options.map((o) => `
      <label class="opt ${cur.includes(o.code) ? 'sel' : ''}">
        <input type="checkbox" data-field="${esc(field)}" data-multi="1" value="${esc(o.code)}"
          ${cur.includes(o.code) ? 'checked' : ''}>
        <span>${esc(o.label)}</span>
      </label>`).join('') + `</div>`;
  }

  function boolButton(field, label, checked) {
    return `<label class="opt inline ${checked ? 'sel' : ''}">
      <input type="checkbox" data-field="${esc(field)}" ${checked ? 'checked' : ''}>
      <span>${esc(label)}</span></label>`;
  }

  function selectEl(field, options, current) {
    const opts = ['<option value="">— select —</option>'].concat(
      options.map((o) => `<option value="${esc(o.code)}" ${current === o.code ? 'selected' : ''}>${esc(o.label)}</option>`)
    ).join('');
    return `<select class="drop" data-field="${esc(field)}">${opts}</select>`;
  }

  function textEl(field, value, multiline) {
    if (multiline) {
      return `<textarea class="txt" data-field="${esc(field)}" rows="3">${esc(value || '')}</textarea>`;
    }
    return `<input class="txt" type="text" data-field="${esc(field)}" value="${esc(value || '')}">`;
  }

  function labelBlock(label, help, inner) {
    return `<div class="field">
      ${label ? `<div class="q">${esc(label)}</div>` : ''}
      ${help ? `<div class="help">${esc(help)}</div>` : ''}
      ${inner}</div>`;
  }

  // Module A profile meta (ID + GPS status + retry)
  function renderProfileMeta() {
    const r = state.current;
    let gps = '';
    if (r.gps_status === 'ok' && r.gps) {
      gps = `<span class="badge ok">GPS captured</span>
        <span class="mono">${r.gps.lat.toFixed(5)}, ${r.gps.lon.toFixed(5)} (±${Math.round(r.gps.accuracy)}m)</span>`;
    } else if (r.gps_status === 'pending') {
      gps = `<span class="badge warn">Getting GPS…</span>`;
    } else {
      gps = `<span class="badge miss">GPS missing</span>`;
    }
    const errMsg = (r.gps_status === 'missing' && r.gps_error)
      ? `<div class="help gpserr">${esc(r.gps_error)}</div>` : '';
    return `<div class="field metabox">
      <div class="q">Respondent ID</div>
      <div class="mono big">${esc(r.resp_id_code || '— set once Zone is chosen —')}</div>
      <div class="q" style="margin-top:.6rem">Interview location (GPS)</div>
      <div class="gpsrow">${gps}
        <button class="btn tiny" data-action="gps-retry" type="button" ${r.gps_status === 'pending' ? 'disabled' : ''}>Retry GPS</button></div>
      ${errMsg}
      <div class="help">GPS records where the interview happens — never where people hunt.</div>
    </div>`;
  }

  // Species the respondent has ever hunted (Module B = yes). Follow-up grids
  // (tools/timing/abundance) are gated to these, so we never collect
  // not-comparable data about animals the respondent doesn't hunt.
  function huntedCategories() {
    const data = state.current.data;
    return CONFIG.categories.filter((c) => data[NAMES.bTaken(c.code)] === 'yes');
  }
  const gateEmptyMsg = '<div class="note">No animals are marked "ever hunted: yes" yet. Go back to Module B and mark which animals the respondent hunts — then these questions appear only for those animals.</div>';

  // Animal × tool / animal × month boolean grid. Tool grid uses rotated
  // full-name headers (no numeric legend to cross-reference).
  function renderGridBool(field) {
    const cols = SCHEMA.resolveOptions(field.cols);
    const data = state.current.data;
    const rows = field.gateHunted ? huntedCategories() : SCHEMA.resolveOptions(field.rows);
    if (field.gateHunted && rows.length === 0) return gateEmptyMsg;
    const rot = !!field.rotateHeaders;
    let html = `<div class="gridwrap"><table class="grid ${rot ? 'rothead' : ''}"><thead><tr><th class="rowhead">Animal</th>` +
      cols.map((c) => rot
        ? `<th class="rot"><span class="lbl">${esc(c.label)}</span></th>`
        : `<th title="${esc(c.label)}">${esc(c.label)}</th>`).join('') +
      `</tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><th class="rowhead">${esc(r.label)}</th>`;
      cols.forEach((c) => {
        const name = field.nameFn(r.code, c.code);
        const on = data[name] === true;
        html += `<td><label class="cell ${on ? 'sel' : ''}">
          <input type="checkbox" data-field="${esc(name)}" ${on ? 'checked' : ''}>
          <span aria-hidden="true"></span></label></td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  // Category × life-stage single-choice (M/S/F/N/X), age-gated columns (Module G)
  function renderGridSingle(field) {
    const cols = SCHEMA.resolveOptions(field.cols);
    const opts = SCHEMA.resolveOptions(field.options);
    const data = state.current.data;
    const rows = field.gateHunted ? huntedCategories() : SCHEMA.resolveOptions(field.rows);
    if (field.gateHunted && rows.length === 0) return gateEmptyMsg;
    const allowed = field.ageGated
      ? CONFIG.enterableLifeStages(data.age_band) : cols.map((c) => c.code);
    let html = `<div class="gridwrap"><table class="grid"><thead><tr><th class="rowhead">Animal</th>` +
      cols.map((c) => `<th class="${allowed.includes(c.code) ? '' : 'disabled'}">${esc(c.label)}</th>`).join('') +
      `</tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><th class="rowhead">${esc(r.label)}</th>`;
      cols.forEach((c) => {
        const name = field.nameFn(r.code, c.code);
        const on = allowed.includes(c.code);
        const cur = data[name] || '';
        const optHtml = ['<option value="">–</option>'].concat(
          opts.map((o) => `<option value="${esc(o.code)}" ${cur === o.code ? 'selected' : ''}>${esc(o.code)}</option>`)
        ).join('');
        html += `<td>${on
          ? `<select class="cellsel" data-field="${esc(name)}">${optHtml}</select>`
          : `<span class="na">–</span>`}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  // Module H rules grid: category × (food/bilas/sale coded 0/1/2) + notes
  function renderRulesGrid(field) {
    const rows = CONFIG.categories;
    const opts = CONFIG.options.h_rule_score;
    const data = state.current.data;
    const sel = (name) => {
      const cur = data[name] || '';
      const o = ['<option value="">–</option>'].concat(
        opts.map((x) => `<option value="${esc(x.code)}" ${cur === x.code ? 'selected' : ''}>${esc(x.code)}</option>`)
      ).join('');
      return `<select class="cellsel" data-field="${esc(name)}">${o}</select>`;
    };
    let html = `<div class="help">0 = allowed · 1 = allowed with conditions · 2 = not allowed</div>
      <div class="gridwrap"><table class="grid"><thead><tr>
      <th class="rowhead">Animal</th><th>Food</th><th>Bilas</th><th>Sale</th><th>Notes</th></tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><th class="rowhead">${esc(r.label)}</th>
        <td>${sel(NAMES.hFood(r.code))}</td>
        <td>${sel(NAMES.hBilas(r.code))}</td>
        <td>${sel(NAMES.hSale(r.code))}</td>
        <td><input class="txt tiny" type="text" data-field="${esc(NAMES.hNotes(r.code))}"
          value="${esc(data[NAMES.hNotes(r.code)] || '')}"></td></tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  // Module A activity-by-age grid (age-gated rows): per age, how often did you
  // hunt, and — if you did — was it year-round or mainly one season.
  function renderActivityGrid(field) {
    const data = state.current.data;
    const allowed = CONFIG.enterableLifeStages(data.age_band);
    let html = `<div class="field"><div class="q">${esc(field.label)}</div>
      <div class="help">${esc(field.help || '')}</div>`;
    CONFIG.lifeStages.forEach((ls) => {
      if (!allowed.includes(ls.code)) return;
      const af = NAMES.activity(ls.code);
      const sf = NAMES.season(ls.code);
      const actVal = data[af];
      html += `<div class="subq"><div class="q small">Age ${esc(ls.label)}</div>
        ${radioGroup(af, CONFIG.options.activity, actVal)}`;
      if (actVal && actVal !== 'did_not') {
        html += `<div class="seasonq"><div class="help">Year-round or mainly one season?</div>
          ${radioGroup(sf, CONFIG.options.season, data[sf])}</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }

  // Module B per-category block. "Ever hunted?" gates the use questions: uses
  // only show when taken = yes; a reason free-text shows for "other reasons".
  function renderPerCategory(field) {
    const data = state.current.data;
    let html = '';
    CONFIG.categories.forEach((c) => {
      const takenVal = data[NAMES.bTaken(c.code)];
      html += `<div class="catblock"><div class="cathead">${esc(c.label)}</div>`;
      html += labelBlock('Ever hunted?', '',
        radioGroup(NAMES.bTaken(c.code), CONFIG.options.b_taken, takenVal));
      if (takenVal === 'other_reasons') {
        html += labelBlock('Why not? (record the reason)', '',
          textEl(NAMES.bTakenReason(c.code), data[NAMES.bTakenReason(c.code)]));
      }
      if (takenVal === 'yes') {
        html += `<div class="field"><div class="q">Used for</div><div class="options">` +
          CONFIG.useTypes.map((u) => boolButton(u.field(c.code), u.label, data[u.field(c.code)] === true)).join('') +
          `</div></div>`;
        html += labelBlock('Other use (specify)', '',
          textEl(NAMES.bUseOther(c.code), data[NAMES.bUseOther(c.code)]));
      }
      html += `</div>`;
    });
    return html;
  }

  // Module F catch list (repeatable {category, count})
  function renderCatchList(field) {
    const data = state.current.data;
    const key = `f_${field.trip}_catch`;
    const list = Array.isArray(data[key]) ? data[key] : [];
    let rows = list.map((row, i) => {
      const opts = ['<option value="">— category —</option>'].concat(
        CONFIG.categories.map((c) => `<option value="${esc(c.code)}" ${row.category === c.code ? 'selected' : ''}>${esc(c.label)}</option>`)
      ).join('');
      return `<div class="catchrow">
        <select class="drop" data-catch="category" data-trip="${esc(field.trip)}" data-idx="${i}">${opts}</select>
        <input class="txt num" type="number" min="0" inputmode="numeric" placeholder="count"
          data-catch="count" data-trip="${esc(field.trip)}" data-idx="${i}" value="${esc(row.count == null ? '' : row.count)}">
        <button class="btn tiny danger" type="button" data-action="catch-remove" data-trip="${esc(field.trip)}" data-idx="${i}">✕</button>
      </div>`;
    }).join('');
    return `<div class="field"><div class="q">${esc(field.label)}</div>
      <div class="catchlist">${rows || '<div class="help">No catch rows yet.</div>'}</div>
      <button class="btn small" type="button" data-action="catch-add" data-trip="${esc(field.trip)}">+ Add catch row</button></div>`;
  }

  // Module F share allocation: divide the catch into 10 parts across the four
  // uses, with a live running total and stacked bar so it always reads as one
  // whole. Soft — not forced to exactly 10.
  function renderShareAlloc(field) {
    const data = state.current.data;
    const trip = field.trip;
    const max = CONFIG.shareTotal;
    const valOf = (key) => parseInt(data[`f_${trip}_share_${key}`], 10) || 0;
    const total = CONFIG.shareUses.reduce((s, u) => s + valOf(u.key), 0);
    const rows = CONFIG.shareUses.map((u) => {
      const val = valOf(u.key);
      return `<div class="sharerow">
        <div class="sharelabel">${esc(u.label)}</div>
        <button class="btn tiny" type="button" data-action="share-dec" data-trip="${esc(trip)}" data-use="${esc(u.key)}" aria-label="less ${esc(u.label)}">−</button>
        <div class="shareval">${val}</div>
        <button class="btn tiny" type="button" data-action="share-inc" data-trip="${esc(trip)}" data-use="${esc(u.key)}" aria-label="more ${esc(u.label)}">+</button>
      </div>`;
    }).join('');
    const segs = CONFIG.shareUses.map((u) => {
      const val = valOf(u.key);
      return val > 0 ? `<span class="seg seg-${esc(u.key)}" style="flex:${val}"></span>` : '';
    }).join('');
    const cls = total === max ? 'ok' : 'warn';
    return `<div class="field"><div class="q">${esc(field.label)}</div>
      <div class="sharebar">${segs || '<span class="seg empty" style="flex:1"></span>'}</div>
      <div class="sharetotal ${cls}">Total: ${total} / ${max}${total === max ? ' ✓' : ''}</div>
      ${rows}</div>`;
  }

  // Generic field dispatcher
  function renderField(field) {
    const data = state.current.data;
    if (!visible(field, data)) return '';
    switch (field.kind) {
      case 'profile_meta': return renderProfileMeta();
      case 'note': return `<div class="note">${esc(field.text)}</div>`;
      case 'single': {
        let opts = SCHEMA.resolveOptions(field.options);
        // Wards may optionally be scoped to the selected zone (reference.json
        // entries with a `zone` property); entries without one show for all.
        if (field.scopeByZone && data.zone) {
          const scoped = opts.filter((o) => !o.zone || o.zone === data.zone);
          if (scoped.length) opts = scoped;
        }
        return labelBlock(field.label, field.help,
          field.dropdown ? selectEl(field.name, opts, data[field.name])
            : radioGroup(field.name, opts, data[field.name]));
      }
      case 'multi':
        return labelBlock(field.label, field.help,
          multiGroup(field.name, SCHEMA.resolveOptions(field.options), data[field.name]));
      case 'boolean':
        return `<div class="field"><div class="options">${boolButton(field.name, field.label, data[field.name] === true)}</div></div>`;
      case 'text':
        return labelBlock(field.label, field.help, textEl(field.name, data[field.name], false));
      case 'textarea':
        return labelBlock(field.label, field.help, textEl(field.name, data[field.name], true));
      case 'activity_grid': return renderActivityGrid(field);
      case 'per_category': return renderPerCategory(field);
      case 'grid_bool': return labelBlock('', '', renderGridBool(field));
      case 'grid_single': return labelBlock('', '', renderGridSingle(field));
      case 'rules_grid': return renderRulesGrid(field);
      case 'catch_list': return renderCatchList(field);
      case 'share_alloc': return renderShareAlloc(field);
      case 'trip_block': {
        const inner = SCHEMA.tripBlockFields(field.trip).map(renderField).join('');
        return `<div class="tripblock"><div class="triphead">${esc(field.heading)}</div>${inner}</div>`;
      }
      default: return '';
    }
  }

  // --- Screens -------------------------------------------------------------
  function header() {
    return `<div class="topbar">
      <div class="brand">MCA Hunting Survey</div>
      <div class="who">${esc(interviewerId() || '')} <button class="btn tiny ghost" data-action="change-interviewer">change</button></div>
    </div>`;
  }

  function statusBadge(r) {
    if (r.interview_status === 'complete') {
      return r.sync_status === 'exported'
        ? '<span class="badge ok">complete · exported</span>'
        : '<span class="badge done">complete · not exported</span>';
    }
    return '<span class="badge warn">in progress</span>';
  }

  async function renderHome() {
    state.view = 'home';
    const list = await DB.getAll();
    const rowsHtml = list.length ? list.map((r) => `
      <li class="ivrow" data-id="${esc(r.interview_id)}">
        <div class="ivmain" data-action="open" data-id="${esc(r.interview_id)}">
          <div class="ivcode">${esc(r.resp_id_code || '(no ID yet)')}</div>
          <div class="ivmeta">${statusBadge(r)} <span class="mono">${esc((r.updated_at || '').slice(0, 16).replace('T', ' '))}</span>
            ${r.gps_status === 'missing' ? '<span class="badge miss">no GPS</span>' : ''}</div>
        </div>
        <button class="btn tiny danger" data-action="delete" data-id="${esc(r.interview_id)}">Delete</button>
      </li>`).join('') : '<li class="empty">No interviews on this device yet.</li>';

    $app().innerHTML = header() + `
      <div class="screen">
        <button class="btn primary big" data-action="new">+ New interview</button>
        <h2>Interviews on this device (${list.length})</h2>
        <ul class="ivlist">${rowsHtml}</ul>
        <div class="exportbar">
          <button class="btn primary" data-action="send-csv">Send interviews</button>
        </div>
        <details class="moreexport">
          <summary>Other export options</summary>
          <div class="exportbar">
            <button class="btn" data-action="export-csv">Download CSV</button>
            <button class="btn ghost" data-action="export-json">Download JSON (raw)</button>
          </div>
        </details>
        <div class="foot">Offline-first · data stays on this device until you export. App v${esc(CONFIG.appVersion)}</div>
      </div>`;
  }

  function renderConsent() {
    state.view = 'consent';
    $app().innerHTML = header() + `
      <div class="screen">
        <h2>Consent</h2>
        <div class="consent">${esc(CONFIG.consentScript).replace(/\n/g, '<br>')}</div>
        <label class="opt consentcheck">
          <input type="checkbox" id="consent-check">
          <span>I read this aloud and the respondent <b>agreed</b> to take part.</span>
        </label>
        <div class="help">Tick the box to confirm consent. This is recorded with the interview.</div>
        <div class="navbtns">
          <button class="btn danger" data-action="consent-decline">Declined — cancel</button>
          <button class="btn primary" data-action="consent-give">Start interview</button>
        </div>
      </div>`;
  }

  function stepper() {
    const mods = activeModules();
    return `<div class="stepper">` + mods.map((m, i) => `
      <button class="stepdot ${i === state.step ? 'active' : ''}" data-action="goto-step" data-step="${i}">${esc(m.id)}</button>`).join('') + `</div>`;
  }

  function renderModule(preserveScroll) {
    state.view = 'module';
    const y = preserveScroll ? window.scrollY : 0;
    const mods = activeModules();
    if (state.step >= mods.length) state.step = mods.length - 1; // clamp if gate shrank the list
    const mod = mods[state.step];
    const body = mod.fields.map(renderField).join('');
    const last = state.step === mods.length - 1;
    $app().innerHTML = header() + `
      <div class="screen">
        ${stepper()}
        <h2>${esc(mod.title)}</h2>
        <div class="modbody">${body}</div>
        <div class="navbtns">
          <button class="btn" data-action="prev">${state.step === 0 ? 'Home' : 'Back'}</button>
          <button class="btn primary" data-action="next">${last ? 'Review' : 'Next'}</button>
        </div>
        <div class="foot">Every question can be left blank. Progress saves automatically.</div>
      </div>`;
    window.scrollTo(0, y);
  }

  function renderReview() {
    state.view = 'review';
    const r = state.current;
    const cols = EXPORTER.buildColumns();
    const rowsHtml = cols.map((c) => {
      const v = EXPORTER.valueFor(r, c, true);
      if (v === '' || v == null) return '';
      return `<tr><td class="mono small">${esc(c.name)}</td><td>${esc(v)}</td></tr>`;
    }).filter(Boolean).join('');
    const consentOk = r.consent_given === 'yes';
    const gpsOk = r.gps_status === 'ok';
    const flags = [];
    if (!r.resp_id_code) flags.push('no respondent ID (Zone was blank)');
    if (!gpsOk) flags.push('no GPS');
    const flagHtml = flags.length
      ? `<div class="review-consent miss">Check: ${esc(flags.join(' · '))}</div>` : '';
    $app().innerHTML = header() + `
      <div class="screen">
        <h2>Review — ${esc(r.resp_id_code || '(no ID)')}</h2>
        <div class="review-consent ${consentOk ? 'ok' : 'miss'}">Consent recorded: ${consentOk ? 'YES' : 'NOT RECORDED'}</div>
        ${flagHtml}
        <div class="thanks">
          <div class="q">Before you finish — read aloud:</div>
          <div>${esc(CONFIG.thankYouScript)}</div>
        </div>
        <div class="help">Only answered fields are shown (${rowsHtml ? '' : 'none yet'}).</div>
        <table class="review"><tbody>${rowsHtml}</tbody></table>
        <div class="navbtns">
          <button class="btn" data-action="back-to-form">Back to edit</button>
          <button class="btn primary" data-action="complete">Complete interview</button>
        </div>
      </div>`;
  }

  // --- First-run interviewer setup ----------------------------------------
  function renderInterviewerSetup() {
    state.view = 'setup';
    $app().innerHTML = `
      <div class="screen setup">
        <h1>MCA Hunting Survey</h1>
        <p>Before you start, enter your interviewer name or ID. It is stored on this device and recorded with each interview.</p>
        <input class="txt" id="setup-name" type="text" placeholder="e.g. Jane K. or INT-03" value="${esc(interviewerId())}">
        <button class="btn primary big" data-action="save-interviewer">Save and continue</button>
      </div>`;
  }

  // --- Event handling ------------------------------------------------------
  function onChange(e) {
    const t = e.target;
    // Catch-list row edits
    if (t.dataset && t.dataset.catch) {
      const trip = t.dataset.trip, idx = parseInt(t.dataset.idx, 10);
      const key = `f_${trip}_catch`;
      const list = Array.isArray(state.current.data[key]) ? state.current.data[key] : [];
      if (!list[idx]) list[idx] = { category: '', count: '' };
      list[idx][t.dataset.catch] = t.value;
      state.current.data[key] = list;
      save();
      return;
    }
    if (!t.dataset || !t.dataset.field) return;
    const field = t.dataset.field;
    let rerender = false;
    if (t.type === 'radio') {
      setData(field, t.value);
      rerender = true;
    } else if (t.type === 'checkbox' && t.dataset.multi) {
      const cur = Array.isArray(state.current.data[field]) ? state.current.data[field].slice() : [];
      const i = cur.indexOf(t.value);
      if (t.checked && i < 0) cur.push(t.value);
      if (!t.checked && i >= 0) cur.splice(i, 1);
      setData(field, cur);
      rerender = true;
    } else if (t.type === 'checkbox') {
      setData(field, t.checked);
    } else {
      // select / text / textarea / number
      setData(field, t.value);
      rerender = true; // change fires on blur for text/select — safe to refresh dependents
    }
    if (rerender && state.view === 'module') {
      const mod = activeModules()[state.step];
      // activity_type changes which modules are active — always re-render it.
      if (field === 'activity_type') { renderModule(true); return; }
      // activity_* reveals the per-age season question; b_taken_* reveals the
      // per-animal use questions / reason field.
      if (triggerFields(mod).has(field)
        || field.startsWith('activity_')
        || (field.startsWith('b_taken_') && !field.startsWith('b_taken_reason_'))) {
        renderModule(true);
      }
    }
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset && t.dataset.catch) return; // handled on change
    if (!t.dataset || !t.dataset.field) return;
    // Live-save text typing without re-rendering (keeps focus). Debounced so we
    // don't write on every keystroke; blur ('change') will do a final save.
    if (t.type === 'text' || t.tagName === 'TEXTAREA' || t.type === 'number') {
      state.current.data[t.dataset.field] = t.value;
      saveDebounced();
    }
  }

  async function onClick(e) {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const action = a.dataset.action;

    switch (action) {
      case 'save-interviewer': {
        const v = document.getElementById('setup-name').value.trim();
        if (!v) { alert('Please enter a name or ID.'); return; }
        localStorage.setItem(LS.interviewer, v);
        renderHome();
        return;
      }
      case 'change-interviewer': renderInterviewerSetup(); return;
      case 'new': renderConsent(); return;
      case 'consent-decline': renderHome(); return; // no record saved
      case 'consent-give': {
        const box = document.getElementById('consent-check');
        if (!box || !box.checked) { alert('Please tick the consent box to confirm the respondent agreed.'); return; }
        state.current = newInterview();
        state.current.consent_given = 'yes';
        state.current.consent_time = new Date().toISOString();
        state.step = 0;
        await DB.put(state.current);
        captureGPS();
        renderModule();
        return;
      }
      case 'open': {
        const rec = await DB.get(a.dataset.id);
        if (!rec) return;
        state.current = rec;
        state.step = rec.interview_status === 'complete' ? 0 : (rec._step || 0);
        if (rec.interview_status === 'complete') renderReview(); else renderModule();
        return;
      }
      case 'delete': {
        if (confirm('Delete this interview permanently?')) { await DB.remove(a.dataset.id); renderHome(); }
        return;
      }
      case 'gps-retry': captureGPS(); return;
      case 'prev':
        if (state.step === 0) { renderHome(); }
        else { state.step--; state.current._step = state.step; save(); renderModule(); }
        return;
      case 'next': {
        const mods = activeModules();
        const warns = moduleWarnings(mods[state.step]);
        if (warns.length && !confirm('Please check before moving on:\n\n• ' + warns.join('\n• ') + '\n\nContinue anyway?')) return;
        if (state.step === mods.length - 1) { renderReview(); }
        else { state.step++; state.current._step = state.step; save(); renderModule(); }
        return;
      }
      case 'goto-step':
        state.step = parseInt(a.dataset.step, 10);
        state.current._step = state.step; save(); renderModule();
        return;
      case 'catch-add': {
        const key = `f_${a.dataset.trip}_catch`;
        const list = Array.isArray(state.current.data[key]) ? state.current.data[key] : [];
        list.push({ category: '', count: '' });
        state.current.data[key] = list; save(); renderModule(true);
        return;
      }
      case 'catch-remove': {
        const key = `f_${a.dataset.trip}_catch`;
        const list = Array.isArray(state.current.data[key]) ? state.current.data[key] : [];
        list.splice(parseInt(a.dataset.idx, 10), 1);
        state.current.data[key] = list; save(); renderModule(true);
        return;
      }
      case 'share-inc':
      case 'share-dec': {
        const trip = a.dataset.trip, use = a.dataset.use;
        const fname = `f_${trip}_share_${use}`;
        const total = CONFIG.shareUses.reduce(
          (s, u) => s + (parseInt(state.current.data[`f_${trip}_share_${u.key}`], 10) || 0), 0);
        let val = parseInt(state.current.data[fname], 10) || 0;
        if (action === 'share-inc' && total < CONFIG.shareTotal) val++;
        if (action === 'share-dec' && val > 0) val--;
        state.current.data[fname] = val;
        save(); renderModule(true);
        return;
      }
      case 'back-to-form': renderModule(); return;
      case 'complete': {
        const gaps = completeWarnings();
        if (gaps.length && !confirm('Final check — this interview is missing:\n\n• ' + gaps.join('\n• ') + '\n\nComplete anyway?')) return;
        state.current.interview_status = 'complete';
        state.current.interview_end_time = new Date().toISOString();
        await DB.put(state.current);
        state.current = null;
        renderHome();
        return;
      }
      case 'send-csv': return doSend(true);
      case 'export-csv': return doExport('csv', true);
      case 'export-json': return doExport('json', true);
    }
  }

  // Collect the records to export (completed only; fall back to all if none
  // are complete yet, so a test run can still be exported).
  function recordsToExport(all) {
    const completed = all.filter((r) => r.interview_status === 'complete');
    return { records: completed.length ? completed : all, completed };
  }

  async function markExported(completed) {
    for (const r of completed) {
      if (r.sync_status !== 'exported') { r.sync_status = 'exported'; await DB.put(r); }
    }
    if (state.view === 'home') renderHome();
  }

  // One-tap "Send": hand the CSV to the phone's native share sheet (WhatsApp,
  // email, Drive, Bluetooth…). No backend — the interviewer picks where it
  // goes. Falls back to a plain download where file-sharing isn't supported
  // (e.g. desktop browsers), so it always does something useful.
  async function doSend(includeName) {
    const all = await DB.getAll();
    const { records, completed } = recordsToExport(all);
    if (!records.length) { alert('No interviews to send yet.'); return; }
    const csv = EXPORTER.toCSV(records, includeName);
    const fname = `mca_hunt_${includeName ? 'named' : 'anon'}_${EXPORTER.timestamp()}.csv`;
    try {
      const file = new File([csv], fname, { type: 'text/csv' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'MCA Hunting Survey interviews',
          text: `MCA Hunting Survey — ${records.length} interview(s) from ${interviewerId() || 'this device'}.`,
        });
        await markExported(completed);
        return;
      }
    } catch (e) {
      // Share cancelled or unsupported mid-flight → fall through to download.
      if (e && e.name === 'AbortError') return; // user cancelled: do nothing
    }
    // Fallback: download the file so the interviewer can attach it manually.
    EXPORTER.download(fname, csv, 'text/csv;charset=utf-8');
    await markExported(completed);
  }

  async function doExport(kind, includeName) {
    const all = await DB.getAll();
    const { records, completed } = recordsToExport(all);
    if (!records.length) { alert('No interviews to export yet.'); return; }
    const ts = EXPORTER.timestamp();
    if (kind === 'csv') {
      const csv = EXPORTER.toCSV(records, includeName);
      EXPORTER.download(`mca_hunt_${includeName ? 'named' : 'anon'}_${ts}.csv`, csv, 'text/csv;charset=utf-8');
    } else {
      const json = EXPORTER.toJSON(records, includeName);
      EXPORTER.download(`mca_hunt_${ts}.json`, json, 'application/json');
    }
    await markExported(completed);
  }

  // --- Bootstrap -----------------------------------------------------------
  async function init() {
    await DB.open();
    await loadReference();
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('click', onClick);
    if (!interviewerId()) renderInterviewerSetup(); else renderHome();

    // Only register the service worker for the hosted build (http/https).
    // The single-file build opened from disk (file://) skips this — it is
    // already fully offline and SW registration would just error.
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
