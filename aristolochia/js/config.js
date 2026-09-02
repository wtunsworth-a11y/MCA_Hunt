/*
 * config.js — single source of truth for the option sets used throughout the
 * MCA Aristolochia Survey PWA.
 *
 * Scope: garden plots (cleared/abandoned history) and the Aristolochia vines
 * found on them, with birdwing (Ornithoptera) occupancy recorded per vine.
 *
 * Zone and Ward lists are NOT here — they load at runtime from the shared
 * ../data/reference.json used by the hunting app, so both instruments stay on
 * one set of codes.
 */

const CONFIG = {
  // Bumped when the instrument/schema changes, written into every record as
  // `app_version` so exports can be traced to the build that produced them.
  appVersion: '1.0.0',

  // Google Drive folder the day's exports are filed into. Shown on the export
  // screen as a tappable link; the app does not upload by itself.
  driveFolderUrl: 'https://drive.google.com/drive/folders/1u-N563F8bNM2p3xLxdjB2oj42teoY-WC',
  driveFolderName: 'Aristolochia Survey Data',

  // Earliest year accepted in the cleared/abandoned year fields. Anything
  // outside [minYear, current year] is flagged on the plot and at review.
  minYear: 1940,

  // --- Host tree pick-list. LEAVE EMPTY to record host tree species as free
  // text (the default until the common set is known from the field). Populate
  // it — e.g. { code: 'ficus', label: 'Ficus sp.' } — and the field becomes a
  // dropdown with an "Other (specify)" escape, with no other code change. ---
  hostTrees: [],

  // --- Garden types. Editable: add, rename or remove freely. `code` is what
  // lands in the CSV, so keep codes stable once collection starts. ---
  gardenTypes: [
    { code: 'mixed_food',   label: 'Mixed food garden' },
    { code: 'kaukau',       label: 'Kaukau / sweet potato' },
    { code: 'taro',         label: 'Taro' },
    { code: 'yam',          label: 'Yam' },
    { code: 'banana',       label: 'Banana' },
    { code: 'sugarcane',    label: 'Sugarcane' },
    { code: 'coffee',       label: 'Coffee' },
    { code: 'cocoa',        label: 'Cocoa' },
    { code: 'betel_nut',    label: 'Betel nut' },
    { code: 'mixed_cash',   label: 'Mixed food and cash crop' },
    { code: 'other',        label: 'Other (specify)' },
  ],

  // --- Forest types, for plots that are forest rather than garden. Editable
  // on the same terms as gardenTypes: `code` lands in the CSV, so keep codes
  // stable once collection starts. ---
  forestTypes: [
    { code: 'primary',        label: 'Primary forest (no record of gardening)' },
    { code: 'old_secondary',  label: 'Old secondary forest (long regrowth)' },
    { code: 'secondary',      label: 'Secondary forest / regrowth' },
    { code: 'riverine',       label: 'Riverine / riparian forest' },
    { code: 'swamp',          label: 'Swamp forest' },
    { code: 'montane',        label: 'Montane forest' },
    { code: 'disturbed',      label: 'Disturbed / logged forest' },
    { code: 'other',          label: 'Other (specify)' },
  ],

  // Reusable option sets referenced by the schema (js/schema.js).
  options: {
    yes_no: [
      { code: 'yes', label: 'Yes' },
      { code: 'no',  label: 'No' },
    ],
    yes_no_notsure: [
      { code: 'yes',      label: 'Yes' },
      { code: 'no',       label: 'No' },
      { code: 'not_sure', label: 'Not sure' },
    ],
    // Decides which of Section B is asked. A forest plot has no clearing year,
    // no abandonment and no fallow age — its age is not determined here.
    plot_type: [
      { code: 'garden', label: 'Garden (in use or in fallow)' },
      { code: 'forest', label: 'Forest' },
    ],
    // Whether the garden has been abandoned yet. Drives the year-abandoned and
    // fallow-age fields: a garden still in use has no fallow age.
    garden_status: [
      { code: 'abandoned',  label: 'Abandoned (in fallow)' },
      { code: 'still_used', label: 'Still being gardened' },
    ],
    // Recorded per vine, "where possible" — an unidentified caterpillar or egg
    // stays `unknown` rather than being forced to a species.
    birdwing_species: [
      { code: 'priamus',    label: 'O. priamus' },
      { code: 'alexandrae', label: 'O. alexandrae' },
      { code: 'other',      label: 'Other / another butterfly' },
      { code: 'unknown',    label: 'Not identified' },
    ],
  },

  // Read aloud before recording a garden. Covers both permission to walk the
  // garden and consent to record the farmer's name and answers. The
  // "[surveyor name]" placeholder is filled in with the name set on the device.
  consentScript:
    'My name is [surveyor name] and I am helping with a survey run by the ' +
    'Managalas and Oro Province Project, part of CIFOR-ICRAF, funded by the ' +
    'European Union.\n\n' +
    'We are looking at gardens and forest across the Managalas Conservation ' +
    'Area — gardens being used now, old ones left to fallow, and forest — and ' +
    'at a vine called Aristolochia that grows in them. It is the plant the ' +
    'large birdwing butterflies lay their eggs on.\n\n' +
    'I am asking your permission to walk over this place — whether it is a ' +
    'garden or forest — and record what is here. I would write down your name, ' +
    'the village, what kind of place it is, and for a garden the year it was ' +
    'cleared and the year it was left. I would take a GPS point. If I find any ' +
    'Aristolochia vines I would record the tree each one is growing on and ' +
    'whether there are caterpillars or eggs on it.\n\n' +
    'Taking part is voluntary. You do not have to answer any question you do not ' +
    'want to, and you can stop at any time. Your answers are grouped with ' +
    'everyone else\u2019s for analysis. This takes about 20 to 30 minutes.\n\n' +
    'Do you agree, and may I record this garden?',

  // Read aloud at the end (shown on the Review screen).
  thankYouScript:
    'Thank you for your time and for letting me record this place. What is ' +
    'written down here, together with the other places in the survey, will ' +
    'inform conservation planning for the Managalas Conservation Area.',

  // The three occupancy observations made on every vine. `key` is the field
  // suffix; the exporter and the renderer both walk this list.
  vineSigns: [
    { key: 'caterpillar', label: 'Caterpillar seen', counted: true },
    { key: 'egg',         label: 'Egg seen',         counted: true },
    { key: 'feeding',     label: 'Signs of leaves eaten', counted: false },
  ],
};

// Loaded from ../data/reference.json at startup (zones + wards), shared with
// the hunting survey so both instruments use one set of codes.
CONFIG.zones = [];
CONFIG.wards = [];

window.CONFIG = CONFIG;
