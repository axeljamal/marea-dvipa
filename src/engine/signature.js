// Ported to an ES module from the published Batik Pattern Studio (contract 0.2.91). Logic unchanged.
import { AR, LAYOUTS } from './layouts.js';
import { GENERATORS, ladder } from './fibonacci.js';

// Dua Pulau signature: original Bomba-inspired motifs, layouts, a generator and their origins.
Object.assign(AR, { 'bomba-rose': 1.4, 'bomba-rosette': 1.0, 'rebung-border': 0.328, 'ketupat-lattice': 1.0, 'cengkeh-sprig': 1.15, 'dua-pulau-medallion': 1.0 });
var SIGNATURE = ['bomba-rose', 'bomba-rosette', 'rebung-border', 'ketupat-lattice', 'cengkeh-sprig', 'dua-pulau-medallion'];

LAYOUTS['dua-pulau-sarong'] = {
  title: 'Dua Pulau Sarong', note: 'Rebung bands framing a row where the Bali hero and the Bomba rose take turns, clove sprigs between.',
  tw: 640, th: 600,
  items: function (o) {
    return [['rebung-border', 0, 0, 640, false],
      [o.hero, -160, 330, 150, false], ['bomba-rose', 160, 320, 140, false],
      ['cengkeh-sprig', 0, 360, 92, false], ['lotus-bud', 320, 350, 40, false]];
  }
};
LAYOUTS['ketupat-field'] = {
  title: 'Ketupat Field', note: 'The belah ketupat lattice as a ground, Bomba rosettes blooming on every other diamond.',
  tw: 300, th: 300,
  items: function (o) {
    return [['ketupat-lattice', 0, 0, 300, false], ['bomba-rosette', 150, 150, 120, false], ['lotus-bud', 0, 0, 34, false]];
  }
};

GENERATORS['bomba-garden'] = {
  title: 'Bomba Garden',
  note: 'Two islands in one bloom: the Bali hero at the heart, Bomba roses, rosettes and cloves spiralling out around it.',
  rule: function (o) { return 'Vogel phyllotaxis again: each motif turns 137.5° from the last, radius ∝ √n. The ladder moves outward from the hero through Bomba rosette, Bomba rose (stems pointing home to the centre), clove sprig and lotus bud, stepping down by φ across Fibonacci tiers. ' + o.count + ' motifs. Bomba means flower in Kaili, so the garden is the name made visible.'; },
  make: function (o, vw, vh, R) {
    var oo = Object.assign({}, o, { ladder: [o.hero, 'bomba-rosette', 'bomba-rose', 'cengkeh-sprig', 'bomba-rosette', 'bomba-rose', 'lotus-bud', 'lotus-bud'] });
    return GENERATORS['fibonacci-bloom'].make(oo, vw, vh, R);
  }
};

