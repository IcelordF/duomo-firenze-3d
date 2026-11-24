/* Pittori Canvas2D per le parti disegnate: facciata (Arnolfo e di oggi), vetrate degli occhi del tamburo,
   pareti del crocicchio, recinto del coro, pavimento. Il Giudizio universale invece è la foto CC BY-SA
   proiettata in engine.js (vendor/img/CREDITS.txt). Si disegna in METRI: niente immagini esterne. */
(function () {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- primitive pittoriche (unità: metri, y verso il basso) ----------
  function cloud(g, x, y, w, h, tone = [246, 238, 222], a = 0.9) {
    for (let i = 0; i < 26; i++) {
      const cx = x + (rnd() - 0.5) * w, cy = y + (rnd() - 0.4) * h, r = (0.25 + rnd() * 0.35) * h;
      const gr = g.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
      gr.addColorStop(0, `rgba(${tone},${a})`); gr.addColorStop(0.7, `rgba(${tone.map(c => c - 30)},${a * 0.55})`); gr.addColorStop(1, `rgba(${tone},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    }
  }
  const SKIN = ['#d9a888', '#c99474', '#e0b597', '#b98264'];
  // figura in piedi o seduta; opz: robe, mantle, halo, wings, crown, seated, nude, dark, dir, arm
  function figure(g, x, y, h, o = {}) {
    const s = h, dir = o.dir || (rnd() < 0.5 ? -1 : 1), body = o.seated ? 0.66 : 1;
    g.save(); g.translate(x, y);
    if (o.halo) { g.fillStyle = 'rgba(226,186,92,.85)'; g.beginPath(); g.arc(0, -0.9 * s * body - 0.02 * s, 0.11 * s, 0, 7); g.fill(); }
    if (o.wings) {
      g.fillStyle = o.wingCol || 'rgba(236,222,200,.95)'; g.strokeStyle = 'rgba(150,120,90,.5)'; g.lineWidth = 0.02 * s;
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, -0.72 * s * body); g.quadraticCurveTo(sd * 0.42 * s, -1.05 * s * body, sd * 0.36 * s, -0.42 * s * body); g.quadraticCurveTo(sd * 0.2 * s, -0.6 * s * body, 0, -0.62 * s * body); g.fill(); g.stroke(); }
    }
    const skin = o.dark ? '#4a5a4c' : pick(SKIN);
    if (o.nude || o.dark) {                                         // dannati e diavoli: corpo nudo, posa piegata
      g.fillStyle = skin; g.strokeStyle = 'rgba(60,30,20,.55)'; g.lineWidth = 0.025 * s;
      g.beginPath(); g.ellipse(0.04 * s * dir, -0.55 * s, 0.13 * s, 0.3 * s, 0.25 * dir, 0, 7); g.fill(); g.stroke();
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 0.06 * s, -0.3 * s); g.lineTo(sd * 0.12 * s + dir * 0.08 * s, 0); g.lineWidth = 0.07 * s; g.strokeStyle = skin; g.stroke(); }
      g.lineWidth = 0.06 * s; g.beginPath(); g.moveTo(0, -0.75 * s); g.lineTo(dir * 0.28 * s, -0.95 * s * (o.arm || 1)); g.stroke();
      if (o.dark) { g.fillStyle = '#2e3a30'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 0.04 * s, -0.98 * s); g.lineTo(sd * 0.1 * s, -1.1 * s); g.lineTo(sd * 0.08 * s, -0.95 * s); g.fill(); } }
    } else {
      const top = -0.8 * s * body, hem = 0, wT = 0.15 * s, wB = (o.seated ? 0.3 : 0.22) * s;
      const gr = g.createLinearGradient(-wB, 0, wB, 0); const c = o.robe || '#8a5a48';
      gr.addColorStop(0, shade(c, -40)); gr.addColorStop(0.45, shade(c, 25)); gr.addColorStop(1, shade(c, -55));
      g.fillStyle = gr; g.beginPath(); g.moveTo(-wT, top); g.quadraticCurveTo(-wB * 1.1, -0.4 * s * body, -wB, hem); g.lineTo(wB, hem); g.quadraticCurveTo(wB * 1.1, -0.4 * s * body, wT, top); g.closePath(); g.fill();
      g.strokeStyle = shade(c, -70); g.lineWidth = 0.018 * s; g.globalAlpha = 0.6;          // pieghe
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 0.04 * s, top + 0.12 * s); g.quadraticCurveTo(k * 0.09 * s + dir * 0.03 * s, -0.35 * s * body, k * 0.1 * s, hem); g.stroke(); }
      g.globalAlpha = 1;
      if (o.mantle) { g.fillStyle = o.mantle; g.beginPath(); g.moveTo(-wT * dir, top); g.quadraticCurveTo(dir * 0.3 * s, -0.45 * s * body, dir * wB, -0.12 * s * body); g.lineTo(dir * wB * 0.4, -0.05 * s * body); g.quadraticCurveTo(0, -0.45 * s * body, -wT * dir * 0.2, top); g.fill(); }
      g.strokeStyle = skin; g.lineWidth = 0.05 * s; g.lineCap = 'round';                        // braccio
      g.beginPath(); g.moveTo(dir * 0.12 * s, top + 0.06 * s); g.quadraticCurveTo(dir * 0.26 * s, top + 0.2 * s * (o.arm || 1), dir * 0.22 * s, top - 0.06 * s * (o.arm || 1)); g.stroke();
      g.fillStyle = skin; g.beginPath(); g.ellipse(0, top - 0.1 * s, 0.065 * s, 0.08 * s, 0, 0, 7); g.fill();
      g.fillStyle = pick(['#5a3a24', '#3a2a1e', '#8a6a3a', '#d8d0c0']); g.beginPath(); g.ellipse(0, top - 0.14 * s, 0.07 * s, 0.05 * s, 0, Math.PI, 0); g.fill();
      if (o.crown) { g.fillStyle = '#d6a843'; g.beginPath(); g.moveTo(-0.07 * s, top - 0.17 * s); for (let k = 0; k <= 4; k++) g.lineTo(-0.07 * s + k * 0.035 * s, top - (k % 2 ? 0.2 : 0.26) * s); g.lineTo(0.07 * s, top - 0.17 * s); g.fill(); }
    }
    g.restore();
  }
  function shade(hex, d) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, v + d)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  function flames(g, x0, x1, y, h) {
    for (let i = 0; i < 60; i++) {
      const x = lerp(x0, x1, rnd()), hh = h * (0.4 + rnd() * 0.6), w = h * 0.12;
      const gr = g.createLinearGradient(0, y, 0, y - hh); gr.addColorStop(0, 'rgba(160,40,10,.85)'); gr.addColorStop(0.5, 'rgba(225,110,30,.6)'); gr.addColorStop(1, 'rgba(250,200,80,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.2, y - hh * 0.5, x + (rnd() - 0.5) * w, y - hh); g.quadraticCurveTo(x + w * 0.3, y - hh * 0.5, x + w, y); g.fill();
    }
  }
  function plasterGrain(g, W, H, a = 0.08) {
    for (let i = 0; i < W * H / 60; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,240' : '90,70,50'},${a * rnd()})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
  }

  // ---------- colonne dell'atlante: una per faccia dell'ottagono, disegno in metri ----------
  function eachFace(g, W, H, fw, fh, draw) {
    const cw = W / 8;
    for (let i = 0; i < 8; i++) { g.save(); g.beginPath(); g.rect(i * cw, 0, cw, H); g.clip(); g.translate(i * cw, 0); g.scale(cw / fw, H / fh); draw(i); g.restore(); }
  }
  // le facce dispari guardano gli assi: 3 = navata (ovest), 1/5/7 = tribune
  const AXIS = i => i % 2 === 1;
  const SERENA = '#8c8d86', SERENA_D = '#6f716b', INTONACO = '#ebe3d1';

  // Pareti del crocicchio (da terra a 13 m sotto l'imposta): arconi sugli assi, porte e lesene sulle diagonali
  function walls(g, W, H, { faceW: fw, faceH: fh }) {
    eachFace(g, W, H, fw, fh, i => {
      g.fillStyle = INTONACO; g.fillRect(0, 0, fw, fh);
      g.fillStyle = SERENA; g.fillRect(0, 0, 1.3, fh); g.fillRect(fw - 1.3, 0, 1.3, fh);           // pilastri d'angolo
      g.fillRect(0, 0, fw, 1.4); g.fillStyle = SERENA_D; g.fillRect(0, 1.4, fw, 0.3);               // cornicione sotto il tamburo
      if (AXIS(i)) {                                                                             // arcone acuto verso navata/tribuna
        const x0 = 2.2, x1 = fw - 2.2, top = 4.5, spring = 15, cx = fw / 2;
        const gr = g.createLinearGradient(0, top, 0, fh); gr.addColorStop(0, '#3a3026'); gr.addColorStop(1, '#5a4a38');
        g.beginPath(); g.moveTo(x0, fh); g.lineTo(x0, spring); g.quadraticCurveTo(x0, top + 2, cx, top); g.quadraticCurveTo(x1, top + 2, x1, spring); g.lineTo(x1, fh); g.closePath();
        g.fillStyle = gr; g.fill(); g.lineWidth = 0.9; g.strokeStyle = SERENA; g.stroke();
        // in fondo: le finestre della tribuna o della navata, luce calda
        for (let k = -1; k <= 1; k++) { g.fillStyle = 'rgba(240,200,140,.55)'; g.fillRect(cx + k * 3 - 0.5, 12, 1, 5); }
      } else {
        g.fillStyle = SERENA; g.fillRect(fw / 2 - 2.1, fh - 7.2, 4.2, 7.2);                       // porta con cornice
        g.fillStyle = '#3d2c1e'; g.fillRect(fw / 2 - 1.5, fh - 6.6, 3, 6.6);
        g.strokeStyle = SERENA; g.lineWidth = 0.4; g.beginPath(); g.arc(fw / 2, fh - 8.6, 2, Math.PI, 0); g.stroke();   // lunetta
        g.fillStyle = 'rgba(120,110,100,.25)'; g.fillRect(3, 6, fw - 6, fh - 16);                  // grande specchiatura
        g.strokeStyle = SERENA; g.lineWidth = 0.25; g.strokeRect(3, 6, fw - 6, fh - 16);
      }
    });
    plasterGrain(g, W, H, 0.06);
  }

  // Tamburo: parete chiara, cornici in pietra serena, occhio a vetrata al centro di ogni faccia
  function drum(g, W, H, { faceW: fw, faceH: fh, glow }) {
    const oc = window.Fresco.OCULI || [];
    eachFace(g, W, H, fw, fh, i => {
      const cx = fw / 2, cy = fh * 0.5, r = 2.35;
      if (!glow) {
        g.fillStyle = INTONACO; g.fillRect(0, 0, fw, fh);
        g.fillStyle = SERENA; g.fillRect(0, 0, fw, 0.9); g.fillRect(0, fh - 1.1, fw, 1.1); g.fillRect(0, 0, 0.9, fh); g.fillRect(fw - 0.9, 0, 0.9, fh);
        g.fillStyle = SERENA_D; g.beginPath(); g.arc(cx, cy, r + 0.7, 0, 7); g.fill();
      } else { g.fillStyle = '#000'; g.fillRect(0, 0, fw, fh); }
      glass(g, cx, cy, r, oc[i] || {}, glow);
    });
    if (!glow) plasterGrain(g, W, H, 0.05);
  }
  // vetrata tonda: sfondo, figure principali, piombi, bordo a segmenti
  function glass(g, cx, cy, r, o, glow) {
    seed = 100 + Math.round(cx * 7 + (o.seed || 0));
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
    const k = glow ? 0.95 : 0.75;
    g.globalAlpha = k; g.fillStyle = o.bg || '#2f4f8a'; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    const figs = o.figs || [{ x: 0, robe: '#b8402e', mantle: '#2f6a46', halo: true }];
    for (const f of figs) figure(g, cx + f.x * r, cy + r * (f.y ?? 0.75), r * (f.h || 1.35), { robe: f.robe, mantle: f.mantle, halo: f.halo, wings: f.wings, crown: f.crown, seated: f.seated, dir: f.dir });
    if (o.mandorla) { g.strokeStyle = '#e8c45a'; g.lineWidth = r * 0.06; g.beginPath(); g.ellipse(cx, cy, r * 0.42, r * 0.7, 0, 0, 7); g.stroke(); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(30,25,20,.55)'; g.lineWidth = r * 0.025;           // piombi
    for (let a = 0; a < 12; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * Math.PI / 6) * r, cy + Math.sin(a * Math.PI / 6) * r); g.globalAlpha = 0.18; g.stroke(); }
    g.globalAlpha = 1; g.restore();
    const ring = o.ring || ['#c8a040', '#8a2a2a', '#2a4a8a', '#3a7a4a'];                         // corona di vetri colorati
    for (let a = 0; a < 24; a++) { g.strokeStyle = ring[a % ring.length]; g.globalAlpha = glow ? 1 : 0.85; g.lineWidth = r * 0.16; g.beginPath(); g.arc(cx, cy, r * 0.92, a * Math.PI / 12, (a + 0.9) * Math.PI / 12); g.stroke(); }
    g.globalAlpha = 1;
  }

  // Pavimento: marmi bianco, rosso e verde scuro, anelli ottagonali e riquadri a losanga
  function floor(g, W, H) {
    const c = W / 2, oct = (r, rot = Math.PI / 8) => { g.beginPath(); for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4; g[k ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c + Math.sin(a) * r); } g.closePath(); };
    g.fillStyle = '#e9e4da'; g.fillRect(0, 0, W, H);
    const bands = [[0.98, '#3f4a43'], [0.93, '#e9e4da'], [0.9, '#9a3c30'], [0.86, '#e9e4da'], [0.6, '#3f4a43'], [0.57, '#e9e4da'], [0.54, '#9a3c30'], [0.51, '#e9e4da']];
    for (const [f, col] of bands) { oct(f * c); g.fillStyle = col; g.fill(); }
    // losanghe nella fascia tra 0,6 e 0,86
    g.save(); oct(0.86 * c); oct(0.6 * c); g.clip('evenodd');
    const st = W / 36;
    for (let x = -W; x < 2 * W; x += st) for (let y = -H; y < 2 * H; y += st) {
      const odd = (Math.round(x / st) + Math.round(y / st)) % 2;
      g.fillStyle = odd ? '#9a3c30' : '#3f4a43'; g.beginPath(); g.moveTo(x, y - st * 0.42); g.lineTo(x + st * 0.42, y); g.lineTo(x, y + st * 0.42); g.lineTo(x - st * 0.42, y); g.fill();
    }
    g.restore();
    plasterGrain(g, W, H, 0.05);
  }

  // Occhi del tamburo, 1434-1445 (faccia → vetrata). NE e SO dedotte dall'ordine del sito della Cattedrale.
  const OCULI = {
    7: { t: 'Incoronazione della Vergine (Donatello)', bg: '#2a4a86', figs: [{ x: -0.3, robe: '#f2eee4', mantle: '#2f4f8a', seated: true, halo: true }, { x: 0.3, robe: '#f2eee4', mantle: '#b8402e', seated: true, halo: true, crown: true, dir: -1 }] },
    6: { t: 'Resurrezione (Paolo Uccello)', bg: '#24406e', figs: [{ x: 0, y: 0.5, robe: '#e8c8b0', mantle: '#c86a4a', halo: true }] },
    5: { t: 'Deposizione (Andrea del Castagno)', bg: '#22386a', figs: [{ x: -0.48, robe: '#b8302a', h: 1.1 }, { x: 0, robe: '#2f6a46', mantle: '#c8a040', halo: true }, { x: 0.48, robe: '#c8a040', mantle: '#8a2a5a', h: 1.1 }] },
    4: { t: 'Natività (Paolo Uccello)', bg: '#2c4a6e', figs: [{ x: -0.35, robe: '#2f4f8a', mantle: '#f0ece0', seated: true, halo: true }, { x: 0.35, robe: '#c8a040', mantle: '#8a4a2a', halo: true, dir: -1 }] },
    3: { t: 'Annunciazione (Paolo Uccello), perduta nel 1828', bg: '#c9d0c6', figs: [], ring: ['#d8dcd0', '#c4ccc0'] },
    2: { t: 'Presentazione al Tempio (Ghiberti)', bg: '#2a487e', figs: [{ x: -0.42, robe: '#b8402e', mantle: '#2f4f8a', halo: true }, { x: 0, y: 0.6, robe: '#e8dcc0', h: 0.9 }, { x: 0.42, robe: '#3a7a4a', mantle: '#c8a040', dir: -1 }] },
    1: { t: "Orazione nell'orto (Ghiberti)", bg: '#2f5a6a', figs: [{ x: 0, y: 0.55, robe: '#b8402e', mantle: '#2f4f8a', halo: true, h: 1.1 }] },
    0: { t: 'Ascensione (Ghiberti)', bg: '#1c348a', figs: [{ x: 0, y: 0.25, robe: '#f2eee4', mantle: '#c8a040', halo: true, h: 1 }, { x: -0.5, y: 0.95, robe: '#b8402e', h: 0.9 }, { x: 0.5, y: 0.95, robe: '#3a7a4a', h: 0.9, dir: -1 }] }
  };
  // Coro di Baccio Bandinelli com'è oggi: recinto basso (~1,5 m), ~23,3 m di diametro (la parte alta fu smontata nel 1842)
  const CHOIR = { r: 11.7, h: 1.5 };

  // recinto del coro: marmo bianco con specchiature in breccia medicea e rilievi
  function choirWall(g, W, H) {
    g.fillStyle = '#efeae0'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 2; k++) {
      const x = 30 + k * 240, gr = g.createLinearGradient(x, 0, x + 200, H); gr.addColorStop(0, '#a8705a'); gr.addColorStop(0.5, '#c89a7a'); gr.addColorStop(1, '#8a5a4a');
      g.fillStyle = gr; g.fillRect(x, 24, 200, 80); g.strokeStyle = '#d8d0c0'; g.lineWidth = 6; g.strokeRect(x, 24, 200, 80);
      for (let f = 0; f < 3; f++) figure(g, x + 45 + f * 55, 98, 66, { robe: '#e8e2d6', mantle: '#d8d0c2' });
    }
    plasterGrain(g, W, H, 0.05);
  }

  // ---------- Facciata (42 × 50 m). today: De Fabris 1887, con la Madonna in trono sotto il rosone;
  // altrimenti la facciata di Arnolfo, incompiuta: marmi e statue solo in basso, sopra pietra nuda (demolita nel 1587).
  const FW = 42, FH = 47.1;
  function facade(g, W, H, { today }) {
    g.save(); g.scale(W / FW, H / FH); g.translate(FW / 2, FH); g.scale(1, -1);     // metri: x da −21 a 21, y da terra in su
    const WH = '#efeae0', GR = '#45604e', PK = '#d7a99c';
    const box = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const lowTop = today ? FH : 11;                                          // Arnolfo: marmi fino a circa 10 m, poco sopra i portali
    // fondo: specchiature bianche con cornici verdi e rosa
    box(-21, 0, 42, FH, today ? WH : '#a8927a');
    if (!today) for (let i = 0; i < 300; i++) box(-21 + rnd() * 42, 11 + rnd() * 39, 0.8 + rnd() * 1.4, 0.35, `rgba(${rnd() < 0.5 ? '120,100,80' : '170,150,125'},.6)`);   // muratura grezza
    for (let x = -21; x < 21; x += 3.5) for (let y = 0; y < lowTop; y += 4) {
      box(x + 0.25, y + 0.3, 3, 3.4, PK); box(x + 0.55, y + 0.6, 2.4, 2.8, WH); g.strokeStyle = GR; g.lineWidth = 0.18; g.strokeRect(x + 0.25, y + 0.3, 3, 3.4);
    }
    for (const x of [-21, -11.6, 10.6, 20]) box(x, 0, 1, lowTop, GR);                // lesene verdi tra le tre parti
    // portali con ghimberga
    const portal = (cx, w, h) => {
      box(cx - w / 2 - 0.8, 0, w + 1.6, h + 0.6, WH);
      g.fillStyle = '#5a4630'; g.beginPath(); g.moveTo(cx - w / 2, 0); g.lineTo(cx - w / 2, h * 0.7); g.quadraticCurveTo(cx - w / 2, h, cx, h); g.quadraticCurveTo(cx + w / 2, h, cx + w / 2, h * 0.7); g.lineTo(cx + w / 2, 0); g.fill();
      g.fillStyle = PK; g.beginPath(); g.moveTo(cx - w / 2 - 1, h + 0.4); g.lineTo(cx, h + w * 0.75); g.lineTo(cx + w / 2 + 1, h + 0.4); g.fill();
      g.strokeStyle = WH; g.lineWidth = 0.3; g.stroke();
      g.fillStyle = '#e8c870'; g.beginPath(); g.arc(cx, h * 0.82, w * 0.22, 0, 7); g.fill();                      // lunetta a mosaico
    };
    portal(0, 6.5, 13); portal(-15.8, 4.2, 9.5); portal(15.8, 4.2, 9.5);
    const statue = (x, y, h, o = {}) => { g.save(); g.translate(x, y); g.scale(1, -1); figure(g, 0, 0, h, Object.assign({ robe: '#ece6da', mantle: '#d8d0c2' }, o)); g.restore(); };
    if (!today) { for (const x of [-9, -5.5, 5.5, 9]) { box(x - 0.9, 3, 1.8, 4.5, '#6a6050'); statue(x, 3.2, 3.6); } for (const x of [-6, 0, 6]) { box(x - 1.2, 9.5, 2.4, 1.2, '#c8a050'); } g.restore(); return; }   // lunette a mosaico
    // galleria degli apostoli e tabernacolo con la Madonna in trono col Bambino, sotto il rosone
    for (let k = -6; k <= 6; k++) { if (Math.abs(k) < 1) continue; const x = k * 1.55; box(x - 0.65, 20.5, 1.3, 3.6, '#3a4a6a'); statue(x, 20.6, 3.2); }
    box(-2.4, 19.2, 4.8, 8.4, WH); box(-1.8, 19.8, 3.6, 6.4, '#26305a');                         // nicchia con cielo stellato
    g.fillStyle = '#e8c860'; for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(-1.6 + rnd() * 3.2, 21 + rnd() * 5, 0.08, 0, 7); g.fill(); }
    statue(0, 20.2, 4.6, { seated: true, crown: true, robe: '#f2eee6', mantle: '#e2dccf' }); statue(0.7, 22.4, 1.4, { seated: true, robe: '#f2eee6' });
    g.fillStyle = PK; g.beginPath(); g.moveTo(-2.8, 27.4); g.lineTo(0, 30); g.lineTo(2.8, 27.4); g.fill();
    // rosone
    const rc = 34, rr = 4.4;
    g.fillStyle = WH; g.beginPath(); g.arc(0, rc, rr + 0.9, 0, 7); g.fill(); g.fillStyle = '#2e3646'; g.beginPath(); g.arc(0, rc, rr, 0, 7); g.fill();
    g.strokeStyle = WH; g.lineWidth = 0.22; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; g.beginPath(); g.moveTo(Math.cos(a) * 1.1, rc + Math.sin(a) * 1.1); g.lineTo(Math.cos(a) * rr, rc + Math.sin(a) * rr); g.stroke(); }
    for (const r of [1.1, 2.6, rr]) { g.beginPath(); g.arc(0, rc, r, 0, 7); g.stroke(); }
    for (const x of [-15.8, 15.8]) { g.fillStyle = WH; g.beginPath(); g.arc(x, 22, 2, 0, 7); g.fill(); g.fillStyle = '#2e3646'; g.beginPath(); g.arc(x, 22, 1.5, 0, 7); g.fill(); }   // occhi laterali
    // coronamento: fregio con busti, timpano centrale con il medaglione
    box(-21, 30, 42, 1.2, GR); for (let x = -20; x < 21; x += 1.6) { g.fillStyle = '#ddd5c6'; g.beginPath(); g.arc(x, 30.6, 0.42, 0, 7); g.fill(); }
    box(-11, 43, 22, 1, GR);
    g.fillStyle = WH; g.beginPath(); g.arc(0, 46, 1.8, 0, 7); g.fill(); g.strokeStyle = GR; g.lineWidth = 0.3; g.stroke();
    for (const x of [-21, -11.6, 10.6, 20]) { box(x, 0, 1, x < -11 || x > 10 ? 31 : 44, GR); }
    g.restore();
  }

  // Campanile di Giotto, una faccia (14,45 × 80,6 m), registri dal basso: formelle esagonali, losanghe, nicchie con
  // statue, due piani di bifore, il piano alto con la trifora; marmi bianco, verde di Prato e rosso di Siena.
  function campanile(g, W, H) {
    const FWc = 14.45, FHc = 80.6;
    g.save(); g.scale(W / FWc, H / FHc); g.translate(0, FHc); g.scale(1, -1);
    const WH = '#efeae0', GR = '#4a6252', PK = '#d4a497', box = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    box(0, 0, FWc, FHc, WH);
    const band = y => { box(0, y, FWc, 0.35, GR); box(0, y + 0.45, FWc, 0.18, PK); };
    // zoccolo: due file di formelle (esagoni, poi losanghe)
    for (let k = 0; k < 7; k++) { const x = 0.9 + k * 1.85; g.fillStyle = '#e0d8c8'; g.beginPath(); for (let a = 0; a < 6; a++) g.lineTo(x + 0.8 * Math.cos(a * Math.PI / 3), 5 + 0.8 * Math.sin(a * Math.PI / 3)); g.fill(); g.strokeStyle = GR; g.lineWidth = 0.12; g.stroke(); }
    for (let y = 0.5; y < 3.6; y += 1.2) for (let x = 0.4; x < FWc; x += 2) { box(x, y, 1.6, 0.9, PK); g.strokeStyle = GR; g.lineWidth = 0.1; g.strokeRect(x, y, 1.6, 0.9); }
    band(7.5);
    for (let k = 0; k < 7; k++) { const x = 1 + k * 1.85; g.fillStyle = '#e8e0d0'; g.beginPath(); g.moveTo(x, 10.5); g.lineTo(x + 0.7, 11.6); g.lineTo(x, 12.7); g.lineTo(x - 0.7, 11.6); g.fill(); g.strokeStyle = GR; g.lineWidth = 0.1; g.stroke(); }
    for (let x = 0.3; x < FWc; x += 1.85) box(x, 8.6, 0.25, 6, GR);
    band(15);
    // nicchie con le statue (4 per lato)
    for (let k = 0; k < 4; k++) { const x = 1.7 + k * 3.35; box(x - 0.9, 16.4, 1.8, 4.2, '#5a6a7a'); g.fillStyle = WH; g.beginPath(); g.moveTo(x - 1.1, 20.6); g.lineTo(x, 22.4); g.lineTo(x + 1.1, 20.6); g.fill(); const f = window.Fresco.figure; g.save(); g.translate(x, 16.6); g.scale(1, -1); f(g, 0, 0, 3.5, { robe: '#e6e0d4', mantle: '#d6cfc0' }); g.restore(); }
    band(23.5);
    // specchiature policrome a riquadri su tutti i piani
    const panels = (y0, y1) => { for (let y = y0; y < y1 - 0.5; y += 2.6) for (let x = 0.4; x < FWc - 0.4; x += 2.4) { box(x, y + 0.2, 2.1, 2.2, GR); box(x + 0.2, y + 0.4, 1.7, 1.8, WH); box(x + 0.6, y + 0.8, 0.9, 1, PK); } };
    const bifora = (cx, y, w, hgt) => {
      box(cx - w / 2 - 0.4, y - 0.4, w + 0.8, hgt + 2.4, WH);
      g.fillStyle = '#2c2a2c'; g.beginPath(); g.moveTo(cx - w / 2, y); g.lineTo(cx - w / 2, y + hgt); g.quadraticCurveTo(cx - w / 2, y + hgt + 1.4, cx, y + hgt + 1.8); g.quadraticCurveTo(cx + w / 2, y + hgt + 1.4, cx + w / 2, y + hgt); g.lineTo(cx + w / 2, y); g.fill();
      box(cx - 0.12, y, 0.24, hgt + 0.8, '#d8d0c0');
      g.fillStyle = GR; g.beginPath(); g.moveTo(cx - w / 2 - 0.6, y + hgt + 1.9); g.lineTo(cx, y + hgt + 3.6); g.lineTo(cx + w / 2 + 0.6, y + hgt + 1.9); g.fill();
    };
    panels(24.2, 37); bifora(4.5, 27.5, 2.4, 5.5); bifora(10, 27.5, 2.4, 5.5); band(37.5);
    panels(38.2, 51); bifora(4.5, 41.5, 2.4, 5.5); bifora(10, 41.5, 2.4, 5.5); band(51.5);
    panels(52.2, 77); band(77.5);
    // trifora alta
    box(3.2, 55, 8, 18.5, WH); g.fillStyle = '#262428'; g.beginPath(); g.moveTo(3.8, 55.6); g.lineTo(3.8, 69); g.quadraticCurveTo(3.8, 72.8, 7.2, 73.5); g.quadraticCurveTo(10.6, 72.8, 10.6, 69); g.lineTo(10.6, 55.6); g.fill();
    for (const x of [5.9, 8.5]) box(x - 0.13, 55.6, 0.26, 14, '#d8d0c0');
    g.fillStyle = GR; g.beginPath(); g.moveTo(2.6, 73.6); g.lineTo(7.2, 76.8); g.lineTo(11.8, 73.6); g.fill();
    for (let x = 0; x < FWc; x += 0.9) box(x, 78.6, 0.45, 1.4, '#6a6a6a');                          // archetti sotto il cornicione
    g.restore();
    plasterGrain(g, W, H, 0.04);
  }

  // Battistero, una faccia dell'ottagono (≈10,6 × 26 m): ordine basso a lesene verdi, ordine con tre arcate e finestre
  // a edicola, attico a strisce bianche e verdi.
  function battistero(g, W, H) {
    const fw = 10.6, fh = 26; g.save(); g.scale(W / fw, H / fh); g.translate(0, fh); g.scale(1, -1);
    const WH = '#eeeae2', GR = '#3f5648', box = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    box(0, 0, fw, fh, WH);
    for (const x of [0, fw - 0.9]) { for (let y = 0; y < 21; y += 1.2) { box(x, y, 0.9, 0.6, GR); } }      // lesene d'angolo a fasce
    for (let k = 0; k < 2; k++) { const x = 1.4 + k * 4.2; box(x, 1, 3.6, 7, GR); box(x + 0.25, 1.25, 3.1, 6.5, WH); box(x + 0.9, 2, 1.8, 4.8, '#e2dccf'); }   // specchiature basse
    box(0, 9, fw, 0.5, GR);
    for (let k = 0; k < 3; k++) {                                                                       // tre arcate a tutto sesto
      const x = 1.1 + k * 2.9; g.strokeStyle = GR; g.lineWidth = 0.35; g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 16); g.arc(x + 1.2, 16, 1.2, Math.PI, 0, true); g.lineTo(x + 2.4, 10); g.stroke();
      box(x + 0.6, 11.4, 1.2, 2.8, '#3a3632'); g.fillStyle = WH; g.beginPath(); g.moveTo(x + 0.4, 14.3); g.lineTo(x + 1.2, 15.2); g.lineTo(x + 2, 14.3); g.fill();   // finestre a edicola
      g.strokeStyle = GR; g.lineWidth = 0.15; g.strokeRect(x + 0.6, 11.4, 1.2, 2.8);
    }
    box(0, 18.4, fw, 0.6, GR);
    for (let y = 19.4; y < fh; y += 0.9) box(0, y, fw, 0.42, GR);                                         // attico a strisce
    for (let k = 0; k < 4; k++) { box(0.9 + k * 2.5, 20.5, 1.4, 3.6, WH); g.strokeStyle = GR; g.lineWidth = 0.12; g.strokeRect(0.9 + k * 2.5, 20.5, 1.4, 3.6); }
    g.restore(); plasterGrain(g, W, H, 0.04);
  }

  // Fianco della cattedrale, una campata (23 m). clere = alta 41,6 m con l'occhio della navata centrale in alto.
  function flank(g, W, H, { clere }) {
    const fw = 23, fh = clere ? 41.6 : 23; g.save(); g.scale(W / fw, H / fh); g.translate(0, fh); g.scale(1, -1);
    const WH = '#eeeae1', GR = '#46604f', PK = '#d3a396', box = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    box(0, 0, fw, fh, WH);
    for (let y = 0.6; y < fh - 1; y += 3.2) for (let x = 2.2; x < fw - 2.2; x += 2.3) { box(x, y, 2.05, 2.9, GR); box(x + 0.18, y + 0.18, 1.69, 2.54, WH); if ((x + y) % 2 < 1) box(x + 0.6, y + 0.8, 0.85, 1.3, PK); }
    for (const x of [0, fw - 2]) { box(x, 0, 2, fh, GR); box(x + 0.35, 0, 1.3, fh, WH); for (let y = 1; y < fh; y += 3) box(x + 0.5, y, 1, 1.6, PK); }   // lesene
    const top = 23;
    box(0, top - 1.4, fw, 1.4, GR); for (let x = 0; x < fw; x += 0.8) { g.fillStyle = WH; g.beginPath(); g.arc(x + 0.4, top - 1.4, 0.35, Math.PI, 0, true); g.fill(); }   // archetti
    // finestrone gotico della navata laterale
    const cx = fw / 2; box(cx - 2.2, 7.4, 4.4, 12.4, WH);
    g.fillStyle = '#2e2c30'; g.beginPath(); g.moveTo(cx - 1.5, 8); g.lineTo(cx - 1.5, 15.6); g.quadraticCurveTo(cx - 1.5, 18.6, cx, 19.2); g.quadraticCurveTo(cx + 1.5, 18.6, cx + 1.5, 15.6); g.lineTo(cx + 1.5, 8); g.fill();
    box(cx - 0.1, 8, 0.2, 8.6, '#d8d0c0'); g.strokeStyle = '#d8d0c0'; g.lineWidth = 0.18; g.beginPath(); g.arc(cx, 17.1, 0.7, 0, 7); g.stroke();
    g.fillStyle = GR; g.beginPath(); g.moveTo(cx - 2.4, 19.6); g.lineTo(cx, 22); g.lineTo(cx + 2.4, 19.6); g.fill();
    if (clere) {
      box(0, top, fw, 0.8, GR); box(0, fh - 1.6, fw, 1.6, GR); for (let x = 0; x < fw; x += 0.8) { g.fillStyle = WH; g.beginPath(); g.arc(x + 0.4, fh - 1.6, 0.35, Math.PI, 0, true); g.fill(); }
      g.fillStyle = WH; g.beginPath(); g.arc(cx, 32.5, 3.2, 0, 7); g.fill(); g.fillStyle = GR; g.beginPath(); g.arc(cx, 32.5, 2.7, 0, 7); g.fill();
      g.fillStyle = '#2e2c30'; g.beginPath(); g.arc(cx, 32.5, 2.2, 0, 7); g.fill();                    // occhio della navata centrale
      g.strokeStyle = '#d8d0c0'; g.lineWidth = 0.15; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(cx, 32.5); g.lineTo(cx + 2.2 * Math.cos(a * Math.PI / 4), 32.5 + 2.2 * Math.sin(a * Math.PI / 4)); g.stroke(); }
    }
    g.restore(); plasterGrain(g, W, H, 0.04);
  }

  // ---------- Dipinti della navata (procedurali, a scopo didattico: non sono riproduzioni) ----------
  // Orologio di Paolo Uccello (1443): quadrante di 24 ore in "ora italica", una sola lancetta, quattro teste agli angoli
  function clock(g, W, H) {
    const c = W / 2, R = W * 0.36;
    g.fillStyle = '#b9a27a'; g.fillRect(0, 0, W, H); g.strokeStyle = '#6a5232'; g.lineWidth = W * 0.02; g.strokeRect(W * 0.02, W * 0.02, W * 0.96, H * 0.96);
    for (const [x, y] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) {            // teste di profeti negli oculi
      g.fillStyle = '#4a6a5a'; g.beginPath(); g.arc(W * x, H * y, W * 0.09, 0, 7); g.fill();
      g.fillStyle = '#d8b090'; g.beginPath(); g.arc(W * x, H * y + W * 0.01, W * 0.045, 0, 7); g.fill();
      g.fillStyle = '#e8e0d0'; g.beginPath(); g.ellipse(W * x, H * y + W * 0.05, W * 0.03, W * 0.025, 0, 0, Math.PI); g.fill();
    }
    g.fillStyle = '#2a2f5a'; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
    g.fillStyle = '#e8d8a0'; for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, r = rnd() * R * 0.75; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, W * 0.004, 0, 7); g.fill(); }
    g.strokeStyle = '#d6b45a'; g.lineWidth = W * 0.012; g.beginPath(); g.arc(c, c, R, 0, 7); g.stroke(); g.beginPath(); g.arc(c, c, R * 0.78, 0, 7); g.stroke();
    const rom = n => { const v = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IIII'], [1, 'I']]; let r = ''; for (const [k, t] of v) while (n >= k) { r += t; n -= k; } return r; };
    g.fillStyle = '#f0e6c8'; g.font = `700 ${W * 0.03}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k <= 24; k++) { const a = Math.PI / 2 + k / 24 * Math.PI * 2; g.save(); g.translate(c + Math.cos(a) * R * 0.89, c + Math.sin(a) * R * 0.89); g.rotate(a - Math.PI / 2); g.fillText(rom(k), 0, 0); g.restore(); }
    g.fillStyle = '#e6c35a'; g.beginPath(); g.moveTo(c, c + R * 0.74); g.lineTo(c - W * 0.03, c); g.lineTo(c, c - R * 0.15); g.lineTo(c + W * 0.03, c); g.fill();   // una sola lancetta, a stella
  }
  // monumento equestre dipinto: 'verde' = terra verde (Acuto), 'marmo' = finto marmo (Tolentino)
  function equestrian(g, W, H, { tone }) {
    const pal = tone === 'verde' ? ['#7c8a6a', '#5c6a4e', '#a8b494', '#3e4a36'] : ['#c4a882', '#9a7e5c', '#e0ccaa', '#6a5038'];
    g.fillStyle = '#e6dccb'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#8a6a4a'; g.lineWidth = W * 0.025; g.strokeRect(W * 0.03, H * 0.02, W * 0.94, H * 0.96);
    const u = W / 10; g.save(); g.translate(0, 0);
    g.fillStyle = pal[1]; g.fillRect(u * 1.6, H * 0.62, u * 6.8, H * 0.2);                       // basamento / sarcofago
    g.fillStyle = pal[2]; g.fillRect(u * 1.3, H * 0.6, u * 7.4, H * 0.035); g.fillRect(u * 1.3, H * 0.82, u * 7.4, H * 0.035);
    g.fillStyle = pal[3]; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(u * (3 + k * 2), H * 0.72, u * 0.5, 0, 7); g.fill(); }
    const by = H * 0.6;                                                                                 // cavallo al passo
    g.fillStyle = pal[0]; g.beginPath(); g.ellipse(u * 5, by - u * 2.6, u * 2.6, u * 1.2, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(u * 7, by - u * 3.2); g.quadraticCurveTo(u * 8.2, by - u * 4.6, u * 8.4, by - u * 5.2); g.lineTo(u * 9, by - u * 4.6); g.quadraticCurveTo(u * 8.4, by - u * 3.4, u * 7.6, by - u * 2.4); g.fill();   // collo e testa
    g.strokeStyle = pal[0]; g.lineCap = 'round'; g.lineWidth = u * 0.42;
    for (const [x0, x1, lift] of [[3, 2.6, 0], [3.6, 3.9, 0], [6.4, 6.0, 0], [7, 7.6, 0.8]]) { g.beginPath(); g.moveTo(u * x0, by - u * 2.2); g.lineTo(u * x1, by - lift * u); g.stroke(); }
    g.lineWidth = u * 0.25; g.beginPath(); g.moveTo(u * 2.5, by - u * 2.8); g.quadraticCurveTo(u * 1.8, by - u * 2, u * 2, by - u * 1); g.stroke();   // coda
    g.fillStyle = pal[3]; g.beginPath(); g.ellipse(u * 5, by - u * 4.3, u * 0.8, u * 1.3, 0, 0, 7); g.fill();   // cavaliere
    g.fillStyle = pal[2]; g.beginPath(); g.arc(u * 5.1, by - u * 5.8, u * 0.42, 0, 7); g.fill();
    g.strokeStyle = pal[3]; g.lineWidth = u * 0.16; g.beginPath(); g.moveTo(u * 5.6, by - u * 4.5); g.lineTo(u * 6.8, by - u * 5.6); g.stroke();   // bastone del comando
    g.restore(); plasterGrain(g, W, H, 0.05);
  }
  // Dante e il suo poema (Domenico di Michelino, 1465): Dante col libro, a sinistra l'Inferno e il Purgatorio, a destra Firenze
  function dante(g, W, H) {
    const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#d8c48a'); sk.addColorStop(1, '#a89060'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6a7a5a'; g.beginPath(); g.moveTo(W * 0.05, H * 0.9); g.lineTo(W * 0.22, H * 0.25); g.lineTo(W * 0.4, H * 0.9); g.fill();   // monte del Purgatorio
    g.fillStyle = '#3a2a22'; g.fillRect(W * 0.03, H * 0.72, W * 0.2, H * 0.2);                             // porta dell'Inferno
    g.fillStyle = '#c9b48a'; g.fillRect(W * 0.62, H * 0.55, W * 0.34, H * 0.35);                            // Firenze con la cupola
    g.fillStyle = '#b8543a'; g.beginPath(); g.ellipse(W * 0.8, H * 0.55, W * 0.07, W * 0.09, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#efe8da'; g.fillRect(W * 0.795, H * 0.43, W * 0.01, H * 0.04);
    figure(g, W * 0.5, H * 0.95, H * 0.78, { robe: '#b8302a', mantle: '#a02a24', arm: 1.2 });               // Dante in rosso
    g.fillStyle = '#f2ead0'; g.fillRect(W * 0.53, H * 0.42, W * 0.12, H * 0.08);                              // il libro aperto
    g.strokeStyle = '#7a5a30'; g.lineWidth = W * 0.02; g.strokeRect(W * 0.01, H * 0.01, W * 0.98, H * 0.98);
  }

  window.Fresco = { clock, equestrian, dante, flank, battistero, campanile, facade, choirWall, OCULI, CHOIR, walls, drum, floor, rnd, pick, lerp, cloud, figure, flames, shade, plasterGrain, reseed: v => { seed = v; } };
})();
