// Costruisce le pagine standalone (italiano e inglese): inlinea three.js, font, motore, contenuti e parlato.
// Uso: node build.mjs   →  dist/cupola-{cantiere,racconto}.html  e  dist/cupola-{cantiere,racconto}-en.html
import { readFileSync as rd, writeFileSync as wr, readdirSync, mkdirSync, existsSync } from 'node:fs';
const three = rd('vendor/three.module.min.js', 'utf8');
const i = three.lastIndexOf('export{');
const exp = three.slice(i + 7, three.lastIndexOf('}'))
  .split(',').map(e => { const [a, b] = e.split(' as '); return `${b ?? a}:${a}`; }).join(',');
const threeClassic = `(()=>{${three.slice(0, i)};window.THREE={${exp}};})();`;
// GLTFLoader (three r170, stessa versione) come script classico: gli import diventano letture da window.THREE
const esm2classic = src => src.replace(/import\s*\{([^}]*)\}\s*from\s*'three';/g, (_, n) => `const {${n.replace(/\s+as\s+/g, ': ')}} = window.THREE;`);
const bgu = esm2classic(rd('vendor/BufferGeometryUtils.js', 'utf8')).replace(/^export /gm, '');
const gltf = esm2classic(rd('vendor/GLTFLoader.js', 'utf8')).replace(/import\s*\{[^}]*\}\s*from\s*'..\/utils\/BufferGeometryUtils.js';/, '').replace(/^export\s*\{[^}]*\};?/gm, '');
const loaderClassic = `window.__BGU=(()=>{${bgu}\nreturn{toTrianglesDrawMode,mergeGeometries};})();(()=>{const{toTrianglesDrawMode}=window.__BGU;${gltf}\nwindow.THREE_GLTFLoader=GLTFLoader;})();`;
const font = (fam, file, w, st = 'normal') =>
  `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${rd('vendor/' + file + '.woff2').toString('base64')}) format('woff2')}`;
const fonts = [
  font('Cormorant', 'cormorant-garamond-latin-600-normal', 600),
  font('Cormorant', 'cormorant-garamond-latin-600-italic', 600, 'italic'),
  font('Lexend', 'lexend-latin-400-normal', 400),
  font('Lexend', 'lexend-latin-700-normal', 700)
].join('\n');
// parlato delle schede (vendor/audio[-en]/<id>.mp3) incorporato come data URI
const audioFor = dir => existsSync(dir) ? Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.mp3'))
  .map(f => [f.slice(0, -4), 'data:audio/mpeg;base64,' + rd(`${dir}/${f}`).toString('base64')])) : {};
// stringhe dell'interfaccia (HTML e JS) da tradurre per l'inglese: [italiano, inglese]
const UI_EN = JSON.parse(rd('src/ui-en.json', 'utf8'));
const tr = (s, lang) => lang === 'en' ? UI_EN.reduce((t, [a, b]) => t.split(a).join(b), s) : s;

