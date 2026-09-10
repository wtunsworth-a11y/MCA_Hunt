#!/usr/bin/env python3
"""Build the MCA hunting & fishing data review (figures + 6-page HTML brief).

Usage:
    python analysis/build_review.py <consolidated.csv> [out_dir]
    node   analysis/render_pdf.js <out_dir>/review.html <out_dir>/review.pdf

Everything is computed from the CSV — no numbers are hard-coded. Reads the
agreed body masses from analysis/species_body_mass.csv (same directory).

Rules honoured (see ../CLAUDE.md):
  - v2.5.0 MAIN SURVEY ONLY. 13 Aug practice and 15-16 Aug pilot are never
    pooled; pilot is not reported. This script filters to app_version == 2.5.0.
  - report, don't sell; percentages carry their denominator.
  - `dynamite` glossed as a plant-root fish poison; Pilai = monitor lizard.

Outputs into out_dir (default ./review_out/, git-ignored): four PNG figures,
review.html (figures embedded as base64). Survey data and these outputs are
never committed to the public repo.
"""
import csv, sys, os, base64, html
from collections import Counter
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
SPP = ["pigeon","wallaby","tree_kangaroo","bandicoot","hornbill","parrot",
       "cuscus","bats","snake","bushfowl","cassowary","wild_pig"]
CLASS = {"bats":"mammal","bandicoot":"mammal","cuscus":"mammal","wallaby":"mammal",
         "tree_kangaroo":"mammal","wild_pig":"mammal","parrot":"bird","pigeon":"bird",
         "bushfowl":"bird","hornbill":"bird","cassowary":"bird","snake":"reptile"}
NATIVE = {s: (s != "wild_pig") for s in SPP}
LAB = {"tree_kangaroo":"Tree kangaroo","wild_pig":"Wild pig",
       "pigeon":"Pigeon (imperial)","cassowary":"Cassowary (dwarf)"}
METHODS = {1:'Bow and arrow',2:'Spear',3:'Trap/snare (vine or bush)',
    4:'Trap/snare (wire or plastic)',5:'Slingshot (handheld)',6:'Slingshot (mounted)',
    7:'Hunting dogs',8:'Bush knife',9:'Hand capture',10:'Smoking out burrow/hole',
    11:'Burn grass',12:'Cut down tree',13:'Glue',14:'Net',15:'Shotgun (factory-made)',
    16:'Shotgun (homemade)',17:'Spear gun',18:'Pitfall trap',19:'Axe',20:'Other'}
# Confirmed zone -> range (from the team; never inferred from data)
ZONE_RANGE = {"z6":"Hydrographers Range", "z9":"Sibium Range"}

def lab(s): return LAB.get(s, s.capitalize())
def yes(v): return (v or "").strip().lower() in ("yes","1","true")
def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None
def multivals(rows, col):
    c = Counter()
    for r in rows:
        for p in (r.get(col) or "").replace("|",";").split(";"):
            p = p.strip()
            if p: c[p] += 1
    return c
def local_day(r):
    t = r.get("interview_start_time") or ""
    try:  # data stored UTC; report in PNG local (UTC+10)
        return (datetime.strptime(t[:19], "%Y-%m-%dT%H:%M:%S") + timedelta(hours=10)).strftime("%Y-%m-%d")
    except ValueError:
        return t[:10]

