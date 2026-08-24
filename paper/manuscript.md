# [Working title — to settle once framing is fixed]

*Candidate: "Hunting and fishing in a new community conservation area: a knowledge-and-practice baseline from the Managalas Plateau, Papua New Guinea"*

**Authors:** [TO CONFIRM — names, affiliations, corresponding author, ORCIDs]
**Target journal:** specialist conservation (e.g. *Oryx*, *Conservation Science and Practice*, *Pacific Conservation Biology*) — IMRaD, ~4,000–6,000 words.

> Status key: **[VERIFIED]** = read in full and checked · **[SEARCH-ONLY]** = found via web search, full text NOT verified from this environment, needs author check · **[NEEDS REF]** = claim awaiting a source · **[TODO]** = to write/fill.

---

## Abstract
[TODO — draft last, once framing and the core results are fixed. ~250 words, structured: context / aim / methods / key findings / implication.]

---

## 1. Introduction

*(Framing deliberately left open — see the four candidate emphases in the working notes. The paragraphs below are written so any of them can become the lead argument without rewriting the section.)*

- **Para 1 — Subsistence hunting and biodiversity in New Guinea.** Wild meat is central to rural livelihoods and protein across New Guinea; the region holds exceptional endemism; subsistence hunting has coexisted with that biodiversity over long time-scales but is changing under population growth, market access, and new technologies. [NEEDS REF — PNG/New Guinea bushmeat & sustainability lit; candidates via search below]
- **Para 2 — When subsistence hunting stops being sustainable.** Drivers of change: shift from traditional to modern weapons (shotguns, air rifles, spear guns), commercialisation, road access, human population increase; large-bodied, slow-reproducing taxa are affected first. [NEEDS REF]
- **Para 3 — Customary regulation of hunting.** Communities across Melanesia have customary practices that bear on what, how, where and when animals are taken (taboo/tambu, tenure, seasonal practice). The **four T's — Target, Tool, Tenure, Timing — is an external comparative framework proposed by Pattiselanno et al. (2024) for describing and comparing such practices across communities; it is an analyst's lens, not an indigenous system.** [VERIFIED — Pattiselanno et al. 2024, *Front. Conserv. Sci.*]
- **Para 4 — Fishing: a documentation gap.** Inland fishing (fish, eels, prawns, crabs, shellfish, frogs) belongs to the same subsistence resource system as hunting, and its destructive methods — fine-mesh and mosquito nets, weirs, and traditional plant poisons — are of direct conservation concern. Peer-reviewed documentation of freshwater subsistence and destructive fishing in Papua New Guinea is, however, sparse: the available literature concerns mainly marine or reef systems, or ichthyotoxic-plant use elsewhere. We state this explicitly as a gap and report our fishing observations as primary data against an effectively empty published baseline. [state the gap; do not pad with off-topic citations]
- **Para 5 — Gap and aim.** Community conservation areas in PNG are being declared faster than the resource-use knowledge needed to manage them is compiled. [minimal MCA context — cite previously published MOPP/MCA work]. **Aim:** to establish a knowledge-and-practice baseline of hunting and fishing across the Managalas Conservation Area, using a standardised interview instrument, to (i) describe what is taken, with which tools, under which customary and tenure arrangements, and when; (ii) record change within living memory; and (iii) provide a repeatable benchmark for management. [TODO — sharpen once framing chosen]

**Literature to source for §1 (search-identified; each to be verified by the author):**
[SEARCH-ONLY, to compile next] PNG/New Guinea subsistence & commercial hunting and sustainability; hunting technology transitions; tree-kangaroo (*Dendrolagus* spp.) and cassowary (*Casuarius* spp.) conservation status; customary taboo and tenure in Melanesian resource management; inland/destructive fishing in Melanesia.

---

## 2. Methods

### 2.1 Study area
The study is set in the Managalas Conservation Area, a community conservation area on the Managalas Plateau, Northern (Oro) Province, Papua New Guinea, declared in 2017, where residents retain customary tenure and continue subsistence use of forest and freshwater resources. [minimal by design — cite previously published MOPP/MCA descriptions rather than re-describe here] The survey is conducted under the Managalas and Oro Province Project (MOPP, CIFOR-ICRAF), with EU funding.

