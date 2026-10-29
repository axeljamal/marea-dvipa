// Studio catalogue: every list, preset and rule the controls read from. Ported from the published studio.
import { GENERATORS, FIB_COUNTS } from '../engine';

export const REPEAT_LIST = [["reference-panel","Reference panel"],["temple-column","Temple column"],["royal-damask","Royal damask"],["ocean-voyage","Ocean voyage"],["lotus-garden","Lotus garden"],["temple-frieze","Temple frieze"],["dua-pulau-sarong","Dua Pulau sarong"],["ketupat-field","Ketupat field"],["ntina-stream","Ntina stream"],["ntina-cascade","Ntina cascade"]];
export const SIG_INKS = [["dua-pulau","Dua Pulau"],["buya-bomba","Buya Bomba"]];
export const TEXTURES = [["none","None"],["cecek","Cecek"],["zigzag","Zigzag"],["sero","Sero"]];
export const FLOW_LIST = Object.keys(GENERATORS).map((k) => [k, GENERATORS[k].title]);
export const LAYOUT_LIST = REPEAT_LIST.concat(FLOW_LIST);
export const DIRECTIONS = [["upright","Upright"],["diagonal","Diagonal 45°"],["tossed","Tossed"],["alternate","Mirrored rows"]];
export const ORIENTS = [["flow","Follow the flow"],["upright","Upright"]];
export const LINE_INKS = [["gold","Gold"],["teal","Teal"],["pearl","Pearl"],["navy","Navy"],["off","Off"]];
export const LINE_HEX = { gold: "#C39B65", teal: "#527582", pearl: "#FAF7F2", navy: "#02213D" };
export const COUNTS = FIB_COUNTS.map((n) => [n, String(n)]);
export const GROUNDS = [["#FAF7F2","Pearl"],["#E5DFD4","Ivory"],["#D2C7B6","Sand"],["#B9D4CF","Seafoam"],["#2A6F74","Teal"],["#1F5C63","Deep teal"],["#0F3049","Deep navy"],["#02213D","Midnight"],["#0E0C09","Bomba black"],["#F4EEE3","Ntina paper"]];
export const MOOD = {"#F4EEE3":"warm paper for one-ink Ntina prints; Bomba black reads at full strength","#0E0C09":"the black of the Donggala buya bomba; gold reads at full strength, navy disappears, so pair it with the Buya Bomba signature ink","#FAF7F2":"closest to your original sheet; crisp and heritage","#E5DFD4":"soft and aged, like hand-printed cotton","#D2C7B6":"warm linen; gold sinks in, navy leads","#B9D4CF":"airy coastal; navy leads, gold is a quiet accent","#2A6F74":"lagoon teal; navy and gold both stay readable, the most balanced dark ground","#1F5C63":"deep teal; gold glows, navy turns to shadow for depth","#0F3049":"rich and formal; gold-forward, navy becomes texture","#02213D":"ceremonial night; gold-forward with the strongest glow"};
export const HEROES = [["barong-mask","Barong"],["lotus-floral-motif","Lotus floral"],["large-floral-ornament","Large floral"],["dua-pulau-medallion","Dua Pulau medallion"],["bomba-rosette","Bomba rosette"],["ntina-mark","Ntina mark"]];
export const CROWNS = [["large-floral-ornament","Large floral"],["lotus-floral-motif","Lotus floral"],["lotus-flower","Lotus flower"],["bomba-rose","Bomba rose"],["bomba-rosette","Bomba rosette"]];
export const INKS = [["Temple gold","#C39B65"],["Midnight navy","#02213D"],["Pearl keyline","#FAF7F2"]];
export const USE = {"reference-panel":"a vertical panel: sarong, scarf drop or a door-height wall piece","temple-column":"an all-over repeat for shirts, cushions and wallpaper","royal-damask":"formal all-over: upholstery, curtains, wallcovering","ocean-voyage":"a directional print: tees, swimwear, bags (keep the boats facing one way)","lotus-garden":"a quiet ground print: bedding, linings, packaging; try a small scale","temple-frieze":"stripes for hems, borders and table runners","fibonacci-bloom":"placement prints: silk scarves, cushion centres, rugs, a statement back panel","golden-section":"art prints, wall panels and editorial layouts where the construction is part of the beauty","fibonacci-river":"engineered border flows: dresses, curtains and long runners","golden-spiral":"a single hero placement: scarf squares, tote fronts, round tablecloths","dua-pulau-sarong":"a sarong body or kain panjang: banded, festive, made to be worn","ketupat-field":"a ground cloth for shirts, cushions and linings with a quiet geometric rhythm","bomba-garden":"a placement print: scarf squares, a cushion front, a wedding sarong head panel","ntina-stream":"an all-over signature cloth: shirts, linings, packaging, digital backgrounds","ntina-cascade":"stamped-cloth rhythm for scarves, tote bags, stationery and screens"};
export const FOLDER = {'temple-column':'01','royal-damask':'02','ocean-voyage':'03','lotus-garden':'04','temple-frieze':'05'};
export const PRESETS = [
  {name:"Temple Heritage", tag:"Your original", layout:"reference-panel", ground:"#FAF7F2", hero:"barong-mask", crown:"large-floral-ornament", scale:1, spacing:1, boats:"same", rows:2, why:"The cream ground of your source sheet: navy reads at full strength and gold stays warm. The truest version of the original."},
  {name:"Lagoon Temple", tag:"Teal", layout:"temple-column", ground:"#2A6F74", hero:"barong-mask", crown:"lotus-floral-motif", scale:0.8, spacing:1.05, boats:"same", why:"Teal sits between navy and gold in value, so both inks stay readable and it echoes the sea under the boats."},
  {name:"Deep Teal Damask", tag:"Teal", layout:"royal-damask", ground:"#1F5C63", hero:"barong-mask", crown:"large-floral-ornament", scale:0.85, spacing:1.1, boats:"same", why:"Gold glows on deep teal while navy turns to shadow, giving the damask a carved, lacquered depth."},
  {name:"Seafoam Voyage", tag:"Teal", layout:"ocean-voyage", ground:"#B9D4CF", hero:"barong-mask", crown:"lotus-flower", scale:0.8, spacing:1, boats:"mirrored", why:"Pale seafoam turns the waves into water; mirrored boats read as a fleet rather than a stamp."},
  {name:"Midnight Ceremony", tag:"Gold-forward", layout:"royal-damask", ground:"#02213D", hero:"barong-mask", crown:"large-floral-ornament", scale:0.9, spacing:1, boats:"same", why:"Gold reaches 6:1 on midnight and the pearl keylines sparkle; the navy dissolves, so motifs read as gold filigree."},
  {name:"Ivory Lotus", tag:"Quiet", layout:"lotus-garden", ground:"#E5DFD4", hero:"lotus-floral-motif", crown:"lotus-flower", scale:0.7, spacing:1.15, boats:"same", why:"Small scale on ivory is calm enough for bedding or linings."},
  {name:"Lagoon Bloom", tag:"Fibonacci", layout:"fibonacci-bloom", ground:"#2A6F74", hero:"barong-mask", crown:"large-floral-ornament", scale:1, articulation:0.3, count:34, orient:"flow", lines:"gold", seed:1618, why:"34 motifs set at the golden angle around the barong on teal, with gold parastichy lines. A scarf or cushion placement that reads as a single bloom."},
  {name:"Golden Construction", tag:"Fibonacci", layout:"golden-section", ground:"#FAF7F2", hero:"barong-mask", crown:"large-floral-ornament", scale:1, articulation:0.1, count:34, orient:"upright", lines:"gold", seed:233, why:"Strict golden rectangles on pearl with the construction lines visible: an architectural art print where the maths is the ornament."},
  {name:"Night Spiral", tag:"Fibonacci", layout:"golden-spiral", ground:"#02213D", hero:"barong-mask", crown:"large-floral-ornament", scale:1, articulation:0.7, count:34, orient:"flow", lines:"teal", seed:377, why:"Three golden-spiral arms with expressive counter-spirals on midnight; gold motifs swirl out from a calm centre."},
  {name:"Teal River", tag:"Fibonacci", layout:"fibonacci-river", ground:"#1F5C63", hero:"barong-mask", crown:"lotus-floral-motif", scale:1, articulation:0.5, count:34, orient:"flow", lines:"gold", seed:610, why:"Currents phase-shifted by the golden angle on deep teal; the motif swell 1·2·3·5·3·2·1 makes a border flow for a long dress or runner."},
  {name:"Two Islands", tag:"Signature", layout:"bomba-garden", ground:"#0E0C09", hero:"barong-mask", crown:"bomba-rose", scale:1, articulation:0.3, count:34, orient:"flow", lines:"gold", seed:2009, sigInk:"buya-bomba", texture:"none", why:"Bali at the heart, Sulawesi blooming around it: Bomba roses and cloves at the golden angle on buya bomba black, gold ink."},
  {name:"Dua Pulau Sarong", tag:"Signature", layout:"dua-pulau-sarong", ground:"#FAF7F2", hero:"barong-mask", crown:"bomba-rose", scale:0.8, spacing:1, sigInk:"dua-pulau", texture:"cecek", direction:"upright", why:"Rebung bands frame the barong and the Bomba rose taking turns, on a cecek-dotted pearl ground. A wearable sarong body."},
  {name:"Ntina Stream", tag:"Ntina", layout:"ntina-stream", ground:"#2A6F74", hero:"barong-mask", crown:"bomba-rose", scale:1, spacing:1, direction:"upright", why:"Our signature pattern on lagoon teal: each stem flows as cecek into the horns below, with ketupat diamonds and golden-angle blooms where tiles meet. One flat ink, so it prints, stamps or embroiders the same."},
  {name:"Ntina Cascade", tag:"Ntina", layout:"ntina-cascade", ground:"#F4EEE3", hero:"barong-mask", crown:"bomba-rose", scale:0.9, spacing:1.1, direction:"alternate", why:"Solid mark and line version answer each other in a half-drop on paper, black ink. Mirrored rows keep the marks upright while the rhythm alternates."},
  {name:"Ntina Garden", tag:"Ntina", layout:"bomba-garden", ground:"#0E0C09", hero:"ntina-mark", crown:"bomba-rose", scale:1, articulation:0.2, count:34, orient:"flow", lines:"gold", lineStyle:"rebung", seed:3355, sigInk:"buya-bomba", why:"The Ntina mark at the heart of a Bomba garden on black, rebung ribbons tracing the spirals: the signature as a placement for a scarf or sarong head panel."},
  {name:"Ketupat Night", tag:"Signature", layout:"ketupat-field", ground:"#0E0C09", hero:"barong-mask", crown:"bomba-rosette", scale:0.7, spacing:1, sigInk:"buya-bomba", texture:"none", direction:"upright", why:"The head-panel diamonds of buya bomba as an all-over ground, gold on black, rosettes on every other diamond."}
];
export const STARTERS = ["Our Dua Pulau signature for a wedding sarong", "Teal resort shirt, subtle", "Fibonacci silk scarf, expressive", "Luxury hotel wallpaper", "Wedding sarong panel", "Calm kids' bedding", "Make the current one bolder"];

