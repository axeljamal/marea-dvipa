import json, re
B={"barong-mask":"7c75ea97e84275d424cd7952850684cc","traditional-boat":"9644f23b9d094720f69e95a3b9c498b9","split-gate-candi-bentar":"5ec6c480be66bf91cecdc871a4a61d61","large-floral-ornament":"10f1d8d4820a7390c5996f45f76b7aa8","wave-cloud-ornament":"90fb1bf929c6f15c2d39698fb9453f09","lotus-floral-motif":"e69c91155b7625012cbc6ce257cf9c2f","scroll-ornament":"1b332255980629c15b8a12f2dd320e90","lotus-flower":"c9df19510338b8d18df19c776bb7d801","lotus-bud":"2e1bb440afc04135ae374dc53e79e99b","border-filler-ornament":"eaf14b59fe60759ccfa6cde9e1ca4b14"}
meta=json.load(open("out/meta.json"))
HEAD='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{t}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:#1E4157}}a:hover{{color:#02213D}}
</style>
</helmet>
'''
SERIF="font-family: 'Cormorant Garamond', Georgia, serif"; MONO="font-family: 'IBM Plex Mono', ui-monospace, monospace"
# ---------- Master sheet ----------
def cell(k,h):
    n=meta[k]["name"].upper()
    return f'''<div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 14px; min-width: 0">
<img src="/_blob/{B[k]}" alt="{meta[k]['name']}" style="max-width: 100%; height: {h}px; object-fit: contain">
<div style="{SERIF}; font-weight: 700; font-size: 19px; letter-spacing: 0.04em; color: #1E4157; text-align: center">{n}</div>
</div>'''
W,H=1600,1120
sheet=HEAD.format(t="Master motif sheet")+f'''<div style="width: {W}px; height: {H}px; box-sizing: border-box; padding: 48px 56px; background: #FAF7F2; display: flex; flex-direction: column; gap: 36px">
<div style="display: flex; justify-content: space-between; align-items: baseline">
<div style="{SERIF}; font-weight: 600; font-size: 40px; color: #02213D">Bali Batik Motifs · Master</div>
<div style="{MONO}; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #3F616F">v2.0.0 · Locked · 15 inks</div>
</div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 40px">
{"".join(cell(k,380) for k in ["barong-mask","traditional-boat","split-gate-candi-bentar","large-floral-ornament"])}
</div>
<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 36px">
{"".join(cell(k,230) for k in ["wave-cloud-ornament","lotus-floral-motif","scroll-ornament","lotus-flower","lotus-bud"])}
</div>
<div style="display: flex; justify-content: center">
<div style="width: 1040px; display: flex; flex-direction: column; align-items: center; gap: 14px">
<img src="/_blob/{B['border-filler-ornament']}" alt="Border / Filler Ornament" style="width: 1040px; height: auto">
<div style="{SERIF}; font-weight: 700; font-size: 19px; letter-spacing: 0.04em; color: #1E4157">BORDER / FILLER ORNAMENT</div>
</div>
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{W},"height":{H}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''
open("canvas/project/Master-Sheet.dc.html","w").write(sheet)
# ---------- Pattern builder ----------
lay=open("layouts.js").read().replace("if (typeof module !== 'undefined') module.exports = { AR: AR, LAYOUTS: LAYOUTS, placeLayout: placeLayout };","")
lay=re.sub(r"^//.*\n","",lay,flags=re.M)
BW,BH=1480,980; VW,VH=1040,980
props={"layout":{"editor":"enum","options":["reference-panel","temple-column","royal-damask","ocean-voyage","lotus-garden","temple-frieze"],"default":"reference-panel"},
 "ground":{"editor":"color","default":"#FAF7F2","options":["#FAF7F2","#E5DFD4","#D2C7B6","#0F3049","#02213D"]},
 "scale":{"editor":"range","min":0.4,"max":1.6,"step":0.05,"default":1},
 "spacing":{"editor":"range","min":0.8,"max":1.5,"step":0.05,"default":1},
 "rows":{"editor":"int","min":1,"max":6,"default":2},
 "$preview":{"width":BW,"height":BH}}
