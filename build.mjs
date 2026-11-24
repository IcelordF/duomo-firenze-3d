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
    // il cantiere usa solo le tappe; le curiosità (c-*) servono al racconto
    const audio = Object.fromEntries(Object.entries(parts.AUDIO_ALL).filter(([id]) => page === 'basilica' ? /^b-/.test(id) : page === 'racconto' ? !/^b-/.test(id) : !/^[cab]-/.test(id)));
    parts.AUDIO = `window.CUPOLA_AUDIO=${JSON.stringify(audio)};`;
    let html = tr(rd(`src/${page}.html`, 'utf8'), lang);
    for (let k = 0; k < 3; k++)                       // le parti possono contenere altri segnaposto (HEAD → STYLE → FONTS)
      html = html.replace(/\/\*@(\w+)\*\//g, (_, key) => key in parts ? parts[key].replace(/<\/script/gi, '<\\/script') : `/*@${key}*/`);
    const out = `dist/cupola-${page}${sfx}.html`;
    wr(out, html);
    console.log(out, (html.length / 1024 | 0) + ' KB');
  }
}