export const DEFAULTS = Object.freeze({ layout: 'reference-panel', ground: '#FAF7F2', hero: 'barong-mask', crown: 'large-floral-ornament', scale: 1, spacing: 1, rows: 2, boats: 'same', direction: 'upright', articulation: 0.3, count: 34, orient: 'flow', lines: 'gold', seed: 1618, sigInk: 'dua-pulau', texture: 'none', origin: 'bomba-rose', lineStyle: 'line' });
export const STORE = 'batik-studio-v3';
// which controls each layout actually uses; the rest are dimmed with a reason
export const USES = {
  'reference-panel': { hero: 1, crown: 1, boats: 1, rows: 1, spacing: 1 },
  'temple-column': { hero: 1, crown: 1, boats: 1, spacing: 1, direction: 1 },
  'royal-damask': { hero: 1, crown: 1, spacing: 1, direction: 1 },
  'ocean-voyage': { boats: 1, spacing: 1, direction: 1 },
  'lotus-garden': { spacing: 1, direction: 1 },
  'temple-frieze': { hero: 1, spacing: 1, direction: 1 },
  'dua-pulau-sarong': { hero: 1, spacing: 1, direction: 1 },
  'ketupat-field': { spacing: 1, direction: 1 },
  'ntina-stream': { spacing: 1, direction: 1 },
  'ntina-cascade': { spacing: 1, direction: 1 },
  'fibonacci-bloom': { hero: 1, crown: 1 }, 'golden-section': { hero: 1, crown: 1 },
  'fibonacci-river': { hero: 1, crown: 1 }, 'golden-spiral': { hero: 1, crown: 1 },
  'bomba-garden': { hero: 1 }
};
export const LABELS = { layout: 'Layout', ground: 'Ground', hero: 'Hero', crown: 'Crown', scale: 'Scale', spacing: 'Spacing', rows: 'Repeats', boats: 'Boats', direction: 'Direction', articulation: 'Articulation', count: 'Count', orient: 'Orientation', lines: 'Linework', seed: 'Seed', sigInk: 'Signature ink', texture: 'Isen ground', origin: 'Origin', lineStyle: 'Line style' };
export const BOATS = [['same', 'Boats same way'], ['mirrored', 'Boats mirrored']];
export const LINE_STYLES = [['line', 'Line'], ['rebung', 'Rebung ribbon']];

