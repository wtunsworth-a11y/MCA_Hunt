/*
 * schema.js — declarative definition of the interview form, Modules A–I.
 *
 * The renderer in app.js walks SCHEMA to build each screen. The CSV column
 * order lives in export.js, but BOTH sides generate repeated field names
 * (grids, per-category blocks, trip blocks) through the shared NAMES helpers
 * below, so form fields and export columns cannot drift apart.
 *
 * Field-name conventions come straight from Section 4 of the handover.
 */

// --- Shared field-name generators (used by renderer AND exporter) ----------
const NAMES = {
  method: (cat, m) => `c_method_${cat}_${m}`,          // Module C grid
  month: (cat, mo) => `e_month_${cat}_${mo}`,          // Module E grid
  abundance: (cat, life) => `g_abundance_${cat}_${life}`, // Module G grid
  catch: (trip, cat) => `f_${trip}_catch_${cat}`,      // Module F harvest counts
  // Module B per-category block
  bTaken: (cat) => `b_taken_${cat}`,
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
  // Module F trip block (recent / successful)
  fTrip: (trip, key) => `f_${trip}_${key}`,
};

const SCHEMA = {
  NAMES,

  // Resolve an options reference (string key) to [{code,label}].
  resolveOptions(ref) {
    if (Array.isArray(ref)) return ref;
    const o = CONFIG.options[ref];
    if (o) return o;
    switch (ref) {
      case 'ageBands':      return CONFIG.ageBands;
      case 'zones':         return CONFIG.zones;
      case 'wards':         return CONFIG.wards;
      case 'methods':       return CONFIG.methods;
      case 'categories':    return CONFIG.categories;
      case 'abundanceCodes':return CONFIG.abundanceCodes;
      case 'months':        return CONFIG.months;
      case 'lifeStages':    return CONFIG.lifeStages;
      default:              return [];
    }
  },

  // Ordered list of modules. Each `fields` entry is a render descriptor.
  modules: [
    {
      id: 'A', title: 'Module A — Profile',
      fields: [
        { kind: 'profile_meta' },
        { kind: 'text', name: 'resp_name', label: 'Respondent name (optional)',
          help: 'Optional. Stored separately and can be excluded from exports. Not used to make the ID code.' },
        { kind: 'single', name: 'sex', label: 'Sex', options: 'sex' },
        { kind: 'single', name: 'age_band', label: 'Age band', options: 'ageBands' },
        { kind: 'single', name: 'zone', label: 'Zone', options: 'zones', dropdown: true },
        { kind: 'single', name: 'ward', label: 'Ward', options: 'wards', dropdown: true, scopeByZone: true },
        { kind: 'text', name: 'clan', label: 'Clan', help: 'Free text.' },
        { kind: 'activity_grid', label: 'Life-stage activity',
          help: 'How involved in hunting/fishing/gathering at each life stage? Only stages up to your age band are shown.' },
      ],
    },
    {
      id: 'B', title: 'Module B — Target: species categories and use',
      fields: [
        { kind: 'note', text: 'For each category: was it ever taken, and what is it used for? Every category is asked, by design.' },
        { kind: 'per_category',
          taken: { field: NAMES.bTaken, label: 'Taken?', options: 'b_taken' },
          uses: [
            { field: NAMES.bUseFood, label: 'Food' },
            { field: NAMES.bUseBilas, label: 'Bilas' },
            { field: NAMES.bUseCustomary, label: 'Customary/ceremonial' },
            { field: NAMES.bUseSale, label: 'Sale/income' },
          ],
          otherText: { field: NAMES.bUseOther, label: 'Other use (specify)' },
        },
        { kind: 'text', name: 'b_other_category_name',
          label: 'One extra category (if the respondent names one not in the list)',
          help: 'Asked once. Leave blank if none.' },
        { kind: 'single', name: 'b_other_category_taken', label: 'Extra category — taken?',
          options: 'b_taken', showIf: { field: 'b_other_category_name', notEmpty: true } },
        { kind: 'boolean', name: 'b_other_category_use_food', label: 'Extra category — Food',
          showIf: { field: 'b_other_category_name', notEmpty: true } },
        { kind: 'boolean', name: 'b_other_category_use_bilas', label: 'Extra category — Bilas',
          showIf: { field: 'b_other_category_name', notEmpty: true } },
        { kind: 'boolean', name: 'b_other_category_use_customary', label: 'Extra category — Customary',
          showIf: { field: 'b_other_category_name', notEmpty: true } },
        { kind: 'boolean', name: 'b_other_category_use_sale', label: 'Extra category — Sale',
          showIf: { field: 'b_other_category_name', notEmpty: true } },
        { kind: 'text', name: 'b_other_category_use_other', label: 'Extra category — Other use (specify)',
          showIf: { field: 'b_other_category_name', notEmpty: true } },
      ],
    },
    {
      id: 'C', title: 'Module C — Tool: methods',
      fields: [
        { kind: 'note', text: 'Tick every method used for each category.' },
        { kind: 'grid_bool', name: 'c_method', rows: 'categories', cols: 'methods',
          nameFn: NAMES.method },
        { kind: 'single', name: 'c_trip_style', label: 'Typical trip style', options: 'c_trip_style' },
        { kind: 'single', name: 'c_method_changed', label: 'Have the methods you use changed?',
          options: 'yes_no_notsure' },
        { kind: 'multi', name: 'c_method_changed_previous', label: 'Previous method(s) used',
          options: 'methods', showIf: { field: 'c_method_changed', equals: 'yes' } },
        { kind: 'single', name: 'c_usual_company', label: 'Usually hunt/fish/gather…',
          options: 'c_usual_company' },
        { kind: 'single', name: 'c_preferred_method', label: 'Preferred method', options: 'methods' },
        { kind: 'textarea', name: 'c_preferred_method_why', label: 'Why? (record verbatim)',
          help: 'Write the respondent’s words. Do not summarise.' },
      ],
    },
    {
      id: 'D', title: 'Module D — Tenure',
      fields: [
        { kind: 'note', text: 'This module never records WHERE places are — only the kind of tenure.' },
        { kind: 'single', name: 'd_main_area', label: 'Main area used', options: 'd_main_area' },
        { kind: 'text', name: 'd_main_area_other', label: 'Other (specify)',
          showIf: { field: 'd_main_area', equals: 'other' } },
        { kind: 'multi', name: 'd_restricted_places', label: 'Any restricted places?',
          options: 'd_restricted_places' },
        { kind: 'text', name: 'd_restricted_places_other', label: 'Other (specify)',
          showIf: { field: 'd_restricted_places', includes: 'other' } },
      ],
    },
    {
      id: 'E', title: 'Module E — Timing',
      fields: [
        { kind: 'note', text: 'Tick the months each category is typically taken.' },
        { kind: 'grid_bool', name: 'e_month', rows: 'categories', cols: 'months',
          nameFn: NAMES.month },
      ],
    },
    {
      id: 'F', title: 'Module F — Harvest recall',
      fields: [
        { kind: 'single', name: 'f_source', label: 'Most take comes from…', options: 'f_source' },
        { kind: 'trip_block', trip: 'recent', heading: 'Most recent trip' },
        { kind: 'trip_block', trip: 'successful', heading: 'Most successful trip (last 12 months)' },
        { kind: 'note', text: 'Typical pattern (asked once):' },
        { kind: 'single', name: 'f_typical_frequency', label: 'How often, typically?',
          options: 'f_typical_frequency' },
        { kind: 'single', name: 'f_typical_duration', label: 'Typical trip duration',
          options: 'f_typical_duration' },
      ],
    },
    {
      id: 'G', title: 'Module G — Change over time',
      fields: [
        { kind: 'note', text: 'M = more abundant then · S = same · F = fewer then · N = not sure · X = did not take then. Only life stages up to your age band are shown.' },
        { kind: 'grid_single', name: 'g_abundance', rows: 'categories', cols: 'lifeStages',
          ageGated: true, options: 'abundanceCodes', nameFn: NAMES.abundance },
        { kind: 'single', name: 'g_people_change', label: 'Are more or fewer people hunting/fishing/gathering now?',
          options: 'g_people_change' },
        { kind: 'textarea', name: 'g_change_text', label: 'Anything about how things have changed? (verbatim)',
          help: 'Record verbatim. Do not convert time references (e.g. “before the road”) to dates.' },
      ],
    },
    {
      id: 'H', title: 'Module H — Management and rules',
      fields: [
        { kind: 'single', name: 'h_rules_exist', label: 'Are there rules about taking these species?',
          options: 'yes_no_notsure' },
        { kind: 'rules_grid', showIf: { field: 'h_rules_exist', equals: 'yes' } },
        { kind: 'single', name: 'h_who_decides', label: 'Who decides the rules?', options: 'h_who_decides',
          showIf: { field: 'h_rules_exist', equals: 'yes' } },
        { kind: 'text', name: 'h_who_decides_other', label: 'Other (specify)',
          showIf: { field: 'h_who_decides', equals: 'other' } },
        { kind: 'single', name: 'h_rules_changed', label: 'Have the rules changed?', options: 'yes_no_notsure',
          showIf: { field: 'h_rules_exist', equals: 'yes' } },
        { kind: 'textarea', name: 'h_rules_changed_text', label: 'How have they changed?',
          showIf: { field: 'h_rules_changed', equals: 'yes' } },
      ],
    },
    {
      id: 'I', title: 'Module I — Bilas, customary and income use',
      fields: [
        { kind: 'note', text: 'Asked once, across the categories used for bilas/customary/sale.' },
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

  // Field descriptors for one Module F trip block, expanded per trip via NAMES.
  // `when` options differ for successful (adds more_than_year).
  tripBlockFields(trip) {
    return [
      { kind: 'single', name: NAMES.fTrip(trip, 'when'), label: 'When was it?',
        options: trip === 'successful' ? 'f_when_successful' : 'f_when_recent' },
      { kind: 'single', name: NAMES.fTrip(trip, 'duration'), label: 'How long did it take?',
        options: 'f_duration' },
      { kind: 'single', name: NAMES.fTrip(trip, 'style'), label: 'Trip style', options: 'f_trip_style' },
      { kind: 'catch_list', trip: trip, label: 'What was caught? (add a row per category)' },
      { kind: 'single', name: NAMES.fTrip(trip, 'share_eaten'), label: 'Share eaten', options: 'f_share' },
      { kind: 'single', name: NAMES.fTrip(trip, 'share_given'), label: 'Share given away', options: 'f_share' },
      { kind: 'single', name: NAMES.fTrip(trip, 'share_bilas'), label: 'Share used for bilas', options: 'f_share' },
      { kind: 'single', name: NAMES.fTrip(trip, 'share_sold'), label: 'Share sold', options: 'f_share' },
    ];
  },
};

window.SCHEMA = SCHEMA;
window.NAMES = NAMES;