var ORIGIN_SOURCES = {
  'inayah-2025': ['Inayah & Fatimah, Analisis Ikonografi Kain Tenun Donggala Bermotif "Buya Bomba", Societies, 2025', 'https://ojs.unm.ac.id/societies/article/view/73950'],
  'oktaria-2018': ['Oktaria, Pengolahan Motif pada Buya Bomba, ATRAT, 2018', 'https://jurnal.isbi.ac.id/index.php/atrat/article/view/573'],
  'antara-2011': ['Batik Bomba tandamata dari Palu, ANTARA, 2011', 'https://www.antaranews.com/berita/277926/batik-bomba-tandamata-dari-palu'],
  'detik-2022': ['Mengenal Batik Bomba dari Sulawesi Tengah, detik, 2022', 'https://www.detik.com/sulsel/budaya/d-6405331/mengenal-batik-bomba-dari-sulawesi-tengah-yang-dipakai-elon-musk-di-ktt-b20'],
  'iwarebatik-cs': ['Batik villages in Central Sulawesi, iwarebatik', 'https://www.iwarebatik.org/batik-villages-in-central-sulawesi/'],
  'unesco-batik': ['UNESCO: Indonesian Batik (2009)', 'https://ich.unesco.org/en/Decisions/4.COM/13.44'],
  'canting': ['Canting (Wikipedia)', 'https://en.wikipedia.org/wiki/Canting'],
  'isen-lasem': ['102 Isen-Isen Batik Lasem (Mendeley Data)', 'https://data.mendeley.com/datasets/mjbt8hdvmz']
};
var ORIGINS = {
  'bomba-rose': { title: 'Bomba Rose', from: 'Kaili · Donggala, Central Sulawesi', inspired: 'Mawar bomba, the rose of the Donggala buya bomba sarong, drawn from above with one stem and three leaves.', own: 'Petal rings in Fibonacci counts (13·8·5·3) turned by the golden angle, two-tone brushed petals with cecek veins, a golden-spiral heart, Bali teal and navy leaves.', meaning: 'Pure love for family, kingdom and God.', src: ['inayah-2025', 'detik-2022'] },
  'bomba-rosette': { title: 'Bomba Rosette', from: 'Kaili · Palu, Central Sulawesi', inspired: 'The open bomba flower. Bomba is the Kaili word for flower.', own: 'Five Fibonacci petal rings (21·13·8·5·3), a pure phyllotaxis flower.', meaning: 'Openness and togetherness, as Palu people read the name.', src: ['iwarebatik-cs', 'detik-2022'] },
  'rebung-border': { title: 'Rebung Border', from: 'Donggala buya bomba', inspired: 'Inward-facing rebung (bamboo-shoot) bands with zigzag and dotted framing.', own: 'Two facing rows meeting at a gold zigzag spine with pearl cecek, seamless sideways.', meaning: 'Power, greatness and triumph.', src: ['inayah-2025'] },
  'ketupat-lattice': { title: 'Ketupat Lattice', from: 'Donggala buya bomba (Bugis cobo\')', inspired: 'Belah ketupat diamonds of the sarong head panel.', own: 'A seamless three-tone nested-diamond lattice with pearl cecek crosses.', meaning: 'Courage in proposing marriage; the wisdom of elders.', src: ['inayah-2025'] },
  'cengkeh-sprig': { title: 'Cengkeh Sprig', from: 'Palu batik · Tolitoli clove', inspired: 'The clove motif of Palu batik, honouring Tolitoli\'s harvest.', own: 'A fan of five clove buds, a Fibonacci number, with one navy and one teal leaf.', meaning: 'Healing; wishes for the wearer\'s health.', src: ['detik-2022', 'antara-2011'] },
  'dua-pulau-medallion': { title: 'Dua Pulau Medallion', from: 'Central Sulawesi + Bali', inspired: 'The meeting of Bomba\'s rose and rebung with the Balinese keyline and lotus language.', own: 'Our emblem: a Bomba rose heart, 13 rebung rays, 55 cecek dots and 21 outer leaves, all Fibonacci counts.', meaning: 'Recognition of both origins in one mark.', src: ['inayah-2025', 'iwarebatik-cs'] },
  'isen': { title: 'Isen-isen fills', from: 'Indonesian batik', inspired: 'Cecek dots and sawut lines drawn with the canting; buya bomba zigzag bands; the sero tangga fish trap of Palu batik.', own: 'Three seamless fills (cecek, zigzag, sero) with a deterministic hand tremor.', meaning: 'The patience of hand-drawn batik.', src: ['canting', 'isen-lasem', 'unesco-batik'] },
  'bali': { title: 'Bali master motifs', from: 'Your Balinese motif sheet', inspired: 'Barong, candi bentar gates, perahu boats, lotus and cloud-wave ornaments of Balinese art.', own: 'Cleaned, traced and locked as the master edition v2.0.0, palette sampled from the sheet.', meaning: 'Protection, passage and devotion.', src: ['unesco-batik'] }
};
var CREDIT_LINE = 'Dua Pulau signature: original designs inspired by the Bomba flower of the Kaili people (Donggala and Palu, Central Sulawesi) and by Balinese ornament, with gratitude to the weavers and batik makers who keep these traditions alive.';


export { SIGNATURE, ORIGINS, ORIGIN_SOURCES, CREDIT_LINE };