// One colour, two grounds (after Josef Albers)
export const ALB_INKS = [['#C39B65','Temple gold'],['#02213D','Midnight navy'],['#FAF7F2','Pearl keyline'],['#527582','Teal line'],['#C9A35A','Bomba gold'],['#0E0C09','Bomba black']];
export const ALB_FORMS = [['ntina-mark','Ntina mark'],['ntina-line','Ntina line'],['square','Albers square']];
export const ALB_BRIDGE = [['off','Hidden'],['on','Show the bridge']];
export const ALB_STORE = 'batik-albers-v1';

// Katagami bridge check
export const KATA_MOTIFS = [['ntina-mark','Ntina mark'],['ntina-line','Ntina line'],['ntina-tile','Ntina tile'],['dua-pulau-medallion','Dua Pulau medallion'],['bomba-rosette','Bomba rosette'],['bomba-rose','Bomba rose'],['cengkeh-sprig','Cengkeh sprig'],['ketupat-lattice','Ketupat lattice'],['rebung-border','Rebung border']];
export const KATA_SIZES = [[3,'3 cm stamp'],[8,'8 cm print'],[20,'20 cm panel']];
export const KATA_VIEWS = [['stencil','Stencil'],['print','Print with bridges']];
export const KATA_LAYERS = [['all','All inks, one colour'],['gold','Gold screen'],['blue','Navy and teal screen']]; // one stencil per colour, as in multi-screen printing
export const KATA_WRAP = { 'ntina-tile': 'xy', 'ketupat-lattice': 'xy', 'rebung-border': 'x' }; // seamless repeats are checked as a continuous cloth
export const KATA_LAND = 1.0, KATA_CUT = 0.6, KATA_RES = 360, KATA_STORE = 'batik-kata-v1';
export const KATA_COL = { paper: '#8A5A2E', cut: '#F4EEE3', island: '#D9654B', thin: '#E0B04A', fine: '#4FA8BD', thread: '#1A1410', ink: '#16130F', sheet: '#F4EEE3' };
