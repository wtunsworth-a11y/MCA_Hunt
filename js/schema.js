/*
 * schema.js — declarative definition of the interview form, Modules A–I (v2).
 *
 * The renderer in app.js walks SCHEMA to build each screen; export.js generates
 * the CSV column order. Both sides generate repeated field names (grids,
 * per-category blocks, trip blocks) through the shared NAMES helpers, so form
 * fields and export columns cannot drift apart.
 *
 * Scope: hunting only. UI says "age", not "life stage".
 */

// --- Shared field-name generators (used by renderer AND exporter) ----------
const NAMES = {
  method: (cat, m) => `c_method_${cat}_${m}`,          // Module C grid
  month: (cat, mo) => `e_month_${cat}_${mo}`,          // Module E grid
  abundance: (cat, life) => `g_abundance_${cat}_${life}`, // Module G grid
  catch: (trip, cat) => `f_${trip}_catch_${cat}`,      // Module F harvest counts
  // Module B per-category block
  bTaken: (cat) => `b_taken_${cat}`,
  bTakenReason: (cat) => `b_taken_reason_${cat}`,      // free text when "other reasons"
  bUseFood: (cat) => `b_use_food_${cat}`,
  bUseBilas: (cat) => `b_use_bilas_${cat}`,
  bUseCustomary: (cat) => `b_use_customary_${cat}`,
  bUseSale: (cat) => `b_use_sale_${cat}`,
  bUseOther: (cat) => `b_use_other_${cat}`,
  // Module H per-category block
  hFood: (cat) => `h_food_${cat}`,
  hBilas: (cat) => `h_bilas_${cat}`,
  hSale: (cat) => `h_sale_${cat}`,
  hNotes: (cat) => `h_notes_${cat}`,
  // Module A per-age
  activity: (band) => `activity_${band}`,
  season: (band) => `season_${band}`,
  // Module F trip block
  fTrip: (trip, key) => `f_${trip}_${key}`,
};