### 2.2 Study design
Cross-sectional survey of active hunters and fishers using a standardised, semi-structured questionnaire administered face-to-face by trained local interviewers. Data collection began in August 2026 and is ongoing. Interviews are recorded on an offline-first digital instrument (a custom progressive web application) running on Android phones; responses are stored on-device and exported as CSV, so no network connection is required in the field.

### 2.3 Instrument
The questionnaire is organised in modules (A–J). It records: respondent profile (sex, age band, zone, ward, clan) and whether the respondent hunts, fishes, or both (a gate that routes fishers directly to the fishing module); self-reported hunting frequency and seasonality recalled at each age band up to the respondent's own age; for each of twelve named animal categories, whether it has ever been hunted and the purposes of use (food, *bilas*/adornment, ceremonial, sale); the tools ever used per animal (twenty method categories); tenure of the main hunting area and any restricted places, and any seasonal, catch-number or trip limits; the months each animal is typically taken; recent hunting effort and catch, and how a catch is divided (eaten / given / *bilas* or ceremonial / sold); relative abundance of each animal recalled at each past age band compared with today; management rules per animal; parts used and occasions for *bilas*, ceremonial and income use; and, for fishing, the main river or water, what is caught, and the methods used (including destructive methods such as nets, weirs and traditional plant poison). Version 2.5.0 of the instrument added an explicit question on hunting motivation and on whether any tools are locally prohibited.

The twelve animal categories are **folk categories** used by respondents (pigeon, wallaby, tree kangaroo, bandicoot, hornbill, parrot, cuscus, bats, snake, bushfowl, cassowary, wild pig) and may each span more than one biological species; they are analysed as ethno-taxa, not species-level identifications. [NEEDS DECISION — whether/how to map to scientific taxa; see questions]

No hunting locations are recorded at any point, by design; the only spatial data captured are the GPS coordinates of the interview setting and, for fishing, the name of the main river.

### 2.4 Sampling
Purposive, community-nominated sampling of active hunters and fishers, with a target of 45 respondents per zone, distributed approximately equally across three age groups (25–39, 40–59, 60+) and including at least 20% women, with additional effort where fishing is prevalent. [Realized sample to be reported in Results once collection is complete.]

### 2.5 Consent and ethics
Before each interview the interviewer reads a standardised consent script describing the study, its voluntary nature, the right to skip questions or stop, and the fact that no hunting locations are recorded; participation proceeds only if the respondent agrees, and consent is recorded with the interview. Names are optional and stored separately from the analysed, anonymised record. [NEEDS — ethics approval body and reference number; any national/provincial research permits. This must be stated for publication.]

### 2.6 Data handling
Each device stores interviews locally and exports a CSV; the respondent identifier carries a per-device code so identifiers do not collide across interviewers working offline. Exports are consolidated by de-duplicating on the interview identifier and aligning columns by name to the current export schema. Survey data are held in project-controlled storage and are not placed in any public repository.

### 2.7 Analysis
Primarily descriptive. Categorical responses are summarised as counts and proportions with their denominators. Change within living memory is examined from the age-band recall of relative abundance (more / same / fewer / not sure / did-not-hunt-then) and from recalled hunting frequency, read as a pseudo-longitudinal signal across age cohorts. Customary limits are organised using the four-T framework (Pattiselanno et al. 2024) as an external comparative scheme. [TODO — specify any tests/among-zone or among-age comparisons once the sample supports them.]

### 2.8 Limitations
Self-report and recall are subject to memory and social-desirability bias; recalled past abundance is a perception, not a census. Sampling is purposive and, in the current data, uneven across zones. Folk categories are not species-level identifications. "Successful trip" is respondent-defined. The instrument changed across versions during early collection, so a few fields are absent from the earliest records. [expand as needed]

---

## 3. Results
[Scaffold — to be filled as the dataset matures. Planned subsections: sample description (who, where, age, sex); what is hunted and for what; tools and the traditional→modern transition; tenure and restricted places; timing and limits; recent effort and catch disposition; change within living memory; fishing (rivers, targets, methods); motivation and tool prohibitions.]

## 4. Discussion
[Scaffold — depends on chosen framing.]

## References
1. Pattiselanno, F., Ziembicki, M., Nasi, R. & Krockenberger, A. (2024). Target, tool, tenure and timing: the four T's limiting the impact of traditional hunting in Indonesian Papua. *Frontiers in Conservation Science*, 4:1266321. doi:10.3389/fcosc.2023.1266321 — **[VERIFIED, read in full]**
- [others to add and verify]