// SEO: titolo, descrizione, Open Graph e dati strutturati per ogni pagina e lingua
const REPO = 'https://github.com/IcelordF/duomo-firenze-3d';
const SITE = 'https://icelordf.github.io/duomo-firenze-3d/';   // GitHub Pages del repo (ramo main, radice): le pagine stanno in dist/
const OG_IMG = { cantiere: 'cantiere-palla', racconto: 'cantiere-spina', basilica: 'basilica-copertina' };
const SEO = {
  cantiere: { it: ['Cupola di Brunelleschi in 3D: il cantiere anno per anno', 'Guarda crescere la cupola di Santa Maria del Fiore dal 1418 al 1471 in un modello 3D interattivo: macchine, spina di pesce, catene e ponteggi interni.'],
              en: ["Brunelleschi's dome in 3D: the building site year by year", 'Watch the dome of Florence Cathedral rise from 1418 to 1471 in an interactive 3D model: hoisting machines, herringbone brickwork, chains and inner scaffolding.'] },
  racconto: { it: ['Brunelleschi e la cupola di Firenze: la storia in 3D', 'La sfida di Filippo Brunelleschi raccontata per la scuola media: il concorso, la doppia cupola, le curiosità del cantiere e un quiz finale, con voce narrante.'],
              en: ['Brunelleschi and the dome of Florence: the story in 3D', "Filippo Brunelleschi's challenge told for middle-school students: the competition, the double shell, stories from the building site and a final quiz, with narration."] },
  basilica: { it: ['Duomo di Firenze in 3D: visita guidata alla basilica', 'Santa Maria del Fiore capitolo per capitolo: facciata, Porta del Paradiso, Campanile di Giotto, Battistero e interno da percorrere a piedi in un modello 3D.'],
              en: ['Florence Cathedral in 3D: a guided tour of the basilica', "Santa Maria del Fiore chapter by chapter: the facade, the Gates of Paradise, Giotto's Bell Tower, the Baptistery and a walkable interior in a 3D model."] }
};
const esc = t => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function seo(page, lang) {
  const [title, desc] = SEO[page][lang], it = lang === 'it';
  const ld = { '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description: desc, inLanguage: lang,
    learningResourceType: it ? 'modello 3D interattivo' : 'interactive 3D model', educationalLevel: it ? 'scuola secondaria di primo grado' : 'middle school',
    isAccessibleForFree: true, license: REPO + '/blob/main/LICENSE', isBasedOn: REPO, url: `${SITE}dist/cupola-${page}${it ? '' : '-en'}.html`, image: `${SITE}docs/screenshots/${OG_IMG[page]}.jpg`,
    about: { '@type': 'LandmarksOrHistoricalBuildings', name: 'Cattedrale di Santa Maria del Fiore', sameAs: 'https://it.wikipedia.org/wiki/Cattedrale_di_Santa_Maria_del_Fiore' },
    creator: { '@type': 'Person', name: 'IcelordF', url: 'https://github.com/IcelordF' } };
  return [`<title>${esc(title)}</title>`, `<meta name="description" content="${esc(desc)}">`,
    `<meta name="keywords" content="${it ? 'cupola del Brunelleschi, Duomo di Firenze, Santa Maria del Fiore, Brunelleschi, modello 3D, Campanile di Giotto, Battistero, storia dell\'arte, scuola media' : "Brunelleschi's dome, Florence Cathedral, Santa Maria del Fiore, Brunelleschi, 3D model, Giotto's Bell Tower, Baptistery, art history, middle school"}">`,
    '<meta name="author" content="IcelordF">', '<meta name="theme-color" content="#1d1813">',
    `<link rel="canonical" href="${SITE}dist/cupola-${page}${it ? '' : '-en'}.html">`,
    `<link rel="alternate" hreflang="it" href="${SITE}dist/cupola-${page}.html">`, `<link rel="alternate" hreflang="en" href="${SITE}dist/cupola-${page}-en.html">`,
    `<meta property="og:url" content="${SITE}dist/cupola-${page}${it ? '' : '-en'}.html">`, `<meta property="og:image" content="${SITE}docs/screenshots/${OG_IMG[page]}.jpg">`,
    `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="${it ? 'La cupola di Brunelleschi' : "Brunelleschi's dome"}">`,
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(desc)}">`, `<meta property="og:locale" content="${it ? 'it_IT' : 'en_GB'}">`,
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(desc)}">`,
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>`].join('\n');
}
mkdirSync('dist', { recursive: true });
for (const lang of ['it', 'en']) {
  const sfx = lang === 'en' ? '-en' : '';
  const parts = {
    AUDIO_ALL: audioFor(lang === 'en' ? 'vendor/audio-en' : 'vendor/audio'),
    THREE: threeClassic + '\n' + loaderClassic, MODEL: `window.CUPOLA_MODELS=${JSON.stringify(Object.fromEntries(['duomo', 'campanile', 'battistero'].map(n => [n, 'data:model/gltf-binary;base64,' + rd(`vendor/model/${n}.glb`).toString('base64')])))};`, FRESCO: rd('src/fresco.js', 'utf8') + '\n' + rd('src/build3d.js', 'utf8'),
    // immagini originali (Wikimedia Commons) e loro crediti: vendor/img/*.jpg + vendor/img/credits.json
    IMG: `window.CUPOLA_IMG=${JSON.stringify(Object.fromEntries(readdirSync('vendor/img').filter(f => f.endsWith('.jpg'))
      .map(f => [f.replace('-fresco', '').slice(0, -4), 'data:image/jpeg;base64,' + rd('vendor/img/' + f).toString('base64')])))};window.CUPOLA_CREDITS=${rd('vendor/img/credits.json', 'utf8')};`,
    ENGINE: tr(rd('src/engine.js', 'utf8'), lang), SECTION: tr(rd('src/section2d.js', 'utf8'), lang), UI: tr(rd('src/ui.js', 'utf8'), lang),
    DATA: rd('src/data.js', 'utf8') + (lang === 'en' ? '\n' + rd('src/i18n-en.js', 'utf8') : ''),
    STYLE: rd('src/common.css', 'utf8').replace('/*@FONTS*/', fonts), HEAD: rd('src/head.html', 'utf8'),
    SHELL: tr(rd('src/shell.html', 'utf8'), lang), BUTTONS: tr(rd('src/buttons.html', 'utf8'), lang)
  };
  for (const page of ['cantiere', 'racconto', 'basilica']) {
    parts.SEO = seo(page, lang);
    // il cantiere usa solo le tappe; le curiosità (c-*) servono al racconto
    const audio = Object.fromEntries(Object.entries(parts.AUDIO_ALL).filter(([id]) => page === 'basilica' ? /^b-/.test(id) : page === 'racconto' ? !/^b-/.test(id) : !/^[cab]-/.test(id)));
    parts.AUDIO = `window.CUPOLA_AUDIO=${JSON.stringify(audio)};`;
    let html = tr(rd(`src/${page}.html`, 'utf8'), lang);
    for (let k = 0; k < 3; k++)                       // le parti possono contenere altri segnaposto (HEAD → STYLE → FONTS)
      html = html.replace(/\/\*@(\w+)\*\//g, (_, key) => key in parts ? (key === 'SEO' ? parts[key] : parts[key].replace(/<\/script/gi, '<\\/script')) : `/*@${key}*/`   /* SEO contiene un vero <script> JSON-LD */);
    const out = `dist/cupola-${page}${sfx}.html`;
    wr(out, html);
    console.log(out, (html.length / 1024 | 0) + ' KB');
  }
}
