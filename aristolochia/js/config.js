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