def load_masses():
    m = {}
    with open(os.path.join(HERE, "species_body_mass.csv"), encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("category,"): continue
            p = next(csv.reader([line]))
            m[p[0]] = float(p[1])
    return m


# ---------- figures ----------
def make_figures(rows, hunters, MASS, out):
    import numpy as np, matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D
    from matplotlib.colors import LinearSegmentedColormap
    from matplotlib.ticker import ScalarFormatter
    NH = len(hunters)
    COLOR = {"mammal":"#3F7A4E","bird":"#B8862F","reptile":"#6B7A8F"}
    def spearman(a, b):
        a = np.asarray(a, float); b = np.asarray(b, float)
        return np.corrcoef(np.argsort(np.argsort(a)), np.argsort(np.argsort(b)))[0, 1]
    b64 = {}
    def save(fig, name):
        p = os.path.join(out, name); fig.savefig(p, dpi=160, bbox_inches="tight")
        b64[name] = base64.b64encode(open(p, "rb").read()).decode(); plt.close(fig)

    # 1) take frequency vs mass
    freq = {s: sum(1 for r in hunters if yes(r.get("b_taken_"+s))) for s in SPP}
    def fit(keys):
        m = np.array([MASS[s] for s in keys]); f = np.array([100*freq[s]/NH for s in keys])
        b1, b0 = np.polyfit(np.log10(m), f, 1); return spearman(m, f), b1, b0
    rho_all, _, _ = fit(SPP); natk = [s for s in SPP if NATIVE[s]]; rho_n, b1, b0 = fit(natk)
    fig, ax = plt.subplots(figsize=(8.4, 5.4))
    for s in SPP:
        intro = not NATIVE[s]
        ax.scatter(MASS[s], 100*freq[s]/NH, s=150, color=COLOR[CLASS[s]],
                   edgecolor=("#c0392b" if intro else "white"), linewidth=(1.8 if intro else 1.1), zorder=3)
    xg = np.array([0.35, 10.5]); ax.plot(xg, b0+b1*np.log10(xg), color="#3F7A4E", lw=1.4, ls="--", alpha=.8, zorder=2)
    for s in SPP:
        ax.annotate(lab(s), (MASS[s], 100*freq[s]/NH), xytext=(MASS[s]*1.07, 100*freq[s]/NH+1.6),
                    fontsize=8.3, color="#22302a")
    ax.set_xscale("log"); ax.set_xticks([0.5,1,2,5,10,20,50]); ax.get_xaxis().set_major_formatter(ScalarFormatter())
    ax.set_xlim(0.3, 75); ax.set_ylim(0, 105)
    ax.set_xlabel("Representative adult body mass (kg, log) — PNG taxa", fontsize=8.6)
    ax.set_ylabel(f"Hunters taking the category (% of {NH})", fontsize=9.5)
    ax.set_title("Take frequency vs body mass — MCA main survey (v2.5.0)", fontsize=12, color="#1E3D2C")
    ax.grid(True, which="both", color="#e6ece2", linewidth=0.7, zorder=0)
    for sp in ("top","right"): ax.spines[sp].set_visible(False)
    leg = [Line2D([0],[0],marker='o',color='w',markerfacecolor=COLOR[c],markersize=9,label=c.capitalize())
           for c in ("mammal","bird","reptile")]
    leg.append(Line2D([0],[0],marker='o',color='w',markerfacecolor="#3F7A4E",markeredgecolor="#c0392b",
                      markeredgewidth=1.8, markersize=9, label="Introduced (wild pig)"))
    ax.legend(handles=leg, loc="lower left", frameon=False, fontsize=8.2)
    ax.text(0.985, 0.06, f"Native (n=11): Spearman rho = {rho_n:+.2f}", transform=ax.transAxes,
            ha="right", fontsize=8.4, color="#3F7A4E")
    ax.text(0.985, 0.015, f"Whole suite (n=12): Spearman rho = {rho_all:+.2f}", transform=ax.transAxes,
            ha="right", fontsize=8.4, color="#55635a")
    fig.tight_layout(); save(fig, "freq_mass.png")

    # 2/3) biomass per trip
    def biomass(prefix, title, name):
        mean = {}; nrep = {}
        for s in SPP:
            v = [num(r.get(prefix+s)) for r in rows]; v = [x for x in v if x is not None]
            nrep[s] = len(v); mean[s] = (sum(v)/len(v)) if v else 0
        bpt = {s: mean[s]*MASS[s] for s in SPP}
        nz = [s for s in SPP if bpt[s] > 0]
        slope, c0 = np.polyfit(np.log10([MASS[s] for s in nz]), np.log10([bpt[s] for s in nz]), 1)
        FLOOR = 0.45
        fig, ax = plt.subplots(figsize=(8.4, 5.4))
        for s in SPP:
            intro = not NATIVE[s]; faint = nrep[s] < 10 or bpt[s] == 0
            ax.scatter(MASS[s], bpt[s] if bpt[s] > 0 else FLOOR, s=150, color=COLOR[CLASS[s]],
                       edgecolor=("#c0392b" if intro else "white"), linewidth=(1.8 if intro else 1.1),
                       alpha=(0.5 if faint else 1.0), zorder=3)
        xg = np.array([0.35, 60]); ax.plot(xg, 10**(c0+slope*np.log10(xg)), color="#888", lw=1.2, ls="--", alpha=.7, zorder=2)
        for s in SPP:
            y = bpt[s] if bpt[s] > 0 else FLOOR
            t = lab(s) + ((" (0 caught)" if bpt[s] == 0 else f" (n={nrep[s]})") if nrep[s] < 10 else "")
            ax.annotate(t, (MASS[s], y), xytext=(MASS[s]*1.07, y), fontsize=8.2, color="#22302a")
        ax.set_xscale("log"); ax.set_yscale("log")
        ax.set_xticks([0.5,1,2,5,10,20,50]); ax.get_xaxis().set_major_formatter(ScalarFormatter())
        ax.set_yticks([0.5,1,2,5,10,20,50,100,200]); ax.get_yaxis().set_major_formatter(ScalarFormatter())
        ax.set_xlim(0.3, 75); ax.set_ylim(0.4, 220)
        ax.set_xlabel("Representative adult body mass (kg, log) — PNG taxa", fontsize=8.2)
        ax.set_ylabel(f"Biomass per {title} trip (kg, log)\nmean animals/trip × body mass", fontsize=9)
        ax.set_title(f"Biomass per {title} trip vs body mass — MCA main survey (v2.5.0)", fontsize=11.5, color="#1E3D2C")
        ax.grid(True, which="both", color="#e6ece2", linewidth=0.7, zorder=0)
        for sp in ("top","right"): ax.spines[sp].set_visible(False)
        leg = [Line2D([0],[0],marker='o',color='w',markerfacecolor=COLOR[c],markersize=9,label=c.capitalize())
               for c in ("mammal","bird","reptile")]
        leg.append(Line2D([0],[0],marker='o',color='w',markerfacecolor="#3F7A4E",markeredgecolor="#c0392b",
                          markeredgewidth=1.8, markersize=9, label="Introduced (wild pig)"))
        leg.append(Line2D([0],[0],marker='o',color='w',markerfacecolor="#888",markersize=9,alpha=0.5,label="Faded = <10 reports"))
        ax.legend(handles=leg, loc="upper left", frameon=False, fontsize=8.0)
        ax.text(0.985, 0.03, f"log-log slope = {slope:.2f}  (1.0 = same count per trip at every size)",
                transform=ax.transAxes, ha="right", fontsize=8, color="#55635a")
        fig.tight_layout(); save(fig, name)
        return slope, bpt
    slope_s, bpt_s = biomass("f_successful_catch_", "successful", "biomass_successful.png")
    slope_r, _ = biomass("f_recent_catch_", "recent", "biomass_recent.png")

    # 4) tools by age band heatmap
    FOREST = LinearSegmentedColormap.from_list("forest", ["#F4F7F0","#BFD6B4","#7DAE80","#3F7A4E","#1E3D2C"])
    codes = [2,5,8,7,14,3,6,17,4,12,9,15,16]
    COH = [("60_plus","60+"),("40_59","40–59"),("25_39","25–39"),("under_25","under 25")]
    def methods_of(r):
        s = set()
        for k in SPP:
            for n in range(1, 21):
                if (r.get(f"c_method_{k}_{n}") or "").strip() in ("1","yes","true"): s.add(n)
        return s
    cohN = {c: sum(1 for r in hunters if r.get("age_band") == c) for c, _ in COH}
    M = np.array([[ (sum(1 for r in hunters if r.get("age_band") == c and code in methods_of(r))/cohN[c]
                     if cohN[c] else 0) for c, _ in COH] for code in codes])
    fig, ax = plt.subplots(figsize=(6.0, 5.8))
    im = ax.imshow(M, cmap=FOREST, vmin=0, vmax=1, aspect="auto")
    ax.set_xticks(range(len(COH))); ax.set_xticklabels([f"{l}\n(n={cohN[c]})" for c, l in COH], fontsize=9)
    ax.set_yticks(range(len(codes))); ax.set_yticklabels([METHODS[c].split(" (")[0] if c not in (15,16) else
        ("Shotgun (factory)" if c == 15 else "Shotgun (homemade)") for c in codes], fontsize=9)
    for i in range(len(codes)):
        for j in range(len(COH)):
            if M[i, j] > 0:
                ax.text(j, i, f"{M[i,j]*100:.0f}", ha="center", va="center", fontsize=8,
                        color="white" if M[i, j] > 0.5 else "#1E3D2C")
    ax.set_xlabel("Age band  (older → younger)", fontsize=9)
    ax.set_title("Hunting tools by age band — % of that band's hunters using the tool", fontsize=10.5, pad=8)
    fig.colorbar(im, ax=ax, fraction=0.045, pad=0.03)
    fig.tight_layout(); save(fig, "tools_by_age.png")

    return b64, dict(rho_n=rho_n, rho_all=rho_all, slope_s=slope_s, slope_r=slope_r,
                     cohN=cohN, bpt_s=bpt_s, freq=freq)


# ---------- brief HTML ----------
def build_html(rows, out):
    MASS = load_masses()
    hunters = [r for r in rows if r.get("activity_type") in ("hunt","hunt_and_fish")]
    fishers = [r for r in rows if r.get("activity_type") in ("fish","hunt_and_fish")]
    NH, NF, N = len(hunters), len(fishers), len(rows)
    b64, stt = make_figures(rows, hunters, MASS, out)

    men = sum(1 for r in rows if r.get("sex") == "male")
    women = sum(1 for r in rows if r.get("sex") == "female")
    zones = Counter(r.get("zone") for r in rows).most_common()
    age = Counter(r.get("age_band") for r in rows)
    act = Counter(r.get("activity_type") for r in rows)
    dates = sorted(local_day(r) for r in rows if r.get("interview_start_time"))
    span = f"{dates[0]} – {dates[-1]}" if dates else "?"
    today = datetime.utcnow() + timedelta(hours=10)

    sp = sorted(((lab(s), sum(1 for r in hunters if yes(r.get("b_taken_"+s)))) for s in SPP),
                key=lambda x: -x[1])
    reasons = multivals(hunters, "a_hunt_reasons")
    use = Counter(u for r in hunters for s in SPP if yes(r.get("b_taken_"+s))
                  for u in ("food","sale","bilas","customary") if yes(r.get(f"b_use_{u}_{s}")))
    tarea = multivals(hunters, "d_main_area"); trestr = multivals(hunters, "d_restricted_places")
    tr_tool = Counter(r.get("c_tool_restrictions") for r in hunters)
    m_chg = Counter(r.get("c_method_changed") for r in hunters)
    ftar = multivals(fishers, "fish_targets"); ftool = multivals(fishers, "fish_tools")
    pilai = sum(1 for r in rows if any(k in (r.get("b_other_category_name") or "").lower() for k in ("lizard","pilai")))
    echidna = sum(1 for r in rows if "echidna" in (r.get("b_other_category_name") or "").lower())

    def methods_of(r):
        s = set()
        for k in SPP:
            for n in range(1, 21):
                if (r.get(f"c_method_{k}_{n}") or "").strip() in ("1","yes","true"): s.add(n)
        return s
    tu = Counter()
    for r in hunters:
        for c in methods_of(r): tu[c] += 1
    tools = [(METHODS[c], n, round(100*n/NH)) for c, n in tu.most_common()]

    # tree kangaroo by zone (for the elevation paragraph)
    tk = {}
    for z, _ in zones:
        hz = [r for r in hunters if r.get("zone") == z]
        tk[z] = (sum(1 for r in hz if yes(r.get("b_taken_tree_kangaroo"))), len(hz))
    high = [z for z, _ in zones if tk[z][1] >= 8 and tk[z][1] and tk[z][0]/tk[z][1] >= 0.30]
    low = [z for z, _ in zones if tk[z][1] >= 8 and tk[z][0] <= 1]
    def zname(z): return "Zone " + z.replace("z","").upper()
    high_txt = ", ".join(f"{zname(z)} {tk[z][0]}/{tk[z][1]}" for z in high)
    low_txt = ", ".join(zname(z) for z in low)
    range_txt = "; ".join(f"{zname(z)} is on the {ZONE_RANGE[z]}" if z == "z6"
                          else f"{zname(z)} fringes the {ZONE_RANGE[z]}" for z in ("z6","z9") if z in dict(zones))
    named = {"z6","z9"}
    unnamed = [zname(z) for z in high if z not in named]

    # ----- helpers to emit rows -----
    e = html.escape
    def bar(pct): return f'<td><div class="bar"><span style="width:{pct}%"></span></div></td>'
    def sprows():
        return "".join(f'<tr><td>{e(n)}</td><td class="num">{c}</td>{bar(round(100*c/NH))}'
                       f'<td class="num">{round(100*c/NH)}%</td></tr>' for n, c in sp)
    def toolrows():
        top = tools[:11]
        return "".join(f'<tr><td>{e(n)}</td><td class="num">{c}</td>{bar(p)}<td class="num">{p}%</td></tr>'
                       for n, c, p in top)
    less = ", ".join(f"{e(n.lower())} ({c}, {p}%)" for n, c, p in tools[11:] if c)

    zrows = "".join(f'<tr><td>{zname(z)}</td><td class="num">{c}</td><td class="num">{round(100*c/N)}%</td></tr>'
                    for z, c in zones if c >= 10)
    tiny = [f"{zname(z)} ({c})" for z, c in zones if c < 10]
    tiny_txt = "; ".join(tiny) if tiny else "none"

    def kv(counter, keys):
        return "".join(f'<tr><td>{e(k[1])}</td><td class="num">{counter.get(k[0],0)}</td></tr>' for k in keys)

    css = open(os.path.join(HERE, "review_template.css")).read()
    P = []
    def img(name, cls): return f'<img class="{cls}" src="data:image/png;base64,{b64[name]}" alt="{name}">'

    # PAGE 1
    P.append(f"""<section class="page">
 <div class="mast"><div class="kicker">Managalas Conservation Area · Oro Province, PNG</div>
 <h1>Hunting &amp; Fishing Survey — data review</h1>
 <div class="sub">Main survey (app v2.5.0) · {span} · prepared {today.strftime('%-d %b %Y')}</div></div>
 <div class="stats">
  <div class="stat"><div class="n">{N}</div><div class="l">interviews</div></div>
  <div class="stat"><div class="n">{women}</div><div class="l">women respondents</div></div>
  <div class="stat"><div class="n">{sum(1 for z,c in zones if c>=10)}</div><div class="l">well-sampled zones</div></div>
  <div class="stat"><div class="n">{NH}</div><div class="l">hunt · {NF} fish</div></div></div>
 <div class="note"><b>What this covers.</b> The <b>main survey</b> only — app v2.5.0, {span}, {N} interviews.
  The 13 Aug practice day and the 15–16 Aug pilot are excluded (pilot retained for provenance, not pooled).
  Percentages carry their denominator.</div>
 <div class="two"><div><h2>Coverage by zone</h2>
  <table><tr><th>Zone</th><th class="num">Interviews</th><th class="num">Share</th></tr>{zrows}</table>
  <p class="sub">Smaller zones (too few to report on their own yet): {tiny_txt}.</p></div>
  <div><h2>Who was interviewed</h2><h3>Sex</h3><table>
   <tr><td>Men</td><td class="num">{men}</td>{bar(round(100*men/(men+women)) if men+women else 0)}</tr>
   <tr><td>Women</td><td class="num">{women}</td>{bar(round(100*women/(men+women)) if men+women else 0)}</tr></table>
   <h3>Age band</h3><table>{kv(age,[('under_25','Under 25'),('25_39','25–39'),('40_59','40–59'),('60_plus','60+')])}</table>
  </div></div>
 <h2>Activity reported</h2><div class="chips">
  <div class="chip"><b>{act.get('hunt_and_fish',0)}</b> &nbsp;hunt and fish</div>
  <div class="chip"><b>{act.get('fish',0)}</b> &nbsp;fish only</div>
  <div class="chip"><b>{act.get('hunt',0)}</b> &nbsp;hunt only</div></div>
 <p class="lede">Most respondents do both. The counts below use <b>{NH} hunters</b> and <b>{NF} fishers</b>
  as their denominators.</p>
 <div class="foot"><span>MCA Hunting &amp; Fishing Survey · data review</span><span>Page 1 of 6</span></div></section>""")

    # PAGE 2
    rlist = [('food','Food'),('income','Income'),('custom','Custom'),('entertainment','Entertainment'),('see_land','Look after land')]
    rmax = max((reasons.get(k[0],0) for k in rlist), default=1) or 1
    reason_rows = "".join(f'<tr><td>{e(k[1])}</td><td class="num">{reasons.get(k[0],0)}</td>'
                          f'{bar(round(100*reasons.get(k[0],0)/rmax))}</tr>' for k in rlist)
    P.append(f"""<section class="page">
 <h2>What is taken</h2>
 <p class="sub">Share of {NH} hunters who report taking each category. Records, not a ranking of value —
  species and takes are neutral data.</p>
 <table><tr><th style="width:22%">Category</th><th class="num">Hunters</th><th style="width:52%"></th><th class="num">%</th></tr>{sprows()}</table>
 <div class="note"><b>“Other animal” (free text).</b> Beyond the 12 categories, respondents named a
  <b>monitor lizard</b> (locally <i>Pilai</i>) in {pilai} interviews and <b>long-beaked echidna</b>
  (<i>Zaglossus</i>) in {echidna} — concentrated in the higher-elevation zones. Echidna species to be confirmed
  with a specialist before a name is published.</div>
 <div class="two"><div><h2>Why people hunt</h2><p class="sub">Of {NH} hunters; multiple answers allowed.</p>
  <table>{reason_rows}</table></div>
  <div><h2>How the take is used</h2><p class="sub">Counts across all species records where a category is taken.</p>
  <table>{kv(use,[('food','Food'),('sale','Sale / income'),('bilas','Bilas (decoration)'),('customary','Customary')])}</table>
  <p class="sub">Food is near-universal; sale and bilas are common secondary uses.</p></div></div>
 <h2>Elevation shows in the record</h2>
 <p class="lede">Tree kangaroo concentrates in the higher-elevation zones — {high_txt} — and is near-absent in
  {low_txt} (≤1 each). Echidna clusters in the same zones. {range_txt}; the ranges for {', '.join(unnamed) or 'the other high zones'}
  are not confirmed here. The between-zone difference reflects where these animals live, not a depletion
  gradient — the natural distribution across the MCA was never even.</p>
 <div class="foot"><span>MCA Hunting &amp; Fishing Survey · data review</span><span>Page 2 of 6</span></div></section>""")

    # PAGE 3 freq-mass
    wp = round(100*stt['freq']['wild_pig']/NH); tkp = round(100*stt['freq']['tree_kangaroo']/NH)
    P.append(f"""<section class="page">
 <h2>Take frequency and body mass</h2>
 <p class="sub">Share of {NH} hunters who take each category, against a representative adult body mass (log
  scale) for the PNG taxa — pigeon = imperial pigeon (<i>Ducula</i>), cassowary = dwarf cassowary
  (<i>Casuarius bennetti</i>), bandicoot excludes the giant bandicoot, cockatoos not counted as parrots.
  Wild pig is introduced and marked; the trend line is fitted to the 11 native categories only.</p>
 {img('freq_mass.png','figw')}
 <p class="lede">Native suite <b>Spearman ρ = {stt['rho_n']:+.2f}</b> (n=11); with wild pig, <b>ρ = {stt['rho_all']:+.2f}</b>
  (n=12). Tree kangaroo is now taken by {tkp}% of hunters; wild pig remains the exception — large-bodied yet
  taken by {wp}%.</p>
 <div class="note"><b>Read with care.</b> Body masses are representative PNG-taxa values agreed with the team
  (<code>analysis/species_body_mass.csv</code>) — category-level, with within-category spread. Take frequency
  reflects abundance, habitat and effort as well as size. ρ on 12 (or 11) points describes this plot; it is not
  a significance test.</div>
 <div class="foot"><span>MCA Hunting &amp; Fishing Survey · data review</span><span>Page 3 of 6</span></div></section>""")

    # PAGE 4 biomass
    P.append(f"""<section class="page">
 <h2>Biomass per hunting trip</h2>
 <p class="sub">Per category: mean animals caught per trip × body mass. Two views — a remembered
  <b>successful</b> trip and the <b>most recent</b> trip. No trips-per-year is recorded, so this is per-trip,
  <b>not</b> an annual total.</p>
 {img('biomass_successful.png','figb')}
 {img('biomass_recent.png','figb')}
 <p class="lede">The biomass haul is dominated by the large-bodied animals — <b>wild pig</b>
  (~{stt['bpt_s']['wild_pig']:.0f} kg per successful trip) and <b>dwarf cassowary</b>
  (~{stt['bpt_s']['cassowary']:.0f} kg) — even though small animals are taken far more often. Bats are the
  small-species exception (bulk-caught). Both trip types give the same ranking.</p>
 <div class="note"><b>Read with care.</b> Biomass = count × mass, so plotting it against mass carries body mass
  on both axes — the log–log <b>slope</b> ({stt['slope_s']:.2f}–{stt['slope_r']:.2f}) is the informative part,
  not the upward trend. A slope below 1 means larger species contribute less-than-proportional biomass.</div>
 <div class="foot"><span>MCA Hunting &amp; Fishing Survey · data review</span><span>Page 4 of 6</span></div></section>""")

    # PAGE 5 tools
    P.append(f"""<section class="page">
 <h2>Hunting tools used in MCA</h2>
 <p class="sub">Share of {NH} hunters using each tool for at least one animal; multiple tools per hunter.
  A method-and-place record, not a group's habit.</p>
 <table><tr><th style="width:34%">Tool / method</th><th class="num">Hunters</th><th style="width:44%"></th><th class="num">%</th></tr>{toolrows()}</table>
 <p class="sub">Less common: {less}.</p>
 <h2>Change across age bands</h2>
 <p class="sub">Same tools, split by the hunter's age band (a generational comparison, read as a proxy for
  change over time — not a within-person history). Each cell is the share of that band's hunters using the tool.
  The 60+ band is small (n={stt['cohN'].get('60_plus',0)}); read it with care.</p>
 {img('tools_by_age.png','fig')}
 <p class="lede">Spear is near-universal in every band. Reading older → younger, spear gun rises while vine/bush
  traps, hunting dogs and cut-down-tree are named more by older hunters.</p>
 <div class="foot"><span>MCA Hunting &amp; Fishing Survey · data review</span><span>Page 5 of 6</span></div></section>""")

    # PAGE 6 rules/tenure/fishing
    def chips(counter, keys):
        return "".join(f'<div class="chip">{e(l)} <b>{counter.get(k,0)}</b></div>' for k, l in keys)
    dyn = " Includes one record given as <i>“dynamite”</i> — the local name for a plant-root fish poison, not an explosive." \
          if ftool.get("dynamite") else ""
    P.append(f"""<section class="page">
 <h2>Rules on tools, and change of method</h2>
 <div class="two"><div>
   <h3>Has your main method changed? <small class="den">({NH} hunters)</small></h3>
   <div class="chips">{chips(m_chg,[('no','No'),('yes','Yes'),('not_sure','Not sure')])}</div>
   <h3>Any tools you don’t / can’t use? <small class="den">({NH} hunters)</small></h3>
   <div class="chips">{chips(tr_tool,[('no','No'),('yes','Yes'),('not_sure','Not sure')])}</div></div>
  <div><h3>In respondents’ words <span class="sub">(anonymised to zone)</span></h3>
   <div class="q">Factory-made guns are no longer used today, as it’s against the law. <span>— Zone 6</span></div>
   <div class="q">Gun is prohibited by the community because the noise might scare away the animals. <span>— Zone 7A</span></div>
   <div class="q">Community reminds us not to use mosquito nets to fish the river. <span>— Zone 8</span></div></div></div>
 <h2>Where hunting happens</h2>
 <div class="two"><div><h3>Main hunting area <small class="den">({NH} hunters)</small></h3>
  <table>{kv(tarea,[('own_clan_only','Own clan land only'),('own_plus_permission','Own land + others with permission'),('own_plus_shared_open','Own + shared / open land'),('other','Other')])}</table></div>
  <div><h3>Places kept off-limits <small class="den">({NH} hunters)</small></h3>
  <table>{kv(trestr,[('tambu_sacred','Tambu / sacred'),('clan_no_take_not_sacred','Clan no-take (not sacred)'),('none','None'),('other','Other')])}</table></div></div>
 <h2>Fishing</h2>
 <div class="two"><div><h3>What is caught <small class="den">({NF} fishers)</small></h3>
  <table>{kv(ftar,[('fish','Fish'),('eel','Eel'),('prawn','Prawn'),('frog','Frog'),('shellfish','Shellfish'),('crab','Crab')])}</table></div>
  <div><h3>How <small class="den">({NF} fishers)</small></h3>
  <table>{kv(ftool,[('hook_line','Hook & line'),('poison_traditional','Traditional poison'),('spear','Spear'),('diving_hand','Diving / by hand'),('net','Net'),('spear_gun','Spear gun'),('mosquito_net','Mosquito net')])}</table></div></div>
 <p class="sub">{dyn}</p>
 <div class="note"><b>Framing.</b> Results will be read against the four T’s — Target, Tool, Tenure, Timing — an
  external comparative framework (Pattiselanno et al. 2024), used here as a researcher’s lens. Hunting and
  fishing are legitimate resource use by the landowners, who own the land and its resources. Interim figures.</div>
 <div class="foot"><span>MCA Hunting &amp; Fishing Survey · MOPP / CIFOR-ICRAF · data review</span><span>Page 6 of 6</span></div></section>""")

    doc = f"<!doctype html><html lang=en><head><meta charset=utf-8><title>MCA Hunting &amp; Fishing Survey — data review</title><style>{css}</style></head><body>{''.join(P)}</body></html>"
    with open(os.path.join(out, "review.html"), "w", encoding="utf-8") as fh:
        fh.write(doc)
    return N, NH, NF


def main(csvpath, outdir):
    os.makedirs(outdir, exist_ok=True)
    with open(csvpath, newline="", encoding="utf-8-sig") as fh:
        rows = [r for r in csv.DictReader(fh) if r.get("app_version") == "2.5.0"]
    if not rows:
        sys.exit("no v2.5.0 main-survey rows found")
    N, NH, NF = build_html(rows, outdir)
    print(f"{N} interviews ({NH} hunters, {NF} fishers) -> {outdir}/review.html")
    print(f"render with: node analysis/render_pdf.js {outdir}/review.html {outdir}/review.pdf")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "review_out")
