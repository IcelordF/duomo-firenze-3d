/* Spaccato 2D "tavola di progetto": sezione trasversale nord-sud del crocicchio.
   Le parti tagliate sono campite e tratteggiate; dietro il piano di taglio si vedono
   in prospetto le pareti interne (vele, occhi, arcone del coro). Unità: metri, come il 3D. */
(function () {
  const G = window.Cupola.geom, { YTOP, GROUND, STONE_Y, WOOD_Y } = G;
  const C8 = Math.cos(Math.PI / 8), C38 = Math.cos(3 * Math.PI / 8), PI = Math.PI;
  const m = (i, y) => G.R[i](y) * C8;              // raggio in sezione (a metà vela)
  const DRUM_IN = m(0, 0), DRUM_OUT = G.RD * C8;    // ≈ 21,0 e 25,7 m
  const INK = '#33251a', INK2 = 'rgba(51,37,26,.55)', INK3 = 'rgba(51,37,26,.25)';
  const PAPER = '#efe4cc', COTTO = '#c98563', COTTO_D = '#9c5538', STONE = '#bdb3a0', WOOD = '#8f6238', MARBLE = '#f4efe4', VERDE = '#4c6b58';
  const clamp01 = v => Math.min(1, Math.max(0, v));

  // ---------- pattern in spazio schermo ----------
  function patternCanvas(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c; }
  const grainC = patternCanvas(256, (g, s) => {
    const d = g.createImageData(s, s);
    for (let i = 0; i < d.data.length; i += 4) { const v = 225 + Math.random() * 30 | 0; d.data[i] = v; d.data[i + 1] = v - 8; d.data[i + 2] = v - 24; d.data[i + 3] = 26; }
    g.putImageData(d, 0, 0);
  });
  const hatchC = (gap, ang, col, w = 1) => patternCanvas(gap * 4, (g, s) => {
    g.strokeStyle = col; g.lineWidth = w; g.translate(s / 2, s / 2); g.rotate(ang);
    for (let x = -s; x <= s; x += gap) { g.beginPath(); g.moveTo(x, -s); g.lineTo(x, s); g.stroke(); }
  });
  const H_STONE = hatchC(6, PI / 4, 'rgba(51,37,26,.42)'), H_EARTH = hatchC(9, -PI / 4, 'rgba(51,37,26,.5)'), H_EARTH2 = hatchC(9, PI / 4, 'rgba(51,37,26,.2)');
  const H_WOOD = hatchC(4, 0.08, 'rgba(60,35,15,.35)');

  function create(wrap) {
    const cv = document.createElement('canvas'); cv.className = 'sec-canvas'; wrap.appendChild(cv);
    const g = cv.getContext('2d');
    let W = 1, H = 1, dpr = 1;
    const pats = {};
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1); W = wrap.clientWidth; H = wrap.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      for (const [k, c] of Object.entries({ grain: grainC, stone: H_STONE, earth: H_EARTH, earth2: H_EARTH2, wood: H_WOOD })) pats[k] = g.createPattern(c, 'repeat');
      dirty = true;
    }
    const view = { cx: 0, cy: 3, span: 122 }, goal = { ...view };
    let fit = null, inset = 0, year = 1418, h = -1, focus = null, scaffold = false, labels = [], follow = null, dirty = true, userView = false;
    new ResizeObserver(resize).observe(wrap); resize();

    // trasformazione mondo → schermo
    let s = 1;
    const sx = x => (W - inset) / 2 + (x - view.cx) * s, sy = y => H / 2 - (y - view.cy) * s;
    function world() { g.setTransform(dpr * s, 0, 0, -dpr * s, dpr * ((W - inset) / 2 - view.cx * s), dpr * (H / 2 + view.cy * s)); }
    function screen() { g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    const lw = px => px / s;
    function fillPat(p) { const mtx = new DOMMatrix().scaleSelf(1 / s, -1 / s); p.setTransform(mtx); g.fillStyle = p; g.fill(); }
    const path = pts => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const rect = (x, y, w, hh) => { g.beginPath(); g.rect(x, y, w, hh); };
    function stroke(px, col = INK) { g.lineWidth = lw(px); g.strokeStyle = col; g.stroke(); }
    function wash(c0, c1, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fill(); }

    // ---------- profili ----------
    const prof = (i, y0, y1, sign, n = 60) => Array.from({ length: n + 1 }, (_, j) => { const y = y0 + (y1 - y0) * j / n; return [sign * m(i, y), y]; });
    const band = (i0, i1, y0, y1, sign) => [...prof(i0, y0, y1, sign), ...prof(i1, y0, y1, sign).reverse()];
    // letto di malta: raggio verso il centro dell'arco (i corsi si inclinano verso l'interno salendo)
    function bed(i0, i1, y, sign) {
      const cx = -sign * 13.65 * C8, x0 = sign * m(i0, y), dx = x0 - cx, dy = y;
      let lo = 0, hi = 0.4;
      for (let k = 0; k < 24; k++) { const t = (lo + hi) / 2, X = cx + dx * (1 + t), Y = dy * (1 + t); (sign * X < m(i1, Y)) ? lo = t : hi = t; }
      return [[x0, y], [cx + dx * (1 + lo), dy * (1 + lo)]];
    }

    // ---------- figure ----------
    function ox(x, y, sc, dir, alpha) {
      g.save(); g.translate(x, y); g.scale(dir * sc, sc); g.globalAlpha = alpha;
      g.fillStyle = '#6b4a32'; g.strokeStyle = INK; g.lineWidth = lw(1) / sc;
      g.beginPath(); g.moveTo(-1.15, 1.25); g.bezierCurveTo(-1.2, 0.75, -0.9, 0.62, -0.4, 0.66); g.lineTo(0.6, 0.64);
      g.bezierCurveTo(1.0, 0.62, 1.12, 0.85, 1.2, 1.0); g.lineTo(1.62, 0.86); g.lineTo(1.72, 0.66); g.lineTo(1.5, 0.62); g.lineTo(1.3, 0.78);
      g.lineTo(1.25, 1.18); g.bezierCurveTo(1.05, 1.5, 0.4, 1.42, -0.2, 1.45); g.bezierCurveTo(-0.7, 1.48, -1.05, 1.45, -1.15, 1.25); g.fill(); g.stroke();
      for (const lx of [-0.95, -0.72, 0.55, 0.8]) { g.beginPath(); g.moveTo(lx, 0.7); g.lineTo(lx + 0.04, 0); g.lineWidth = lw(2.2) / sc; g.stroke(); }
      g.beginPath(); g.moveTo(1.38, 1.1); g.quadraticCurveTo(1.5, 1.35, 1.62, 1.3); g.lineWidth = lw(1.2) / sc; g.stroke();
      g.beginPath(); g.moveTo(-1.15, 1.2); g.quadraticCurveTo(-1.3, 0.8, -1.22, 0.45); g.stroke();
      g.restore();
    }
    function worker(x, y, sc, pose, t) {
      g.save(); g.translate(x, y); g.scale(sc, sc); g.strokeStyle = INK; g.lineCap = 'round';
      const sw = Math.sin(t * 3 + x);
      g.lineWidth = lw(2.2) / sc;
      line(-0.12, 0, 0, 0.82); line(0.14, 0, 0, 0.82);                                  // gambe
      g.lineWidth = lw(3.2) / sc; g.strokeStyle = '#6d3f2a'; line(0, 0.8, pose ? 0.15 : 0, 1.42); // busto
      g.lineWidth = lw(1.8) / sc; g.strokeStyle = INK;
      if (pose === 1) { line(0.08, 1.35, 0.55, 1.05 + sw * 0.08); line(0.08, 1.35, 0.4, 0.95); }      // posa mattoni
      else { line(0, 1.35, -0.3, 1.0); line(0, 1.35, 0.32, 1.55); rect(0.22, 1.5, 0.45, 0.22); g.fillStyle = COTTO; g.fill(); } // gerla
      g.beginPath(); g.arc(pose ? 0.2 : 0, 1.6, 0.13, 0, 7); g.fillStyle = '#d9b48f'; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(pose ? 0.2 : 0, 1.7, 0.17, 0.06, 0, 0, 7); g.fillStyle = '#3d4b5a'; g.fill();
      g.restore();
    }
    function gear(x, y, r, teeth, a) {
      g.save(); g.translate(x, y); g.rotate(a);
      g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = '#a4784c'; g.fill(); stroke(1.2);
      for (let i = 0; i < teeth; i++) { const t = i * 2 * PI / teeth; g.save(); g.rotate(t); rect(r - 0.05, -0.07, 0.3, 0.14); g.fillStyle = '#5a3b20'; g.fill(); g.restore(); }
      for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * PI / 4); line(-r * 0.9, 0, r * 0.9, 0); g.restore(); }
      g.beginPath(); g.arc(0, 0, r * 0.18, 0, 7); g.fillStyle = INK; g.fill();
      g.restore();
    }
    function bricksPile(x, y, n) {
      for (let r = 0; r < n; r++) for (let c = 0; c < n - r; c++) {
        rect(x + c * 0.42 + r * 0.21, y + r * 0.12, 0.4, 0.11); g.fillStyle = r % 2 ? COTTO : COTTO_D; g.fill(); stroke(0.4);
      }
    }
    function volute(x, y, r, dir) {
      g.beginPath();
      for (let t = 0; t < 4 * PI; t += 0.2) { const rr = r * (1 - t / (4.6 * PI)); const X = x + dir * Math.cos(t) * rr, Y = y + Math.sin(t) * rr; t ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      stroke(1.1);
    }

    // ---------- disegno ----------
    let tAnim = 0;
    function draw() {
      s = H / view.span;
      screen(); g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
      g.fillStyle = pats.grain; g.fillRect(0, 0, W, H);
      world();
      // griglia di progetto (5 m)
      g.lineWidth = lw(0.5); g.strokeStyle = 'rgba(51,37,26,.07)';
      for (let x = -100; x <= 100; x += 5) line(x, GROUND - 20, x, 90);
      for (let y = GROUND - 20; y <= 90; y += 5) line(-100, y, 100, y);

      const built = Math.min(h, YTOP), building = h > 0 && h < YTOP;

      // --- terreno e fondazioni ---
      rect(-120, GROUND - 30, 240, 30); fillPat(pats.earth2);
      for (const sg of [-1, 1]) { rect(sg > 0 ? 19 : -30, GROUND - 9, 11, 9); g.fillStyle = STONE; g.fill(); fillPat(pats.stone); stroke(1.2); }
      line(-120, GROUND, 120, GROUND); stroke(2);

      // --- prospetto interno (dietro il taglio) ---
      // pavimento a riquadri
      for (let x = -21; x < 21; x += 1.5) { rect(x, GROUND, 1.5, 0.35); g.fillStyle = (Math.round(x / 1.5) % 2) ? '#e8e0cf' : '#7f8f80'; g.fill(); }
      // parete di fondo del crocicchio: faccia frontale + due facce in scorcio
      const back = (y0, y1, x0, x1, c) => { rect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = c; g.fill(); };
      back(GROUND, -13, -DRUM_IN, -DRUM_IN * C38 / C8, '#d4c7ad'); back(GROUND, -13, DRUM_IN * C38 / C8, DRUM_IN, '#d4c7ad');
      back(GROUND, -13, -DRUM_IN * C38 / C8, DRUM_IN * C38 / C8, '#e2d7bf');
      g.lineWidth = lw(0.8); g.strokeStyle = INK2;
      for (const x of [-DRUM_IN * C38 / C8, DRUM_IN * C38 / C8]) line(x, GROUND, x, 0);
      // arcone verso il coro (tribuna est)
      const aw = 7.2, ay = -24;
      g.beginPath(); g.moveTo(-aw, GROUND); g.lineTo(-aw, ay); g.quadraticCurveTo(-aw, ay + 6.5, 0, ay + 9); g.quadraticCurveTo(aw, ay + 6.5, aw, ay); g.lineTo(aw, GROUND); g.closePath();
      wash('#5d5143', '#8d7d66', 0, GROUND, 0, ay + 9); stroke(1.2);
      g.beginPath(); g.moveTo(-aw - 0.8, ay); g.quadraticCurveTo(-aw - 0.8, ay + 7.2, 0, ay + 10); g.quadraticCurveTo(aw + 0.8, ay + 7.2, aw + 0.8, ay); stroke(0.8, INK2);
      // altare e coro (sagome)
      rect(-2.2, GROUND, 4.4, 1.2); g.fillStyle = MARBLE; g.fill(); stroke(0.8);
      for (let i = -5; i <= 5; i++) { rect(i * 1.2 - 0.2, GROUND, 0.4, 3.4); g.fillStyle = 'rgba(60,45,30,.35)'; g.fill(); }
      // porte nelle facce in scorcio
      for (const sg of [-1, 1]) {
        const cx = sg * DRUM_IN * 0.66;
        g.beginPath(); g.moveTo(cx - 1.6, GROUND); g.lineTo(cx - 1.6, GROUND + 5); g.arc(cx, GROUND + 5, 1.6, PI, 0, true); g.lineTo(cx + 1.6, GROUND); g.closePath();
        g.fillStyle = '#6b5a47'; g.fill(); stroke(0.8);
      }
      // tamburo, prospetto interno: occhi (frontale tondo, laterali ellittici)
      back(-13, 0, -DRUM_IN, DRUM_IN, '#ddd1b8');
      for (const [cx, rx] of [[0, 2.7], [-DRUM_IN * 0.66, 1.05], [DRUM_IN * 0.66, 1.05]]) {
        g.beginPath(); g.ellipse(cx, -6.3, rx + 0.45, 3.15, 0, 0, 7); g.fillStyle = '#efe7d6'; g.fill(); stroke(0.8);
        g.beginPath(); g.ellipse(cx, -6.3, rx, 2.7, 0, 0, 7);
        if (year >= 1437 && cx === 0) {                       // vetrata: quella al centro (est) è di Donatello, 1434-37 (le altre fino al 1445)
          const cols = ['#2f5d8a', '#a33b2e', '#d1a440', '#3f6e4a', '#6a3d7a', '#2f5d8a', '#d1a440', '#a33b2e'];
          g.save(); g.clip(); cols.forEach((c, i) => { g.beginPath(); g.moveTo(cx, -6.3); g.arc(cx, -6.3, 3, i * PI / 4, (i + 1) * PI / 4); g.fillStyle = c; g.fill(); });
          g.beginPath(); g.arc(cx, -6.3, 1.2, 0, 7); g.fillStyle = '#e8d6a0'; g.fill(); g.restore();
        } else { g.fillStyle = '#9fb2b8'; g.fill(); }
        stroke(1);
      }
      g.lineWidth = lw(0.8); g.strokeStyle = INK2;
      for (const by of [-13, -1.2]) {                                  // ballatoi interni su mensole
        rect(-DRUM_IN, by - 0.35, 2 * DRUM_IN, 0.35); g.fillStyle = '#cfc2a6'; g.fill(); g.stroke();
        line(-DRUM_IN, by + 0.9, DRUM_IN, by + 0.9); for (let x = -DRUM_IN; x < DRUM_IN; x += 0.5) line(x, by, x, by + 0.9);
      }

      // vele interne in prospetto (fino all'altezza costruita)
      if (built > 0) {
        g.save(); rect(-40, 0, 80, built + 0.01); g.clip();
        const yTop = Math.min(built, YTOP);
        path([...prof(0, 0, yTop, -1), ...prof(0, 0, yTop, 1).reverse()]);
        wash('#cdbfa3', '#e6dcc6', 0, 0, 0, YTOP);
        // spigoli a 67,5°: x = R·cos(67,5°)
        g.lineWidth = lw(1); g.strokeStyle = INK2;
        for (const sg of [-1, 1]) {
          g.beginPath(); for (let j = 0; j <= 40; j++) { const y = yTop * j / 40, x = sg * G.R[0](y) * C38; j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
          // ombra sulle vele in scorcio
          path([...Array.from({ length: 41 }, (_, j) => { const y = yTop * j / 40; return [sg * G.R[0](y) * C38, y]; }), ...prof(0, 0, yTop, sg, 40).reverse()]);
          g.fillStyle = 'rgba(90,70,50,.13)'; g.fill();
        }
        // filari leggermente incurvati ("corda blanda")
        g.lineWidth = lw(0.5); g.strokeStyle = INK3;
        for (let y = 1.5; y < yTop; y += 1.5) {
          const a = G.R[0](y) * C38, b = m(0, y);
          for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(sg * a, y); g.quadraticCurveTo(sg * (a + b) / 2, y - 0.35, sg * b, y); g.stroke(); }
          g.beginPath(); g.moveTo(-a, y); g.quadraticCurveTo(0, y - 0.5, a, y); g.stroke();
        }
        g.restore();
      }

      // --- parti tagliate: tamburo e muri del crocicchio ---
      for (const sg of [-1, 1]) {
        const xi = sg * DRUM_IN, xo = sg * DRUM_OUT;
        // muro sopra l'arcone verso la tribuna, e tamburo con l'occhio tagliato
        const wallParts = [[-20, -10.2], [-2.4, 0]];
        path([[xi, -15], [xo, -15], [xo, -13], [xi, -13]]); g.fillStyle = STONE; g.fill(); fillPat(pats.stone); stroke(1.6);
        // intradosso dell'arcone (in vista) e pilastro oltre
        g.beginPath(); g.moveTo(xi, -15); g.lineTo(xo, -15); stroke(0.8, INK2);
        rect(xi, -15.8, xo - xi, 0.8); g.fillStyle = 'rgba(90,70,50,.25)'; g.fill();
        for (const [y0, y1] of [[-13, -9.45], [-3.15, 0]]) {
          path([[xi, y0], [xo, y0], [xo, y1], [xi, y1]]); g.fillStyle = STONE; g.fill(); fillPat(pats.stone); stroke(1.6);
        }
        // strombatura dell'occhio
        path([[xi, -9.45], [xi + sg * 0.6, -8.7], [xo - sg * 0.6, -8.7], [xo, -9.45]]); g.fillStyle = '#d7cdb8'; g.fill(); stroke(0.8);
        path([[xi, -3.15], [xi + sg * 0.6, -3.9], [xo - sg * 0.6, -3.9], [xo, -3.15]]); g.fillStyle = '#d7cdb8'; g.fill(); stroke(0.8);
        // rivestimento esterno in marmi
        rect(xo, -13, sg * 0.35, 13); g.fillStyle = MARBLE; g.fill(); stroke(0.8);
        for (const yy of [-12.4, -1.4]) { rect(xo, yy, sg * 0.35, 0.5); g.fillStyle = VERDE; g.fill(); }
        // cornicione all'imposta
        path([[xo, -0.6], [xo + sg * 0.35, -0.6], [xo + sg * 0.35, 0.5], [xo, 0.5]]); g.fillStyle = COTTO_D; g.fill(); stroke(1);   // fascia grezza (niente ballatoio)
        // arcone tagliato e pilastro verso la tribuna
        // --- tribuna laterale ---
        const t0 = sg * DRUM_OUT, t1 = sg * (DRUM_OUT + 17.5), t2 = sg * (DRUM_OUT + 20.5);
        rect(Math.min(t0, t1), GROUND, Math.abs(t1 - t0), 27); g.fillStyle = 'rgba(214,201,174,.65)'; g.fill();
        // volta della tribuna (semicupola in sezione)
        const tm = (t0 + t1) / 2;
        g.beginPath(); g.moveTo(t0, -28); g.quadraticCurveTo(tm, -16, t1, -28);          // catino della tribuna (muratura piena)
        g.lineTo(t2, -28); g.lineTo(t2, -27.2); g.lineTo(t0, -15.2); g.closePath(); g.fillStyle = STONE; g.fill(); fillPat(pats.stone); stroke(1.4);
        path([[t0, -15.2], [t2 + sg * 0.8, -27.2], [t2 + sg * 0.8, -26.4], [t0, -14.4]]); g.fillStyle = '#a04a2c'; g.fill(); stroke(1);   // tetto in coppi
        // muro di fondo della tribuna tagliato, con finestra
        for (const [y0, y1] of [[GROUND, -46], [-38, -28]]) { path([[t1, y0], [t2, y0], [t2, y1], [t1, y1]]); g.fillStyle = STONE; g.fill(); fillPat(pats.stone); stroke(1.6); }
        rect(t1, -46, t2 - t1, 8); g.fillStyle = '#9fb2b8'; g.fill(); stroke(0.6);
        rect(t2, GROUND, sg * 0.3, 27); g.fillStyle = MARBLE; g.fill();
        // cappelle radiali (prospetto) e arcone tagliato verso la tribuna
        for (const cx of [sg * (DRUM_OUT + 5), sg * (DRUM_OUT + 12.5)]) {
          g.beginPath(); g.moveTo(cx - 2.2, GROUND); g.lineTo(cx - 2.2, GROUND + 12); g.quadraticCurveTo(cx, GROUND + 16, cx + 2.2, GROUND + 12); g.lineTo(cx + 2.2, GROUND); g.closePath();
          g.fillStyle = '#7a6a55'; g.fill(); stroke(0.8);
        }
              }

      // --- cupola tagliata (le due calotte) ---
      if (built > 0) {
        g.save(); rect(-40, -1, 80, built + 1.01); g.clip();
        for (const sg of [-1, 1]) {
          for (const [a, b, c0, c1] of [[0, 1, '#c27b5a', '#d59675'], [2, 3, '#c98563', '#dc9f80']]) {
            path(band(a, b, 0, YTOP, sg)); wash(c0, c1, sg * m(a, 0), 0, sg * m(b, 0), 0);
            g.save(); g.clip();
            // corsi radiali e giunti sfalsati
            let arc = 0, prev = null, n = 0;
            for (let y = 0; y < YTOP; y += 0.05) {
              const x = m(a, y); if (prev) arc += Math.hypot(x - prev[0], y - prev[1]); prev = [x, y];
              if (arc >= 0.42) {
                arc = 0; n++; const [p0, p1] = bed(a, b, y, sg);
                g.lineWidth = lw(0.6); g.strokeStyle = 'rgba(80,40,20,.55)'; line(p0[0], p0[1], p1[0], p1[1]);
                const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), steps = Math.max(1, Math.round(L / 0.55));
                for (let k = 1; k < steps; k++) {
                  if ((k + n) % 2) continue;
                  const f = k / steps, qx = p0[0] + (p1[0] - p0[0]) * f, qy = p0[1] + (p1[1] - p0[1]) * f;
                  const [nx, ny] = [-(p1[1] - p0[1]) / L, (p1[0] - p0[0]) / L];
                  g.lineWidth = lw(0.45); line(qx, qy, qx - nx * 0.4 * sg, qy - ny * 0.4 * sg);
                }
                if (a === 0 && n % 5 === 0) {           // mattoni "a coltello" della spina di pesce
                  const f = 0.25 + ((n / 5) % 3) * 0.22, qx = p0[0] + (p1[0] - p0[0]) * f, qy = p0[1] + (p1[1] - p0[1]) * f;
                  const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
                  g.save(); g.translate(qx, qy); g.rotate(ang); rect(-0.14, -0.05, 0.28, 0.84); g.fillStyle = '#8e4528'; g.fill(); g.restore();
                }
              }
            }
            g.restore();
            path(band(a, b, 0, YTOP, sg)); stroke(1.8);
          }
          // intercapedine: faccia del costolone intermedio in fondo, ombra e scale
          path(band(1, 2, 0, YTOP, sg)); wash('#7a5a44', '#b68d70', sg * m(1, 0), 0, sg * m(2, 0), 0);
          g.lineWidth = lw(1); g.strokeStyle = 'rgba(245,230,210,.55)';
          for (let y = 2.4; y < YTOP - 3; y += 2.2) {
            const xa = sg * (m(1, y) + 0.08), xb = sg * (m(1, y + 2.2) + 0.08);
            g.beginPath(); g.moveTo(xa, y);
            for (let k = 1; k <= 6; k++) { const yy = y + k * 2.2 / 6, xx = xa + (xb - xa) * k / 6; g.lineTo(xx + sg * 0.32, yy - 2.2 / 6); g.lineTo(xx + sg * 0.32, yy); }
            g.stroke();
          }
          for (const y of [6, 14, 22]) { const xa = sg * m(1, y), xb = sg * m(2, y); g.beginPath(); g.moveTo(xa, y); g.quadraticCurveTo((xa + xb) / 2, y + 0.9, xb, y); stroke(0.8, 'rgba(40,25,15,.6)'); }
          // catene di pietra con grappe di ferro
          for (const cy of STONE_Y) {
            if (cy > built) continue;
            const x0 = sg * (m(1, cy) - 0.35), x1 = sg * (m(1, cy) + 0.18);
            rect(Math.min(x0, x1), cy, Math.abs(x1 - x0), 0.55); g.fillStyle = focus === 'chains' ? '#a9c0d8' : STONE; g.fill(); fillPat(pats.stone); stroke(1.2);
            g.beginPath(); g.moveTo(x0 + sg * 0.08, cy + 0.55); g.lineTo(x0 + sg * 0.08, cy + 0.7); g.lineTo(x1 - sg * 0.08, cy + 0.7); g.lineTo(x1 - sg * 0.08, cy + 0.55); stroke(1.6, '#2b2b2b');
          }
          if (WOOD_Y < built) {
            const x0 = sg * (m(1, WOOD_Y) + 0.15), x1 = sg * (m(1, WOOD_Y) + 0.6);
            rect(Math.min(x0, x1), WOOD_Y, Math.abs(x1 - x0), 0.42); g.fillStyle = focus === 'chains' ? '#e7a55a' : WOOD; g.fill(); fillPat(pats.wood); stroke(1.2);
            g.beginPath(); g.arc((x0 + x1) / 2, WOOD_Y + 0.21, 0.07, 0, 7); g.fillStyle = '#222'; g.fill();
          }
          // copertura in coppi (dopo la chiusura)
          if (year >= 1436.6) {
            g.beginPath(); const pts = prof(3, 0, YTOP, sg, 120);
            pts.forEach(([x, y], j) => { const bump = (j % 2) ? 0.22 : 0; j ? g.lineTo(x + sg * bump, y) : g.moveTo(x, y); });
            stroke(2.2, '#8e3a20');
          }
        }
        g.restore();
        // anello di chiusura (serraglio)
        if (h >= YTOP) for (const sg of [-1, 1]) { path([[sg * 3.0, YTOP - 0.6], [sg * (m(3, YTOP) + 0.1), YTOP - 0.6], [sg * (m(3, YTOP) + 0.25), YTOP + 1.1], [sg * 3.0, YTOP + 1.1]]); g.fillStyle = MARBLE; g.fill(); fillPat(pats.stone); stroke(1.4); }
      }
      // corona di lavoro e sagoma di progetto tratteggiata
      if (h < YTOP) {
        g.setLineDash([lw(6), lw(4)]); g.lineWidth = lw(0.9); g.strokeStyle = 'rgba(51,37,26,.5)';
        for (const sg of [-1, 1]) for (const i of [0, 1, 2, 3]) {
          g.beginPath(); prof(i, Math.max(0, h), YTOP, sg, 40).forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
        }
        g.beginPath(); g.moveTo(-3, YTOP + 1.1); g.lineTo(3, YTOP + 1.1); g.stroke();
        g.setLineDash([]);
      }
      {
        // costruzione geometrica del quinto acuto (centri e raggi)
        if (focus === 'geometry') {
          g.setLineDash([lw(3), lw(3)]); g.strokeStyle = 'rgba(160,60,30,.7)'; g.lineWidth = lw(1);
          for (const sg of [-1, 1]) { line(-sg * 13.65 * C8, 0, sg * m(0, 20), 20); g.beginPath(); g.arc(-sg * 13.65 * C8, 0, 0.4, 0, 7); g.stroke(); }
          g.setLineDash([]);
        }
      }

      // --- cantiere: ponteggi, operai, argano ---
      if (building) {
        const py = h - 1.6;
        for (const sg of [-1, 1]) {
          const xi = sg * m(0, py);
          for (let k = 0; k < 3; k++) { rect(xi, py - 0.25 - k * 0.0, -sg * 2.9, 0.22); g.fillStyle = WOOD; g.fill(); stroke(0.8); }
          line(xi - sg * 2.8, py, xi - sg * 0.5, py - 1.7); stroke(1.2, '#5a3b20');                     // saettone
          rect(xi - sg * 2.9, py, sg * 2.9, 0.12); g.fillStyle = '#b08458'; g.fill(); stroke(0.6);        // tavolato
          for (let k = 0; k <= 2; k++) line(xi - sg * (2.8 - k * 1.1), py, xi - sg * (2.8 - k * 1.1), py + 1.05);
          stroke(1, '#5a3b20'); line(xi - sg * 2.85, py + 1.05, xi - sg * 0.1, py + 1.05); stroke(1, '#5a3b20');
          worker(xi - sg * 0.9, py + 0.12, 1, 1, tAnim); worker(xi - sg * 2.1, py + 0.12, 1, 0, tAnim);
          bricksPile(xi - sg * (sg > 0 ? 2.6 : 1.4), py + 0.12, 3);
        }
        // fune e carico
        // gru a braccio sul ponteggio (forma reale incerta) e fune che scende al bue-argano
        const xL = -(m(0, py) - 1.6), reach = Math.min(10, -xL), tip = xL + reach, top = py + 6.8;
        rect(xL - 0.22, py, 0.44, 7); g.fillStyle = '#7d5532'; g.fill(); stroke(1);
        rect(xL - 0.6, top - 0.2, reach + 0.8, 0.4); g.fill(); stroke(1);
        line(xL, py + 4.2, xL + reach * 0.6, top - 0.2); stroke(1.2, '#5a3b20');
        g.beginPath(); g.arc(tip, top - 0.45, 0.35, 0, 7); g.fillStyle = '#5a3b20'; g.fill();
        const ph = (tAnim / 9) % 1, f = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        const ly = GROUND + 7 + (top - 3 - GROUND - 7) * (0.5 - 0.5 * Math.cos(f * PI));
        g.lineWidth = lw(1.2); g.strokeStyle = '#7a6440'; line(tip, top - 0.45, tip, ly + 1.6);
        line(tip + 0.35, top - 0.45, tip + 0.35, GROUND + 6.4); line(tip + 0.35, GROUND + 6.4, 1.2, GROUND + 4.95);
        rect(tip - 0.7, ly, 1.4, 1.0); g.fillStyle = STONE; g.fill(); fillPat(pats.stone); stroke(1);
        line(tip - 0.7, ly + 1, tip, ly + 1.6); line(tip + 0.7, ly + 1, tip, ly + 1.6);
        // bue-argano
        const gy = GROUND;
        rect(-4.2, gy, 0.35, 6.2); rect(3.85, gy, 0.35, 6.2); rect(-4.4, gy + 6.0, 8.8, 0.4); g.fillStyle = '#7d5532'; g.fill(); stroke(1);
        rect(-0.18, gy, 0.36, 6.0); g.fillStyle = '#6a4527'; g.fill(); stroke(0.8);                // albero verticale
        gear(-1.6, gy + 4.6, 1.15, 18, tAnim * 0.8); gear(1.6, gy + 4.6, 0.75, 12, -tAnim * 1.2);
        rect(0.9, gy + 4.25, 2.6, 0.7); g.fillStyle = '#9b7348'; g.fill(); stroke(1);               // tamburo della fune
        for (let k = 0; k < 7; k++) line(1.0 + k * 0.36, gy + 4.25, 1.15 + k * 0.36, gy + 4.95);
        line(-5.5, gy + 1.0, 5.5, gy + 1.0); stroke(1.4, '#5a3b20');                                // stanga
        const a = tAnim * 0.5, ox1 = Math.cos(a) * 4, d1 = Math.sin(a);
        const oxen = [[ox1, d1, -Math.sign(Math.sin(a + PI / 2)) || 1], [-ox1, -d1, Math.sign(Math.sin(a + PI / 2)) || 1]];
        oxen.sort((p, q) => p[1] - q[1]).forEach(([x, d, dir]) => ox(x, gy + 0.05, 1.15 - d * 0.12, dir, d < 0 ? 0.55 : 1));
        bricksPile(-12, gy, 5); bricksPile(9, gy, 4); worker(7, gy, 1, 0, tAnim);   // figura umana: scala 1,65 m
        for (const bx of [12.6, 13.6]) { g.beginPath(); g.ellipse(bx, gy + 0.6, 0.42, 0.6, 0, 0, 7); g.fillStyle = '#8a6a48'; g.fill(); stroke(0.8); line(bx - 0.42, gy + 0.35, bx + 0.42, gy + 0.35); line(bx - 0.42, gy + 0.85, bx + 0.42, gy + 0.85); }
        rect(-16, gy, 2.2, 1.1); g.fillStyle = STONE; g.fill(); fillPat(pats.stone); stroke(0.8);
      }

      // --- lanterna ---
      if (year >= 1446) {
        const L0 = YTOP + 1.1, lp = clamp01((year - 1446) / 15), lTop = L0 + 0.4 + lp * 20.5;
        g.save(); rect(-12, L0 - 1, 24, lTop - L0 + 1); g.clip();
        path([[-5.6, L0], [5.6, L0], [5.6, L0 + 1.6], [-5.6, L0 + 1.6]]); g.fillStyle = MARBLE; g.fill(); fillPat(pats.stone); stroke(1.4);
        // corpo: pareti tagliate con finestre
        for (const sg of [-1, 1]) {
          for (const [y0, y1] of [[L0 + 1.6, L0 + 3.6], [L0 + 10.1, L0 + 12.1]]) { path([[sg * 3.0, y0], [sg * 3.6, y0], [sg * 3.6, y1], [sg * 3.0, y1]]); g.fillStyle = MARBLE; g.fill(); fillPat(pats.stone); stroke(1.2); }
          // contrafforte con voluta (prospetto)
          path([[sg * 3.6, L0 + 1.6], [sg * 5.4, L0 + 1.6], [sg * 4.9, L0 + 3.2], [sg * 4.2, L0 + 10], [sg * 3.6, L0 + 11.2]]); g.fillStyle = '#ece5d6'; g.fill(); stroke(1.1);
          volute(sg * 4.75, L0 + 2.55, 0.75, sg);
          line(sg * 3.9, L0 + 4, sg * 3.9, L0 + 9.8); stroke(0.6, INK2);
        }
        rect(-2.9, L0 + 1.6, 5.8, 10.5); g.fillStyle = '#d9cfbd'; g.fill();
        g.beginPath(); g.moveTo(-0.9, L0 + 3.6); g.lineTo(-0.9, L0 + 9.1); g.arc(0, L0 + 9.1, 0.9, PI, 0, true); g.lineTo(0.9, L0 + 3.6); g.closePath(); g.fillStyle = '#9fb2b8'; g.fill(); stroke(0.8);
        path([[-4.1, L0 + 12.1], [4.1, L0 + 12.1], [4.3, L0 + 12.7], [4.0, L0 + 13.2], [-4.0, L0 + 13.2], [-4.3, L0 + 12.7]]); g.fillStyle = MARBLE; g.fill(); stroke(1.2);
        // cuspide scanalata
        path([[-3.6, L0 + 13.2], [3.6, L0 + 13.2], [0.25, L0 + 20.4], [-0.25, L0 + 20.4]]); wash('#e9e2d3', '#cfc6b4', -3.6, 0, 3.6, 0); stroke(1.2);
        for (let k = -3; k <= 3; k++) line(k * 1.0, L0 + 13.2, k * 0.07, L0 + 20.3);
        g.restore();
        if (year >= 1471) {
          path([[-0.5, L0 + 20.1], [0.5, L0 + 20.1], [0.8, L0 + 21.4], [-0.8, L0 + 21.4]]); g.fillStyle = '#c99a3a'; g.fill(); stroke(1);
          g.beginPath(); g.arc(0, L0 + 22.6, 1.25, 0, 7);
          const gr = g.createRadialGradient(-0.4, L0 + 23.0, 0.1, 0, L0 + 22.6, 1.3); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(0.4, '#e2b54d'); gr.addColorStop(1, '#8a6118');
          g.fillStyle = gr; g.fill(); stroke(1.2);
          rect(-0.17, L0 + 23.8, 0.34, 3.6); rect(-0.95, L0 + 25.9, 1.9, 0.34); g.fillStyle = '#c99a3a'; g.fill(); stroke(0.8);
        } else {                                        // gru girevole della lanterna
          rect(-0.22, L0, 0.44, 27); g.fillStyle = WOOD; g.fill(); stroke(1);            // albero sull'asse: la lanterna cresce attorno
          const reach = 7 + Math.sin(tAnim / 3) * 2;
          line(-1.5, L0 + 26.5, reach + 0.5, L0 + 26.5); stroke(3, '#7d5532'); line(0, L0 + 22, reach * 0.6, L0 + 26.4); stroke(1.2, '#7d5532');
          const by = lTop + 2 + Math.abs(Math.sin(tAnim / 2)) * 3;
          line(reach, L0 + 26.5, reach, by + 0.8); stroke(1, '#7a6440');
          rect(reach - 0.6, by, 1.2, 0.8); g.fillStyle = MARBLE; g.fill(); stroke(0.8);
        }
      }

      // ponteggio interno ricostruito sul disegno attribuito a G. B. Nelli (Uffizi): dall'imposta salgono due grandi gambe inclinate fino alla trave sotto l'occhio, l'albero centrale con i mozzi e l'anello dei puntoni,
      // un piano di tavole su ritti a un terzo dell'altezza e due tavolati inclinati verso il centro (a V) per lavorare sulle vele
      if (scaffold) {
        const beam = (x0, y0, x1, y1, w = 0.42) => {
          const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L * w / 2, ny = dx / L * w / 2;
          path([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]); g.fillStyle = WOOD; g.fill(); fillPat(pats.wood); stroke(0.9);
        };
        const plank = pts => { path(pts); g.fillStyle = '#c8a070'; g.fill(); stroke(1); g.save(); g.clip(); for (let x = -24; x < 24; x += 0.7) line(x, -8, x + 3, 40); stroke(0.4, INK2); g.restore(); };
        const B0 = 0.4, PL = 10.2;                                     // piede delle gambe sull'imposta, piano principale a un terzo
        beam(0, B0, 0, 30.2, 0.62);                                   // albero centrale
        beam(-7.1, 29.4, 7.1, 29.4, 0.85);                            // trave sotto l'occhio
        for (const y of [22.6, 19.8]) { rect(-0.7, y - 0.6, 1.4, 1.2); g.fillStyle = WOOD; g.fill(); stroke(0.9); }   // mozzi sull'albero
        for (const sg of [-1, 1]) {
          const ox = t => sg * (22 + (6.6 - 22) * (t - B0) / (28.9 - B0));          // gamba esterna (a scala, con i pioli) dal palco alla trave
          beam(sg * 22, B0, sg * 6.6, 28.9, 0.6);
          beam(sg * 13.5, B0, sg * 2.4, 27.6, 0.46);                                 // gamba interna
          for (let y = 13; y < 28; y += 1.6) beam(ox(y) - sg * 0.45, y, ox(y + 0.3) + sg * 0.45, y + 0.3, 0.16);   // pioli
          beam(sg * 11.6, 15.2, 0, 22.6, 0.32); beam(sg * 7.6, 14.8, 0, 19.8, 0.3);  // puntoni radiali dai mozzi
          beam(sg * 6.9, 29, sg * 11.6, 15.2, 0.3); beam(sg * 2.2, 27.2, sg * 9.5, 18.6, 0.26);
          // crociere della parte alta (come nel disegno): tra gamba esterna e gamba interna, e dall'albero alle gambe interne
          const ix = t => sg * (13.5 + (2.4 - 13.5) * (t - B0) / (27.6 - B0));
          for (const [ya, yb] of [[16.5, 20.5], [20.5, 24.5], [24.5, 27.8]]) { beam(ox(ya), ya, ix(yb), yb, 0.22); beam(ix(ya), ya, ox(yb), yb, 0.22); }
          beam(sg * 0.3, 26.2, ix(22.6), 22.6, 0.22); beam(sg * 0.3, 22.6, ix(26.2), 26.2, 0.22);
          // ritti e saettoni sotto il piano principale
          for (const [xt, xb] of [[11.8, 13.6], [9.8, 10.3], [7.2, 5.4], [4.6, 3.4]]) beam(sg * xt, PL, sg * xb, B0, 0.36);
          beam(sg * 15.2, B0, sg * 7.4, PL - 1.4, 0.32); beam(sg * 3.6, B0, sg * 9.8, PL - 1.6, 0.28);
          // tavolato inclinato verso il centro, appoggiato in fuori su un cavalletto legato alla gamba esterna
          plank([[sg * 16.2, 15.6], [sg * 16.2, 16.3], [sg * 1.4, 12.0], [sg * 1.4, 11.3]]);
          beam(sg * 15.6, 16.3, sg * 15.6, 9.4, 0.3);   // cavalletto fino alla gamba esterna beam(sg * 8.9, 13.8, sg * 8.9, PL + 0.6, 0.28);
        }
        plank([[-12.4, PL], [12.4, PL], [12.4, PL + 0.7], [-12.4, PL + 0.7]]);                // piano principale
        worker(-9, PL + 0.7, 1, 0, tAnim); worker(12.5, 14.7, 1, 1, tAnim);
        screen(); g.font = `600 italic 14px Cormorant, Georgia, serif`; g.textAlign = 'left';
        const cap = ['ricostruzione ipotetica, da un disegno attribuito', 'a G. B. Nelli (fine Seicento, Uffizi)'];
        g.fillStyle = 'rgba(239,228,204,.9)'; g.fillRect(60, 82, 250, 42); g.fillStyle = INK; cap.forEach((t, k) => g.fillText(t, 68, 99 + k * 17)); world();   // didascalia a destra dei pulsanti dello zoom
      }

      // evidenziazione (alone pulsante)
      if (focus) {
        const pulse = 0.35 + 0.35 * Math.sin(tAnim * 4);
        g.save(); g.lineWidth = lw(4); g.strokeStyle = `rgba(214,120,40,${pulse})`;
        if (focus === 'shells' && built > 0) for (const sg of [-1, 1]) { g.save(); rect(-40, 0, 80, built); g.clip(); path(band(0, 1, 0, YTOP, sg)); g.stroke(); path(band(2, 3, 0, YTOP, sg)); g.stroke(); g.restore(); }
        if (focus === 'scaffold' && building) for (const sg of [-1, 1]) { const xi = sg * m(0, h - 1.6); rect(xi - sg * 3.1, h - 2.0, sg * 3.2, 3.3); g.stroke(); }
        if (focus === 'hoist' && building) { rect(-6, GROUND - 0.3, 12, 7.2); g.stroke(); }
        if (focus === 'lantern' && year >= 1446) { rect(-6, YTOP + 1, 12, 22); g.stroke(); }
        g.restore();
      }

      // asse della cupola (tratto-punto)
      g.setLineDash([lw(14), lw(4), lw(2), lw(4)]); g.lineWidth = lw(0.8); g.strokeStyle = 'rgba(51,37,26,.5)'; line(0, GROUND - 3, 0, YTOP + 32); g.setLineDash([]);

      // --- quote (dimensioni) ---
      const qx = view.cx - ((W - inset) / 2 - 34) / s;
      const topQ = year >= 1471 ? YTOP + 1.1 + 27 : year >= 1446 ? YTOP + 1.1 + clamp01((year - 1446) / 15) * 21 : Math.max(h, 0);
      g.lineWidth = lw(1); g.strokeStyle = INK;
      line(qx, GROUND, qx, topQ); line(qx - lw(6), GROUND, qx + lw(6), GROUND); line(qx - lw(6), topQ, qx + lw(6), topQ);
      line(qx, topQ, qx + lw(14), topQ); g.setLineDash([lw(2), lw(3)]); line(qx + lw(14), topQ, view.cx + view.span, topQ); g.setLineDash([]);

      // ---------- testo (spazio schermo) ----------
      screen();
      g.fillStyle = INK; g.font = `600 italic ${Math.max(13, W / 52)}px Cormorant, Georgia, serif`;
      g.save(); g.translate(sx(qx) - 8, sy((GROUND + topQ) / 2)); g.rotate(-PI / 2); g.textAlign = 'center';
      g.fillText(`quota ${(topQ - GROUND).toFixed(0)} m · ${((topQ - GROUND) / 0.5836).toFixed(0)} braccia`, 0, 0); g.restore();
      // etichette con linee di richiamo
      g.font = `600 ${Math.max(14, W / 46)}px Cormorant, Georgia, serif`;
      for (const l of labels) {
        if (l.minYear && year < l.minYear) continue;
        if (l.minH !== undefined && h < l.minH) continue;
        const [wx, wy] = typeof l.at === 'function' ? l.at(h) : l.at;
        const ax = sx(wx), ay = sy(wy), tx = ax + (l.dx || 60), ty = ay + (l.dy || -40);
        g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.lineTo(tx + (l.dx < 0 ? -8 : 8), ty); g.stroke();
        g.beginPath(); g.arc(ax, ay, 3, 0, 7); g.fill();
        g.textAlign = l.dx < 0 ? 'right' : 'left'; g.textBaseline = 'middle';
        const txt = l.text, tw = g.measureText(txt).width, maxX = W - inset - 14;
        let bx = l.dx < 0 ? tx - 12 - tw : tx + 12; bx = Math.max(14, Math.min(maxX - tw, bx));
        g.fillStyle = 'rgba(239,228,204,.85)'; g.fillRect(bx - 4, ty - 11, tw + 8, 22);
        g.textAlign = 'left'; g.fillStyle = INK; g.fillText(txt, bx, ty);
      }
      g.textBaseline = 'alphabetic';
      // scala grafica
      // ponytail: passo "tondo" (1-2-5) scelto perché la barra resti tra ~50 e ~140 px a ogni ingrandimento
      const unit = [0.5, 1, 2, 5, 10, 20, 50, 100].find(u => u * s >= 50) || 100, bar = unit * s, bx0 = 24, by0 = H - 22;
      const fmt = v => document.documentElement.lang === 'en' ? String(v) : String(v).replace('.', ',');
      g.fillStyle = PAPER; g.fillRect(bx0 - 8, by0 - 20, 2 * bar + 52, 32);
      for (let k = 0; k < 2; k++) { g.fillStyle = k ? PAPER : INK; g.fillRect(bx0 + k * bar, by0, bar, 6); }
      g.strokeStyle = INK; g.strokeRect(bx0, by0, 2 * bar, 6);
      g.font = `600 13px Cormorant, Georgia, serif`; g.fillStyle = INK; g.textAlign = 'center';
      g.fillText('0', bx0, by0 - 5); g.fillText(fmt(unit), bx0 + bar, by0 - 5); g.fillText(fmt(2 * unit) + ' m', bx0 + 2 * bar, by0 - 5);
      // cartiglio
      g.textAlign = 'left';
      g.fillStyle = PAPER; g.fillRect(14, 14, 250, 62); g.fillStyle = INK;
      g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(14, 14, 250, 62); g.lineWidth = 0.6; g.strokeRect(18, 18, 242, 54);
      g.font = `600 17px Cormorant, Georgia, serif`; g.fillText('S. MARIA DEL FIORE', 28, 40);
      g.font = `600 italic 15px Cormorant, Georgia, serif`; g.fillText(`Spaccato per il mezzo · anno ${Math.floor(year)}`, 28, 60);
      g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(6, 6, W - 12, H - 12); g.lineWidth = 0.6; g.strokeRect(10, 10, W - 20, H - 20);
      // vignettatura
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(120,90,50,0)'); vg.addColorStop(1, 'rgba(120,90,50,.18)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }

    // ---------- interazione: trascina per spostare, rotella/pizzico per ingrandire ----------
    const pts = new Map(); let pinch0 = 0;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); });
    const up = e => { pts.delete(e.pointerId); pinch0 = 0; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
      userView = true; follow = null;
      if (pts.size === 1) { goal.cx -= dx / s; goal.cy += dy / s; Object.assign(view, { cx: goal.cx, cy: goal.cy }); }
      else { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) goal.span = Math.min(140, Math.max(8, goal.span * pinch0 / d)); pinch0 = d; }
    });
    cv.addEventListener('wheel', e => { e.preventDefault(); userView = true; follow = null; goal.span = Math.min(140, Math.max(8, goal.span * (1 + Math.sign(e.deltaY) * 0.12))); }, { passive: false });

    let t0 = performance.now(), last = 0;
    function frame(now) {
      const dt = Math.min(0.05, Math.max(0, (now - t0) / 1000)); t0 = now;   // il timestamp di rAF può precedere performance.now() tAnim += dt;
      if (follow) { goal.cy = Math.max(h, 0) + follow.dy; }
      if (fit && !userView) goal.span = Math.max(fit.span, fit.w * H / Math.max(240, W - inset));
      const k = 1 - Math.pow(0.03, dt);
      for (const key in view) view[key] += (goal[key] - view[key]) * k;
      if (now - last > 33) { draw(); last = now; }        // ~30 fps bastano per un disegno
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    const VIEWS = {
      whole: { cx: 0, cy: 3, span: 122, fitW: 104 }, dome: { cx: 0, cy: 14, span: 56, fitW: 64 }, shells: { cx: -19.5, cy: 9, span: 30 },
      hoist: { cx: 0, cy: GROUND + 8, span: 24 }, lantern: { cx: 0, cy: YTOP + 13, span: 34 }, drum: { cx: 0, cy: -8, span: 40 },
      work: { cx: -12, span: 22, follow: { dy: 1 } }
    };
    return {
      setYear(y) { year = y; h = G.heightAt(y); },
      setFocus(f) { focus = f || null; },
      setScaffold(on) { scaffold = !!on; },
      setInset(px) { inset = px; },
      zoom(f) { userView = true; follow = null; goal.span = Math.min(140, Math.max(8, goal.span * f)); },
      setLabels(l) { labels = l || []; },
      setView(name) {
        const v = VIEWS[name] || VIEWS.whole; userView = false;
        follow = v.follow || null; fit = v.fitW ? { w: v.fitW, span: v.span } : null;
        Object.assign(goal, { cx: v.cx, span: v.span }, v.cy !== undefined ? { cy: v.cy } : {});
      },
      VIEWS, _state: () => ({ view, goal, fit, userView, follow, inset })
    };
  }
  window.Section2D = { create };
})();
