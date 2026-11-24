/* Le statue NON sono modellate: la foto le mostra già, e una sagoma generica al tornio sembrava un manichino.
   Ricostruzioni 3D in rilievo della facciata (De Fabris, 1887) e del Campanile di Giotto.
   Le misure vengono dalla foto raddrizzata (vendor/img/facciata.jpg, 42 × 47,1 m; campanile.jpg, 14,45 × 80,6 m):
   la geometria ha la profondità vera (torri, cornici, portali, rosoni, nicchie, statue); il colore delle facce
   frontali è quello della foto, proiettato in pianta, le facce laterali sono di marmo. */
(function () {
  // statua in piedi (profilo di una figura panneggiata, al tornio) o seduta; h = altezza in metri
  function statue(T, m, h, { seated = false, child = false, turn = 0 } = {}) {
    const g = new T.Group();
    const prof = seated
      ? [[0, 0], [0.34, 0], [0.36, 0.06], [0.34, 0.3], [0.3, 0.42], [0.22, 0.5], [0.19, 0.62], [0.2, 0.7], [0.13, 0.76], [0.06, 0.78], [0.075, 0.83], [0.085, 0.9], [0.06, 0.96], [0, 0.97]]
      : [[0, 0], [0.24, 0], [0.26, 0.04], [0.23, 0.12], [0.2, 0.4], [0.17, 0.62], [0.18, 0.72], [0.19, 0.78], [0.12, 0.84], [0.055, 0.86], [0.065, 0.9], [0.075, 0.95], [0.05, 0.99], [0, 1]];
    const body = new T.Mesh(new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r * h, y * h)), 14), m);
    body.scale.z = 0.78; g.add(body);                                              // un po' schiacciata: è una statua da nicchia
    const arm = new T.Mesh(new T.CapsuleGeometry(0.045 * h, 0.26 * h, 3, 6), m);    // braccio piegato sul petto
    arm.rotation.z = 1.1; arm.position.set(0.05 * h, (seated ? 0.62 : 0.66) * h, 0.12 * h); g.add(arm);
    if (seated) {                                                                     // ginocchia e, per la Madonna, il Bambino
      const knees = new T.Mesh(new T.BoxGeometry(0.5 * h, 0.12 * h, 0.36 * h), m); knees.position.set(0, 0.42 * h, 0.16 * h); g.add(knees);
      if (child) { const c = statue(T, m, 0.36 * h); c.position.set(0.12 * h, 0.48 * h, 0.16 * h); g.add(c); }
    } else {
      const staff = new T.Mesh(new T.CylinderGeometry(0.012 * h, 0.012 * h, 0.9 * h, 5), m); staff.position.set(-0.2 * h, 0.45 * h, 0.1 * h); g.add(staff);
    }
    g.rotation.y = turn; g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    return g;
  }

  // facce frontali con la foto (UV in pianta), facce laterali di marmo
  function planarUV(geo, W, H, x0 = -W / 2) {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / W, p.getY(i) / H);
    uv.needsUpdate = true; return geo;
  }

  // ---------- Facciata (coordinate locali: x da −21 a 21, y in su, z verso la piazza) ----------
  function facade(T, { photo, side, marble, dark, stone }) {
    const W = 42, H = 47.1, G = new T.Group();
    const M6 = [side, side, side, side, photo, side];
    const mesh = (geo, m, cast = true) => { const o = new T.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = true; G.add(o); return o; };
    const box = (x0, x1, y0, y1, z0, z1, m = M6) => {                 // parallelepipedo con la foto sulla faccia davanti
      const geo = new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      return mesh(planarUV(geo, W, H), m);
    };
    const sym = f => { f(1); f(-1); };                                   // la facciata è simmetrica
    const tri = (x0, x1, y0, apex, z0, d, m = [photo, side]) => {        // ghimberga / timpano triangolare
      const sh = new T.Shape([new T.Vector2(x0, y0), new T.Vector2(x1, y0), new T.Vector2((x0 + x1) / 2, apex)]);
      const geo = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); geo.translate(0, 0, z0);
      return mesh(planarUV(geo, W, H), m);
    };
    const pinnacle = (x, y0, y1, z, r = 0.32) => {                       // pinnacolo: fusto ottagonale e cuspide
      const f = mesh(new T.CylinderGeometry(r, r, y1 - y0, 8), marble); f.position.set(x, (y0 + y1) / 2, z);
      const c = mesh(new T.ConeGeometry(r * 1.25, r * 4, 8), marble); c.position.set(x, y1 + r * 2, z);
    };

    // muro di fondo con i fori dei rosoni (la foto ci sta sopra)
    const wall = new T.Shape([[-21, 0], [21, 0], [21, 28.4], [10.6, 28.4], [10.6, 41.5], [-10.6, 41.5], [-10.6, 28.4], [-21, 28.4]].map(([x, y]) => new T.Vector2(x, y)));
    const roses = [[0, 32.8, 3.25, 0.9], [-13.3, 17.6, 1.95, 0.55], [13.3, 17.6, 1.95, 0.55]];
    for (const [x, y, r] of roses) { const h = new T.Path(); h.absarc(x, y, r, 0, Math.PI * 2, true); wall.holes.push(h); }
    mesh(planarUV(new T.ShapeGeometry(wall, 48), W, H), photo, false);
    // rosoni: strombatura conica e vetrata incassata
    for (const [x, y, r, d] of roses) {
      const cone = new T.CylinderGeometry(r, r * 0.84, d, 48, 1, true); cone.rotateX(Math.PI / 2); cone.translate(x, y, -d / 2);
      mesh(planarUV(cone, W, H), photo, false);
      const disc = new T.CircleGeometry(r * 0.84, 48); disc.translate(x, y, -d); mesh(planarUV(disc, W, H), photo, false);
    }
    // timpano centrale sopra il coronamento
    tri(-7.4, 7.4, 41.5, H, 0, 0.6);
    const cross = mesh(new T.BoxGeometry(0.18, 1.6, 0.18), marble); cross.position.set(0, H + 0.8, 0.3);
    mesh(new T.BoxGeometry(0.9, 0.16, 0.16), marble).position.set(0, H + 1.1, 0.3);

    sym(s => {
      const X = v => s * v, R = (a, b) => [Math.min(X(a), X(b)), Math.max(X(a), X(b))];
      // torri angolari e torri tra corpo centrale e laterali (sporgono dal muro)
      box(...R(18.6, 21), 0, 28.4, 0, 1.0);
      box(...R(7.4, 10.6), 0, 43.0, 0, 1.3);
      // coronamenti su beccatelli e parapetti merlati
      box(...R(18.2, 21.3), 27.2, 28.9, 0, 1.7); box(...R(10.6, 18.6), 26.6, 28.4, 0, 1.4);
      box(...R(7.0, 10.9), 42.6, 44.6, 0, 1.9);
      for (const [a, b, y, z] of [[18.2, 21.3, 28.9, 1.6], [10.6, 18.6, 28.4, 1.3], [7.0, 10.9, 44.6, 1.8]])
        for (let k = a; k < b - 0.3; k += 0.75) { const c = mesh(new T.BoxGeometry(0.42, 0.7, z), marble); c.position.set(X(k + 0.25), y + 0.35, z / 2); }
      for (let k = 0; k < 10; k++) { const b = mesh(new T.BoxGeometry(0.3, 0.9, 1.0), marble); b.position.set(X(11 + k * 0.75), 26.2, 0.6); }   // beccatelli
      // cornici marcapiano
      box(...R(10.6, 18.6), 13.7, 14.1, 0, 0.35); box(...R(0, 21), 21.8, 22.3, 0, 0.4); box(...R(0, 21), 26.2, 26.6, 0, 0.45);
      box(...R(0, 7.4), 38.4, 38.9, 0, 0.35); box(...R(0, 7.4), 39.4, 41.5, 0, 0.5);
      // portale laterale: cornice strombata, ghimberga e pinnacoli
      const px = 14;
      for (let k = 0; k < 3; k++) box(...R(px - 2.6 + k * 0.35, px - 2.25 + k * 0.35), 0, 9.6 - k * 0.3, 0, 0.9 - k * 0.25), box(...R(px + 2.25 - k * 0.35, px + 2.6 - k * 0.35), 0, 9.6 - k * 0.3, 0, 0.9 - k * 0.25);
      tri(X(px) - 2.8, X(px) + 2.8, 9.6, 14.6, 0, 0.7);
      pinnacle(X(px - 2.75), 9, 14.2, 0.55); pinnacle(X(px + 2.75), 9, 14.2, 0.55);
      // nicchie della galleria con le statue (5 per lato, 3 per metà del corpo centrale)
      for (const nx of [11.6, 13.3, 15.0, 16.7, 18.4, 1.9, 3.8, 5.7]) {
        tri(X(nx) - 0.8, X(nx) + 0.8, 25.2, 26.8, 0.05, 0.3);
        pinnacle(X(nx) - 0.82, 22.3, 25.6, 0.3, 0.09);
      }
      // statue nei tabernacoli delle torri
      pinnacle(X(7.4), 41, 45.6, 1.0, 0.4); pinnacle(X(10.6), 41, 45.6, 1.0, 0.4);
    });
    // portale centrale: strombatura a gradini, lunetta, ghimberga con pinnacoli
    sym(s => { for (let k = 0; k < 4; k++) box(Math.min(s * (6.2 - k * 0.45), s * (5.75 - k * 0.45)), Math.max(s * (6.2 - k * 0.45), s * (5.75 - k * 0.45)), 0, 13.6 - k * 0.4, 0, 1.2 - k * 0.27); pinnacle(s * 6.4, 12, 22.4, 0.8, 0.4); });
    tri(-6.6, 6.6, 13.6, 22.3, 0, 0.9);
    // tabernacolo della Madonna in trono col Bambino, sotto il rosone
    tri(-1.7, 1.7, 26.4, 29.2, 0.1, 0.5);
    sym(s => pinnacle(s * 1.75, 22.3, 27, 0.45, 0.14));
    // porta di bronzo: lieve incasso scuro (la foto ad alta risoluzione la mette engine.js)
    box(-1.65, 1.65, 0, 6.0, -0.3, 0.02, [dark, dark, dark, dark, dark, dark]);
    return G;
  }

  // ---------- Campanile (centro in 0, base in y = 0): rilievi su ognuna delle 4 facce ----------
  function campanile(T, { marble, dark, stone }) {
    const S = 14.45, half = S / 2, G = new T.Group();
    const add = (geo, m, x, y, z, parent) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
    // cornici marcapiano tutto intorno (quote dalla foto raddrizzata)
    for (const [y, t, d] of [[6.2, 0.45, 0.25], [11.6, 1.2, 0.35], [13.3, 0.4, 0.25], [20.6, 0.5, 0.3], [27.6, 1.3, 0.4], [32.9, 0.45, 0.3], [41.6, 0.9, 0.35], [57.6, 1.1, 0.4], [61.2, 0.5, 0.3]])
      add(new T.BoxGeometry(S + 2 * d, t, S + 2 * d), marble, 0, y + t / 2, 0, G);
    for (let f = 0; f < 4; f++) {
      const F = new T.Group(); F.rotation.y = f * Math.PI / 2; G.add(F); const z = half;
      // finestre: stipiti, colonnine, archi e cappucci a timpano in rilievo; il vuoto è scuro
      const opening = (cx, y0, y1, w, lights) => {
        add(new T.BoxGeometry(w, y1 - y0, 0.08), dark, cx, (y0 + y1) / 2, z + 0.01, F);
        for (const sx of [-1, 1]) add(new T.BoxGeometry(0.28, y1 - y0 + 0.6, 0.35), marble, cx + sx * (w / 2 + 0.14), (y0 + y1) / 2 + 0.3, z + 0.17, F);
        for (let k = 1; k < lights; k++) add(new T.CylinderGeometry(0.1, 0.1, (y1 - y0) * 0.8, 8), marble, cx - w / 2 + w * k / lights, y0 + (y1 - y0) * 0.4, z + 0.12, F);
        const arc = add(new T.TorusGeometry(w / 2 + 0.1, 0.16, 6, 20, Math.PI), marble, cx, y1, z + 0.17, F);
        const sh = new T.Shape([new T.Vector2(-w / 2 - 0.6, 0), new T.Vector2(w / 2 + 0.6, 0), new T.Vector2(0, w * 0.55 + 0.9)]);
        add(new T.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }), marble, cx, y1 + w / 2 + 0.2, z, F);
        add(new T.BoxGeometry(w + 0.5, 0.25, 0.5), marble, cx, y0 - 0.12, z + 0.25, F);               // davanzale con balaustra
        arc.rotation.z = 0;
      };
      for (const cx of [-1.7, 1.8]) opening(cx, 34.5, 39.6, 2.1, 2);
      for (const cx of [-2.0, 2.0]) opening(cx, 46.2, 52.8, 2.3, 2);
      opening(0, 63, 71.6, 4.0, 3);
      // nicchie con le statue di profeti e sibille (4 per lato)
      for (const nx of [-3.7, -1.1, 1.5, 4.2]) {
        add(new T.BoxGeometry(1.3, 3.8, 0.06), dark, nx, 17.4, z + 0.01, F);
        add(new T.BoxGeometry(1.5, 0.2, 0.5), marble, nx, 15.5, z + 0.25, F);
      }
    }
    return G;
  }

  window.Build3D = { statue, facade, campanile, planarUV };
})();
