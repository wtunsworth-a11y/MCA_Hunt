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
      gps: null,
      gps_status: 'pending',
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
    if (!navigator.geolocation) {
      state.current.gps_status = 'missing';
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
        save();
        if (state.view === 'module') renderModule(true);
      },
      () => {
        state.current.gps_status = 'missing';
        save();
        if (state.view === 'module') renderModule(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // --- showIf evaluation ---------------------------------------------------
  function visible(field, data) {
    const c = field.showIf;
    if (!c) return true;
    const v = data[c.field];
    if (c.equals != null) return v === c.equals;
    if (c.notEmpty) return !!(v && String(v).trim());
    if (c.includes) return Array.isArray(v) && v.includes(c.includes);
    return true;
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
    return `<div class="field metabox">
      <div class="q">Respondent ID</div>
      <div class="mono big">${esc(r.resp_id_code || '— set once Zone is chosen —')}</div>
      <div class="q" style="margin-top:.6rem">Interview location (GPS)</div>
      <div class="gpsrow">${gps}
        <button class="btn tiny" data-action="gps-retry" type="button">Retry GPS</button></div>
      <div class="help">GPS records where the interview happens — never where people hunt/fish/gather.</div>
    </div>`;
  }

  // Category × method / category × month boolean grid
  function renderGridBool(field) {
    const rows = SCHEMA.resolveOptions(field.rows);
    const cols = SCHEMA.resolveOptions(field.cols);
    const data = state.current.data;
    let legend = '';
    if (field.cols === 'methods') {
      legend = `<details class="legend"><summary>Method code legend</summary><ul>` +
        cols.map((c) => `<li><b>${esc(c.code)}</b> — ${esc(c.label)}</li>`).join('') + `</ul></details>`;
    }
    let html = `${legend}<div class="gridwrap"><table class="grid"><thead><tr><th class="rowhead">Category</th>` +
      cols.map((c) => `<th title="${esc(c.label)}">${esc(field.cols === 'methods' ? c.code : c.label)}</th>`).join('') +
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
    const rows = SCHEMA.resolveOptions(field.rows);
    const cols = SCHEMA.resolveOptions(field.cols);
    const opts = SCHEMA.resolveOptions(field.options);
    const data = state.current.data;
    const allowed = field.ageGated
      ? CONFIG.enterableLifeStages(data.age_band) : cols.map((c) => c.code);
    let html = `<div class="gridwrap"><table class="grid"><thead><tr><th class="rowhead">Category</th>` +
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
      <th class="rowhead">Category</th><th>Food</th><th>Bilas</th><th>Sale</th><th>Notes</th></tr></thead><tbody>`;
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

  // Module A life-stage activity grid (age-gated rows)
  function renderActivityGrid(field) {
    const data = state.current.data;
    const allowed = CONFIG.enterableLifeStages(data.age_band);
    const fieldFor = { under_25: 'activity_under_25', '25_39': 'activity_25_39',
      '40_59': 'activity_40_59', '60_plus': 'activity_60_plus' };
    let html = `<div class="field"><div class="q">${esc(field.label)}</div>
      <div class="help">${esc(field.help || '')}</div>`;
    CONFIG.lifeStages.forEach((ls) => {
      if (!allowed.includes(ls.code)) return;
      const fname = fieldFor[ls.code];
      const opts = ls.code === 'under_25'
        ? CONFIG.options.activity_under_25 : CONFIG.options.activity_other;
      html += `<div class="subq"><div class="q small">${esc(ls.label)}</div>
        ${radioGroup(fname, opts, data[fname])}</div>`;
    });
    html += `</div>`;
    return html;
  }

  // Module B per-category block
  function renderPerCategory(field) {
    const data = state.current.data;
    let html = '';
    CONFIG.categories.forEach((c) => {
      html += `<div class="catblock"><div class="cathead">${esc(c.label)}</div>`;
      html += labelBlock(field.taken.label,
        '', radioGroup(field.taken.field(c.code), SCHEMA.resolveOptions(field.taken.options), data[field.taken.field(c.code)]));
      html += `<div class="field"><div class="q">Used for</div><div class="options">` +
        field.uses.map((u) => boolButton(u.field(c.code), u.label, data[u.field(c.code)] === true)).join('') +
        `</div></div>`;
      html += labelBlock(field.otherText.label, '', textEl(field.otherText.field(c.code), data[field.otherText.field(c.code)]));
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
          <button class="btn" data-action="export-csv">Export CSV (with names)</button>
          <button class="btn" data-action="export-csv-anon">Export CSV (no names)</button>
          <button class="btn ghost" data-action="export-json">Export JSON</button>
        </div>
        <div class="foot">Offline-first · data stays on this device until you export. App v${esc(CONFIG.appVersion)}</div>
      </div>`;
  }

  function renderConsent() {
    state.view = 'consent';
    $app().innerHTML = header() + `
      <div class="screen">
        <h2>Consent</h2>
        <div class="consent">${esc(CONFIG.consentScript).replace(/\n/g, '<br>')}</div>
        <div class="navbtns">
          <button class="btn danger" data-action="consent-decline">Consent declined — cancel</button>
          <button class="btn primary" data-action="consent-give">Consent given — start</button>
        </div>
      </div>`;
  }

  function stepper() {
    const mods = SCHEMA.modules;
    return `<div class="stepper">` + mods.map((m, i) => `
      <button class="stepdot ${i === state.step ? 'active' : ''}" data-action="goto-step" data-step="${i}">${esc(m.id)}</button>`).join('') + `</div>`;
  }

  function renderModule(preserveScroll) {
    state.view = 'module';
    const y = preserveScroll ? window.scrollY : 0;
    const mod = SCHEMA.modules[state.step];
    const body = mod.fields.map(renderField).join('');
    const last = state.step === SCHEMA.modules.length - 1;
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
    $app().innerHTML = header() + `
      <div class="screen">
        <h2>Review — ${esc(r.resp_id_code || '(no ID)')}</h2>
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
      const mod = SCHEMA.modules[state.step];
      if (triggerFields(mod).has(field) || field.startsWith('activity_')) renderModule(true);
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
        state.current = newInterview();
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
      case 'next':
        if (state.step === SCHEMA.modules.length - 1) { renderReview(); }
        else { state.step++; state.current._step = state.step; save(); renderModule(); }
        return;
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
      case 'back-to-form': renderModule(); return;
      case 'complete': {
        state.current.interview_status = 'complete';
        state.current.interview_end_time = new Date().toISOString();
        await DB.put(state.current);
        state.current = null;
        renderHome();
        return;
      }
      case 'export-csv': return doExport('csv', true);
      case 'export-csv-anon': return doExport('csv', false);
      case 'export-json': return doExport('json', true);
    }
  }

  async function doExport(kind, includeName) {
    const all = await DB.getAll();
    const completed = all.filter((r) => r.interview_status === 'complete');
    const records = completed.length ? completed : all; // fall back to all if none complete
    if (!records.length) { alert('No interviews to export yet.'); return; }
    const ts = EXPORTER.timestamp();
    if (kind === 'csv') {
      const csv = EXPORTER.toCSV(records, includeName);
      EXPORTER.download(`mca_hunt_${includeName ? 'named' : 'anon'}_${ts}.csv`, csv, 'text/csv;charset=utf-8');
    } else {
      const json = EXPORTER.toJSON(records, includeName);
      EXPORTER.download(`mca_hunt_${ts}.json`, json, 'application/json');
    }
    // Mark exported completed interviews as synced/exported.
    for (const r of completed) {
      if (r.sync_status !== 'exported') { r.sync_status = 'exported'; await DB.put(r); }
    }
    if (state.view === 'home') renderHome();
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
