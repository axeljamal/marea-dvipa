import json, re
B={"barong-mask":"7c75ea97e84275d424cd7952850684cc","traditional-boat":"9644f23b9d094720f69e95a3b9c498b9","split-gate-candi-bentar":"5ec6c480be66bf91cecdc871a4a61d61","large-floral-ornament":"10f1d8d4820a7390c5996f45f76b7aa8","wave-cloud-ornament":"90fb1bf929c6f15c2d39698fb9453f09","lotus-floral-motif":"e69c91155b7625012cbc6ce257cf9c2f","scroll-ornament":"1b332255980629c15b8a12f2dd320e90","lotus-flower":"c9df19510338b8d18df19c776bb7d801","lotus-bud":"2e1bb440afc04135ae374dc53e79e99b","border-filler-ornament":"eaf14b59fe60759ccfa6cde9e1ca4b14"}
lay=open("layouts.js").read().replace("if (typeof module !== 'undefined') module.exports = { AR: AR, LAYOUTS: LAYOUTS, placeLayout: placeLayout };","")
lay=re.sub(r"^//.*\n","",lay,flags=re.M)
SERIF="font-family: 'Cormorant Garamond', Georgia, serif"; MONO="font-family: 'IBM Plex Mono', ui-monospace, monospace"
BW,BH=1680,1100; VW,VH=1060,1100
props={"layout":{"editor":"enum","options":["reference-panel","temple-column","royal-damask","ocean-voyage","lotus-garden","temple-frieze"],"default":"reference-panel"},
 "ground":{"editor":"color","default":"#FAF7F2","options":["#FAF7F2","#2A6F74","#1F5C63","#02213D"]},
 "scale":{"editor":"range","min":0.4,"max":1.6,"step":0.05,"default":1},
 "spacing":{"editor":"range","min":0.8,"max":1.5,"step":0.05,"default":1},
 "rows":{"editor":"int","min":1,"max":6,"default":2},
 "$preview":{"width":BW,"height":BH}}
