/*
 * config.js — single source of truth for the fixed reference lists and option
 * sets used throughout the MCA Hunting & Wild Resource Use survey PWA.
 *
 * Per Section 7 of the handover, the species-category and method lists are
 * "pilot-refinable": keep them editable here rather than scattered through the
 * code so a category/method can be added, removed or renamed without a rebuild.
 *
 * Zone and Ward lists are NOT here — they are loaded at runtime from
 * data/reference.json (see 3.3) so the real lists can be dropped in without
 * touching code. This file only holds what Section 4 fixes for v1.
 */

const CONFIG = {
  // Bumped when the instrument/schema changes, written into every record as
  // `app_version` so exports can be traced to the build that produced them.
  appVersion: '1.0.0',

  // --- Fixed species categories (Section 4). Order is the canonical order used
  // for every grid row and every CSV column suffix. Edit here to refine. ---
  categories: [
    { code: 'pigeon',        label: 'Pigeon' },
    { code: 'wallaby',       label: 'Wallaby' },
    { code: 'tree_kangaroo', label: 'Tree kangaroo' },
    { code: 'bandicoot',     label: 'Bandicoot' },
    { code: 'hornbill',      label: 'Hornbill' },
    { code: 'parrot',        label: 'Parrot' },
    { code: 'cuscus',        label: 'Cuscus' },
    { code: 'fish',          label: 'Fish' },
    { code: 'snake',         label: 'Snake' },
    { code: 'bushfowl',      label: 'Bushfowl' },
  ],

  // --- Fixed method codes 1..15 (Section 4). Codes are strings to match the
  // field-name suffixes exactly (c_method_pigeon_1 ... _15). ---
  methods: [
    { code: '1',  label: 'Bow and arrow' },
    { code: '2',  label: 'Spear' },
    { code: '3',  label: 'Trap/snare (vine or bush material)' },
    { code: '4',  label: 'Trap/snare (wire or plastic)' },
    { code: '5',  label: 'Slingshot (handheld)' },
    { code: '6',  label: 'Slingshot (mounted/larger)' },
    { code: '7',  label: 'Hunting dogs' },
    { code: '8',  label: 'Bush knife / hand capture' },
    { code: '9',  label: 'Smoking out burrow or hole' },
    { code: '10', label: 'Line or hook' },
    { code: '11', label: 'Net' },
    { code: '12', label: 'Shotgun (factory-made)' },
    { code: '13', label: 'Shotgun (homemade)' },
    { code: '14', label: 'Spear gun' },
    { code: '15', label: 'Other (specify)' },
  ],

  // Month suffixes for Module E (jan..dec).
  months: [
    { code: 'jan', label: 'Jan' }, { code: 'feb', label: 'Feb' },
    { code: 'mar', label: 'Mar' }, { code: 'apr', label: 'Apr' },
    { code: 'may', label: 'May' }, { code: 'jun', label: 'Jun' },
    { code: 'jul', label: 'Jul' }, { code: 'aug', label: 'Aug' },
    { code: 'sep', label: 'Sep' }, { code: 'oct', label: 'Oct' },
    { code: 'nov', label: 'Nov' }, { code: 'dec', label: 'Dec' },
  ],

  // Life stages, used by Module A activity grid and Module G abundance grid.
  // `minBand` is the earliest age_band at which this life stage becomes
  // relevant — used to grey out rows/columns beyond the respondent's age band.
  lifeStages: [
    { code: 'under_25', label: 'Under 25' },
    { code: '25_39',    label: '25–39' },
    { code: '40_59',    label: '40–59' },
    { code: '60_plus',  label: '60+' },
  ],

  ageBands: [
    { code: 'under_25', label: 'Under 25' },
    { code: '25_39',    label: '25–39' },
    { code: '40_59',    label: '40–59' },
    { code: '60_plus',  label: '60+' },
  ],

  // Abundance codes for Module G's grid (M/S/F/N/X).
  abundanceCodes: [
    { code: 'M', label: 'M — more abundant then' },
    { code: 'S', label: 'S — about the same' },
    { code: 'F', label: 'F — fewer then' },
    { code: 'N', label: 'N — not sure' },
    { code: 'X', label: 'X — did not take then' },
  ],

  // Consent script read aloud before an interview begins (3.1 step 2).
  consentScript:
    'My name is [interviewer name] and I am helping with a survey run by the ' +
    'Managalas and Oro Province Project, part of CIFOR-ICRAF, funded by the ' +
    'European Union.\n\n' +
    'We are asking people across the Managalas Conservation Area about hunting, ' +
    'fishing and gathering — what people take, the methods they use, and how ' +
    'these things have changed over time.\n\n' +
    'Taking part is completely voluntary. You do not have to answer any question ' +
    'you do not want to, and you can stop at any time. We will NOT ask where you ' +
    'hunt, fish or gather, and we will not record that anywhere.\n\n' +
    'Your answers are grouped with everyone else’s for analysis. Giving your ' +
    'name is optional. The interview takes about 30 to 45 minutes.\n\n' +
    'Do you agree to take part?',

  // Reusable option sets referenced by the schema (js/schema.js). Kept here so
  // wording changes live in one place.
  options: {
    sex: [
      { code: 'male',   label: 'Male' },
      { code: 'female', label: 'Female' },
    ],
    activity_under_25: [
      { code: 'primary',              label: 'Primary activity' },
      { code: 'occasional',           label: 'Occasional' },
      { code: 'seasonal',             label: 'Seasonal' },
      { code: 'none',                 label: 'None' },
      { code: 'too_young_to_recall',  label: 'Too young to recall' },
    ],
    activity_other: [
      { code: 'primary',    label: 'Primary activity' },
      { code: 'occasional', label: 'Occasional' },
      { code: 'seasonal',   label: 'Seasonal' },
      { code: 'none',       label: 'None' },
    ],
    b_taken: [
      { code: 'yes',              label: 'Yes' },
      { code: 'used_to_not_now',  label: 'No, used to but not now' },
      { code: 'never_but_knows',  label: 'Never personally, but knows of it' },
    ],
    c_trip_style: [
      { code: 'targeted',              label: 'Targeted' },
      { code: 'general_opportunistic', label: 'General / opportunistic' },
      { code: 'half_and_half',         label: 'Half and half' },
    ],
    yes_no_notsure: [
      { code: 'yes',      label: 'Yes' },
      { code: 'no',       label: 'No' },
      { code: 'not_sure', label: 'Not sure' },
    ],
    c_usual_company: [
      { code: 'alone',       label: 'Alone' },
      { code: 'with_others', label: 'With others' },
      { code: 'depends',     label: 'Depends' },
    ],
    d_main_area: [
      { code: 'own_clan_only',        label: 'Own clan land only' },
      { code: 'own_plus_permission',  label: 'Own clan + others with permission' },
      { code: 'own_plus_shared_open', label: 'Own clan + shared/open areas' },
      { code: 'other',                label: 'Other' },
    ],
    d_restricted_places: [
      { code: 'tambu_sacred',             label: 'Tambu / sacred places' },
      { code: 'clan_no_take_not_sacred',  label: 'Clan no-take areas (not sacred)' },
      { code: 'none',                     label: 'None' },
      { code: 'other',                    label: 'Other' },
    ],
    f_source: [
      { code: 'mostly_dedicated',  label: 'Mostly dedicated hunting/fishing/gathering trips' },
      { code: 'mostly_incidental', label: 'Mostly incidental (while doing other things)' },
      { code: 'half_and_half',     label: 'Half and half' },
    ],
    f_when_recent: [
      { code: 'today_yesterday', label: 'Today or yesterday' },
      { code: 'this_week',       label: 'This week' },
      { code: 'this_month',      label: 'This month' },
      { code: 'more_than_month', label: 'More than a month ago' },
    ],
    // "successful" adds the more_than_year option.
    f_when_successful: [
      { code: 'today_yesterday', label: 'Today or yesterday' },
      { code: 'this_week',       label: 'This week' },
      { code: 'this_month',      label: 'This month' },
      { code: 'more_than_month', label: 'More than a month ago' },
      { code: 'more_than_year',  label: 'More than a year ago' },
    ],
    f_duration: [
      { code: 'under_2h',                  label: 'Under 2 hours' },
      { code: '2_6h',                      label: '2–6 hours' },
      { code: 'more_than_6h_same_day',     label: 'More than 6 hours, same day' },
      { code: 'overnight_one_night',       label: 'Overnight (one night)' },
      { code: 'longer_than_one_night',     label: 'Longer than one night' },
    ],
    f_typical_duration: [
      { code: 'under_2h',                  label: 'Under 2 hours' },
      { code: '2_6h',                      label: '2–6 hours' },
      { code: 'more_than_6h_same_day',     label: 'More than 6 hours, same day' },
      { code: 'overnight_one_night',       label: 'Overnight (one night)' },
      { code: 'longer_than_one_night',     label: 'Longer than one night' },
      { code: 'not_applicable_incidental', label: 'Not applicable (incidental)' },
    ],
    f_trip_style: [
      { code: 'targeted', label: 'Targeted' },
      { code: 'general',  label: 'General' },
    ],
    f_share: [
      { code: 'all',        label: 'All' },
      { code: 'most',       label: 'Most' },
      { code: 'about_half', label: 'About half' },
      { code: 'small_part', label: 'Small part' },
      { code: 'none',       label: 'None' },
    ],
    f_typical_frequency: [
      { code: 'most_days',                 label: 'Most days' },
      { code: 'few_times_week',            label: 'A few times a week' },
      { code: 'about_weekly',              label: 'About weekly' },
      { code: 'few_times_month',           label: 'A few times a month' },
      { code: 'less_often',                label: 'Less often' },
      { code: 'not_applicable_incidental', label: 'Not applicable (incidental)' },
    ],
    g_people_change: [
      { code: 'more_now',   label: 'More people now' },
      { code: 'about_same', label: 'About the same' },
      { code: 'fewer_now',  label: 'Fewer people now' },
      { code: 'not_sure',   label: 'Not sure' },
    ],
    h_rule_score: [
      { code: '0', label: '0 — Allowed' },
      { code: '1', label: '1 — Allowed with conditions' },
      { code: '2', label: '2 — Not allowed' },
    ],
    h_who_decides: [
      { code: 'clan_leaders',          label: 'Clan leaders' },
      { code: 'whole_clan_consensus',  label: 'Whole clan (consensus)' },
      { code: 'camc_mcf',              label: 'CAMC / MCF' },
      { code: 'other',                 label: 'Other' },
    ],
    i_part_used: [
      { code: 'feathers',     label: 'Feathers' },
      { code: 'skin_fur',     label: 'Skin / fur' },
      { code: 'teeth_claws',  label: 'Teeth / claws' },
      { code: 'shell',        label: 'Shell' },
      { code: 'whole_animal', label: 'Whole animal' },
      { code: 'other',        label: 'Other' },
    ],
    i_who_does: [
      { code: 'anyone_in_clan',      label: 'Anyone in the clan' },
      { code: 'particular_families', label: 'Particular families' },
      { code: 'particular_role',     label: 'A particular role/person' },
      { code: 'other',               label: 'Other' },
    ],
    i_income_importance: [
      { code: 'not_a_source',      label: 'Not a source of income' },
      { code: 'small_occasional',  label: 'Small / occasional' },
      { code: 'regular_minor',     label: 'Regular but minor' },
      { code: 'important_regular', label: 'Important and regular' },
    ],
  },
};

// Helper: given an age_band code, return the set of life-stage codes that are
// enterable (up to and including that band). Used by Module A and G (3.4).
CONFIG.enterableLifeStages = function (ageBand) {
  const order = ['under_25', '25_39', '40_59', '60_plus'];
  const idx = order.indexOf(ageBand);
  if (idx < 0) return order.slice(); // unknown/blank age band → allow all
  return order.slice(0, idx + 1);
};

// Loaded from data/reference.json at startup (zones + wards). Populated by
// app.js; kept on CONFIG so the rest of the app reads lists from one place.
CONFIG.zones = [];
CONFIG.wards = [];

window.CONFIG = CONFIG;
