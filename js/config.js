/*
 * config.js — single source of truth for the fixed reference lists and option
 * sets used throughout the MCA Hunting Survey PWA.
 *
 * Scope: HUNTING (the targeted taking of animals) plus a short FISHING section
 * (Module J). Gathering is out of scope. The species-category and method lists
 * are pilot-refinable: keep them editable here so a category/method can be
 * added, renamed or removed without a rebuild.
 *
 * Zone and Ward lists are NOT here — they load at runtime from
 * data/reference.json so the real lists can be dropped in without touching code.
 */

const CONFIG = {
  // Bumped when the instrument/schema changes, written into every record as
  // `app_version` so exports can be traced to the build that produced them.
  appVersion: '2.4.0',

  // --- Fixed species categories. Order is the canonical order used for every
  // grid row and every CSV column suffix. Edit here to refine. ---
  categories: [
    { code: 'pigeon',        label: 'Pigeon' },
    { code: 'wallaby',       label: 'Wallaby' },
    { code: 'tree_kangaroo', label: 'Tree kangaroo' },
    { code: 'bandicoot',     label: 'Bandicoot' },
    { code: 'hornbill',      label: 'Hornbill' },
    { code: 'parrot',        label: 'Parrot' },
    { code: 'cuscus',        label: 'Cuscus' },
    { code: 'bats',          label: 'Bats' },
    { code: 'snake',         label: 'Snake' },
    { code: 'bushfowl',      label: 'Bushfowl' },
    { code: 'cassowary',     label: 'Cassowary' },
    { code: 'wild_pig',      label: 'Wild pig' },
  ],

  // --- Hunting tools/methods (1..20). Codes are strings to match the field-name
  // suffixes exactly (c_method_pigeon_1 ... _20). ---
  methods: [
    { code: '1',  label: 'Bow and arrow' },
    { code: '2',  label: 'Spear' },
    { code: '3',  label: 'Trap/snare (vine or bush material)' },
    { code: '4',  label: 'Trap/snare (wire or plastic)' },
    { code: '5',  label: 'Slingshot (handheld)' },
    { code: '6',  label: 'Slingshot (mounted/larger)' },
    { code: '7',  label: 'Hunting dogs' },
    { code: '8',  label: 'Bush knife' },
    { code: '9',  label: 'Hand capture' },
    { code: '10', label: 'Smoking out burrow or hole' },
    { code: '11', label: 'Burn grass' },
    { code: '12', label: 'Cut down tree' },
    { code: '13', label: 'Glue' },
    { code: '14', label: 'Net' },
    { code: '15', label: 'Shotgun (factory-made)' },
    { code: '16', label: 'Shotgun (homemade)' },
    { code: '17', label: 'Spear gun' },
    { code: '18', label: 'Pitfall trap' },
    { code: '19', label: 'Axe' },
    { code: '20', label: 'Other (specify)' },
  ],

  // --- Module J (Fishing) — a simple, separate section. Edit freely. ---
  fishTargets: [
    { code: 'fish',      label: 'Fish' },
    { code: 'eel',       label: 'Eel' },
    { code: 'prawn',     label: 'Prawn / shrimp' },
    { code: 'crab',      label: 'Crab' },
    { code: 'shellfish', label: 'Shellfish / mussels' },
    { code: 'frog',      label: 'Frog' },
    { code: 'turtle',    label: 'Turtle' },
    { code: 'other',     label: 'Other' },
  ],
  fishTools: [
    { code: 'hook_line',          label: 'Hook and line' },
    { code: 'net',                label: 'Net' },
    { code: 'mosquito_net',       label: 'Mosquito net' },
    { code: 'spear',              label: 'Spear / harpoon' },
    { code: 'spear_gun',          label: 'Spear gun' },
    { code: 'diving_hand',        label: 'Diving / hand collection' },
    { code: 'trap_weir',          label: 'Fish trap / weir' },
    { code: 'bow',                label: 'Bow and arrow' },
    { code: 'poison_traditional', label: 'Traditional plant poison' },
    { code: 'poison_shop',        label: 'Shop/store poison (chemicals, bleach)' },
    { code: 'dynamite',           label: 'Dynamite / explosives' },
    { code: 'other',              label: 'Other' },
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

  // Age bands, used by Module A (activity by age) and Module G (abundance).
  // `code`s are kept for the data schema; the UI calls them "age", not
  // "life stage".
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
    { code: 'X', label: 'X — did not hunt then' },
  ],

  // Consent script read aloud before an interview begins.
  consentScript:
    'My name is [interviewer name] and I am helping with a survey run by the ' +
    'Managalas and Oro Province Project, part of CIFOR-ICRAF, funded by the ' +
    'European Union.\n\n' +
    'We are asking people across the Managalas Conservation Area about hunting ' +
    'and fishing — what animals and fish people take, the tools they use, and ' +
    'how these things have changed over time.\n\n' +
    'Taking part is completely voluntary. You do not have to answer any question ' +
    'you do not want to, and you can stop at any time. We will NOT record where ' +
    'you hunt. For fishing, we note only the name of the main river you use.\n\n' +
    'Your answers are grouped with everyone else’s for analysis. Giving your ' +
    'name is optional. The interview takes about 30 to 45 minutes.\n\n' +
    'Do you agree to take part?',

  // Read aloud at the end of the interview (shown on the Review screen).
  thankYouScript:
    'Thank you very much for your time and for sharing your knowledge. Your ' +
    'answers, together with everyone else’s, will help inform conservation ' +
    'planning for the Managalas Conservation Area.',

  // Reusable option sets referenced by the schema (js/schema.js).
  options: {
    sex: [
      { code: 'male',   label: 'Male' },
      { code: 'female', label: 'Female' },
    ],
    // Gate at the start of the interview — decides which sections are asked.
    activity_type: [
      { code: 'hunt',          label: 'Hunts' },
      { code: 'fish',          label: 'Fishes' },
      { code: 'hunt_and_fish', label: 'Hunts AND fishes' },
    ],
    yes_no: [
      { code: 'yes', label: 'Yes' },
      { code: 'no',  label: 'No' },
    ],
    // Module A — how often the respondent hunted at a given age (frequency,
    // with definitions). Same set for every age band.
    activity: [
      { code: 'regular',    label: 'Regular — more than once a month' },
      { code: 'occasional', label: 'Occasional — 6–12 times a year' },
      { code: 'seldom',     label: 'Seldom — fewer than 6 times a year' },
      { code: 'did_not',    label: 'Did not hunt' },
    ],
    // Module A — seasonality at a given age (asked only if they hunted then).
    season: [
      { code: 'year_round', label: 'Year-round' },
      { code: 'wet',        label: 'Mainly wet season' },
      { code: 'dry',        label: 'Mainly dry season' },
    ],
    // Module B — was this animal ever hunted, and if not, why.
    b_taken: [
      { code: 'yes',                  label: 'Yes' },
      { code: 'not_personally_known', label: 'Not personally, but knows of it' },
      { code: 'never_saw_it',         label: 'Never saw it' },
      { code: 'other_reasons',        label: 'Didn’t hunt it, for other reasons' },
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
      { code: 'mostly_dedicated',  label: 'Mostly dedicated hunting trips' },
      { code: 'mostly_incidental', label: 'Mostly incidental (while doing other things)' },
      { code: 'half_and_half',     label: 'Half and half' },
    ],
    f_when_recent: [
      { code: 'today_yesterday', label: 'Today or yesterday' },
      { code: 'this_week',       label: 'This week' },
      { code: 'this_month',      label: 'This month' },
      { code: 'more_than_month', label: 'More than a month ago' },
    ],
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
    // Reworded: present-day typical trip, with a "no longer hunt" escape.
    f_typical_duration: [
      { code: 'under_2h',              label: 'Under 2 hours' },
      { code: '2_6h',                  label: '2–6 hours' },
      { code: 'more_than_6h_same_day', label: 'More than 6 hours, same day' },
      { code: 'overnight_one_night',   label: 'Overnight (one night)' },
      { code: 'longer_than_one_night', label: 'Longer than one night' },
      { code: 'no_longer_hunt',        label: 'I no longer hunt / not applicable' },
    ],
    f_trip_style: [
      { code: 'targeted', label: 'Targeted' },
      { code: 'general',  label: 'General' },
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

  // The four "use" purposes in Module B (worn vs used definitions per feedback).
  useTypes: [
    { key: 'food',      field: (c) => `b_use_food_${c}`,      label: 'Food' },
    { key: 'bilas',     field: (c) => `b_use_bilas_${c}`,     label: 'Bilas (worn)' },
    { key: 'customary', field: (c) => `b_use_customary_${c}`, label: 'Ceremonial (used: tools, instruments, display)' },
    { key: 'sale',      field: (c) => `b_use_sale_${c}`,      label: 'Sale / income' },
  ],

  // The four "shares" in Module F, allocated as parts out of 10.
  shareUses: [
    { key: 'eaten', label: 'Eaten' },
    { key: 'given', label: 'Given away' },
    { key: 'bilas', label: 'Bilas / ceremonial' },
    { key: 'sold',  label: 'Sold' },
  ],
  shareTotal: 10,
};

// Helper: given an age_band code, return the age codes enterable up to and
// including that band (Modules A and G).
CONFIG.enterableLifeStages = function (ageBand) {
  const order = ['under_25', '25_39', '40_59', '60_plus'];
  const idx = order.indexOf(ageBand);
  if (idx < 0) return order.slice();
  return order.slice(0, idx + 1);
};

// Loaded from data/reference.json at startup (zones + wards).
CONFIG.zones = [];
CONFIG.wards = [];

window.CONFIG = CONFIG;