LBL=f"{MONO}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9FB3C2"
chip='''<sc-for list="{{%s}}" as="c" hint-placeholder-count="%d">
<button type="button" onClick="{{c.pick}}" aria-pressed="{{c.pressed}}" style="min-height: 44px; padding: 0 14px; border-radius: 22px; border: 1px solid {{c.bd}}; background: {{c.bg}}; color: {{c.fg}}; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px"><sc-if value="{{c.dot}}" hint-placeholder-val="{{false}}"><span style="width: 14px; height: 14px; border-radius: 7px; background: {{c.dot}}; border: 1px solid #9FB3C2"></span></sc-if>{{c.label}}</button>
</sc-for>'''
def group(label, inner, extra=""):
    return f'''<div style="display: flex; flex-direction: column; gap: 10px">
<div style="{LBL}">{label}</div>
<div style="display: flex; flex-wrap: wrap; gap: 8px">
{inner}
</div>
{extra}
</div>'''
def stepper(key,label):
    return f'''<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px">
<div style="{LBL}">{label}</div>
<div style="display: flex; align-items: center; gap: 6px">
<button type="button" onClick="{{{{{key}Dn}}}}" aria-label="Decrease {label}" style="width: 44px; height: 44px; border-radius: 22px; border: 1px solid #3F616F; background: transparent; color: #FAF7F2; font-size: 20px; cursor: pointer">−</button>
<div style="{MONO}; font-size: 13px; color: #FAF7F2; width: 44px; text-align: center">{{{{{key}Txt}}}}</div>
<button type="button" onClick="{{{{{key}Up}}}}" aria-label="Increase {label}" style="width: 44px; height: 44px; border-radius: 22px; border: 1px solid #3F616F; background: transparent; color: #FAF7F2; font-size: 20px; cursor: pointer">+</button>
</div>
</div>'''
custom=f'''<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
<label for="custom-ground" style="{MONO}; font-size: 12px; color: #FAF7F2">Custom colour</label>
<input id="custom-ground" type="color" value="{{{{customHex}}}}" onInput="{{{{onCustom}}}}" onChange="{{{{onCustom}}}}" style="width: 52px; height: 44px; border: 1px solid #3F616F; border-radius: 8px; background: transparent; padding: 2px; cursor: pointer">
<label for="custom-hex" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Custom ground hex code</label>
<input id="custom-hex" type="text" value="{{{{hexDraft}}}}" onInput="{{{{onHexType}}}}" placeholder="#2A6F74" maxLength="7" style="width: 96px; height: 44px; box-sizing: border-box; border: 1px solid #3F616F; border-radius: 8px; background: #0F3049; color: #FAF7F2; padding: 0 10px; {MONO}; font-size: 13px">
</div>'''
readability=f'''<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">
<sc-for list="{{{{inkChecks}}}}" as="k" hint-placeholder-count="3">
<div style="border: 1px solid #1E4157; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px">
<div style="display: flex; align-items: center; gap: 8px"><span style="width: 14px; height: 14px; border-radius: 7px; background: {{{{k.hex}}}}; border: 1px solid #9FB3C2"></span><span style="{MONO}; font-size: 11px; color: #C9D3DA">{{{{k.name}}}}</span></div>
<div style="{MONO}; font-size: 18px; color: #FAF7F2">{{{{k.ratio}}}}</div>
<div style="{MONO}; font-size: 11px; color: {{{{k.tone}}}}">{{{{k.verdict}}}}</div>
</div>
</sc-for>
</div>
<div style="font-family: Georgia, serif; font-size: 14px; line-height: 1.5; color: #E5DFD4">{{{{groundRead}}}}</div>'''
cards=f'''<sc-for list="{{{{suggestions}}}}" as="s" hint-placeholder-count="3">
<div style="border: 1px solid #2C5063; border-radius: 12px; padding: 14px; display: flex; gap: 14px; align-items: flex-start; background: #0A2A45">
<div style="width: 64px; height: 64px; flex-shrink: 0; border-radius: 8px; background: {{{{s.ground}}}}; border: 1px solid #3F616F; display: flex; align-items: center; justify-content: center">
<img src="{{{{s.thumb}}}}" alt="" aria-hidden="true" style="width: 48px; height: 48px; object-fit: contain">
</div>
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px">
<div style="display: flex; justify-content: space-between; gap: 8px; align-items: baseline">
<div style="{SERIF}; font-weight: 600; font-size: 22px; color: #FAF7F2">{{{{s.name}}}}</div>
<div style="{MONO}; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #C39B65">{{{{s.tag}}}}</div>
</div>
<div style="font-family: Georgia, serif; font-size: 13px; line-height: 1.5; color: #C9D3DA">{{{{s.why}}}}</div>
<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px">
<div style="{MONO}; font-size: 11px; color: #9FB3C2">{{{{s.spec}}}}</div>
<button type="button" onClick="{{{{s.apply}}}}" style="min-height: 44px; padding: 0 16px; border-radius: 22px; border: 1px solid #C39B65; background: #C39B65; color: #02213D; {MONO}; font-size: 12px; cursor: pointer">Apply</button>
</div>
</div>
</div>
</sc-for>'''
html=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Pattern builder</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:#C39B65}}a:hover{{color:#D1B285}}
</style>
</helmet>
<div style="width: {BW}px; height: {BH}px; display: flex; background: #02213D">
<div style="position: relative; width: {VW}px; height: {VH}px; overflow: hidden; background: {{{{groundNow}}}}; flex-shrink: 0">
<sc-for list="{{{{items}}}}" as="it" hint-placeholder-count="12">
<img src="{{{{it.src}}}}" alt="" aria-hidden="true" style="position: absolute; left: {{{{it.x}}}}px; top: {{{{it.y}}}}px; width: {{{{it.w}}}}px; height: {{{{it.h}}}}px; transform: {{{{it.tf}}}}">
</sc-for>
</div>
<div style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 32px 30px; display: flex; flex-direction: column; gap: 22px; color: #FAF7F2; overflow-y: auto">
<div style="display: flex; flex-direction: column; gap: 6px">
<div style="{MONO}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #C39B65">Pattern builder · Master v2.0.0</div>
<h1 style="margin: 0; {SERIF}; font-weight: 600; font-size: 38px; line-height: 1.05">{{{{title}}}}</h1>
<p style="margin: 0; font-family: Georgia, serif; font-size: 14px; line-height: 1.5; color: #C9D3DA">{{{{note}}}}</p>
</div>
{group("Layout", chip % ("layouts",6))}
{group("Ground", chip % ("grounds",9), custom)}
<div style="display: flex; flex-direction: column; gap: 10px">
<div style="{LBL}">How the inks read on this ground</div>
{readability}
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px">
{group("Hero motif", chip % ("heroes",3))}
{group("Crown motif", chip % ("crowns",3))}
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px">
{stepper("scale","Scale")}
{stepper("spacing","Spacing")}
<sc-if value="{{{{isPanel}}}}" hint-placeholder-val="{{{{true}}}}">
{stepper("rows","Repeats")}
</sc-if>
<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
{chip % ("mirrors",2)}
</div>
</div>
<div style="display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #1E4157; padding-top: 18px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px">
<div style="display: flex; flex-direction: column; gap: 4px">
<div style="{MONO}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #C39B65">Design assistant</div>
<div style="font-family: Georgia, serif; font-size: 14px; color: #C9D3DA">{{{{tip}}}}</div>
</div>
<button type="button" onClick="{{{{surprise}}}}" style="min-height: 44px; padding: 0 16px; border-radius: 22px; border: 1px solid #C39B65; background: transparent; color: #C39B65; {MONO}; font-size: 12px; cursor: pointer; flex-shrink: 0">Surprise me</button>
</div>
{cards}
</div>
<div style="{MONO}; font-size: 11px; line-height: 1.7; color: #9FB3C2; border-top: 1px solid #1E4157; padding-top: 12px">{{{{readout}}}}</div>
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{json.dumps(props)}'>
{lay}
var SRC = {json.dumps({k:"/_blob/"+v for k,v in B.items()})};
var LAYOUT_LIST = [["reference-panel","Reference panel"],["temple-column","Temple column"],["royal-damask","Royal damask"],["ocean-voyage","Ocean voyage"],["lotus-garden","Lotus garden"],["temple-frieze","Temple frieze"]];
var GROUNDS = [["#FAF7F2","Pearl"],["#E5DFD4","Ivory"],["#D2C7B6","Sand"],["#B9D4CF","Seafoam"],["#2A6F74","Teal"],["#1F5C63","Deep teal"],["#0F3049","Deep navy"],["#02213D","Midnight"]];
var GROUND_MOOD = {{"#FAF7F2":"closest to your original sheet; crisp and heritage","#E5DFD4":"soft and aged, like hand-printed cotton","#D2C7B6":"warm linen; gold sinks in, navy leads","#B9D4CF":"airy coastal; navy leads, gold is a quiet accent","#2A6F74":"lagoon teal; both navy and gold stay readable, the most balanced dark ground","#1F5C63":"deep teal; gold glows, navy turns to shadow for depth","#0F3049":"rich and formal; gold-forward, navy becomes texture","#02213D":"ceremonial night; gold-forward with the strongest glow"}};
var HEROES = [["barong-mask","Barong"],["lotus-floral-motif","Lotus floral"],["large-floral-ornament","Large floral"]];
var CROWNS = [["large-floral-ornament","Large floral"],["lotus-floral-motif","Lotus floral"],["lotus-flower","Lotus flower"]];
var INKS = [["Temple gold","#C39B65"],["Midnight navy","#02213D"],["Pearl keyline","#FAF7F2"]];
var USE = {{"reference-panel":"a vertical panel: sarong, scarf drop or a door-height wall piece","temple-column":"an all-over repeat for shirts, cushions and wallpaper","royal-damask":"formal all-over: upholstery, curtains, wallcovering","ocean-voyage":"a directional print: tees, swimwear, bags (keep the boats facing one way)","lotus-garden":"a quiet ground print: bedding, linings, packaging; try a small scale","temple-frieze":"stripes for hems, borders and table runners"}};
var RECIPES = [
 {{name:"Temple Heritage", tag:"Your original", layout:"reference-panel", ground:"#FAF7F2", hero:"barong-mask", crown:"large-floral-ornament", scale:1, spacing:1, mirror:"same", why:"The cream ground of your source sheet: navy reads at full strength (15:1) and gold stays warm. The truest version of the original."}},
 {{name:"Lagoon Temple", tag:"Teal", layout:"temple-column", ground:"#2A6F74", hero:"barong-mask", crown:"lotus-floral-motif", scale:0.8, spacing:1.05, mirror:"same", why:"Teal sits between the navy and gold in value, so both inks stay readable. It echoes the sea under the boats. Swapping the crown to the lotus floral keeps the top lighter."}},
 {{name:"Deep Teal Damask", tag:"Teal", layout:"royal-damask", ground:"#1F5C63", hero:"barong-mask", crown:"large-floral-ornament", scale:0.85, spacing:1.1, mirror:"same", why:"On deep teal the gold glows (3:1) while the navy turns to shadow, giving the damask a carved, lacquered depth. Extra spacing lets each medallion breathe."}},
 {{name:"Seafoam Voyage", tag:"Teal", layout:"ocean-voyage", ground:"#B9D4CF", hero:"barong-mask", crown:"lotus-flower", scale:0.8, spacing:1, mirror:"alternate", why:"A pale seafoam ground turns the waves into water. Mirrored boats make the rows feel like a fleet rather than a stamp."}},
 {{name:"Midnight Ceremony", tag:"Gold-forward", layout:"royal-damask", ground:"#02213D", hero:"barong-mask", crown:"large-floral-ornament", scale:0.9, spacing:1, mirror:"same", why:"Gold reaches 6:1 on midnight and the pearl keylines sparkle. The navy disappears into the ground, so the motifs read as gold filigree."}},
 {{name:"Ivory Lotus", tag:"Quiet", layout:"lotus-garden", ground:"#E5DFD4", hero:"lotus-floral-motif", crown:"lotus-flower", scale:0.7, spacing:1.15, mirror:"same", why:"A small scale on ivory is calm enough for bedding or linings. The navy lotus anchors it, the gold scrolls add movement."}},
 {{name:"Teal Frieze", tag:"Teal", layout:"temple-frieze", ground:"#2A6F74", hero:"barong-mask", crown:"large-floral-ornament", scale:0.75, spacing:1, mirror:"same", why:"Border bands on teal suit hems and table runners. Teal gives the gold border a jewel-like edge without losing the navy gates."}},
 {{name:"Sand Shrine", tag:"Warm", layout:"temple-column", ground:"#D2C7B6", hero:"lotus-floral-motif", crown:"large-floral-ornament", scale:0.75, spacing:1.1, mirror:"same", why:"Linen sand is warm and soft. Gold blends in (1.5:1), so navy leads. Swapping the barong for the lotus floral gives a gentler, botanical column."}}
];
function lum(h) {{
  h = (h || '#000000').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var c = [0, 2, 4].map(function (i) {{ var x = parseInt(h.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }});
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}}
function ratio(a, b) {{ var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }}
function validHex(h) {{ return /^#[0-9a-fA-F]{{6}}$/.test(h || ''); }}
function nameOf(list, v) {{ for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; }}
class Component extends DCLogic {{
  get(k, d) {{ var s = this.state || {{}}; return s[k] !== undefined ? s[k] : (this.props[k] !== undefined ? this.props[k] : d); }}
  chips(list, key, cur, withDot) {{
    var self = this;
    return list.map(function (o) {{
      var on = o[0] === cur;
      return {{ label: o[1], dot: withDot ? o[0] : '', pressed: on ? 'true' : 'false', bg: on ? '#C39B65' : 'transparent', fg: on ? '#02213D' : '#FAF7F2',
        bd: on ? '#C39B65' : '#3F616F', pick: function () {{ var u = {{}}; u[key] = o[0]; if (key === 'ground') u.hexDraft = o[0]; self.setState(u); }} }};
    }});
  }}
  step(key, d, lo, hi, cur) {{
    var self = this;
    return function () {{ var v = Math.round((cur + d) * 100) / 100; v = Math.max(lo, Math.min(hi, v)); var u = {{}}; u[key] = v; self.setState(u); }};
  }}
  applyRecipe(r) {{
    var self = this;
    return function () {{ self.setState({{ layout: r.layout, ground: r.ground, hero: r.hero, crown: r.crown, scale: r.scale, spacing: r.spacing, mirror: r.mirror, hexDraft: r.ground, surprise: null }}); }};
  }}
  makeSurprise() {{
    var layouts = LAYOUT_LIST.map(function (l) {{ return l[0]; }});
    var pick = function (a) {{ return a[Math.floor(Math.random() * a.length)]; }};
    for (var tries = 0; tries < 40; tries++) {{
      var g = pick(GROUNDS)[0], gold = ratio(g, '#C39B65'), navy = ratio(g, '#02213D');
      if (Math.max(gold, navy) < 2.2 || (gold < 1.6 && navy < 3)) continue;
      var lay = pick(layouts), hero = pick(HEROES)[0], crown = pick(CROWNS)[0];
      if (crown === hero) continue;
      var sc = Math.round((0.65 + Math.random() * 0.45) * 20) / 20, sp = Math.round((0.95 + Math.random() * 0.25) * 20) / 20;
      var lead = gold >= 2.2 && navy >= 2.2 ? 'both inks read, a balanced look' : gold > navy ? 'gold leads and navy becomes shadow' : 'navy leads and gold becomes a soft accent';
      return {{ name: nameOf(GROUNDS, g) + ' ' + nameOf(LAYOUT_LIST, lay).toLowerCase(), tag: 'Surprise', layout: lay, ground: g, hero: hero, crown: crown, scale: sc, spacing: sp,
        mirror: Math.random() > 0.5 ? 'alternate' : 'same',
        why: nameOf(HEROES, hero) + ' as hero with ' + nameOf(CROWNS, crown).toLowerCase() + ' crown on ' + nameOf(GROUNDS, g).toLowerCase() + ': ' + lead + '. Best for ' + USE[lay] + '.' }};
    }}
    return RECIPES[1];
  }}
  renderVals() {{
    var self = this;
    var layout = this.get('layout', 'reference-panel'), ground = this.get('ground', '#FAF7F2');
    if (!validHex(ground)) ground = '#FAF7F2';
    var scale = this.get('scale', 1), spacing = this.get('spacing', 1), rows = this.get('rows', 2);
    var hero = this.get('hero', 'barong-mask'), crown = this.get('crown', 'large-floral-ornament'), mirror = this.get('mirror', 'same');
    var isPanel = layout === 'reference-panel', key = isPanel ? 'temple-column' : layout, s = scale;
    if (isPanel) s = Math.min(scale, ({VH} - 60) / ((rows * 390 + 80) * spacing), ({VW} - 40) / (760 * spacing));
    var res = placeLayout({{ layout: key, scale: s, spacing: spacing, hero: hero, crown: crown, mirror: mirror === 'alternate', panel: isPanel, rows: rows }}, {VW}, {VH});
    var items = res.items.map(function (it) {{
      return {{ src: SRC[it.m], x: it.x.toFixed(1), y: it.y.toFixed(1), w: it.w.toFixed(1), h: it.h.toFixed(1), tf: it.flip ? 'scaleX(-1)' : 'none' }};
    }});
    var L = LAYOUTS[key];
    var isCustom = !GROUNDS.some(function (g) {{ return g[0].toLowerCase() === ground.toLowerCase(); }});
    var groundChips = this.chips(GROUNDS, 'ground', ground, true);
    if (isCustom) groundChips.push({{ label: 'Custom ' + ground.toUpperCase(), dot: ground, pressed: 'true', bg: '#C39B65', fg: '#02213D', bd: '#C39B65', pick: function () {{}} }});
    // readability
    var inkChecks = INKS.map(function (k) {{
      var r = ratio(ground, k[1]);
      var verdict = r >= 4.5 ? 'Strong' : r >= 3 ? 'Clear' : r >= 2 ? 'Soft' : r >= 1.4 ? 'Faint' : 'Blends in';
      var tone = r >= 3 ? '#9FD3B6' : r >= 2 ? '#D1B285' : '#E8A08A';
      return {{ name: k[0], hex: k[1], ratio: r.toFixed(1) + ':1', verdict: verdict, tone: tone }};
    }});
    var gold = ratio(ground, '#C39B65'), navy = ratio(ground, '#02213D');
    var mood = GROUND_MOOD[ground.toUpperCase()] || GROUND_MOOD[ground];
    var lead = gold >= 2.2 && navy >= 2.2 ? 'Balanced: navy and gold both carry.' : gold >= navy ? 'Gold-forward: the navy reads as shadow and texture.' : 'Navy-forward: the gold becomes a quiet accent.';
    var groundRead = (mood ? nameOf(GROUNDS, ground) + ' is ' + mood + '. ' : 'Your custom ground. ') + lead;
    // assistant tip
    var tip;
    if (Math.max(gold, navy) < 2) tip = 'Both inks sit close to this ground. Go lighter (towards pearl) or deeper (towards teal or navy) for definition.';
    else if (gold < 1.6) tip = 'Gold nearly vanishes here; fine for a tonal look, but try Teal or Deep teal if you want the gold to sing.';
    else if (navy < 1.6) tip = 'Navy melts into this ground. Lean into it with a gold-forward hero, or switch to Teal to bring the navy back.';
    else if (s < 0.6) tip = 'At this scale the fine detail turns into texture, which is ideal for linings and bedding. Raise the scale to show the barong\\u2019s face.';
    else tip = 'Use: ' + USE[layout] + '.';
    // suggestions: favour ideas that change one thing at a time
    var cur = {{ layout: layout, ground: ground.toUpperCase() }};
    var pool = RECIPES.filter(function (r) {{ return !(r.layout === cur.layout && r.ground.toUpperCase() === cur.ground); }});
    pool.sort(function (a, b) {{
      var sa = (a.layout === cur.layout ? 2 : 0) + (a.ground.toUpperCase() === cur.ground ? 1 : 0) + (a.tag === 'Teal' ? 0.5 : 0);
      var sb = (b.layout === cur.layout ? 2 : 0) + (b.ground.toUpperCase() === cur.ground ? 1 : 0) + (b.tag === 'Teal' ? 0.5 : 0);
      return sb - sa;
    }});
    var picks = pool.slice(0, 3);
    var sur = (this.state || {{}}).surprise;
    if (sur) picks = [sur].concat(picks.slice(0, 2));
    var suggestions = picks.map(function (r) {{
      var g2 = ratio(r.ground, '#C39B65'), n2 = ratio(r.ground, '#02213D');
      return {{ name: r.name, tag: r.tag, why: r.why, ground: r.ground, thumb: SRC[r.hero],
        spec: nameOf(LAYOUT_LIST, r.layout) + ' · ' + nameOf(GROUNDS, r.ground) + ' · gold ' + g2.toFixed(1) + ':1 · navy ' + n2.toFixed(1) + ':1',
        apply: self.applyRecipe(r) }};
    }});
    var hexDraft = (this.state || {{}}).hexDraft;
    if (hexDraft === undefined) hexDraft = ground.toUpperCase();
    return {{
      items: items, groundNow: ground, title: isPanel ? 'Reference panel' : L.title,
      note: isPanel ? 'Your layout, rebuilt from the master motifs: floral crown over barong, temple gates over boats, lotus-bud finials.' : L.note,
      isPanel: isPanel,
      layouts: this.chips(LAYOUT_LIST, 'layout', layout), grounds: groundChips,
      heroes: this.chips(HEROES, 'hero', hero), crowns: this.chips(CROWNS, 'crown', crown),
      mirrors: this.chips([['same', 'Boats same way'], ['alternate', 'Boats mirrored']], 'mirror', mirror),
      customHex: ground.toLowerCase(), hexDraft: hexDraft,
      onCustom: function (e) {{ var v = e && e.target ? e.target.value : ''; if (validHex(v)) self.setState({{ ground: v.toUpperCase(), hexDraft: v.toUpperCase() }}); }},
      onHexType: function (e) {{ var v = (e && e.target ? e.target.value : '').trim(); if (v && v[0] !== '#') v = '#' + v; var u = {{ hexDraft: v }}; if (validHex(v)) u.ground = v.toUpperCase(); self.setState(u); }},
      inkChecks: inkChecks, groundRead: groundRead, tip: tip, suggestions: suggestions,
      surprise: function () {{ self.setState({{ surprise: self.makeSurprise() }}); }},
      scaleTxt: s.toFixed(2), scaleDn: this.step('scale', -0.1, 0.4, 1.6, scale), scaleUp: this.step('scale', 0.1, 0.4, 1.6, scale),
      spacingTxt: spacing.toFixed(2), spacingDn: this.step('spacing', -0.05, 0.8, 1.5, spacing), spacingUp: this.step('spacing', 0.05, 0.8, 1.5, spacing),
      rowsTxt: String(rows), rowsDn: this.step('rows', -1, 1, 6, rows), rowsUp: this.step('rows', 1, 1, 6, rows),
      readout: (isPanel ? 'Panel · ' + rows + ' repeats' : 'Tile ' + Math.round(res.tw) + ' × ' + Math.round(res.th) + ' px') + ' · ' + items.length + ' motifs · ground ' + ground.toUpperCase() + ' · recipe: pattern-layouts/' + ({{'temple-column':'01','royal-damask':'02','ocean-voyage':'03','lotus-garden':'04','temple-frieze':'05'}})[key] + '-' + key + '/recipe.json'
    }};
  }}
}}
</script>
</body>
</html>
'''
open("canvas/project/Pattern-Builder.dc.html","w").write(html)
print("ok")