const SCHEMA = {
  NAMES,

  resolveOptions(ref) {
    if (Array.isArray(ref)) return ref;
    const o = CONFIG.options[ref];
    if (o) return o;
    switch (ref) {
      case 'ageBands':       return CONFIG.ageBands;
      case 'zones':          return CONFIG.zones;
      case 'wards':          return CONFIG.wards;
      case 'methods':        return CONFIG.methods;
      case 'categories':     return CONFIG.categories;
      case 'abundanceCodes': return CONFIG.abundanceCodes;
      case 'months':         return CONFIG.months;
      case 'lifeStages':     return CONFIG.lifeStages;
      default:               return [];
    }
  },

  modules: [
    {
      id: 'A', title: 'Module A — Profile',
      fields: [
        { kind: 'profile_meta' },
        { kind: 'text', name: 'resp_name', label: 'Respondent name (optional)',
          help: 'Optional. Stored separately and can be left blank. Not used to make the ID code.' },
        { kind: 'single', name: 'sex', label: 'Sex', options: 'sex' },
        { kind: 'single', name: 'age_band', label: 'Age', options: 'ageBands' },
        { kind: 'single', name: 'zone', label: 'Zone', options: 'zones', dropdown: true },
        { kind: 'single', name: 'ward', label: 'Ward', options: 'wards', dropdown: true, scopeByZone: true },
        { kind: 'text', name: 'clan', label: 'Clan', help: 'Free text.' },
        { kind: 'activity_grid', label: 'Hunting by age',
          help: 'For each age up to your own, how often did you hunt? If you hunted, was it year-round or mainly one season?' },
      ],
    },
    {
      id: 'B', title: 'Module B — Which animals, and what for',
      fields: [
        { kind: 'note', text: 'Ask about every animal — whether it was EVER hunted, and what it is used for. Also ask if this has changed over time and note it below.' },
        { kind: 'per_category' },
        { kind: 'text', name: 'b_other_category_name',
          label: 'One extra animal (if they name one not in the list)',
          help: 'Asked once. Leave blank if none.' },
        { kind: 'single', name: 'b_other_category_taken', label: 'Extra animal — ever hunted?',
          options: 'b_taken', showIf: { field: 'b_other_category_name', notEmpty: true } },
        { kind: 'boolean', name: 'b_other_category_use_food', label: 'Extra animal — Food',
          showIf: { field: 'b_other_category_taken', equals: 'yes' } },
        { kind: 'boolean', name: 'b_other_category_use_bilas', label: 'Extra animal — Bilas (worn)',
          showIf: { field: 'b_other_category_taken', equals: 'yes' } },
        { kind: 'boolean', name: 'b_other_category_use_customary', label: 'Extra animal — Ceremonial (used)',
          showIf: { field: 'b_other_category_taken', equals: 'yes' } },
        { kind: 'boolean', name: 'b_other_category_use_sale', label: 'Extra animal — Sale',
          showIf: { field: 'b_other_category_taken', equals: 'yes' } },
        { kind: 'text', name: 'b_other_category_use_other', label: 'Extra animal — Other use (specify)',
          showIf: { field: 'b_other_category_taken', equals: 'yes' } },
        { kind: 'textarea', name: 'b_changes_notes',
          label: 'Notes — how has WHAT is hunted / used changed over time?',
          help: 'Prompt the respondent. Record verbatim. No length limit.' },
      ],
    },
    {
      id: 'C', title: 'Module C — Tools',
      fields: [
        { kind: 'note', text: 'Only the animals marked "ever hunted: yes" in Module B are shown. Tick every tool EVER used for each, then note any change over time below.' },
        { kind: 'grid_bool', name: 'c_method', rows: 'categories', cols: 'methods',
          nameFn: NAMES.method, rotateHeaders: true, gateHunted: true },
        { kind: 'single', name: 'c_method_changed', label: 'Have the tools you use changed?',
          options: 'yes_no_notsure' },
        { kind: 'multi', name: 'c_method_changed_previous', label: 'Previous tool(s) used',
          options: 'methods', showIf: { field: 'c_method_changed', equals: 'yes' } },
        { kind: 'single', name: 'c_usual_company', label: 'Usually hunt…', options: 'c_usual_company' },
        { kind: 'single', name: 'c_preferred_method', label: 'Preferred tool', options: 'methods' },
        { kind: 'textarea', name: 'c_preferred_method_why', label: 'Why? (record verbatim)',
          help: 'Write the respondent’s words. Do not summarise.' },
        { kind: 'textarea', name: 'c_changes_notes',
          label: 'Notes — how have the tools changed over time?',
          help: 'Prompt the respondent. Record verbatim. No length limit.' },
      ],
    },
    {
      id: 'D', title: 'Module D — Tenure and limits',
      fields: [
        { kind: 'note', text: 'This module never records WHERE places are — only the kind of tenure and any limits.' },
        { kind: 'single', name: 'd_main_area', label: 'Main area hunted', options: 'd_main_area' },
        { kind: 'text', name: 'd_main_area_other', label: 'Other (specify)',
          showIf: { field: 'd_main_area', equals: 'other' } },
        { kind: 'multi', name: 'd_restricted_places', label: 'Any restricted places?',
          options: 'd_restricted_places' },
        { kind: 'text', name: 'd_restricted_places_other', label: 'Other (specify)',
          showIf: { field: 'd_restricted_places', includes: 'other' } },
        { kind: 'single', name: 'd_seasonal_limits', label: 'Are there seasonal limits on hunting?',
          options: 'yes_no_notsure' },
        { kind: 'text', name: 'd_seasonal_limits_text', label: 'Seasonal limits — note',
          showIf: { field: 'd_seasonal_limits', equals: 'yes' } },
        { kind: 'single', name: 'd_number_limits', label: 'Are there limits on how many can be taken?',
          options: 'yes_no_notsure' },
        { kind: 'text', name: 'd_number_limits_text', label: 'Number limits — note',
          showIf: { field: 'd_number_limits', equals: 'yes' } },
        { kind: 'single', name: 'd_trip_limits', label: 'Are there limits on how many hunting trips can be made?',
          options: 'yes_no_notsure' },
        { kind: 'text', name: 'd_trip_limits_text', label: 'Trip limits — note',
          showIf: { field: 'd_trip_limits', equals: 'yes' } },
      ],
    },
    {
      id: 'E', title: 'Module E — Timing',
      fields: [
        { kind: 'note', text: 'Only the animals marked "ever hunted: yes" in Module B are shown. Tick the months each is typically hunted, then note any change over time below.' },
        { kind: 'grid_bool', name: 'e_month', rows: 'categories', cols: 'months',
          nameFn: NAMES.month, gateHunted: true },
        { kind: 'textarea', name: 'e_changes_notes',
          label: 'Notes — has the timing changed over time?',
          help: 'Prompt the respondent. Record verbatim. No length limit.' },
      ],
    },
    {
      id: 'F', title: 'Module F — Recent hunting',
      fields: [
        { kind: 'note', text: 'These questions are about your hunting THESE DAYS (the last 12 months).' },
        { kind: 'single', name: 'f_source', label: 'Most of what you take comes from…', options: 'f_source' },
        { kind: 'trip_block', trip: 'recent', heading: 'Most recent hunting trip' },
        { kind: 'trip_block', trip: 'successful', heading: 'Most successful trip (last 12 months) — let them decide what “successful” means' },
        { kind: 'note', text: 'Typical pattern these days (asked once):' },
        { kind: 'single', name: 'f_typical_duration', label: 'These days, how long is a typical hunting trip?',
          options: 'f_typical_duration' },
      ],
    },
    {
      id: 'G', title: 'Module G — Change over time',
      fields: [
        { kind: 'note', text: 'Only animals marked "ever hunted: yes" in Module B are shown. M = more abundant then · S = same · F = fewer then · N = not sure · X = did not hunt then. Only ages up to your own are shown.' },
        { kind: 'grid_single', name: 'g_abundance', rows: 'categories', cols: 'lifeStages',
          ageGated: true, options: 'abundanceCodes', nameFn: NAMES.abundance, gateHunted: true },
        { kind: 'single', name: 'g_people_change', label: 'Are more or fewer people hunting now?',
          options: 'g_people_change' },
        { kind: 'textarea', name: 'g_change_text', label: 'Anything about how things have changed? (verbatim)',
          help: 'Record verbatim. Do not convert time references (e.g. “before the road”) to dates.' },
      ],
    },
    {
      id: 'H', title: 'Module H — Management and rules',
      fields: [
        { kind: 'note', text: 'Rules often change the most over time — prompt discussion and use the notes below freely (no length limit).' },
        { kind: 'single', name: 'h_rules_exist', label: 'Are there rules about hunting these animals?',
          options: 'yes_no_notsure' },
        { kind: 'rules_grid', showIf: { field: 'h_rules_exist', equals: 'yes' } },
        { kind: 'single', name: 'h_who_decides', label: 'Who decides the rules?', options: 'h_who_decides',
          showIf: { field: 'h_rules_exist', equals: 'yes' } },
        { kind: 'text', name: 'h_who_decides_other', label: 'Other (specify)',
          showIf: { field: 'h_who_decides', equals: 'other' } },
        { kind: 'single', name: 'h_rules_changed', label: 'Have the rules changed?', options: 'yes_no_notsure',
          showIf: { field: 'h_rules_exist', equals: 'yes' } },
        { kind: 'textarea', name: 'h_rules_changed_text', label: 'How have they changed? (verbatim, no length limit)',
          showIf: { field: 'h_rules_changed', equals: 'yes' } },
      ],
    },
    {
      id: 'I', title: 'Module I — Bilas, ceremonial and income use',
      fields: [
        { kind: 'note', text: 'Asked once, across the animals used for bilas (worn), ceremonial (used: tools, instruments, display) or sale. Bilas = worn; ceremonial = used.' },
        { kind: 'multi', name: 'i_part_used', label: 'Which parts are used?', options: 'i_part_used' },
        { kind: 'text', name: 'i_part_used_other', label: 'Other (specify)',
          showIf: { field: 'i_part_used', includes: 'other' } },
        { kind: 'text', name: 'i_occasion', label: 'On what occasions?' },
        { kind: 'single', name: 'i_who_does', label: 'Who does this?', options: 'i_who_does' },
        { kind: 'text', name: 'i_who_does_other', label: 'Other (specify)',
          showIf: { field: 'i_who_does', equals: 'other' } },
        { kind: 'single', name: 'i_income_importance', label: 'Importance as income',
          options: 'i_income_importance' },
      ],
    },
  ],

  // Field descriptors for one Module F trip block, expanded per trip.
  tripBlockFields(trip) {
    return [
      { kind: 'single', name: NAMES.fTrip(trip, 'when'), label: 'When was it?',
        options: trip === 'successful' ? 'f_when_successful' : 'f_when_recent' },
      { kind: 'single', name: NAMES.fTrip(trip, 'duration'), label: 'How long did it take?',
        options: 'f_duration' },
      { kind: 'single', name: NAMES.fTrip(trip, 'style'), label: 'Trip style', options: 'f_trip_style' },
      { kind: 'catch_list', trip: trip, label: 'What was caught? (add a row per animal)' },
      { kind: 'share_alloc', trip: trip, label: 'Of what was caught, how was it used? (divide into 10 parts)' },
    ];
  },
};

window.SCHEMA = SCHEMA;
window.NAMES = NAMES;
