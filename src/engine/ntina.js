// Ported to an ES module from the published Batik Pattern Studio (contract 0.2.91). Logic unchanged.
import { AR, LAYOUTS } from './layouts.js';
import { ORIGINS, ORIGIN_SOURCES } from './signature.js';

// Ntina: our Central Sulawesi signature system (primary mark, line version, pattern unit).
// Inspired by taiganja (Kaili and Kulawi open-oval ornament) and the Bomba flower. Flat, one ink, reproducible.
Object.assign(AR, { 'ntina-mark': 1.0, 'ntina-line': 1.0, 'ntina-tile': 1.0 });
var NTINA = ['ntina-mark', 'ntina-line', 'ntina-tile'];

LAYOUTS['ntina-stream'] = {
  title: 'Ntina Stream', note: 'The pattern unit tiled: each stem runs as a line of cecek into the horns of the mark below; ketupat diamonds and golden-angle blooms grow where tiles meet.',
  tw: 300, th: 300,
  items: function (o) { return [['ntina-tile', 0, 0, 300, false]]; }
};
LAYOUTS['ntina-cascade'] = {
  title: 'Ntina Cascade', note: 'Half-drop rhythm of the solid mark and the line version: a call and answer, like a stamped cloth.',
  tw: 340, th: 420,
  items: function (o) { return [['ntina-mark', 0, 0, 170, false], ['ntina-line', 170, 210, 150, false]]; }
};

ORIGINS['ntina'] = {
  title: 'Ntina', from: 'Kaili · Kulawi · Central Sulawesi',
  inspired: 'Taiganja, the open-oval ornament of the Kaili and Kulawi peoples, given at weddings and kept as an heirloom; in Kaili, tai means womb and ganja means shape. Ntina are the women who keep the custom. The seed head honours bomba, the Kaili word for flower.',
  own: 'A flat, one-ink mark built over four sketchbook rounds: the open-oval silhouette, a seed head of 21 dots at the golden angle, horns as one upswept crescent; a line version for stamps and embroidery; a pattern unit where each stem flows into the horns below.',
  meaning: 'Origin and growth; honour to the women who keep the custom. Used only as a whole, upright mark, never as filler or cut by an edge.',
  src: ['taiganja-wiki', 'natgeo-taiganja', 'met-taiganja', 'iwarebatik-cs']
};
ORIGIN_SOURCES['taiganja-wiki'] = ['Taiganja (Wikipedia)', 'https://en.wikipedia.org/wiki/Taiganja'];
ORIGIN_SOURCES['natgeo-taiganja'] = ['Taiganja, symbol honouring women, National Geographic Indonesia', 'https://nationalgeographic.grid.id/read/133823142/taiganja-simbol-tradisi-sulawesi-tengah-untuk-memuliakan-perempuan?page=all'];
ORIGIN_SOURCES['met-taiganja'] = ['The Met: Taiganja (ornament), Kulawi artist', 'https://www.metmuseum.org/art/collection/search/320836'];
var NTINA_CREDIT = 'Ntina: original designs inspired by taiganja of the Kaili and Kulawi peoples and the Bomba flower of Central Sulawesi, honouring the women who keep the custom.';


export { NTINA, NTINA_CREDIT };
