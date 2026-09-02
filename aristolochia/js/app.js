/*
 * app.js — controller, router and renderer for the MCA Aristolochia Survey PWA.
 *
 * Fully client-side and offline-first: reference lists load from a bundled JSON
 * file, all state lives in IndexedDB (js/db.js), and every field change
 * autosaves. No network call is made at the point of data entry.
 *
 * Uploading is manual by design: the day's records are exported as two CSVs
 * (plots and vines) and filed into the Drive folder named in js/config.js.
 */
(function () {
  'use strict';

  const $app = () => document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // --- Local device / surveyor identity (localStorage) ---------------------
  const LS = {
    surveyor: 'mca_aris_surveyor',
    device: 'mca_aris_device_prefix',
    seq: 'mca_aris_seq',
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
  function surveyorId() { return localStorage.getItem(LS.surveyor) || ''; }

  // Plot code: <ZONE>-<DEVICE>-<SEQ>. Generated locally, collision-safe via the
  // per-device prefix, never typed by hand.
  function makePlotCode(zoneCode, seq) {
    const zone = (zoneCode || 'ZZ').toUpperCase();
    return `${zone}-${devicePrefix()}-${String(seq).padStart(3, '0')}`;
  }

  // Local calendar date (not UTC) — the survey day the record belongs to.
  function todayLocal(d) {
    const t = d || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  }

  // --- App state -----------------------------------------------------------
  const state = { view: 'home', current: null, step: 0 };

  // --- Reference list loading (zones/wards), shared with the hunting survey -
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
      const res = await fetch('../data/reference.json', { cache: 'no-cache' });
      const ref = await res.json();
      CONFIG.zones = Array.isArray(ref.zones) ? ref.zones : [];
      CONFIG.wards = Array.isArray(ref.wards) ? ref.wards : [];
    } catch (e) {
      CONFIG.zones = []; CONFIG.wards = [];
    }
  }

  // --- Plot model ----------------------------------------------------------
  function newPlot() {
    const seq = nextSeq();
    return {
      plot_id: (crypto.randomUUID ? crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(16).slice(2)),
      plot_code: '',
      _seq: seq,
      surveyor: surveyorId(),
      survey_date: todayLocal(),
      farmer_name: '',
      gps: null,
      gps_status: 'pending',
      gps_error: '',
      consent_given: '',
      consent_time: '',
      plot_status: 'in_progress',
      sync_status: 'not_exported',
      exported_at: '',
      app_version: CONFIG.appVersion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: { vines: [] },
    };
  }

  function save() { if (state.current) DB.put(state.current); }
  let saveTimer = null;
  function saveDebounced() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  function setData(field, value) {
    state.current.data[field] = value;
    // The plot code carries the zone prefix, so it is (re)built when zone is set.
    if (field === 'zone') {
      state.current.plot_code = makePlotCode(value, state.current._seq);
    }
    // Changing the garden/forest gate clears the other branch, so a plot can
    // never export a forest type alongside a clearing year.
    if (field === 'plot_type') {
      const drop = value === 'forest' ? SCHEMA.BRANCH_FIELDS.garden
        : value === 'garden' ? SCHEMA.BRANCH_FIELDS.forest : [];
      drop.forEach((f) => { delete state.current.data[f]; });
    }
    save();
  }

  // --- GPS capture ---------------------------------------------------------
  function captureGPS() {
    if (!state.current) return;
    state.current.gps_status = 'pending';
    state.current.gps_error = '';
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
          state.current.gps_error = 'Timed out getting a fix. Move to open sky (away from thick canopy) and Retry.';
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
  function condHolds(c, data) {
    const v = data[c.field];
    if (c.equals != null) return v === c.equals;
    if (c.notEquals != null) return v !== c.notEquals;
    return true;
  }

  // showIf is either one condition or a list of conditions that must all hold
  // (e.g. year_abandoned needs a garden plot AND an abandoned garden).
  function visible(field, data) {
    const c = field.showIf;
    if (!c) return true;
    return Array.isArray(c) ? c.every((one) => condHolds(one, data)) : condHolds(c, data);
  }

  // --- Validation warnings -------------------------------------------------
  function yearWarnings(data) {
    const w = [];
    if (data.plot_type === 'forest') return w; // no years are asked for forest
    const now = new Date().getFullYear();
    const check = (name, label) => {
      const raw = data[name];
      if (raw === '' || raw == null) return;
      const y = parseInt(raw, 10);
      if (!y || y < CONFIG.minYear || y > now) {
        w.push(`${label} “${raw}” is outside ${CONFIG.minYear}–${now}.`);
      }
    };
    check('year_cleared', 'Year cleared');
    check('year_abandoned', 'Year abandoned');
    const c = parseInt(data.year_cleared, 10);
    const a = parseInt(data.year_abandoned, 10);
    if (c && a && a < c) w.push(`Year abandoned (${a}) is before year cleared (${c}).`);
    return w;
  }

  function moduleWarnings(mod) {
    const data = state.current.data;
    if (mod.id === 'B') return yearWarnings(data);
    if (mod.id === 'C') {
      const w = [];
      const vines = Array.isArray(data.vines) ? data.vines : [];
      if (data.aristolochia_present === 'yes' && EXPORTER.realVines(state.current).length === 0) {
        w.push('Aristolochia recorded as present, but no vine has been entered yet.');
      }
      vines.forEach((v, i) => {
        if (!EXPORTER.vineHasContent(v)) return;
        CONFIG.vineSigns.forEach((s) => {
          if (!s.counted) return;
          const n = v[s.key + '_count'];
          if (v[s.key] === 'no' && n !== '' && n != null && parseInt(n, 10) > 0) {
            w.push(`Vine ${i + 1}: ${s.label.toLowerCase()} is “No” but a count of ${n} is entered.`);
          }
        });
      });
      return w;
    }
    return [];
  }

  function completeWarnings() {
    const r = state.current;
    const w = yearWarnings(r.data);
    if (r.consent_given !== 'yes') w.push('consent not recorded');
    if (!r.plot_code) w.push('no plot code (Zone was blank)');
    if (r.gps_status !== 'ok') w.push('no GPS point');
    if (!r.data.plot_type) w.push('garden or forest not recorded');
    if (!r.data.aristolochia_present) w.push('Aristolochia present/absent not recorded');
    return w;
  }

  // Fields whose value changes what else is shown — a change on one of these
  // re-renders the section.
  function triggerFields(module) {
    const s = new Set();
    module.fields.forEach((f) => {
      if (!f.showIf) return;
      (Array.isArray(f.showIf) ? f.showIf : [f.showIf]).forEach((c) => s.add(c.field));
    });
    return s;
  }

  // --- Field renderers (return HTML strings) -------------------------------
  function radioGroup(field, options, current) {
    return `<div class="options">` + options.map((o) => `
      <label class="opt ${current === o.code ? 'sel' : ''}">
        <input type="radio" name="${esc(field)}" value="${esc(o.code)}"
          data-field="${esc(field)}" ${current === o.code ? 'checked' : ''}>
        <span>${esc(o.label)}</span></label>`).join('') + `</div>`;
  }

  // `attrs` is the raw attribute string identifying the target of the edit —
  // data-field=... for a plot field, data-vine/data-idx for a vine sub-field.
  function selectWith(attrs, options, current, placeholder) {
    return `<select class="sel" ${attrs}>
      <option value="">${esc(placeholder || '— choose —')}</option>` +
      options.map((o) => `<option value="${esc(o.code)}" ${current === o.code ? 'selected' : ''}>${esc(o.label)}</option>`).join('') +
      `</select>`;
  }
  function selectEl(field, options, current, placeholder) {
    return selectWith(`data-field="${esc(field)}"`, options, current, placeholder);
  }
  function selectVine(idx, key, options, current, placeholder) {
    return selectWith(`data-vine="${esc(key)}" data-idx="${idx}"`, options, current, placeholder);
  }

  function textEl(field, value, multiline) {
    return multiline
      ? `<textarea class="txt" rows="3" data-field="${esc(field)}">${esc(value || '')}</textarea>`
      : `<input class="txt" type="text" data-field="${esc(field)}" value="${esc(value || '')}">`;
  }

  function labelBlock(label, help, inner) {
    return `<div class="field">
      ${label ? `<div class="q">${esc(label)}</div>` : ''}
      ${help ? `<div class="help">${esc(help)}</div>` : ''}
      ${inner}</div>`;
  }

  function renderPlotMeta() {
    const r = state.current;
    let gpsLine;
    if (r.gps_status === 'ok' && r.gps) {
      gpsLine = `<span class="badge ok">GPS ${r.gps.lat.toFixed(5)}, ${r.gps.lon.toFixed(5)}</span>
        <span class="mono small">±${Math.round(r.gps.accuracy)} m</span>`;
    } else if (r.gps_status === 'pending') {
      gpsLine = '<span class="badge warn">Getting GPS…</span>';
    } else {
      gpsLine = '<span class="badge miss">No GPS point</span>';
    }
    const errMsg = (r.gps_status === 'missing' && r.gps_error)
      ? `<div class="help gpserr">${esc(r.gps_error)}</div>` : '';
    return `<div class="meta">
      <div class="metarow"><b>Plot</b> <span class="mono">${esc(r.plot_code || '(set Zone to generate)')}</span></div>
      <div class="metarow"><b>Date</b> <span class="mono">${esc(r.survey_date)}</span></div>
      <div class="metarow"><b>Point</b> ${gpsLine}
        <button class="btn tiny" data-action="gps-retry" type="button" ${r.gps_status === 'pending' ? 'disabled' : ''}>Retry GPS</button></div>
      ${errMsg}</div>`;
  }

  function renderFallowAge() {
    const data = state.current.data;
    const fallow = SCHEMA.DERIVED.fallowAge(data);
    const cult = SCHEMA.DERIVED.cultivationYears(data);
    const rows = [];
    if (data.plot_type === 'forest') {
      return `<div class="calc">
        <div class="calcrow"><b>Fallow age</b><span class="calcval muted">— forest, age not determined</span></div>
        <div class="help">Forest plots are not given an age. The plot type is recorded instead.</div></div>`;
    }
    if (fallow !== '') {
      rows.push(`<div class="calcrow"><b>Fallow age</b><span class="calcval">${esc(fallow)} year${fallow === '1' ? '' : 's'}</span></div>`);
    } else if (data.garden_status === 'still_used') {
      rows.push('<div class="calcrow"><b>Fallow age</b><span class="calcval muted">— still gardened</span></div>');
    } else if (data.garden_status === 'abandoned') {
      rows.push('<div class="calcrow"><b>Fallow age</b><span class="calcval muted">— enter the year abandoned</span></div>');
    } else {
      rows.push('<div class="calcrow"><b>Fallow age</b><span class="calcval muted">— answer the questions above</span></div>');
    }
    if (cult !== '') {
      rows.push(`<div class="calcrow"><b>Years gardened</b><span class="calcval">${esc(cult)} year${cult === '1' ? '' : 's'}</span></div>`);
    }
    return `<div class="calc">${rows.join('')}
      <div class="help">Calculated from the years above against today’s date. Not typed in, and recalculated every time the record is opened.</div></div>`;
  }

  // --- Vine list -----------------------------------------------------------
  function vineList() {
    const list = state.current.data.vines;
    return Array.isArray(list) ? list : (state.current.data.vines = []);
  }

  function renderVine(v, i) {
    const treeField = CONFIG.hostTrees.length
      ? selectVine(i, 'host_tree', CONFIG.hostTrees, v.host_tree, '— choose tree —')
      : `<input class="txt" type="text" data-vine="host_tree" data-idx="${i}"
           value="${esc(v.host_tree)}" placeholder="Tree species (local or scientific name)">`;
    const treeOther = (CONFIG.hostTrees.length && v.host_tree === 'other')
      ? `<input class="txt" type="text" data-vine="host_tree_other" data-idx="${i}"
           value="${esc(v.host_tree_other)}" placeholder="Other tree species (specify)">`
      : '';

    const signs = CONFIG.vineSigns.map((s) => {
      const cur = v[s.key];
      const yesNo = CONFIG.options.yes_no.map((o) => `
        <label class="opt tight ${cur === o.code ? 'sel' : ''}">
          <input type="radio" name="vine_${i}_${esc(s.key)}" value="${esc(o.code)}"
            data-vine="${esc(s.key)}" data-idx="${i}" ${cur === o.code ? 'checked' : ''}>
          <span>${esc(o.label)}</span></label>`).join('');
      const countId = `vc_${i}_${s.key}`;
      const count = (s.counted && cur === 'yes')
        ? `<div class="countrow"><label for="${countId}">How many? (optional)</label>
             <input class="txt num" id="${countId}" type="number" inputmode="numeric" min="0" step="1"
               data-vine="${esc(s.key)}_count" data-idx="${i}"
               value="${esc(v[s.key + '_count'])}"></div>`
        : '';
      return `<div class="signrow"><div class="q small">${esc(s.label)}</div>
        <div class="options inline">${yesNo}</div>${count}</div>`;
    }).join('');

    // Species identification is only asked where there is something to identify.
    const anySign = CONFIG.vineSigns.some((s) => v[s.key] === 'yes');
    const species = anySign ? `
      <div class="signrow"><div class="q small">Butterfly species, where you can tell</div>
      ${selectVine(i, 'species', CONFIG.options.birdwing_species, v.species, '— not identified —')}</div>` : '';

    return `<div class="vine">
      <div class="vinehead"><b>Vine ${i + 1}</b>
        <button class="btn tiny danger" type="button" data-action="vine-remove" data-idx="${i}">Remove</button></div>
      <div class="field"><div class="q small">Tree the vine is climbing</div>${treeField}${treeOther}</div>
      <div class="field"><div class="q small">Tree DBH (cm)</div>
        <input class="txt num" type="number" inputmode="decimal" min="0" step="0.1"
          data-vine="dbh_cm" data-idx="${i}" value="${esc(v.dbh_cm)}" placeholder="diameter at breast height"></div>
      ${signs}
      ${species}
      <div class="field"><div class="q small">Notes on this vine (optional)</div>
        <textarea class="txt" rows="2" data-vine="notes" data-idx="${i}">${esc(v.notes || '')}</textarea></div>
    </div>`;
  }

  function renderVineList() {
    const list = vineList();
    const body = list.length
      ? list.map(renderVine).join('')
      : '<div class="empty">No vines recorded yet.</div>';
    return `<div class="vines">
      <div class="vinecount">${list.length} vine${list.length === 1 ? '' : 's'} on this plot</div>
      ${body}
      <button class="btn primary" type="button" data-action="vine-add">+ Add vine</button></div>`;
  }

  function renderField(field) {
    const data = state.current.data;
    if (!visible(field, data)) return '';
    switch (field.kind) {
      case 'plot_meta':   return renderPlotMeta();
      case 'fallow_age':  return renderFallowAge();
      case 'vine_list':   return renderVineList();
      case 'note':        return `<div class="note">${esc(field.text)}</div>`;
      case 'single': {
        let opts = SCHEMA.resolveOptions(field.options);
        if (field.scopeByZone && data.zone) {
          const scoped = opts.filter((o) => !o.zone || o.zone === data.zone);
          if (scoped.length) opts = scoped;
        }
        const inner = field.dropdown
          ? selectEl(field.name, opts, data[field.name])
          : radioGroup(field.name, opts, data[field.name]);
        return labelBlock(field.label, field.help, inner);
      }
      case 'year':
        return labelBlock(field.label, field.help,
          `<input class="txt num" type="number" inputmode="numeric" min="${CONFIG.minYear}"
             max="${new Date().getFullYear()}" step="1" data-field="${esc(field.name)}"
             value="${esc(data[field.name] || '')}" placeholder="YYYY">`);
      case 'text':
      default:
        return labelBlock(field.label, field.help,
          textEl(field.name, data[field.name], field.multiline));
    }
  }

  // --- Screens -------------------------------------------------------------
  function header() {
    return `<div class="topbar">
      <div class="brand">MCA Aristolochia Survey</div>
      <div class="who">${esc(surveyorId() || '')} <button class="btn tiny ghost" data-action="change-surveyor">change</button></div>
    </div>`;
  }

  function statusBadge(r) {
    if (r.plot_status === 'complete') {
      return r.sync_status === 'exported'
        ? '<span class="badge ok">complete · exported</span>'
        : '<span class="badge done">complete · not exported</span>';
    }
    return '<span class="badge warn">in progress</span>';
  }

  // Records eligible for export: completed plots. In-progress ones are held
  // back so a half-entered plot is not filed as data.
  function exportable(all) {
    return all.filter((r) => r.plot_status === 'complete');
  }

  async function renderHome() {
    state.view = 'home';
    const list = await DB.getAll();
    const today = todayLocal();
    const done = exportable(list);
    const todayDone = done.filter((r) => r.survey_date === today);
    const pendingToday = todayDone.filter((r) => r.sync_status !== 'exported');
    const pendingOlder = done.filter((r) => r.survey_date !== today && r.sync_status !== 'exported');

    const backlog = pendingOlder.length
      ? `<div class="backlog">${pendingOlder.length} completed plot${pendingOlder.length === 1 ? '' : 's'} from earlier day${pendingOlder.length === 1 ? '' : 's'} not exported yet. Use “Export everything not yet sent”.</div>`
      : '';

    const rowsHtml = list.length ? list.map((r) => {
      const vines = EXPORTER.realVines(r).length;
      return `
      <li class="ivrow" data-id="${esc(r.plot_id)}">
        <div class="ivmain" data-action="open" data-id="${esc(r.plot_id)}">
          <div class="ivcode">${esc(r.plot_code || '(no code yet)')}
            <span class="vtag">${vines} vine${vines === 1 ? '' : 's'}</span></div>
          <div class="ivmeta">${statusBadge(r)} <span class="mono">${esc(r.survey_date || '')}</span>
            ${r.gps_status === 'missing' ? '<span class="badge miss">no GPS</span>' : ''}</div>
        </div>
        <button class="btn tiny danger" data-action="delete" data-id="${esc(r.plot_id)}">Delete</button>
      </li>`; }).join('') : '<li class="empty">No plots on this device yet.</li>';

    $app().innerHTML = header() + `
      <div class="screen">
        <button class="btn primary big" data-action="new">+ New plot</button>

        <div class="daycard">
          <div class="dayhead">Today — ${esc(today)}</div>
          <div class="daystat">${todayDone.length} completed · ${pendingToday.length} not yet exported</div>
          <button class="btn primary" data-action="send-today">Send today’s data</button>
          <a class="drivelink" href="${esc(CONFIG.driveFolderUrl)}" target="_blank" rel="noopener">
            Open the ${esc(CONFIG.driveFolderName)} folder in Drive →</a>
          <div class="help">One tap. Choose <b>Drive</b> on the share sheet and save into
            ${esc(CONFIG.driveFolderName)}. Both files — plots and vines — go together.</div>
        </div>
        ${backlog}

        <h2>Plots on this device (${list.length})</h2>
        <ul class="ivlist">${rowsHtml}</ul>

        <details class="moreexport">
          <summary>Other export options</summary>
          <div class="exportbar">
            <button class="btn" data-action="send-pending">Send everything not yet sent</button>
            <button class="btn" data-action="export-today">Download today’s data</button>
            <button class="btn" data-action="export-all">Download all data (re-export)</button>
            <button class="btn ghost" data-action="export-json">Download JSON (raw)</button>
            <button class="btn ghost" data-action="export-anon">Export without farmer names</button>
          </div>
        </details>
        <div class="foot">Offline-first · data stays on this device until you export. App v${esc(CONFIG.appVersion)}</div>
      </div>`;
  }

  function renderConsent() {
    state.view = 'consent';
    const script = CONFIG.consentScript.replace('[surveyor name]', surveyorId() || '[your name]');
    $app().innerHTML = header() + `
      <div class="screen">
        <h2>Permission and consent</h2>
        <div class="consent">${esc(script).replace(/\n/g, '<br>')}</div>
        <label class="opt consentcheck">
          <input type="checkbox" id="consent-check">
          <span>I read this aloud and the farmer <b>agreed</b> to take part and to this garden being recorded.</span>
        </label>
        <div class="help">Tick the box to confirm consent. This is recorded with the plot.</div>
        <div class="navbtns">
          <button class="btn danger" data-action="consent-decline">Declined — cancel</button>
          <button class="btn primary" data-action="consent-give">Start recording</button>
        </div>
      </div>`;
  }

  function stepper() {
    return `<div class="stepper">` + SCHEMA.modules.map((m, i) => `
      <button class="stepdot ${i === state.step ? 'active' : ''}" data-action="goto-step" data-step="${i}">${esc(m.id)}</button>`).join('') + `</div>`;
  }

  // Partial refreshes. A text field's `change` fires on blur — which happens as
  // the user's finger is going down on the next control. Rebuilding the whole
  // section there removes that control before the tap completes and the tap is
  // lost, so text edits update only the blocks that can actually have changed.
  function refreshWarnings() {
    const warns = moduleWarnings(SCHEMA.modules[state.step]);
    let box = document.querySelector('.warnbox');
    if (!warns.length) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.className = 'warnbox';
      const body = document.querySelector('.modbody');
      if (!body || !body.parentNode) return;
      body.parentNode.insertBefore(box, body.nextSibling);
    }
    box.innerHTML = warns.map((w) => `<div>${esc(w)}</div>`).join('');
  }

  function refreshDerived() {
    const calc = document.querySelector('.calc');
    if (calc) calc.outerHTML = renderFallowAge();
    const count = document.querySelector('.vinecount');
    if (count) {
      const n = EXPORTER.realVines(state.current).length;
      count.textContent = `${n} vine${n === 1 ? '' : 's'} on this plot`;
    }
    refreshWarnings();
  }

  function renderModule(preserveScroll) {
    state.view = 'module';
    const y = preserveScroll ? window.scrollY : 0;
    const mods = SCHEMA.modules;
    if (state.step >= mods.length) state.step = mods.length - 1;
    const mod = mods[state.step];
    const body = mod.fields.map(renderField).join('');
    const warns = moduleWarnings(mod);
    const warnHtml = warns.length
      ? `<div class="warnbox">${warns.map((w) => `<div>${esc(w)}</div>`).join('')}</div>` : '';
    const last = state.step === mods.length - 1;
    $app().innerHTML = header() + `
      <div class="screen">
        ${stepper()}
        <h2>${esc(mod.title)}</h2>
        <div class="modbody">${body}</div>
        ${warnHtml}
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
    const cols = EXPORTER.buildPlotColumns();
    const rowsHtml = cols.map((c) => {
      const v = EXPORTER.plotValue(r, c, true);
      if (v === '' || v == null) return '';
      return `<tr><td class="mono small">${esc(c.name)}</td><td>${esc(v)}</td></tr>`;
    }).filter(Boolean).join('');

    const vines = EXPORTER.realVines(r);
    const vineHtml = vines.length ? `
      <h3>Vines (${vines.length})</h3>
      <table class="review"><tbody>${vines.map((v, i) => {
        const signs = CONFIG.vineSigns
          .filter((s) => v[s.key] === 'yes')
          .map((s) => s.label + (v[s.key + '_count'] ? ` (${v[s.key + '_count']})` : ''))
          .join(', ') || 'none seen';
        const sp = v.species && v.species !== 'unknown'
          ? (CONFIG.options.birdwing_species.find((x) => x.code === v.species) || {}).label : '';
        const tree = v.host_tree === 'other' ? v.host_tree_other : v.host_tree;
        return `<tr><td class="mono small">Vine ${i + 1}</td><td>${esc(tree || '(tree not named)')}${v.dbh_cm ? ` · DBH ${esc(v.dbh_cm)} cm` : ''}<br>
          <span class="small">${esc(signs)}${sp ? ' · ' + esc(sp) : ''}</span></td></tr>`;
      }).join('')}</tbody></table>` : '';

    const flags = completeWarnings();
    const flagHtml = flags.length
      ? `<div class="review-consent miss">Check: ${esc(flags.join(' · '))}</div>` : '';

    const consentOk = r.consent_given === 'yes';
    $app().innerHTML = header() + `
      <div class="screen">
        <h2>Review — ${esc(r.plot_code || '(no code)')}</h2>
        <div class="review-consent ${consentOk ? 'ok' : 'miss'}">Consent recorded: ${consentOk ? 'YES' : 'NOT RECORDED'}</div>
        ${flagHtml}
        <div class="thanks">
          <div class="q">Before you finish — read aloud:</div>
          <div>${esc(CONFIG.thankYouScript)}</div>
        </div>
        <div class="help">Only answered fields are shown${rowsHtml ? '' : ' (none yet)'}.</div>
        <table class="review"><tbody>${rowsHtml}</tbody></table>
        ${vineHtml}
        <div class="navbtns">
          <button class="btn" data-action="back-to-form">Back to edit</button>
          <button class="btn primary" data-action="complete">Complete plot</button>
        </div>
      </div>`;
  }

  // --- First-run surveyor setup -------------------------------------------
  function renderSurveyorSetup() {
    state.view = 'setup';
    $app().innerHTML = `
      <div class="screen setup">
        <h1>MCA Aristolochia Survey</h1>
        <p>Before you start, enter your name or ID. It is stored on this device and recorded with each plot.</p>
        <input class="txt" id="setup-name" type="text" placeholder="e.g. Jane K. or SUR-01" value="${esc(surveyorId())}">
        <button class="btn primary big" data-action="save-surveyor">Save and continue</button>
      </div>`;
  }

  // --- Event handling ------------------------------------------------------
  function vineAt(idx) {
    const list = vineList();
    if (!list[idx]) list[idx] = SCHEMA.emptyVine();
    return list[idx];
  }

  function onChange(e) {
    const t = e.target;
    // Vine sub-record edits
    if (t.dataset && t.dataset.vine) {
      const idx = parseInt(t.dataset.idx, 10);
      const key = t.dataset.vine;
      const v = vineAt(idx);
      v[key] = t.value;
      // Clearing a sign to "No" drops a count that would otherwise contradict it.
      const sign = CONFIG.vineSigns.find((s) => s.key === key);
      if (sign && sign.counted && t.value !== 'yes') v[key + '_count'] = '';
      save();
      if (state.view === 'module') {
        // Radio/select choices reveal or hide fields, so they need the section
        // rebuilt; a text or number edit only changes the derived readouts.
        if (t.type === 'radio' || t.tagName === 'SELECT') renderModule(true);
        else refreshDerived();
      }
      return;
    }
    if (!t.dataset || !t.dataset.field) return;
    const field = t.dataset.field;
    if (t.type === 'checkbox') {
      setData(field, t.checked);
    } else {
      setData(field, t.value);
    }
    if (state.view !== 'module') return;
    // A radio or dropdown choice can gate other fields, so rebuild the section.
    // A text/number edit does not — refresh only the derived readouts, or
    // rebuild if this particular field happens to gate something.
    if (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT'
      || triggerFields(SCHEMA.modules[state.step]).has(field)) {
      renderModule(true);
    } else {
      refreshDerived();
    }
  }

  function onInput(e) {
    const t = e.target;
    // Live-save typing without re-rendering (keeps focus). Debounced; the
    // 'change' event on blur does the final save and re-render.
    if (!t.dataset) return;
    if (t.dataset.vine) {
      if (t.type === 'text' || t.type === 'number' || t.tagName === 'TEXTAREA') {
        vineAt(parseInt(t.dataset.idx, 10))[t.dataset.vine] = t.value;
        saveDebounced();
      }
      return;
    }
    if (!t.dataset.field) return;
    if (t.type === 'text' || t.type === 'number' || t.tagName === 'TEXTAREA') {
      state.current.data[t.dataset.field] = t.value;
      saveDebounced();
    }
  }

  async function onClick(e) {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const action = a.dataset.action;

    switch (action) {
      case 'save-surveyor': {
        const v = document.getElementById('setup-name').value.trim();
        if (!v) { alert('Please enter a name or ID.'); return; }
        localStorage.setItem(LS.surveyor, v);
        renderHome();
        return;
      }
      case 'change-surveyor': renderSurveyorSetup(); return;

      case 'new': renderConsent(); return;
      case 'consent-decline': renderHome(); return; // no record saved, no code used
      case 'consent-give': {
        const box = document.getElementById('consent-check');
        if (!box || !box.checked) { alert('Please tick the consent box to confirm the farmer agreed.'); return; }
        state.current = newPlot();
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
        if (!Array.isArray(rec.data.vines)) rec.data.vines = [];
        state.current = rec;
        state.step = 0;
        renderModule();
        return;
      }
      case 'delete': {
        const rec = await DB.get(a.dataset.id);
        const label = (rec && rec.plot_code) || 'this plot';
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
        await DB.remove(a.dataset.id);
        renderHome();
        return;
      }
      case 'gps-retry': captureGPS(); return;

      case 'vine-add': {
        vineList().push(SCHEMA.emptyVine());
        save();
        renderModule(true);
        return;
      }
      case 'vine-remove': {
        const idx = parseInt(a.dataset.idx, 10);
        const list = vineList();
        if (EXPORTER.vineHasContent(list[idx]) && !confirm(`Remove vine ${idx + 1}?`)) return;
        list.splice(idx, 1);
        save();
        renderModule(true);
        return;
      }

      case 'goto-step': state.step = parseInt(a.dataset.step, 10); renderModule(); return;
      case 'prev':
        if (state.step === 0) { state.current = null; renderHome(); }
        else { state.step -= 1; renderModule(); }
        return;
      case 'next':
        if (state.step === SCHEMA.modules.length - 1) renderReview();
        else { state.step += 1; renderModule(); }
        return;
      case 'back-to-form': renderModule(); return;
      case 'complete': {
        const flags = completeWarnings();
        if (flags.length && !confirm(`This plot still has: ${flags.join('; ')}.\n\nComplete it anyway?`)) return;
        state.current.plot_status = 'complete';
        state.current.completed_at = new Date().toISOString();
        await DB.put(state.current);
        state.current = null;
        renderHome();
        return;
      }

      case 'send-today':     return doSend({ scope: 'today' });
      case 'send-pending':   return doSend({ scope: 'pending' });
      case 'export-today':   return doExport({ scope: 'today' });
      case 'export-pending': return doExport({ scope: 'pending' });
      case 'export-all':     return doExport({ scope: 'all' });
      case 'export-anon':    return doExport({ scope: 'all', includeName: false });
      case 'export-json':    return doExport({ scope: 'all', kind: 'json' });
    }
  }

  // --- Export --------------------------------------------------------------
  async function markExported(records) {
    const now = new Date().toISOString();
    for (const r of records) {
      r.sync_status = 'exported';
      r.exported_at = now;
      await DB.put(r);
    }
  }

  function scopeRecords(all, scope) {
    const done = exportable(all);
    if (scope === 'today') return done.filter((r) => r.survey_date === todayLocal());
    if (scope === 'pending') return done.filter((r) => r.sync_status !== 'exported');
    return done;
  }

  // Build the day's files once, so Send and Download cannot diverge.
  function buildFiles(records, includeName, stamp) {
    const tag = includeName ? 'named' : 'anon';
    return [
      { name: `mca_aristolochia_plots_${tag}_${stamp}.csv`,
        body: EXPORTER.plotsCSV(records, includeName) },
      { name: `mca_aristolochia_vines_${stamp}.csv`,
        body: EXPORTER.vinesCSV(records) },
    ];
  }

  // One tap: hand both CSVs to the phone's share sheet so they can go straight
  // into Drive. Falls back to downloading them where file sharing is not
  // available (desktop browsers, or the app opened from disk), so the button
  // always does something useful.
  async function doSend(opts) {
    const includeName = opts.includeName !== false;
    const all = await DB.getAll();
    const records = scopeRecords(all, opts.scope);
    if (!records.length) { noRecordsAlert(opts.scope); return; }

    const stamp = opts.scope === 'today' ? todayLocal() : EXPORTER.timestamp();
    const built = buildFiles(records, includeName, stamp);

    try {
      const files = built.map((f) => new File([f.body], f.name, { type: 'text/csv' }));
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: 'MCA Aristolochia Survey',
          text: `${records.length} plot(s) from ${surveyorId() || 'this device'} — save both files into ${CONFIG.driveFolderName}.`,
        });
        await markExported(records);
        if (state.view === 'home') renderHome();
        return;
      }
    } catch (e) {
      // Cancelled by the user → stop, and do not mark anything as exported.
      if (e && e.name === 'AbortError') return;
      // Anything else (unsupported mid-flight) → fall through to downloading.
    }

    await downloadFiles(built);
    await markExported(records);
    if (state.view === 'home') renderHome();
    alert(`Sharing isn’t available on this phone, so ${built.length} files were downloaded instead.\n\nUpload them to ${CONFIG.driveFolderName} from your Downloads folder.`);
  }

  async function downloadFiles(built) {
    for (let i = 0; i < built.length; i++) {
      EXPORTER.download(built[i].name, built[i].body, 'text/csv;charset=utf-8');
      // Browsers drop back-to-back downloads; give each one a beat.
      if (i < built.length - 1) await new Promise((res) => setTimeout(res, 600));
    }
  }

  function noRecordsAlert(scope) {
    alert(scope === 'today'
      ? 'No completed plots for today yet. A plot is exported once you tap “Complete plot”.'
      : 'No completed plots to export yet.');
  }

  async function doExport(opts) {
    const includeName = opts.includeName !== false;
    const all = await DB.getAll();
    const records = scopeRecords(all, opts.scope);
    if (!records.length) { noRecordsAlert(opts.scope); return; }
    // Daily files are named by survey day; anything wider carries a timestamp.
    const stamp = opts.scope === 'today' ? todayLocal() : EXPORTER.timestamp();

    if (opts.kind === 'json') {
      const tag = includeName ? 'named' : 'anon';
      EXPORTER.download(`mca_aristolochia_${tag}_${stamp}.json`,
        EXPORTER.toJSON(records, includeName), 'application/json');
    } else {
      await downloadFiles(buildFiles(records, includeName, stamp));
    }

    await markExported(records);
    if (state.view === 'home') renderHome();
    alert(`Exported ${records.length} plot${records.length === 1 ? '' : 's'}.\n\nNow save the file(s) into the ${CONFIG.driveFolderName} folder in Drive.`);
  }

  // --- Bootstrap -----------------------------------------------------------
  async function init() {
    await DB.open();
    await loadReference();
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('click', onClick);
    if (!surveyorId()) renderSurveyorSetup(); else renderHome();

    // Only register the service worker for the hosted build (http/https). The
    // single-file build opened from disk (file://) is already fully offline.
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