chip='''<sc-for list="{{%s}}" as="c" hint-placeholder-count="%d">
<button type="button" onClick="{{c.pick}}" aria-pressed="{{c.pressed}}" style="min-height: 44px; padding: 0 14px; border-radius: 22px; border: 1px solid {{c.bd}}; background: {{c.bg}}; color: {{c.fg}}; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; cursor: pointer">{{c.label}}</button>
</sc-for>'''
def group(label, inner):
    return f'''<div style="display: flex; flex-direction: column; gap: 10px">
<div style="{MONO}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9FB3C2">{label}</div>
<div style="display: flex; flex-wrap: wrap; gap: 8px">
{inner}
</div>
</div>'''
stepper=lambda key,label: f'''<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
<div style="{MONO}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9FB3C2">{label}</div>
<div style="display: flex; align-items: center; gap: 8px">
<button type="button" onClick="{{{{{key}Dn}}}}" aria-label="Decrease {label}" style="width: 44px; height: 44px; border-radius: 22px; border: 1px solid #3F616F; background: transparent; color: #FAF7F2; font-size: 20px; cursor: pointer">−</button>
<div style="{MONO}; font-size: 13px; color: #FAF7F2; width: 52px; text-align: center">{{{{{key}Txt}}}}</div>
<button type="button" onClick="{{{{{key}Up}}}}" aria-label="Increase {label}" style="width: 44px; height: 44px; border-radius: 22px; border: 1px solid #3F616F; background: transparent; color: #FAF7F2; font-size: 20px; cursor: pointer">+</button>
</div>
</div>'''
builder=HEAD.format(t="Pattern builder")+f'''<div style="width: {BW}px; height: {BH}px; display: flex; background: #02213D">
<div style="position: relative; width: {VW}px; height: {VH}px; overflow: hidden; background: {{{{groundNow}}}}; flex-shrink: 0">
<sc-for list="{{{{items}}}}" as="it" hint-placeholder-count="12">
<img src="{{{{it.src}}}}" alt="" aria-hidden="true" style="position: absolute; left: {{{{it.x}}}}px; top: {{{{it.y}}}}px; width: {{{{it.w}}}}px; height: {{{{it.h}}}}px; transform: {{{{it.tf}}}}">
</sc-for>
</div>
<div style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 36px 32px; display: flex; flex-direction: column; gap: 22px; color: #FAF7F2; overflow-y: auto">
<div style="display: flex; flex-direction: column; gap: 6px">
<div style="{MONO}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #C39B65">Pattern builder · Master v2.0.0</div>
<h1 style="margin: 0; {SERIF}; font-weight: 600; font-size: 38px; line-height: 1.05">{{{{title}}}}</h1>
<p style="margin: 0; font-family: Georgia, serif; font-size: 14px; line-height: 1.5; color: #C9D3DA">{{{{note}}}}</p>
</div>
{group("Layout", chip % ("layouts",6))}
{group("Ground", chip % ("grounds",5))}
{group("Hero motif", chip % ("heroes",3))}
{group("Crown motif", chip % ("crowns",3))}
<div style="display: flex; flex-direction: column; gap: 10px">
{stepper("scale","Scale")}
{stepper("spacing","Spacing")}
<sc-if value="{{{{isPanel}}}}" hint-placeholder-val="{{{{true}}}}">
{stepper("rows","Repeats")}
</sc-if>
</div>
{group("Boats", chip % ("mirrors",2))}
<div style="margin-top: auto; {MONO}; font-size: 11px; line-height: 1.7; color: #9FB3C2; border-top: 1px solid #1E4157; padding-top: 14px">{{{{readout}}}}</div>
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{json.dumps(props)}'>
{lay}
var SRC = {json.dumps({k:"/_blob/"+v for k,v in B.items()})};
var LAYOUT_LIST = [["reference-panel","Reference panel"],["temple-column","Temple column"],["royal-damask","Royal damask"],["ocean-voyage","Ocean voyage"],["lotus-garden","Lotus garden"],["temple-frieze","Temple frieze"]];
var GROUNDS = [["#FAF7F2","Pearl"],["#E5DFD4","Ivory"],["#D2C7B6","Sand"],["#0F3049","Deep navy"],["#02213D","Midnight"]];
var HEROES = [["barong-mask","Barong"],["lotus-floral-motif","Lotus floral"],["large-floral-ornament","Large floral"]];
var CROWNS = [["large-floral-ornament","Large floral"],["lotus-floral-motif","Lotus floral"],["lotus-flower","Lotus flower"]];
class Component extends DCLogic {{
  get(k, d) {{ var s = this.state || {{}}; return s[k] !== undefined ? s[k] : (this.props[k] !== undefined ? this.props[k] : d); }}
  chips(list, key, cur) {{
    var self = this;
    return list.map(function (o) {{
      var on = o[0] === cur;
      return {{ label: o[1], pressed: on ? 'true' : 'false', bg: on ? '#C39B65' : 'transparent', fg: on ? '#02213D' : '#FAF7F2',
        bd: on ? '#C39B65' : '#3F616F', pick: function () {{ var u = {{}}; u[key] = o[0]; self.setState(u); }} }};
    }});
  }}
  step(key, d, lo, hi, cur) {{
    var self = this;
    return function () {{ var v = Math.round((cur + d) * 100) / 100; v = Math.max(lo, Math.min(hi, v)); var u = {{}}; u[key] = v; self.setState(u); }};
  }}
  renderVals() {{
    var layout = this.get('layout', 'reference-panel'), ground = this.get('ground', '#FAF7F2');
    var scale = this.get('scale', 1), spacing = this.get('spacing', 1), rows = this.get('rows', 2);
    var hero = this.get('hero', 'barong-mask'), crown = this.get('crown', 'large-floral-ornament'), mirror = this.get('mirror', 'same');
    var isPanel = layout === 'reference-panel';
    var key = isPanel ? 'temple-column' : layout;
    var s = scale;
    if (isPanel) s = Math.min(scale, ({VH} - 60) / ((rows * 390 + 80) * spacing), ({VW} - 40) / (760 * spacing));
    var res = placeLayout({{ layout: key, scale: s, spacing: spacing, hero: hero, crown: crown, mirror: mirror === 'alternate', panel: isPanel, rows: rows }}, {VW}, {VH});
    var items = res.items.map(function (it) {{
      return {{ src: SRC[it.m], x: it.x.toFixed(1), y: it.y.toFixed(1), w: it.w.toFixed(1), h: it.h.toFixed(1), tf: it.flip ? 'scaleX(-1)' : 'none' }};
    }});
    var L = LAYOUTS[key];
    var title = isPanel ? 'Reference panel' : L.title;
    var note = isPanel ? 'Your layout, rebuilt from the master motifs: floral crown over barong, temple gates over boats, lotus-bud finials.' : L.note;
    return {{
      items: items, groundNow: ground, title: title, note: note, isPanel: isPanel,
      layouts: this.chips(LAYOUT_LIST, 'layout', layout), grounds: this.chips(GROUNDS, 'ground', ground),
      heroes: this.chips(HEROES, 'hero', hero), crowns: this.chips(CROWNS, 'crown', crown),
      mirrors: this.chips([['same', 'Same way'], ['alternate', 'Mirrored']], 'mirror', mirror),
      scaleTxt: s.toFixed(2), scaleDn: this.step('scale', -0.1, 0.4, 1.6, scale), scaleUp: this.step('scale', 0.1, 0.4, 1.6, scale),
      spacingTxt: spacing.toFixed(2), spacingDn: this.step('spacing', -0.05, 0.8, 1.5, spacing), spacingUp: this.step('spacing', 0.05, 0.8, 1.5, spacing),
      rowsTxt: String(rows), rowsDn: this.step('rows', -1, 1, 6, rows), rowsUp: this.step('rows', 1, 1, 6, rows),
      readout: (isPanel ? 'Panel · ' + rows + ' repeats' : 'Tile ' + Math.round(res.tw) + ' × ' + Math.round(res.th) + ' px') + ' · ' + items.length + ' motifs placed · recipe: pattern-layouts/' + key + '/recipe.json'
    }};
  }}
}}
</script>
</body>
</html>
'''
open("canvas/project/Pattern-Builder.dc.html","w").write(builder)
print("ok")
