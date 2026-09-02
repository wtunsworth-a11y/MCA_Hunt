/*
 * schema.js — declarative definition of the plot form, Sections A–C.
 *
 * The renderer in app.js walks SCHEMA to build each screen; export.js generates
 * the CSV column order from the same field names, so the form and the export
 * cannot drift apart.
 *
 * Structure: a plot record carries the flat fields below plus `data.vines`, an
 * ordered list of vine observations (one object per vine) whose keys are listed
 * in VINE_FIELDS. Vines export to their own CSV, one row per vine.
 */

// --- Vine sub-record: the ordered key list shared by renderer and exporter.
// `count` keys only apply where CONFIG.vineSigns marks the sign as counted.
const VINE_FIELDS = (function () {
  const f = ['host_tree', 'host_tree_other', 'dbh_cm', 'vine_origin'];
  CONFIG.vineSigns.forEach((s) => {
    f.push(s.key);
    if (s.counted) f.push(s.key + '_count');
    if (s.origin) f.push(s.origin.field);   // follow-up, asked only on "yes"
  });
  f.push('species', 'notes');
  return f;
})();

function emptyVine() {
  const v = {};
  VINE_FIELDS.forEach((k) => { v[k] = ''; });
  return v;
}

// --- Derived values. Computed on read, never stored, so they cannot go stale
// as the year rolls over. Both are exported as their own columns. ---
const DERIVED = {
  // Years since the garden was abandoned, to today. Blank while still gardened,
  // and blank for a forest plot — a forest's age is not determined here.
  fallowAge(data) {
    if (data.plot_type === 'forest') return '';
    if (data.garden_status !== 'abandoned') return '';
    const y = parseInt(data.year_abandoned, 10);
    if (!y) return '';
    const now = new Date().getFullYear();
    const age = now - y;
    return age < 0 ? '' : String(age);
  },
  // Years the garden was under cultivation (cleared -> abandoned).
  cultivationYears(data) {
    if (data.plot_type === 'forest') return '';
    const c = parseInt(data.year_cleared, 10);
    const a = parseInt(data.year_abandoned, 10);
    if (!c || !a) return '';
    const n = a - c;
    return n < 0 ? '' : String(n);
  },
};

// Fields owned by each branch of the plot_type gate. When the gate changes, the
// other branch's answers are cleared so a forest plot cannot export a clearing
// year, nor a garden plot a forest type.
const BRANCH_FIELDS = {
  garden: ['garden_type', 'garden_type_other', 'garden_description',
           'year_cleared', 'garden_status', 'year_abandoned'],
  forest: ['forest_type', 'forest_type_other', 'forest_description'],
};

const SCHEMA = {
  VINE_FIELDS,
  BRANCH_FIELDS,
  emptyVine,
  DERIVED,

  resolveOptions(ref) {
    if (Array.isArray(ref)) return ref;
    const o = CONFIG.options[ref];
    if (o) return o;
    switch (ref) {
      case 'zones':       return CONFIG.zones;
      case 'wards':       return CONFIG.wards;
      case 'gardenTypes': return CONFIG.gardenTypes;
      case 'forestTypes': return CONFIG.forestTypes;
      case 'hostTrees':   return CONFIG.hostTrees;
      default:            return [];
    }
  },

  modules: [
    {
      id: 'A', title: 'Section A — Plot and farmer',
      fields: [
        { kind: 'plot_meta' },
        { kind: 'text', name: 'farmer_name', label: 'Farmer’s name',
          help: 'Stored separately from the rest of the record and can be left out of an export.' },
        { kind: 'text', name: 'village', label: 'Village' },
        { kind: 'single', name: 'zone', label: 'Zone', options: 'zones', dropdown: true },
        { kind: 'single', name: 'ward', label: 'Ward', options: 'wards', dropdown: true, scopeByZone: true },
        { kind: 'text', name: 'plot_notes', label: 'Notes on the plot (optional)', multiline: true },
      ],
    },
    {
      id: 'B', title: 'Section B — Garden or forest',
      fields: [
        { kind: 'single', name: 'plot_type', label: 'Is this plot a garden or forest?',
          options: 'plot_type',
          help: 'A forest plot is not asked for a clearing year — its age is not determined here.' },

        // --- Garden branch ---
        { kind: 'single', name: 'garden_type', label: 'Garden type', options: 'gardenTypes', dropdown: true,
          showIf: { field: 'plot_type', equals: 'garden' } },
        { kind: 'text', name: 'garden_type_other', label: 'Other garden type (specify)',
          showIf: [{ field: 'plot_type', equals: 'garden' }, { field: 'garden_type', equals: 'other' }] },
        { kind: 'text', name: 'garden_description', label: 'Garden description', multiline: true,
          help: 'What was grown, how it looks now, regrowth stage.',
          showIf: { field: 'plot_type', equals: 'garden' } },
        { kind: 'year', name: 'year_cleared', label: 'Year cleared',
          help: 'The year the forest or fallow was cut to make this garden.',
          showIf: { field: 'plot_type', equals: 'garden' } },
        { kind: 'single', name: 'garden_status', label: 'Is the garden still being gardened?',
          options: 'garden_status',
          showIf: { field: 'plot_type', equals: 'garden' } },
        { kind: 'year', name: 'year_abandoned', label: 'Year abandoned',
          showIf: [{ field: 'plot_type', equals: 'garden' }, { field: 'garden_status', equals: 'abandoned' }] },

        // --- Forest branch ---
        { kind: 'single', name: 'forest_type', label: 'Forest type', options: 'forestTypes', dropdown: true,
          showIf: { field: 'plot_type', equals: 'forest' } },
        { kind: 'text', name: 'forest_type_other', label: 'Other forest type (specify)',
          showIf: [{ field: 'plot_type', equals: 'forest' }, { field: 'forest_type', equals: 'other' }] },
        { kind: 'text', name: 'forest_description', label: 'Forest description', multiline: true,
          help: 'Canopy, understorey, any sign of past gardening. Note an age only if someone actually knows it.',
          showIf: { field: 'plot_type', equals: 'forest' } },

        { kind: 'fallow_age' },
      ],
    },
    {
      id: 'C', title: 'Section C — Aristolochia',
      fields: [
        { kind: 'single', name: 'aristolochia_present', label: 'Aristolochia present on this plot?',
          options: 'yes_no' },
        { kind: 'note', text: 'Record every vine found. For each one: the tree it is climbing, that tree’s DBH, and whether there is a caterpillar, an egg, or signs of leaves being eaten. Identify the butterfly only where you can — leave it as “Not identified” otherwise.',
          showIf: { field: 'aristolochia_present', equals: 'yes' } },
        { kind: 'vine_list', showIf: { field: 'aristolochia_present', equals: 'yes' } },
      ],
    },
  ],
};

window.SCHEMA = SCHEMA;
window.VINE_FIELDS = VINE_FIELDS;
