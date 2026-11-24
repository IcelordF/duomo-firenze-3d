/* Motore 3D della cupola di Santa Maria del Fiore.
   Unità: metri. y = 0 è l'imposta della cupola (circa 54 m da terra).
   Tutto è guidato da un solo parametro: l'anno (setYear). */
(function () {
  const T = window.THREE;
  const PI = Math.PI, P8 = PI / 8, COS8 = Math.cos(P8);

  // ---------- Geometria (Museo Galileo: imposta ~54 m, cupola ~33 m, lanterna ~22 m) ----------
  const RHO = 36.4, CX = 13.65;          // "quinto acuto": raggio = 4/5 del diametro (45,5 m agli spigoli)
  const YTOP = 32.4, GROUND = -55;   // imposta a ~55 m: con la lanterna si arriva a ~116 m
  const rIn = y => Math.sqrt(RHO * RHO - y * y) - CX;   // intradosso, misurato sugli spigoli
  const k = y => Math.min(1, Math.max(0, y / YTOP));
  // spessori a metà vela (letteratura corrente): interna 2,25→1,5 m, intercapedine ~1,2 m, esterna 0,75→0,4 m.
  // R[] è misurato sugli spigoli, quindi gli spessori si dividono per cos 22,5°.
  const tIn = y => 2.25 - 0.75 * k(y), GAP = 1.2, tOut = y => 0.75 - 0.35 * k(y);
  const R = [
    y => rIn(y),
    y => rIn(y) + tIn(y) / COS8,                                       // calotta interna (spessa)
    y => rIn(y) + (tIn(y) + GAP) / COS8,                               // intercapedine
    y => rIn(y) + (tIn(y) + GAP + tOut(y)) / COS8                      // calotta esterna (sottile)
  ];
  const ang = i => i * PI / 4 + P8;     // spigoli a 22,5° + 45°·i: le vele guardano gli assi
  const corner = (i, r, y) => [r * Math.cos(ang(i)), y, r * Math.sin(ang(i))];

  // anno → altezza muratura (m sopra l'imposta). ponytail: interpolazione lineare a tratti, tappe documentate.
  const H_KEYS = [[1420.6, 0], [1423, 4.5], [1425, 9], [1428, 15], [1431, 22], [1434, 28.5], [1436.6, YTOP]];
  function heightAt(year) {
    if (year < H_KEYS[0][0]) return -0.5;
    for (let i = 1; i < H_KEYS.length; i++) {
      const [y1, h1] = H_KEYS[i], [y0, h0] = H_KEYS[i - 1];
      if (year <= y1) return h0 + (h1 - h0) * (year - y0) / (y1 - y0);
    }
    return YTOP + 2;
  }
  const clamp01 = v => Math.min(1, Math.max(0, v));

  // ---------- Texture procedurali ----------
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function canvasTex(w, h, draw, { srgb = true, repeat = true } = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    if (srgb) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  // normal map da una mappa d'altezza disegnata su canvas (filtro di Sobel)
  function normalTex(w, h, draw, strength) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const src = g.getImageData(0, 0, w, h).data, out = g.createImageData(w, h), o = out.data;
    const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4; o[i] = (nx / l * 0.5 + 0.5) * 255; o[i + 1] = (ny / l * 0.5 + 0.5) * 255; o[i + 2] = (nz / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t;
  }
  function noise(g, w, h, n, a, dark) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = dark ? `rgba(30,20,10,${a * rnd()})` : `rgba(255,250,240,${a * rnd()})`;
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
    }
  }
  // Mattoni con spina di pesce: riquadro di 2×2 m, 25 corsi; ogni corso la fila verticale slitta di 8 cm.
  function brickDraw(bump) {
    return (g, w, h) => {
      const px = w / 2, ch = h / 25, bl = 0.4 * px;
      g.fillStyle = bump ? '#202020' : '#b8a98f'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 25; r++) {
        const y = r * ch, off = (r % 2) * bl / 2;
        for (let x = -bl; x < w + bl; x += bl) {
          const c = bump ? 150 + rnd() * 70 | 0 : 0;
          g.fillStyle = bump ? `rgb(${c},${c},${c})`
            : `hsl(${12 + rnd() * 12},${42 + rnd() * 18}%,${33 + rnd() * 14}%)`;
          g.fillRect(x + off + 2, y + 2, bl - 4, ch - 4);
        }
        for (let s = 0; s < 2; s++) {           // mattoni "a coltello" della spina di pesce
          const vx = ((s + r * 0.04) % 1) * w, vw = 0.1 * px;
          for (const dx of [0, -w, w]) {
            g.fillStyle = bump ? '#202020' : '#a89a80'; g.fillRect(vx + dx - 3, y, vw + 6, ch);
            const c = bump ? 235 : 0;
            g.fillStyle = bump ? `rgb(${c},${c},${c})` : `hsl(${8 + rnd() * 8},${48 + rnd() * 10}%,${28 + rnd() * 8}%)`;
            g.fillRect(vx + dx, y + 2, vw, ch - 4);
          }
        }
      }
      if (!bump) noise(g, w, h, 9000, 0.25, rnd() > 0.5);
    };
  }
  // Coppi: file di tegole curve 2×2 m.
  function tileDraw(bump) {
    return (g, w, h) => {
      const rows = 6, cols = 10, rh = h / rows, cw = w / cols;
      g.fillStyle = bump ? '#000' : '#5a2a1a'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * cw, y = r * rh, cover = c % 2 === 0;
        const grd = g.createLinearGradient(x, 0, x + cw, 0);
        if (bump) {
          const top = cover ? 255 : 90;
          grd.addColorStop(0, '#111'); grd.addColorStop(0.5, `rgb(${top},${top},${top})`); grd.addColorStop(1, '#111');
        } else {
          const hue = 15 + rnd() * 11, sat = 40 + rnd() * 18, l = 44 + rnd() * 12 - (cover ? 0 : 8);
          grd.addColorStop(0, `hsl(${hue},${sat}%,${l - 12}%)`);
          grd.addColorStop(0.45, `hsl(${hue},${sat}%,${l + 6}%)`);
          grd.addColorStop(1, `hsl(${hue},${sat}%,${l - 14}%)`);
        }
        g.fillStyle = grd;
        g.beginPath(); g.roundRect(x + 1, y + 2, cw - 2, rh + 6, [0, 0, cw / 2, cw / 2]); g.fill();
        if (!bump) { g.fillStyle = 'rgba(20,10,5,.35)'; g.fillRect(x, y + rh - 3, cw, 4); }
      }
      if (!bump) { noise(g, w, h, 6000, 0.3, true); noise(g, w, h, 3000, 0.12, false); }
    };
  }
  function marbleDraw(base) {
    return (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.lineWidth = 1;
      for (let i = 0; i < 22; i++) {
        g.strokeStyle = `rgba(110,105,95,${0.08 + rnd() * 0.12})`;
        g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
        for (let j = 0; j < 30; j++) { x += (rnd() - 0.3) * 30; y += (rnd() - 0.5) * 30; g.lineTo(x, y); }
        g.stroke();
      }
      noise(g, w, h, 4000, 0.06, true);
    };
  }
  const GREEN = '#33503f', PINK = '#b98473', WHITE = '#ebe4d6';
  // Paramento policromo (bianco Carrara, verde Prato, rosso Maremma).
  function polyDraw(g, w, h) {
    marbleDraw(WHITE)(g, w, h);
    const b = w * 0.06;
    g.fillStyle = GREEN;
    g.fillRect(0, 0, w, b); g.fillRect(0, h / 2 - b / 2, w, b);
    for (const x of [0, w / 2 - b / 2]) g.fillRect(x, 0, b, h);
    g.strokeStyle = GREEN; g.lineWidth = b * 0.5;
    for (const [x, y] of [[w * 0.14, h * 0.6], [w * 0.64, h * 0.6], [w * 0.14, h * 0.1], [w * 0.64, h * 0.1]]) g.strokeRect(x, y, w * 0.22, h * 0.32);
    g.fillStyle = PINK; g.fillRect(w * 0.205, h * 0.68, w * 0.09, h * 0.16); g.fillRect(w * 0.705, h * 0.18, w * 0.09, h * 0.16);
    noise(g, w, h, 3000, 0.08, true);
  }
  // Faccia del tamburo con l'occhio (oculo) centrale.
  function drumDraw(g, w, h) {
    marbleDraw(WHITE)(g, w, h);
    g.fillStyle = GREEN;
    g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.94, w, h * 0.06); g.fillRect(0, h * 0.13, w, h * 0.025);
    g.fillRect(0, 0, w * 0.045, h); g.fillRect(w * 0.955, 0, w * 0.045, h);
    g.lineWidth = w * 0.012; g.strokeStyle = GREEN;
    g.strokeRect(w * 0.08, h * 0.2, w * 0.2, h * 0.66); g.strokeRect(w * 0.72, h * 0.2, w * 0.2, h * 0.66);
    g.fillStyle = PINK; g.fillRect(w * 0.13, h * 0.35, w * 0.1, h * 0.36); g.fillRect(w * 0.77, h * 0.35, w * 0.1, h * 0.36);
    const cx = w / 2, cy = h * 0.53, r = h * 0.27;
    g.strokeStyle = GREEN; g.lineWidth = w * 0.016; g.strokeRect(cx - r * 1.25, cy - r * 1.25, r * 2.5, r * 2.5);
    const rings = [[1.12, WHITE], [1.04, GREEN], [0.97, WHITE], [0.9, '#8a7e6c']];
    for (const [s, c] of rings) { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r * s, 0, 7); g.fill(); }
    const gg = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r * 0.86);
    gg.addColorStop(0, '#5d6a70'); gg.addColorStop(1, '#1b2023');
    g.fillStyle = gg; g.beginPath(); g.arc(cx, cy, r * 0.86, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,190,160,.35)'; g.lineWidth = 2;
    for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * PI / 4) * r * 0.86, cy + Math.sin(a * PI / 4) * r * 0.86); g.stroke(); }
    noise(g, w, h, 5000, 0.07, true);
  }
  function woodDraw(g, w, h) {
    g.fillStyle = '#7a5634'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += h / 8) {
      g.fillStyle = `hsl(28,${35 + rnd() * 15}%,${26 + rnd() * 12}%)`; g.fillRect(0, y + 1, w, h / 8 - 2);
      for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(40,22,10,.25)'; g.beginPath(); const yy = y + rnd() * h / 8; g.moveTo(0, yy); g.bezierCurveTo(w / 3, yy + 3, w * 2 / 3, yy - 3, w, yy); g.stroke(); }
    }
  }
  function plasterDraw(g, w, h) { g.fillStyle = '#d9cdb6'; g.fillRect(0, 0, w, h); noise(g, w, h, 6000, 0.08, true); }

  // ---------- Costruttori di geometria ----------
  function build(pos, uv, idx) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // Superficie a padiglione: 8 vele cilindriche tra gli spigoli, r(y) misurato sugli spigoli.
  function octSurface(rf, y0, y1, ny, tex = 2) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < 8; i++) {
      const base = pos.length / 3; let v = 0, prev = null;
      for (let j = 0; j <= ny; j++) {
        const y = y0 + (y1 - y0) * j / ny, r = rf(y), L = r * Math.sin(P8);
        if (prev) v += Math.hypot(y - prev[0], (r - prev[1]) * COS8);
        prev = [y, r];
        pos.push(...corner(i, r, y), ...corner(i + 1, r, y));
        uv.push(-L / tex, v / tex, L / tex, v / tex);
        if (j) { const a = base + (j - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
    }
    return build(pos, uv, idx);
  }
  // Striscia verticale a una frazione s della vela i (costoloni), tra due raggi.
  function ribStrip(i, s, rf0, rf1, y0, y1, ny) {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= ny; j++) {
      const y = y0 + (y1 - y0) * j / ny;
      for (const rf of [rf0, rf1]) {
        const a = corner(i, rf(y), y), b = corner(i + 1, rf(y), y);
        pos.push(a[0] + (b[0] - a[0]) * s, y, a[2] + (b[2] - a[2]) * s);
      }
      uv.push(0, y / 2, 0.5, y / 2);
      if (j) { const a = (j - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    return build(pos, uv, idx);
  }
  // Sezione nel piano z = 0 (vele che guardano ±x): profilo tra due raggi.
  function sectionStrip(sign, rf0, rf1, y0, y1, ny, tex = 2) {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= ny; j++) {
      const y = y0 + (y1 - y0) * j / ny, a = rf0(y) * COS8 * sign, b = rf1(y) * COS8 * sign;
      pos.push(a, y, 0.02, b, y, 0.02); uv.push(a / tex, y / tex, b / tex, y / tex);
      if (j) { const q = (j - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    return build(pos, uv, idx);
  }
  function prism(r, y0, y1, uvFace, sc = 12) {          // prisma ottagonale aperto, una texture per faccia
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < 8; i++) {
      const b = pos.length / 3, a0 = corner(i, r, 0), a1 = corner(i + 1, r, 0);
      pos.push(a0[0], y0, a0[2], a1[0], y0, a1[2], a0[0], y1, a0[2], a1[0], y1, a1[2]);
      const L = 2 * r * Math.sin(P8);
      if (uvFace) uv.push(0, 0, 1, 0, 0, 1, 1, 1); else uv.push(0, 0, L / sc, 0, 0, (y1 - y0) / sc, L / sc, (y1 - y0) / sc);
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    return build(pos, uv, idx);
  }
  // box con UV in metri (un riquadro di paramento ogni `sc` metri)
  function boxUV(w, h, d, sc) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / sc, uv.getY(i) * dims[f][1] / sc); }
    return g;
  }
  function octRing(rf0, rf1) {                  // anello piatto (corona di lavoro), aggiornabile
    const g = build(new Array(8 * 4 * 3).fill(0), new Array(8 * 4 * 2).fill(0),
      [...Array(8).keys()].flatMap(i => { const b = i * 4; return [b, b + 2, b + 1, b + 1, b + 2, b + 3]; }));
    g.userData.update = y => {
      const p = g.attributes.position.array, u = g.attributes.uv.array;
      for (let i = 0; i < 8; i++) {
        const pts = [corner(i, rf0(y), y), corner(i + 1, rf0(y), y), corner(i, rf1(y), y), corner(i + 1, rf1(y), y)];
        pts.forEach((q, n) => { p.set(q, (i * 4 + n) * 3); u.set([q[0] / 2, q[2] / 2], (i * 4 + n) * 2); });
      }
      g.attributes.position.needsUpdate = g.attributes.uv.needsUpdate = true;
      g.computeVertexNormals(); g.computeBoundingSphere();
    };
    return g;
  }

  // ---------- Scena ----------
  function create(container, opts = {}) {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) {
      const msg = document.createElement('div'); msg.className = 'nogl'; msg.textContent = 'Questo computer non riesce a mostrare la grafica 3D (WebGL disattivato): resta disponibile lo spaccato.'; container.appendChild(msg);
      return null;
    }
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, 2, 4000);   // near 2 m: più precisione di profondità, niente sfarfallio
    const HORIZON = 0xd6d6ca;
    scene.fog = new T.FogExp2(HORIZON, 0.0007);
    const SUN_DIR = new T.Vector3(-0.55, 0.47, 0.69).normalize();     // pomeriggio, sole a ~28°

    // Cielo toscano con nuvole (fbm) e disco solare
    const skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { sun: { value: SUN_DIR } },
      vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 d; uniform vec3 sun;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
        void main(){ float h = clamp(d.y,0.,1.);
          vec3 c = mix(vec3(.886,.831,.737), vec3(.38,.57,.79), pow(h,.5));
          float sd = max(dot(d,sun),0.);
          c += vec3(1.,.78,.5)*(pow(sd,8.)*.25 + pow(sd,64.)*.6) + vec3(1.,.95,.85)*smoothstep(.9994,.9997,sd);
          if (d.y > 0.) {
            vec2 uv = d.xz/(d.y+.12)*1.6;
            float cl = smoothstep(.52,.85, fbm(uv + vec2(3.,1.)));
            vec3 cc = mix(vec3(1.,.97,.92), vec3(.82,.78,.74), smoothstep(.6,1.,fbm(uv*2.)));
            c = mix(c, cc, cl*smoothstep(0.,.25,d.y)*.85);
          } else c = vec3(.886,.831,.737);
          gl_FragColor = vec4(c,1.); }`
    });
    const sky = new T.Mesh(new T.SphereGeometry(3000, 48, 24), skyMat); sky.renderOrder = -1; scene.add(sky);
    // environment map dal solo cielo: riflessi credibili su oro e marmo
    const pmrem = new T.PMREMGenerator(renderer), skyScene = new T.Scene(); skyScene.add(sky.clone());
    scene.environment = pmrem.fromScene(skyScene).texture; scene.environmentIntensity = 0.7;
    const hemi = new T.HemisphereLight(0xd6e4f2, 0x8a6a50, 1.1); scene.add(hemi);   // luce del cielo: i lati in ombra restano chiari come nelle foto
    const sun = new T.DirectionalLight(0xffd9a8, 3.6);
    sun.position.copy(SUN_DIR).multiplyScalar(420); sun.target.position.set(0, -20, 0);
    Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 50, far: 1000 });
    const bigShadow = renderer.capabilities.maxTextureSize >= 8192;
    sun.shadow.mapSize.set(bigShadow ? 4096 : 2048, bigShadow ? 4096 : 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5;
    sun.shadow.radius = 3; sun.castShadow = true; scene.add(sun, sun.target);
    const inner = new T.PointLight(0xffd6a0, 2600, 140, 2); inner.position.set(0, -22, 0); scene.add(inner);   // luce calda nel crocicchio
    renderer.shadowMap.autoUpdate = false;        // scena statica: le ombre si ricalcolano solo quando cambia qualcosa
    const shadowsDirty = () => { renderer.shadowMap.needsUpdate = true; };

    // Piani di taglio: altezza della muratura e sezione (via la metà verso z+).
    const cutH = new T.Plane(new T.Vector3(0, -1, 0), 0);
    const cutZ = new T.Plane(new T.Vector3(0, 0, -1), 0);
    const cutLantern = new T.Plane(new T.Vector3(0, -1, 0), 0);
    const off = new T.Plane(new T.Vector3(0, -1, 0), 1e6);   // piano neutro quando la sezione è spenta
    const DOME = [cutH, off], SECT = [cutH], WORLD = [off], LANT = [cutLantern];
    let sectionOn = false;

    const tx = {
      brick: canvasTex(1024, 1024, brickDraw(false)), brickB: normalTex(1024, 1024, brickDraw(true), 3),
      tile: canvasTex(512, 512, tileDraw(false)), tileB: normalTex(512, 512, tileDraw(true), 5),
      marble: canvasTex(512, 512, marbleDraw(WHITE)), poly: canvasTex(512, 512, polyDraw),
      drum: canvasTex(1024, 640, drumDraw, { repeat: false }), wood: canvasTex(256, 256, woodDraw),
      plaster: canvasTex(256, 256, plasterDraw), stone: canvasTex(256, 256, marbleDraw('#9a8f7e'))
    };
    const mat = (o, clip = DOME) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0, side: T.DoubleSide, clippingPlanes: clip, clipShadows: true }, o));
    const M = {
      brick: mat({ map: tx.brick, normalMap: tx.brickB }),
      brickSec: mat({ map: tx.brick, normalMap: tx.brickB, color: 0xf0d8c8 }, SECT),
      tiles: mat({ map: tx.tile, normalMap: tx.tileB, normalScale: new T.Vector2(0.5, 0.5), roughness: 0.9 }),
      marble: mat({ map: tx.marble, roughness: 0.42 }),
      plaster: mat({ map: tx.plaster }),
      rib: mat({ map: tx.brick, color: 0xd9b8a4 }),
      stoneChain: mat({ map: tx.stone, color: 0xc8c0b0, emissive: 0x000000 }),
      woodChain: mat({ map: tx.wood, emissive: 0x000000 }),
      chainSec: mat({ map: tx.stone, color: 0xd0c8b8, polygonOffset: true, polygonOffsetFactor: -2, emissive: 0 }, SECT),
      woodSec: mat({ map: tx.wood, polygonOffset: true, polygonOffsetFactor: -2, emissive: 0 }, SECT),
      drum: mat({ map: tx.drum, roughness: 0.6 }, WORLD), poly: mat({ map: tx.poly, roughness: 0.6 }, WORLD),
      polyIn: mat({ map: tx.plaster }, WORLD), roof: mat({ map: tx.tile, normalMap: tx.tileB, roughness: 0.8 }, []),
      cath: mat({ map: tx.poly, roughness: 0.6 }, []), cathCut: mat({ map: tx.poly, roughness: 0.6 }, WORLD),
      wood: mat({ map: tx.wood }, DOME), site: mat({ map: tx.wood }, WORLD), lantern: mat({ map: tx.marble, roughness: 0.5 }, LANT),
      lanternTop: mat({ color: 0x5b6b62, roughness: 0.5, metalness: 0.3 }, LANT),
      gold: mat({ color: 0xd4a640, roughness: 0.3, metalness: 1 }, WORLD),
      rope: new T.MeshStandardMaterial({ color: 0xc9b48a, roughness: 1 })
    };
    // foto originali (Wikimedia Commons, vedi crediti nel glossario)
    const imgTex = name => { const t = new T.TextureLoader().load((window.CUPOLA_IMG || {})[name] || ''); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
    // rilievo dalla foto (portali): la luminanza sfocata sposta davvero i vertici e fa da bump, così figure e cornici sporgono
    // ponytail: luce = sporgenza è un'approssimazione; una scansione 3D dei battenti la sostituirebbe se ce ne fosse una libera
    const reliefMat = (name, depth, o = {}) => {
      const h = imgTex(name + '-rilievo'); h.colorSpace = T.NoColorSpace;
      return new T.MeshStandardMaterial(Object.assign({ map: imgTex(name), displacementMap: h, displacementScale: depth, displacementBias: -depth / 2, bumpMap: h, bumpScale: 2, roughness: 0.5, side: T.DoubleSide }, o));
    };
    const add = (geo, m, parent = scene, shadow = true) => {
      const o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = shadow; parent.add(o); return o;
    };

    // --- Cupola ---
    const dome = new T.Group(); scene.add(dome);
    const NY = 72;
    const shellIn = add(octSurface(R[0], 0, YTOP, NY), M.plaster, dome);
    add(octSurface(R[1], 0, YTOP, NY), M.brick, dome);
    add(octSurface(R[2], 0, YTOP, NY), M.brick, dome);
    const shellOut = add(octSurface(R[3], 0, YTOP, NY), M.brick, dome);
    const ribs = new T.Group(); dome.add(ribs);
    for (let i = 0; i < 8; i++) {                                    // 8 sproni d'angolo + 16 intermedi
      for (const [s, w] of [[0, 0.035], [1 / 3, 0.014], [2 / 3, 0.014]]) for (const d of [-w, w])
        add(ribStrip(i, s + d, R[1], R[2], 0, YTOP, 36), M.rib, ribs);
    }
    const ring = new T.Group(); dome.add(ring);                       // serraglio (anello di chiusura)
    add(octSurface(y => 3.2, YTOP - 0.2, YTOP + 1.1, 2), M.marble, ring);
    add(octSurface(y => R[3](YTOP) + 0.15, YTOP - 0.6, YTOP + 1.1, 2), M.marble, ring);
    const cap = add(new T.RingGeometry(3.2, (R[3](YTOP) + 0.15) * COS8 + 0.05, 8, 1, P8), M.marble, ring); cap.rotation.x = -PI / 2; cap.position.y = YTOP + 1.1;
    // Sezione (visibile solo col taglio)
    const sect = new T.Group(); dome.add(sect);
    for (const s of [1, -1]) {
      add(sectionStrip(s, R[0], R[1], 0, YTOP, NY), M.brickSec, sect, false);
      add(sectionStrip(s, R[2], R[3], 0, YTOP, NY), M.brickSec, sect, false);
    }
    // Catene: 4 di pietra (dentro la calotta interna) e 1 di legno (nell'intercapedine). Quote indicative.
    const chains = new T.Group(), chainSect = new T.Group(); dome.add(chains); sect.add(chainSect);
    const STONE_Y = [0.6, 11, 19.5, 27.5], WOOD_Y = 7.8;   // anche in Cupola.geom
    function beamRing(y, r0, r1, hh, m, grp) {
      add(octSurface(() => r1, y, y + hh, 1, 1), m, grp);
      add(octSurface(() => r0, y, y + hh, 1, 1), m, grp);
      for (const yy of [y, y + hh]) { const g = octRing(() => r0, () => r1); g.userData.update(yy); add(g, m, grp); }
    }
    for (const y of STONE_Y) {
      beamRing(y, R[1](y) - 0.35, R[1](y) + 0.18, 0.55, M.stoneChain, chains);
      for (const s of [1, -1]) add(sectionStrip(s, yy => R[1](y) - 0.35, yy => R[1](y) + 0.18, y, y + 0.55, 1, 1), M.chainSec, chainSect, false).position.z = 0.03;
    }
    beamRing(WOOD_Y, R[1](WOOD_Y) + 0.15, R[1](WOOD_Y) + 0.6, 0.42, M.woodChain, chains);
    for (const s of [1, -1]) add(sectionStrip(s, yy => R[1](WOOD_Y) + 0.15, yy => R[1](WOOD_Y) + 0.6, WOOD_Y, WOOD_Y + 0.42, 1, 1), M.woodSec, chainSect, false).position.z = 0.03;
    // Corona di lavoro (cima della muratura fresca)
    const topIn = octRing(R[0], R[1]), topOut = octRing(R[2], R[3]);
    const workTop = new T.Group(); dome.add(workTop);
    const mTop = mat({ map: tx.brick, color: 0xf4dcc8 }, [cutZ]);
    add(topIn, mTop, workTop); add(topOut, mTop, workTop);
    // Costoloni di marmo bianco sugli spigoli (con la copertura)
    const marbleRibs = new T.Group(); dome.add(marbleRibs);
    for (let i = 0; i < 8; i++) {
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= NY; j++) {
        const y = YTOP * j / NY, r = R[3](y), c = corner(i, r, y);
        const prev = corner(i - 1, r, y), next = corner(i + 1, r, y);
        const w = 0.95 - 0.35 * k(y), lift = 0.8 - 0.3 * k(y);
        const toward = (p, d) => { const L = Math.hypot(p[0] - c[0], p[2] - c[2]); return [c[0] + (p[0] - c[0]) / L * d, y, c[2] + (p[2] - c[2]) / L * d]; };
        const n = [Math.cos(ang(i)), 0, Math.sin(ang(i))];
        const a = toward(prev, w), b = toward(next, w);
        const a2 = [a[0] + n[0] * lift, y, a[2] + n[2] * lift], b2 = [b[0] + n[0] * lift, y, b[2] + n[2] * lift];
        pos.push(...a, ...a2, ...b2, ...b); uv.push(0, y / 3, 0.2, y / 3, 0.8, y / 3, 1, y / 3);
        if (j) { const q = (j - 1) * 4; for (let e = 0; e < 3; e++) idx.push(q + e, q + e + 4, q + e + 1, q + e + 1, q + e + 4, q + e + 5); }
      }
      add(build(pos, uv, idx), M.marble, marbleRibs);
    }
    // Ponteggio a sbalzo interno, carrucola e carico (durante il cantiere)
    const site = new T.Group(); scene.add(site);
    const W8 = M.site, UPY = new T.Vector3(0, 1, 0), _d = new T.Vector3();
    // mette un pezzo alto 1 (asse Y) tra due punti
    const between = (o, a, b) => { o.position.copy(a).add(b).multiplyScalar(0.5); _d.copy(b).sub(a); o.scale.y = _d.length(); o.quaternion.setFromUnitVectors(UPY, _d.normalize()); };
    const plat = octRing(y => R[0](y) - 2.6, R[0]); add(plat, W8, site);
    const rail = octRing(y => R[0](y - 1.1) - 2.62, y => R[0](y - 1.1) - 2.4); add(rail, W8, site);   // parapetto
    const beams = new T.Group(); site.add(beams);
    for (let i = 0; i < 16; i++) {
      const a = i * PI / 8 + P8 / 2;
      const b = add(new T.BoxGeometry(3.4, 0.3, 0.3), W8, beams); b.userData = { a, k: 'beam' };      // travi infilate nel muro
      const st = add(new T.BoxGeometry(0.22, 1, 0.22), W8, beams); st.userData = { a, k: 'strut' };    // saettone
      const po = add(new T.BoxGeometry(0.14, 1.1, 0.14), W8, beams); po.userData = { a, k: 'post' };    // montante del parapetto
    }
    // materiali e operai sul ponte (scala umana: 1,65 m)
    const brickM = mat({ map: tx.brick }, WORLD), skin = new T.MeshStandardMaterial({ color: 0xc89a78, roughness: 0.8 });
    for (let i = 0; i < 6; i++) { const b = add(new T.BoxGeometry(1.1, 0.55, 0.7), brickM, beams); b.userData = { a: i * PI / 3 + 0.5, k: 'pile' }; }
    for (let i = 0; i < 4; i++) { const b = add(new T.CylinderGeometry(0.4, 0.32, 0.5, 12), W8, beams); b.userData = { a: i * PI / 2 + 1.1, k: 'tub' }; }
    ['#7a4a35', '#4f5d6b', '#8a7a52', '#6b3f4a', '#55603f'].forEach((c, i) => {
      const w = new T.Group(); w.userData = { a: i * 2 * PI / 5 + 0.25, k: 'man' }; beams.add(w);
      add(new T.CapsuleGeometry(0.22, 0.75, 4, 8), new T.MeshStandardMaterial({ color: c, roughness: 0.9 }), w).position.y = 0.72;
      add(new T.SphereGeometry(0.15, 10, 8), skin, w).position.y = 1.47;
      add(new T.CylinderGeometry(0.17, 0.17, 0.08, 10), new T.MeshStandardMaterial({ color: 0x2f3a4a }), w).position.y = 1.6;
    });
    // gru a braccio ("castello"): piede a croce, albero, braccio con contrappeso, vite e carrello (ricostruzione indicativa)
    const JY = 8.4;                                                   // quota del braccio sul ponte
    const jib = new T.Group(); site.add(jib);
    add(new T.BoxGeometry(4, 0.35, 0.35), W8, jib).position.y = 0.2; add(new T.BoxGeometry(0.35, 0.35, 4), W8, jib).position.y = 0.2;
    add(new T.BoxGeometry(0.6, 11, 0.6), W8, jib).position.y = 5.5;
    for (const [x, z] of [[1.9, 0], [-1.9, 0], [0, 1.9], [0, -1.9]]) between(add(new T.BoxGeometry(0.2, 1, 0.2), W8, jib), new T.Vector3(x, 0.3, z), new T.Vector3(0, 3.6, 0));
    const boom = new T.Group(); boom.position.y = JY; jib.add(boom);
    const beamsB = [-0.38, 0.38].map(z => { const b = add(new T.BoxGeometry(1, 0.38, 0.26), W8, boom); b.position.z = z; return b; });
    const screw = add(new T.CylinderGeometry(0.13, 0.13, 1, 8), mat({ color: 0x8a6a45, roughness: 0.7 }, WORLD), boom); screw.rotation.z = PI / 2; screw.position.y = 0.3;
    const cw = add(new T.BoxGeometry(1.5, 1.3, 1.3), mat({ map: tx.stone }, WORLD), boom); cw.position.set(-2.4, -0.85, 0);   // contrappeso
    const carr = add(new T.BoxGeometry(0.9, 0.45, 1.1), W8, boom); carr.position.y = -0.1;
    const pulley = add(new T.CylinderGeometry(0.42, 0.42, 0.18, 16), W8, boom); pulley.rotation.x = PI / 2; pulley.position.y = -0.55;
    const stays = [0, 1].map(() => add(new T.CylinderGeometry(0.045, 0.045, 1, 5), M.rope, jib, false));   // tiranti dalla testa dell'albero
    const rope = add(new T.CylinderGeometry(0.06, 0.06, 1, 6), M.rope, site, false);
    const load = add(new T.BoxGeometry(1.2, 0.9, 1.2), brickM, site, false);
    // Sagoma della cupola finita (fil di ferro tenue)
    const ghostPts = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 24; j++) {
      const y0 = YTOP * j / 24, y1 = YTOP * (j + 1) / 24;
      ghostPts.push(...corner(i, R[3](y0), y0), ...corner(i, R[3](y1), y1));
    }
    for (const y of [0, 8, 16, 24, 30]) for (let i = 0; i < 8; i++) ghostPts.push(...corner(i, R[3](y), y), ...corner(i + 1, R[3](y), y));
    const ghostG = new T.BufferGeometry(); ghostG.setAttribute('position', new T.Float32BufferAttribute(ghostPts, 3));
    const ghostMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, clippingPlanes: [new T.Plane(new T.Vector3(0, 1, 0), 0)] });
    scene.add(new T.LineSegments(ghostG, ghostMat));

    // --- Tamburo e cattedrale ---
    const RD = 27.4;   // diametro esterno ~54,8 m
    const drumOut = new T.Group(); scene.add(drumOut);               // esterno del tamburo (si nasconde quando c'è il modello 3D di oggi)
    add(prism(RD, -13, 0, true), M.drum, drumOut);
    add(prism(R[0](0), -13, 0), M.polyIn);
    // all'imposta: fascia di muratura grezza (il ballatoio di Baccio d'Agnolo, 1512-15, è su un solo lato e qui non c'è)
    add(prism(RD + 0.25, -0.6, 0.5), M.rib, drumOut);
    const corniceTop = octRing(() => R[0](0), () => RD + 0.25); corniceTop.userData.update(0.5); add(corniceTop, M.rib, drumOut);
    const drumSect = new T.Group(); scene.add(drumSect);
    for (const s of [1, -1]) add(sectionStrip(s, () => R[0](0), () => RD, -13, 0.5, 1, 4), mat({ map: tx.stone }, WORLD), drumSect, false);
    const cath = new T.Group(); scene.add(cath);
    add(prism(31, GROUND, -13, false, 8), M.cathCut, cath);            // la base si taglia con la sezione: si vede il crocicchio
    add(prism(R[0](0), GROUND, -13), M.polyIn, cath);                  // interno del crocicchio (intonaco)
    const cr = octRing(() => R[0](0), () => 31); cr.userData.update(-13); add(cr, mat({ map: tx.tile, normalMap: tx.tileB, roughness: 0.8 }, WORLD), cath);
    for (const s of [1, -1]) add(sectionStrip(s, () => R[0](0), () => 31, GROUND, -13, 1, 4), mat({ map: tx.stone }, WORLD), drumSect, false);
    const floor = add(new T.CircleGeometry(R[0](0), 8, P8), mat({ map: tx.poly, roughness: 0.4 }, WORLD), scene); floor.rotation.x = -PI / 2; floor.position.y = GROUND + 0.3;
    tx.poly.repeat.set(1, 1);
    // ---------- Interni di oggi: costruiti solo la prima volta che servono ----------
    const interior = new T.Group(); interior.visible = false; scene.add(interior);
    const credit = document.createElement('div'); credit.className = 'credit';
    const FRESCO_CREDIT = 'Affreschi: foto di <a href="https://commons.wikimedia.org/wiki/File:Dome_of_Cattedrale_di_Santa_Maria_del_Fiore_(Florence).jpg" target="_blank" rel="noopener">Livioandronico2013</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.it" target="_blank" rel="noopener">CC BY-SA 4.0</a>';
    const W3 = (id, t) => `<a href="https://3dwarehouse.sketchup.com/model/${id}" target="_blank" rel="noopener">«${t}»</a>`;
    const MODEL_CREDIT = `Modelli 3D ${W3('8f187dc09654501c70f2373efbf66671/Florence-Duomo', 'Florence Duomo')}, ${W3('a6bb0f9c555bbab490da2fe60070b981/Campanile-di-Giotto', 'Campanile di Giotto')}, ${W3('e0cebb9d97a2101d69a7efa28ad69d0e/Florence-Baptistry', 'Florence Baptistry')} di Enrico Dalbosco (Arrigo Silva), 3D Warehouse`;
    credit.innerHTML = MODEL_CREDIT;
    container.appendChild(credit);
    let interiorBuilt = false, interiorOn = false;
    function prismAtlas(r, y0, y1) {                                  // prisma ottagonale, faccia i → colonna i/8 dell'atlante
      const pos = [], uv = [], idx = [];
      for (let i = 0; i < 8; i++) {
        const b = pos.length / 3, a0 = corner(i, r, 0), a1 = corner(i + 1, r, 0);
        pos.push(a0[0], y0, a0[2], a1[0], y0, a1[2], a0[0], y1, a0[2], a1[0], y1, a1[2]);
        uv.push(i / 8, 0, (i + 1) / 8, 0, i / 8, 1, (i + 1) / 8, 1); idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
      return build(pos, uv, idx);
    }
    const atlasTex = (w, h, draw) => { const t = canvasTex(w, h, draw, { repeat: false }); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t; };
    function buildInterior() {
      interiorBuilt = true;
      const F = window.Fresco; if (!F) return;
      // Giudizio universale: la foto zenitale scattata dal pavimento (Livioandronico2013, CC BY-SA 4.0) proiettata
      // sulla cupola dal punto in cui fu scattata. Da quel punto il modello coincide con la foto; da altri punti
      // la pittura resta sulla superficie giusta. Calibrazione: bordo ottagonale all'imposta e oculo misurati sulla foto
      // (in alto nella foto c'è l'ovest, in basso Cristo sulla vela est, a destra il sud).
      const PH = { u0: 562 / 1129, v0: 368.8 / 828, fu: 976 / 1129, fv: 961 / 828, C: [-2.43, GROUND + 1.5, 0] };
      const uvOf = (x, y, z) => { const dy = y - PH.C[1]; return [PH.u0 + PH.fu * (z - PH.C[2]) / dy, 1 - (PH.v0 + PH.fv * (x - PH.C[0]) / dy)]; };
      const photo = new T.TextureLoader().load((window.CUPOLA_IMG || {}).dome || '');
      photo.colorSpace = T.SRGBColorSpace; photo.anisotropy = 8;
      const photoM = clip => new T.MeshBasicMaterial({ map: photo, side: T.DoubleSide, clippingPlanes: clip, clipShadows: true });
      const surf = (rf, y0, y1, ny, keep) => {                     // superficie ottagonale con UV proiettate dalla foto
        const pos = [], uv = [], idx = [];
        for (let i = 0; i < 8; i++) {
          const pts = []; for (let j = 0; j <= ny; j++) { const y = y0 + (y1 - y0) * j / ny, r = rf(y); pts.push(corner(i, r, y), corner(i + 1, r, y)); }
          const uvs = pts.map(p => uvOf(...p));
          if (keep && !uvs.every(([u, v]) => u > 0.003 && u < 0.997 && v > 0.003 && v < 0.997)) continue;   // faccia fuori dalla foto: resta quella disegnata
          const base = pos.length / 3; pts.forEach((p, k) => { pos.push(...p); uv.push(...uvs[k]); });
          for (let j = 1; j <= ny; j++) { const q = base + (j - 1) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
        }
        return build(pos, uv, idx);
      };
      add(surf(y => R[0](y) - 0.03, 0, YTOP, 96), photoM(DOME), interior, false);
      add(surf(() => R[0](0) - 0.09, -13, 0, 16, true), photoM(WORLD), interior, false);      // pareti del tamburo che la foto inquadra
      // tamburo: pareti con gli occhi a vetrata (le vetrate brillano: emissiveMap)
      const fW = 2 * R[0](0) * Math.sin(P8);
      const drumT = atlasTex(4096, 512, (g, w, h) => F.drum(g, w, h, { faceW: fW, faceH: 13, glow: false }));
      const drumG = atlasTex(4096, 512, (g, w, h) => F.drum(g, w, h, { faceW: fW, faceH: 13, glow: true }));
      add(prismAtlas(R[0](0) - 0.05, -13, 0), mat({ map: drumT, emissiveMap: drumG, emissive: 0xffffff, roughness: 0.9 }, WORLD), interior, false);
      // vetrate vere degli occhi (foto Commons): faccia 7 = E Donatello, 0 SE, 1 S, 2 SO Ghiberti, 4 NO e 6 NE Paolo Uccello.
      // La 5 (N, Andrea del Castagno) non ha una foto libera su Commons e resta disegnata; la 3 (O) è perduta dal 1828.
      for (const k of [0, 1, 2, 4, 6, 7]) {
        const a = k * PI / 4 + PI / 4, d = R[0](0) * COS8 - 0.14;
        const gl = add(new T.CircleGeometry(2.4, 48), new T.MeshBasicMaterial({ map: imgTex('v' + k), side: T.DoubleSide, clippingPlanes: WORLD }), interior, false);
        gl.position.set(Math.cos(a) * d, -6.5, Math.sin(a) * d); gl.lookAt(0, -6.5, 0);
      }
      // pareti del crocicchio: grandi archi aperti verso la navata (ovest) e le tre tribune, pilastri d'angolo in pietra serena
      const plW = mat({ color: 0xefe9dd, roughness: 0.92 }, WORLD), serenaI = mat({ color: 0x7d7e78, roughness: 0.85 }, WORLD);
      const AP0 = R[0](0) * COS8, HW = -13 - GROUND;
      const archHole = (w, spring, top) => { const p = new T.Path(), a = -w / 2, b = w / 2; p.moveTo(a, 0.01); p.lineTo(a, spring); p.quadraticCurveTo(a, spring + (top - spring) * 0.75, 0, top); p.quadraticCurveTo(b, spring + (top - spring) * 0.75, b, spring); p.lineTo(b, 0.01); p.lineTo(a, 0.01); return p; };
      const OPEN = { 3: [15.6, 27, 38], 7: [11, 20, 30], 1: [11, 20, 30], 5: [11, 20, 30] };   // faccia: [larghezza, imposta, chiave]
      for (let k = 0; k < 8; k++) {
        const a = k * PI / 4 + PI / 4, sh = new T.Shape([[-fW / 2 - 0.3, 0], [fW / 2 + 0.3, 0], [fW / 2 + 0.3, HW], [-fW / 2 - 0.3, HW]].map(([x, y]) => new T.Vector2(x, y)));
        if (OPEN[k]) sh.holes.push(archHole(...OPEN[k]));
        else { const d = new T.Path(); d.moveTo(-2.2, 0.01); d.lineTo(-2.2, 7); d.lineTo(2.2, 7); d.lineTo(2.2, 0.01); d.lineTo(-2.2, 0.01); sh.holes.push(d); }   // porte delle sagrestie e delle cappelle
        const g = new T.ShapeGeometry(sh, 16); { const uv = g.attributes.uv, ps = g.attributes.position; for (let i = 0; i < ps.count; i++) uv.setXY(i, ps.getX(i) / 12, ps.getY(i) / 12); }
        const w = add(g, plW, interior, false); w.position.set(Math.cos(a) * (AP0 - 0.05), GROUND, Math.sin(a) * (AP0 - 0.05)); w.lookAt(0, GROUND, 0);
        if (OPEN[k]) {   // ghiera dell'arcone
          const [ow, sp, tp] = OPEN[k], o = new T.Shape(); o.moveTo(-ow / 2 - 1, 0); o.lineTo(-ow / 2 - 1, sp); o.quadraticCurveTo(-ow / 2 - 1, sp + (tp + 1.2 - sp) * 0.75, 0, tp + 1.2); o.quadraticCurveTo(ow / 2 + 1, sp + (tp + 1.2 - sp) * 0.75, ow / 2 + 1, sp); o.lineTo(ow / 2 + 1, 0); o.lineTo(-ow / 2 - 1, 0); o.holes.push(archHole(ow, sp, tp));
          const r = add(new T.ExtrudeGeometry(o, { depth: 3, bevelEnabled: false, curveSegments: 16 }), serenaI, interior, false); r.position.copy(w.position); r.quaternion.copy(w.quaternion); r.translateZ(-1.5);
        } else {   // porta: vano scuro dietro il muro e architrave in pietra serena
          const hole = add(new T.PlaneGeometry(4.4, 7), mat({ color: 0x2a211a }, WORLD), interior, false); hole.position.copy(w.position); hole.quaternion.copy(w.quaternion); hole.translateY(3.5); hole.translateZ(-0.3);
          const lin = add(new T.BoxGeometry(5.4, 0.8, 0.4), serenaI, interior, false); lin.position.copy(w.position); lin.quaternion.copy(w.quaternion); lin.translateY(7.4); lin.translateZ(0.2);
        }
      }
      for (let i = 0; i < 8; i++) { const c = corner(i, R[0](0) - 0.9, 0), pl = add(new T.BoxGeometry(2.6, HW, 2.6), serenaI, interior, false); pl.position.set(c[0], GROUND + HW / 2, c[2]); pl.rotation.y = -ang(i) + PI / 4; }   // pilastri d'angolo
      // tribune (est, nord, sud): cinque cappelle radiali sotto un corpo ottagonale e una mezza cupola, aperte verso la crociera
      const chapT = canvasTex(512, 1024, (g, w, h) => {                       // cappella: arco acuto scuro con l'altare, vetrata in alto
        g.fillStyle = '#efe8da'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#7d7e78'; g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h); g.fillRect(0, 318, w, 18);
        g.fillStyle = '#2a221b'; g.beginPath(); g.moveTo(90, h); g.lineTo(90, 640); g.quadraticCurveTo(90, 520, w / 2, 470); g.quadraticCurveTo(w - 90, 520, w - 90, 640); g.lineTo(w - 90, h); g.fill();
        g.strokeStyle = '#7d7e78'; g.lineWidth = 16; g.stroke();
        g.fillStyle = '#c9a75a'; g.fillRect(170, 860, 172, 60); g.fillStyle = 'rgba(255,214,140,.5)'; g.fillRect(200, 700, 112, 160);   // altare e pala
        g.fillStyle = '#2c4f9e'; g.beginPath(); g.moveTo(226, 300); g.lineTo(226, 120); g.quadraticCurveTo(226, 70, 256, 54); g.quadraticCurveTo(286, 70, 286, 120); g.lineTo(286, 300); g.fill();
        g.fillStyle = '#b8322a'; for (let y = 90; y < 300; y += 36) g.fillRect(232, y, 48, 12);
      }, { repeat: false });
      const plainT = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#efe8da'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d7e78'; g.fillRect(0, 0, 13, h); g.fillRect(w - 13, 0, 13, h); g.fillRect(0, 159, w, 9); }, { repeat: false });
      const chapM = mat({ map: chapT, roughness: 0.9 }, WORLD), plainM = mat({ map: plainT, roughness: 0.9 }, WORLD);
      const faceAt = (cx, cz, r, k, y0, y1, m) => {   // faccia k di un ottagono (spigoli come la cupola) centrato in cx, cz
        const a0 = corner(k, r, 0), a1 = corner(k + 1, r, 0), g = build([a0[0] + cx, y0, a0[2] + cz, a1[0] + cx, y0, a1[2] + cz, a0[0] + cx, y1, a0[2] + cz, a1[0] + cx, y1, a1[2] + cz], [0, 0, 1, 0, 0, 1, 1, 1], [0, 2, 1, 1, 2, 3]);
        return add(g, m, interior, false);
      };
      for (const [cx, cz, skip] of [[36, 0, 3], [0, 36, 5], [0, -36, 1]]) {
        const RT = 14.3, RU = 9.9, Y1 = -33, Y2 = -22;
        for (let k = 0; k < 8; k++) {
          if (k === skip) continue;
          const near = k === (skip + 1) % 8 || k === (skip + 7) % 8;
          faceAt(cx, cz, RT, k, GROUND, Y1, near ? plainM : chapM);
          if (k !== skip) faceAt(cx, cz, RU, k, Y1, Y2, plainM);
        }
        const ce = octRing(() => RU, () => RT); ce.userData.update(Y1); const cm = add(ce, plW, interior, false); cm.position.set(cx, 0, cz);
        const cap = add(new T.SphereGeometry(RU, 32, 12, 0, PI * 2, 0, PI / 2), plW, interior, false); cap.position.set(cx, Y2, cz); cap.scale.y = 0.8;
        const fl2 = add(new T.CircleGeometry(RT + 1.5, 8, P8), mat({ map: tx.marble, color: 0xd8d2c6, roughness: 0.35 }, WORLD), interior, false); fl2.rotation.x = -PI / 2; fl2.position.set(cx, GROUND + 0.31, cz);
      }
      // pavimento in marmi policromi
      const floorT = atlasTex(2048, 2048, (g, w, h) => F.floor(g, w, h));
      const fl = add(new T.CircleGeometry(R[0](0) - 0.05, 8, P8), mat({ map: floorT, roughness: 0.35 }, WORLD), interior, false);
      fl.rotation.x = -PI / 2; fl.position.y = GROUND + 0.34; fl.receiveShadow = true;
      // ballatoi: all'imposta della cupola e alla base del tamburo
      const ser = mat({ color: 0x8a8a84, roughness: 0.8 }, WORLD);
      for (const y of [0, -13]) { const rg = octRing(yy => R[0](0) - 1.1, yy => R[0](0) - 0.05); rg.userData.update(y + 0.02); add(rg, ser, interior, false); add(prism(R[0](0) - 1.1, y, y + 1.0), mat({ color: 0xe8e2d4, roughness: 0.7 }, WORLD), interior, false); }
      // coro ottagonale in marmo (Bandinelli) con altare e crocifisso
      const marbleW = mat({ map: tx.marble, roughness: 0.4 }, WORLD), C = F.CHOIR || { r: 8.5, h: 2.4 };
      // recinto di Bandinelli: 8 tratti di balaustra a rilievi, con un varco sul lato della navata (ovest) per entrare a piedi
      const cwM = mat({ map: canvasTex(512, 128, (g, w, h) => F.choirWall(g, w, h)), roughness: 0.4 }, WORLD), CA = C.r * COS8, CL = 2 * C.r * Math.sin(P8);
      for (let k = 0; k < 8; k++) {
        const phi = k * PI / 4, segs = k === 4 ? [[-CL / 2, -1.4], [1.4, CL / 2]] : [[-CL / 2, CL / 2]];
        for (const [s0, s1] of segs) {
          const len = s1 - s0, mid = (s0 + s1) / 2, cx = CA * Math.cos(phi) - Math.sin(phi) * mid, cz = CA * Math.sin(phi) + Math.cos(phi) * mid;
          const wb = add(new T.BoxGeometry(len, C.h, 0.4), cwM, interior); wb.position.set(cx, GROUND + 0.3 + C.h / 2, cz); wb.rotation.y = -phi - PI / 2;
          const cp = add(new T.BoxGeometry(len + 0.1, 0.16, 0.7), marbleW, interior, false); cp.position.set(cx, GROUND + 0.38 + C.h, cz); cp.rotation.y = -phi - PI / 2;   // cimasa
        }
      }
      choirModern = new T.Group(); interior.add(choirModern);
      const cf = add(new T.CircleGeometry(C.r - 0.25, 8, P8), mat({ color: 0x6b4a33, roughness: 0.8 }, WORLD), choirModern, false); cf.rotation.x = -PI / 2; cf.position.y = GROUND + 0.36;   // pavimento bruno del coro
      for (const [r, y] of [[3.6, 0.18], [3.0, 0.36]]) { const st = add(new T.CylinderGeometry(r, r, 0.18, 8, 1, false, P8), marbleW, choirModern); st.position.y = GROUND + 0.36 + y - 0.09; }   // pedana a due gradini
      const alt = add(new T.BoxGeometry(1.5, 1.05, 2.8), marbleW, choirModern); alt.position.set(0, GROUND + 0.72 + 0.53, 0);   // mensa d'altare in marmo bianco
      { const SL = []; for (let k = 0; k < 8; k++) { if (k === 4) continue; const phi = k * PI / 4; for (const d of [1.1, 2.4]) { const a = CA - d; SL.push([a * Math.cos(phi), a * Math.sin(phi), PI - phi]); } }
        pews(choirModern, SL, CL - 2.6); }                                                                       // stalli lungo il recinto, rivolti verso la mensa
      const wood = mat({ color: 0x5a3c26, roughness: 0.7 }, WORLD);
      const cr1 = add(new T.BoxGeometry(0.22, 4.2, 0.22), wood, interior); cr1.position.set(6, GROUND + 2.4, 0);   // crocifisso di Benedetto da Maiano
      const cr2 = add(new T.BoxGeometry(0.22, 0.22, 2.2), wood, interior); cr2.position.set(6, GROUND + 3.6, 0);
    }
    function setInterior(on) {
      interiorOn = !!on; if (on && !interiorBuilt) buildInterior();
      interior.visible = interiorOn;
      // negli interni si taglia lungo l'asse nord-sud e si tiene la metà est: si guarda verso l'abside come chi entra dalla navata
      if (interiorOn) cutZ.normal.set(1, 0, 0); else cutZ.normal.set(0, 0, -1);
      sect.rotation.y = drumSect.rotation.y = interiorOn ? PI / 2 : 0;
      nave.visible = !interiorOn; updNave(); if (!walk) { camera.fov = interiorOn ? 55 : 38; camera.updateProjectionMatrix(); }
      setYear(year); shadowsDirty();
    }
    // Bue-argano sul pavimento del crocicchio (ricostruzione indicativa): telaio, albero, tamburo, ruota dentata, buoi
    const hoist = new T.Group(); hoist.position.y = GROUND + 0.3; scene.add(hoist);
    const wM = M.wood, oxM = new T.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.9 });
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) add(new T.BoxGeometry(0.4, 6.2, 0.4), wM, hoist).position.set(x, 3.1, z);
    for (const z of [-3, 3]) add(new T.BoxGeometry(6.4, 0.4, 0.4), wM, hoist).position.set(0, 6.1, z);
    for (const x of [-3, 3]) add(new T.BoxGeometry(0.4, 0.4, 6.4), wM, hoist).position.set(x, 6.1, 0);
    const spin = new T.Group(); hoist.add(spin);
    add(new T.CylinderGeometry(0.28, 0.28, 6, 10), wM, spin).position.y = 3;
    add(new T.BoxGeometry(10, 0.3, 0.3), wM, spin).position.y = 1.3;                                     // stanga
    const gearW = add(new T.CylinderGeometry(1.4, 1.4, 0.25, 24), wM, spin); gearW.position.y = 4.4;
    for (let i = 0; i < 20; i++) { const t = add(new T.BoxGeometry(0.2, 0.35, 0.2), wM, spin, false); t.position.set(Math.cos(i * PI / 10) * 1.3, 4.7, Math.sin(i * PI / 10) * 1.3); }
    const drumH = add(new T.CylinderGeometry(0.8, 0.8, 3.4, 16), wM, hoist); drumH.rotation.z = PI / 2; drumH.position.set(1.7, 4.4, 0);
    function makeOx(sign) {
      const o = new T.Group();
      const body = add(new T.CapsuleGeometry(0.55, 1.4, 4, 10), oxM, o); body.rotation.z = PI / 2; body.position.y = 1.25;
      add(new T.BoxGeometry(0.55, 0.5, 0.45), oxM, o).position.set(1.25, 1.35, 0);
      for (const [x, z] of [[-0.6, -0.25], [-0.6, 0.25], [0.6, -0.25], [0.6, 0.25]]) add(new T.CylinderGeometry(0.11, 0.09, 0.85, 6), oxM, o).position.set(x, 0.42, z);
      for (const z of [-0.22, 0.22]) { const h = add(new T.ConeGeometry(0.06, 0.45, 5), new T.MeshStandardMaterial({ color: 0xe8dcc0 }), o); h.position.set(1.3, 1.7, z); h.rotation.x = z * 2; }
      o.position.set(sign * 4.4, 0, 0); o.rotation.y = sign > 0 ? -PI / 2 : PI / 2; spin.add(o);
    }
    makeOx(1); makeOx(-1);
    const rope2 = add(new T.CylinderGeometry(0.05, 0.05, 1, 5), M.rope, scene, false);
    const UPV = new T.Vector3(0, 1, 0), ropeA = new T.Vector3(), ropeB = new T.Vector3();
    function tribune(x, z) {
      const g = new T.Group(); g.position.set(x, 0, z); cath.add(g);
      add(prism(15, GROUND, -31, false, 8), M.cath, g);                                   // anello delle cappelle
      add(new T.CylinderGeometry(10.6, 15.8, 4.2, 8, 1, true, P8), M.roof, g).position.y = -28.9;   // tetto spiovente delle cappelle
      add(prism(10.5, -31, -20, false, 8), M.cath, g);                                   // corpo poligonale alto
      const cap = add(new T.SphereGeometry(10.7, 24, 10, 0, PI * 2, 0, PI / 2), M.roof, g); cap.position.y = -20; cap.scale.y = 0.78;   // cupolina
      for (let k = 0; k < 8; k++) { const rb = add(new T.SphereGeometry(10.85, 2, 10, k * PI / 4 + P8 - 0.035, 0.07, 0, PI / 2), M.marble, g); rb.position.y = -20; rb.scale.y = 0.79; }   // costoloni bianchi
      add(new T.CylinderGeometry(1.3, 1.6, 2.6, 8), M.marble, g).position.y = -20 + 10.7 * 0.78 + 1;   // lanternino
      add(new T.ConeGeometry(1.5, 2.4, 8), M.marble, g).position.y = -20 + 10.7 * 0.78 + 3.5;
      return g;
    }
    tribune(36, 0); tribune(0, -36); const tribS = tribune(0, 36);
    const southEx = [], allEx = [];
    // 4 "tribune morte" sui lati diagonali, sotto il tamburo (dal 1439)
    for (let i = 0; i < 4; i++) {
      const a = PI / 4 + i * PI / 2, d = 31 * COS8, g = new T.Group(); g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.rotation.y = -a + PI / 2; cath.add(g);
      add(new T.CylinderGeometry(5.5, 5.5, 9, 24, 1, true, -PI / 2, PI), M.cath, g).position.y = -21.5;
      add(new T.SphereGeometry(5.6, 24, 8, 0, PI, 0, PI / 2), M.roof, g).position.y = -17;   // mezza calotta rivolta come il mezzo cilindro (verso l'esterno)
      const cap = add(new T.CylinderGeometry(5.9, 5.9, 0.6, 24, 1, false, -PI / 2, PI), M.cath, g); cap.position.y = -17.2;   // cornice
      allEx.push(g); if (Math.sin(a) > 0) southEx.push(g);
    }
    // corpo basilicale: navata centrale alta e navatelle più basse
    const nave = new T.Group(); cath.add(nave);
    // fianchi: campate di 23 m con lesene, finestroni gotici (navate laterali) e occhi tondi (navata centrale)
    const flankT = clere => { const t = canvasTex(512, clere ? 926 : 512, (g, w, h) => window.Fresco && window.Fresco.flank(g, w, h, { clere })); return t; };
    const naveT = flankT(true); naveT.repeat.set(1, 23 / 41.6);
    const naveSolid = [add(boxUV(78.9, 41.6, 20, 19.7), mat({ map: naveT, roughness: 0.6 }, []), nave)];   // non complanare con l'anello a -13
    naveSolid[0].position.set(-69.45, GROUND + 20.8, 0);
    const aisleM = mat({ map: flankT(false), roughness: 0.6 }, []);
    for (const sg of [-1, 1]) { const a = add(boxUV(78.9, 23, 11, 19.7), aisleM, nave); a.position.set(-69.45, GROUND + 11.5, sg * 15.5); naveSolid.push(a); }
    const roofW = mat({ map: tx.tile, normalMap: tx.tileB, roughness: 0.8 }, WORLD);        // i tetti della navata si tagliano con la sezione
    const gable = new T.Shape([new T.Vector2(-11, 0), new T.Vector2(11, 0), new T.Vector2(0, 6.5)]);
    const roofN = add(new T.ExtrudeGeometry(gable, { depth: 78.9, bevelEnabled: false }), roofW, nave);
    roofN.rotation.y = -PI / 2; roofN.position.set(-30, GROUND + 41.6, 0);
    for (const sg of [-1, 1]) {
      const lean = new T.Shape([new T.Vector2(0, 0), new T.Vector2(11.6, 0), new T.Vector2(0, 4.5)]);
      const r = add(new T.ExtrudeGeometry(lean, { depth: 78.9, bevelEnabled: false }), roofW, nave);
      r.rotation.y = -PI / 2; r.position.set(-30, GROUND + 23, sg * 10); if (sg < 0) r.scale.x = -1;   // spiovente verso l'esterno
    }
    // Interno delle navate (col taglio, o entrando): ricostruito sulle foto di oggi (Commons, vista est e ovest della navata).
    // 4 campate su pilastri compositi in pietra serena, archi acuti, ballatoio su mensole, volte a crociera con costoloni,
    // oculi del cleristorio, vetrate nelle navatelle, pavimento a marmi (Baccio d'Agnolo). La navata è vuota: niente banchi fissi.
    const naveIn = new T.Group(); naveIn.visible = false; scene.add(naveIn);
    const modernIn = new T.Group(); naveIn.add(modernIn);           // banchi e arredi di oggi: solo dal 1471 in poi («com'è oggi»), mai negli anni del cantiere
    const woodM = mat({ color: 0x5a3a24, roughness: 0.65 }, WORLD);
    function pewGeo(len) {                                          // banco di noce: seduta, schienale, fianchi; lungo z, chi siede guarda verso +x
      const parts = [[0.45, 0.06, len, 0, 0.45, 0], [0.06, 0.5, len, -0.2, 0.75, 0], [0.5, 0.95, 0.07, 0, 0.475, len / 2], [0.5, 0.95, 0.07, 0, 0.475, -len / 2], [0.16, 0.1, len, 0.42, 0.12, 0]]
        .map(([w, h, d, x, y, z]) => new T.BoxGeometry(w, h, d).translate(x, y, z));
      return window.__BGU.mergeGeometries(parts);
    }
    function pews(group, list, len) {                               // list: [x, z, rotY]
      const im = new T.InstancedMesh(pewGeo(len), woodM, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), one = new T.Vector3(1, 1, 1);
      list.forEach(([x, z, r], i) => { m4.compose(new T.Vector3(x, GROUND + 0.32, z), q.setFromAxisAngle(new T.Vector3(0, 1, 0), r || 0), one); im.setMatrixAt(i, m4); });
      im.castShadow = false; im.receiveShadow = true; group.add(im); return im;
    }
    const AP = R[0](0) * COS8;                                     // apotema della crociera: la navata arriva fin lì
    { const F = window.Fresco || {}, X0 = -108.9, X1 = -AP, L = X1 - X0, CX = (X0 + X1) / 2, B = L / 4, ZN = 10, ZA = 20.55;
      const plasterW = mat({ color: 0xeee2c6, roughness: 0.92 }, WORLD), serena = mat({ color: 0x9a7f60, roughness: 0.85 }, WORLD);   // intonaco crema caldo, pietraforte bruna (foto della navata)
      const serenaT = canvasTex(256, 256, (g, w) => {                  // pietraforte dei pilastri: bruno ocra, venata, a conci
        g.fillStyle = '#93765a'; g.fillRect(0, 0, w, w);
        for (let i = 0; i < 4000; i++) { const c = 110 + Math.random() * 50; g.fillStyle = `rgba(${c + 20},${c},${c - 25},.25)`; g.fillRect(Math.random() * w, Math.random() * w, 3, 1); }
        g.strokeStyle = 'rgba(70,52,36,.45)'; g.lineWidth = 2; for (let y = 0; y < w; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      });
      const pierM = mat({ map: serenaT, roughness: 0.8 }, WORLD);
      const capM = mat({ map: canvasTex(256, 128, (g, w, h) => {      // capitello a due ordini di foglie d'acanto, come nelle foto della navata
        g.fillStyle = '#8f7457'; g.fillRect(0, 0, w, h);
        for (const [y, sz] of [[h * 0.78, 22], [h * 0.38, 26]]) for (let x = 0; x <= w; x += 32) {
          const gr = g.createLinearGradient(0, y - sz * 1.6, 0, y + sz * 0.6); gr.addColorStop(0, '#c9ae86'); gr.addColorStop(1, '#6e553c');
          g.fillStyle = gr; g.beginPath(); g.moveTo(x - sz * 0.7, y + sz * 0.6); g.quadraticCurveTo(x - sz, y - sz, x, y - sz * 1.6); g.quadraticCurveTo(x + sz, y - sz, x + sz * 0.7, y + sz * 0.6); g.fill();
          g.strokeStyle = 'rgba(60,44,30,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + sz * 0.5); g.lineTo(x, y - sz * 1.3); g.stroke();
          g.fillStyle = '#5a4430'; g.beginPath(); g.arc(x, y - sz * 1.55, 4, 0, 7); g.fill();   // ricciolo
        }
        g.fillStyle = '#b39878'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 8, w, 8);
      }), roughness: 0.8 }, WORLD);
      // pavimento di Baccio d'Agnolo e Francesco da Sangallo (1526-1660), disegnato in metri su un'unica texture (circa 46 px/m):
      // campate ovest = «labirinto» di tessere brune su fondo beige con raggi rossi verso un ottagono (prima foto, l'OPA all'ingresso);
      // campate verso la cupola = riquadri chiari con grandi rosoni (seconda foto); navatelle = quadroni bianchi a cornice grigia
      const FS = 46, flT = canvasTex(Math.ceil(L * FS), Math.ceil(2 * ZA * FS), g => {
        g.scale(FS, FS); const MZ = ZA;                                   // y = z + ZA: la linea mediana della navata è y = ZA
        const R0 = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        R0(0, 0, L, 2 * ZA, '#e4ded2');
        for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,100,80,${Math.random() * 0.06})`; g.fillRect(Math.random() * L, Math.random() * 2 * ZA, 0.6, 0.08); }   // venature
        // navatelle: quadroni di 2,2 m, cornice grigio-azzurra e rombo interno
        for (const [y0, y1] of [[0, MZ - ZN], [MZ + ZN, 2 * ZA]]) for (let x = 0; x < L; x += 2.2) for (let y = y0; y < y1; y += 2.2) {
          g.strokeStyle = '#6e7176'; g.lineWidth = 0.12; g.strokeRect(x + 0.1, y + 0.1, 2.0, 2.0);
          g.fillStyle = '#9a9ca0'; g.beginPath(); g.moveTo(x + 1.1, y + 0.45); g.lineTo(x + 1.75, y + 1.1); g.lineTo(x + 1.1, y + 1.75); g.lineTo(x + 0.45, y + 1.1); g.closePath(); g.fill();
          g.fillStyle = '#e4ded2'; g.beginPath(); g.ellipse(x + 1.1, y + 1.1, 0.32, 0.2, 0, 0, 7); g.fill();
        }
        const y0 = MZ - ZN, h = 2 * ZN;
        for (let k = 0; k < 4; k++) {
          const x0 = k * B, cx = x0 + B / 2, cy = MZ;
          g.save(); g.beginPath(); g.rect(x0, y0, B, h); g.clip();
          if (k < 2) {                                                    // labirinto: otto spicchi con tessere parallele al bordo esterno
            R0(x0, y0, B, h, '#d6c3a0');
            const P = [[x0, y0], [cx, y0], [x0 + B, y0], [x0 + B, cy], [x0 + B, y0 + h], [cx, y0 + h], [x0, y0 + h], [x0, cy]];
            for (let q = 0; q < 8; q++) {
              const [ax, ay] = P[q], [bx, by] = P[(q + 1) % 8], ex = bx - ax, ey = by - ay, el = Math.hypot(ex, ey), nx = -ey / el, ny = ex / el;
              g.save(); g.beginPath(); g.moveTo(cx, cy); g.lineTo(ax, ay); g.lineTo(bx, by); g.closePath(); g.clip();
              const dist = Math.abs((cx - ax) * nx + (cy - ay) * ny), sg = Math.sign((cx - ax) * nx + (cy - ay) * ny);
              for (let d = 0.2, r = 0; d < dist; d += 0.34, r++) {           // file di tessere sfalsate, come mattoni
                g.setLineDash([0.55, 0.22]); g.lineDashOffset = (r % 2) * 0.38; g.lineWidth = 0.13;
                g.strokeStyle = r % 3 === 0 ? '#7a4f32' : r % 3 === 1 ? '#a9845c' : '#8f6a48';
                g.beginPath(); g.moveTo(ax + nx * d * sg - ex, ay + ny * d * sg - ey); g.lineTo(bx + nx * d * sg + ex, by + ny * d * sg + ey); g.stroke();
              }
              g.restore();
            }
            g.setLineDash([]);
            for (const [px, py] of P) {                                    // raggi rossi bordati di scuro verso l'ottagono
              g.strokeStyle = '#4e3626'; g.lineWidth = 0.34; g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke();
              g.strokeStyle = '#a5523a'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke();
            }
            const oct = (r, fill, stroke, lw) => { g.beginPath(); for (let a = 0; a < 8; a++) { const t = PI / 8 + a * PI / 4; g[a ? 'lineTo' : 'moveTo'](cx + r * Math.cos(t), cy + r * Math.sin(t)); } g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
            oct(2.4, '#d6c3a0', '#4e3626', 0.25); oct(2.0, '#b4613f', '#7a3a26', 0.12); oct(1.55, null, '#e2c9a6', 0.08);
            if (k === 0) {                                                 // il monogramma dell'Opera del Duomo, leggibile entrando
              g.save(); g.translate(cx, cy); g.rotate(PI / 2); g.fillStyle = '#5a2c1c'; g.font = '600 1.1px Cormorant, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OPA', 0, 0.05); g.restore();
            } else { g.fillStyle = '#e2c9a6'; for (let a = 0; a < 8; a++) { g.save(); g.translate(cx, cy); g.rotate(a * PI / 4); g.beginPath(); g.ellipse(0, -0.75, 0.22, 0.55, 0, 0, 7); g.fill(); g.restore(); } }
          } else {                                                        // rosoni: cerchi concentrici bianchi, neri e rossi su riquadri chiari
            R0(x0, y0, B, h, '#ebe7df');
            g.strokeStyle = '#5c5e62'; g.lineWidth = 0.14; for (let x = x0; x < x0 + B; x += B / 6) for (let y = y0; y < y0 + h; y += h / 5) g.strokeRect(x + 0.15, y + 0.15, B / 6 - 0.3, h / 5 - 0.3);
            for (const [r, c, lw] of [[8.4, '#3c3c3a', 0.5], [7.6, '#a5523a', 0.25], [6.9, '#3c3c3a', 0.5], [5.2, '#8e9094', 0.3], [3.4, '#a5523a', 0.22]]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
            g.fillStyle = '#ebe7df'; g.beginPath(); g.arc(cx, cy, 6.6, 0, 7); g.fill();
            for (let a = 0; a < 16; a++) { g.save(); g.translate(cx, cy); g.rotate(a * PI / 8); g.fillStyle = a % 2 ? '#a5523a' : '#3c3c3a'; g.beginPath(); g.moveTo(0, -1.2); g.quadraticCurveTo(0.7, -3.6, 0, -6.2); g.quadraticCurveTo(-0.7, -3.6, 0, -1.2); g.fill(); g.restore(); }
            g.fillStyle = '#a5523a'; g.beginPath(); g.arc(cx, cy, 1.0, 0, 7); g.fill(); g.fillStyle = '#3c3c3a'; g.beginPath(); g.arc(cx, cy, 0.5, 0, 7); g.fill();
          }
          g.restore();
          g.setLineDash([]); g.strokeStyle = '#5a4433'; g.lineWidth = 0.5; g.strokeRect(x0 + 0.25, y0 + 0.25, B - 0.5, h - 0.5);   // fascia tra le campate
          g.strokeStyle = '#a5523a'; g.lineWidth = 0.15; g.strokeRect(x0 + 0.7, y0 + 0.7, B - 1.4, h - 1.4);
        }
        for (const y of [y0, y0 + h]) { R0(0, y - 0.6, L, 1.2, '#8a8c90'); for (let x = 0.3; x < L; x += 0.9) R0(x, y - 0.3, 0.45, 0.6, '#e4ded2'); }   // fascia a scacchi sotto le arcate
      }, { repeat: false });
      const fl = add(new T.PlaneGeometry(L, 2 * ZA), mat({ map: flT, roughness: 0.6 }, WORLD), naveIn, false); fl.rotation.x = -PI / 2; fl.position.set(CX, GROUND + 0.32, 0); fl.receiveShadow = true;
      // pareti esterne delle navatelle (nord e sud) e controfacciata; vetrate a lancetta, una per campata
      for (const sg of [-1, 1]) add(new T.BoxGeometry(L, 26.5, 0.9), plasterW, naveIn).position.set(CX, GROUND + 13.25, sg * ZA);
      add(new T.BoxGeometry(L, 0.6, 2 * ZA + 0.9), mat({ color: 0x5a4a3a }, WORLD), naveIn, false).position.set(CX, GROUND + 42.2, 0);   // tetto: niente cielo tra volte e muri
      for (const sg of [-1, 1]) add(new T.BoxGeometry(L, 0.6, ZA - ZN + 1), mat({ color: 0x5a4a3a }, WORLD), naveIn, false).position.set(CX, GROUND + 26.8, sg * (ZA + ZN) / 2);
      const west = add(new T.BoxGeometry(0.9, 41.6, 2 * ZA), plasterW, naveIn); west.position.set(X0 + 0.45, GROUND + 20.8, 0);
      for (const sg of [-1, 1]) { const e = add(new T.BoxGeometry(0.9, 26.5, ZA - ZN), plasterW, naveIn); e.position.set(X1 - 0.45, GROUND + 13.25, sg * (ZN + ZA) / 2); }   // fondo delle navatelle verso la crociera
      const glassT = canvasTex(128, 512, (g, w, h) => {                    // vetrata: tessere colorate e piombi, con l'arco acuto in cima
        g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
        g.save(); g.beginPath(); g.moveTo(4, h); g.lineTo(4, 70); g.quadraticCurveTo(4, 8, w / 2, 0); g.quadraticCurveTo(w - 4, 8, w - 4, 70); g.lineTo(w - 4, h); g.closePath(); g.clip();
        const cols = ['#2c4f9e', '#b8322a', '#d9a73a', '#3f7d4a', '#7a3e8c', '#e8dcb0', '#2c4f9e', '#2c4f9e'];
        for (let y = 0; y < h; y += 14) for (let x = 0; x < w; x += 14) { g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect(x, y, 14, 14); }
        g.strokeStyle = '#111'; g.lineWidth = 2; for (let y = 0; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        for (let x = 0; x < w; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.55)'; for (let y = 60; y < h; y += 110) g.fillRect(0, y, w, 6);   // ferri trasversali
        g.restore();
      }, { repeat: false });
      const glassM = new T.MeshBasicMaterial({ map: glassT, side: T.DoubleSide, clippingPlanes: WORLD, transparent: true, alphaTest: 0.1 });
      for (const sg of [-1, 1]) for (let k = 0; k < 4; k++) {
        if (sg < 0 && k === 1) continue;                               // campata dei cavalieri dipinti: lì la parete è affrescata
        const wnd = add(new T.PlaneGeometry(2.4, 9.6), glassM, naveIn, false); wnd.position.set(X0 + (k + 0.5) * B, GROUND + 13.5, sg * (ZA - 0.5)); wnd.rotation.y = sg > 0 ? PI : 0;
      }
      // arcate tra navata centrale e laterali: muro con 4 archi acuti e gli oculi del cleristorio
      const arch = (sh, a, b, spring, top) => { const c = (a + b) / 2, p = new T.Path(); p.moveTo(a, 0.01); p.lineTo(a, spring); p.quadraticCurveTo(a, spring + (top - spring) * 0.75, c, top); p.quadraticCurveTo(b, spring + (top - spring) * 0.75, b, spring); p.lineTo(b, 0.01); p.lineTo(a, 0.01); sh.holes.push(p); };
      const SPR = 16.4, TOP = 24.5;
      const oculusM = new T.MeshBasicMaterial({ color: 0xf4f1e6, side: T.DoubleSide, clippingPlanes: WORLD });
      for (const sg of [-1, 1]) {
        const sh = new T.Shape([[0, 0], [L, 0], [L, 41.6], [0, 41.6]].map(([x, y]) => new T.Vector2(x, y)));
        for (let k = 0; k < 4; k++) {
          const a = k * B + 2.2, b = (k + 1) * B - 2.2; arch(sh, a - 0.08, b + 0.08, SPR, TOP + 0.1);   // foro un filo più largo: l'intradosso visibile è solo la ghiera (niente sfarfallio)
          const oc = new T.Path(); oc.absarc((a + b) / 2, 32.5, 2.2, 0, PI * 2, true); sh.holes.push(oc);
          const og = add(new T.CircleGeometry(2.2, 32), oculusM, naveIn, false); og.position.set(X0 + (a + b) / 2, GROUND + 32.5, sg * ZN); og.rotation.y = PI / 2 * 0;
          // ghiera dell'arco in pietra serena
          const ring = new T.Shape(); ring.moveTo(a - 0.9, 0); ring.lineTo(a - 0.9, SPR); ring.quadraticCurveTo(a - 0.9, SPR + (TOP + 1 - SPR) * 0.75, (a + b) / 2, TOP + 1); ring.quadraticCurveTo(b + 0.9, SPR + (TOP + 1 - SPR) * 0.75, b + 0.9, SPR); ring.lineTo(b + 0.9, 0); ring.lineTo(a - 0.9, 0); arch(ring, a, b, SPR, TOP);
          const rg = add(new T.ExtrudeGeometry(ring, { depth: 2.8, bevelEnabled: false, curveSegments: 16 }), serena, naveIn, false); rg.position.set(X0, GROUND, sg * ZN - 1.4);
        }
        const wall = add(new T.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: false, curveSegments: 16 }), plasterW, naveIn); wall.position.set(X0, GROUND, sg * ZN - 1.2);
        // pilastri compositi: fusto quadrato, lesene verso la navata salgono fino all'imposta delle volte
        for (let k = 0; k <= 4; k++) {
          const x = X0 + k * B, w = k === 0 || k === 4 ? 2.4 : 4.6;
          const px = k === 0 ? X0 + 1.2 : k === 4 ? X1 - 1.2 : x;
          // pilastro composito: nucleo quadro con una lesena su ogni faccia, zoccolo, capitello a fogliame a due ordini e abaco
          add(boxUV(w - 1.0, SPR, 2.6, 3), pierM, naveIn).position.set(px, GROUND + SPR / 2, sg * ZN);
          for (const [dx, dz, bw, bd] of [[w / 2 - 0.25, 0, 0.5, 1.5], [-(w / 2 - 0.25), 0, 0.5, 1.5], [0, 1.45, w - 2.2, 0.3], [0, -1.45, w - 2.2, 0.3]])
            add(boxUV(bw, SPR, bd, 3), pierM, naveIn).position.set(px + dx, GROUND + SPR / 2, sg * ZN + dz);
          add(new T.BoxGeometry(w + 0.4, 0.9, 3.6), serena, naveIn).position.set(px, GROUND + 0.45, sg * ZN);                           // zoccolo
          add(new T.BoxGeometry(w + 0.4, 2.3, 3.6), capM, naveIn, false).position.set(px, GROUND + SPR - 0.45, sg * ZN);   // capitello a fogliame attorno a tutto il pilastro
          add(new T.BoxGeometry(w + 0.9, 0.7, 4.1), serena, naveIn).position.set(px, GROUND + SPR + 1.05, sg * ZN);                     // abaco
          add(new T.BoxGeometry(1.6, 31.5 - SPR, 1.0), serena, naveIn).position.set(px, GROUND + (SPR + 31.5) / 2, sg * (ZN - 1.7));    // lesena verso la navata
          add(new T.BoxGeometry(2.4, 0.9, 1.6), serena, naveIn).position.set(px, GROUND + 31.6, sg * (ZN - 1.9));                       // capitello alto
        }
        // ballatoio su mensole lungo la navata (sopra gli archi)
        add(new T.BoxGeometry(L, 1.1, 1.5), serena, naveIn).position.set(CX, GROUND + 26.4, sg * (ZN - 1.9));
        add(new T.BoxGeometry(L, 0.9, 0.12), serena, naveIn).position.set(CX, GROUND + 27.4, sg * (ZN - 2.6));                       // parapetto
        const brk = new T.InstancedMesh(new T.BoxGeometry(0.45, 0.9, 1.2), serena, Math.floor(L / 1.1)); const m4b = new T.Matrix4();
        for (let i = 0; i < brk.count; i++) { m4b.makeTranslation(X0 + 0.6 + i * 1.1, GROUND + 25.4, sg * (ZN - 1.8)); brk.setMatrixAt(i, m4b); }
        brk.castShadow = false; naveIn.add(brk);
      }
      // volte a crociera a sesto acuto, una per campata (navata e navatelle): quota = profilo acuto del più alto dei due archi
      // che si incrociano; ogni campata in 4 spicchi, così gli spigoli (dove corrono i costoloni) restano netti
      const KP = 1.25, F0 = Math.sqrt(KP * KP - (KP - 1) ** 2), fA = w => Math.sqrt(Math.max(0, KP * KP - (Math.min(1, w) + KP - 1) ** 2)) / F0;
      const vPos = [], vIdx = [];
      function groin(cx, cz, hx, hz, y0, rise) {
        for (const [ax, sgn] of [['z', 1], ['z', -1], ['x', 1], ['x', -1]]) {
          const base = vPos.length / 3, S = 20, TT = 12;
          for (let ti = 0; ti <= TT; ti++) for (let si = 0; si <= S; si++) {
            const t = ti / TT, sv = -1 + 2 * si / S, a = sgn * (1 - t), b = sv * (1 - t);   // a: verso la parete del settore, b: lungo la parete
            const u = ax === 'z' ? b : a, v = ax === 'z' ? a : b;
            vPos.push(cx + u * hx, y0 + rise * fA(Math.min(Math.abs(u), Math.abs(v))), cz + v * hz);
          }
          for (let ti = 0; ti < TT; ti++) for (let si = 0; si < S; si++) { const q = base + ti * (S + 1) + si; vIdx.push(q, q + 1, q + S + 1, q + 1, q + S + 2, q + S + 1); }
        }
      }
      const VC = GROUND + 31.6, NZ = ZN - 1.2, AZ = (ZN + 1.2 + ZA - 0.45) / 2, AH = (ZA - 0.45 - ZN - 1.2) / 2;
      for (let k = 0; k < 4; k++) { const cx = X0 + (k + 0.5) * B; groin(cx, 0, B / 2, NZ, VC, 10); for (const sg of [-1, 1]) groin(cx, sg * AZ, B / 2, AH, GROUND + 16.4, 9.4); }   // navatelle: la volta sale sopra gli archi verso la navata
      const vg = new T.BufferGeometry(); vg.setAttribute('position', new T.Float32BufferAttribute(vPos, 3)); vg.setIndex(vIdx); vg.computeVertexNormals();
      add(vg, plasterW, naveIn, false);
      // costoloni diagonali e arconi trasversali in pietraforte
      const rib = (pts, r) => add(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, r, 6), serena, naveIn, false);
      const arcPts = (fn, n = 24) => [...Array(n + 1).keys()].map(i => fn(-1 + 2 * i / n));
      for (const [cz, hz, y0, rise, r] of [[0, NZ, VC, 10, 0.4], [AZ, AH, GROUND + 16.4, 9.4, 0.25], [-AZ, AH, GROUND + 16.4, 9.4, 0.25]]) {
        for (let k = 0; k <= 4; k++) { const x = X0 + k * B; rib(arcPts(v => new T.Vector3(x, y0 + rise * fA(Math.abs(v)) - 0.1, cz + v * hz)), r * 1.4); }
        for (let k = 0; k < 4; k++) { const cx = X0 + (k + 0.5) * B;
          for (const d of [-1, 1]) rib(arcPts(u => new T.Vector3(cx + u * B / 2, y0 + rise * fA(Math.abs(u)) - 0.1, cz + d * u * hz)), r); }
      }
      { const L2 = []; for (let x = X1 - 3.5; x > X1 - 1.6 * B; x -= 1.05) for (const sg of [-1, 1]) L2.push([x, sg * 4.6, 0]); pews(modernIn, L2, 6.0); }   // banchi: corsia centrale di 3 m, la parte ovest resta vuota (prima foto)
      // catene di ferro all'imposta degli archi (si vedono in tutte le foto della navata): attraverso la navata, nelle navatelle, lungo le arcate
      { const rods = []; const A = (x0, y0, z0, x1, y1, z1) => rods.push([new T.Vector3(x0, y0, z0), new T.Vector3(x1, y1, z1)]);
        for (let k = 1; k <= 3; k++) { const x = X0 + k * B; A(x, VC - 0.3, -NZ, x, VC - 0.3, NZ); for (const sg of [-1, 1]) A(x, GROUND + 16.7, sg * (ZN + 1.8), x, GROUND + 16.7, sg * (ZA - 0.45)); }
        for (const sg of [-1, 1]) for (let k = 0; k < 4; k++) A(X0 + k * B + 2.3, GROUND + SPR + 1.3, sg * ZN, X0 + (k + 1) * B - 2.3, GROUND + SPR + 1.3, sg * ZN);
        const rm = new T.InstancedMesh(new T.CylinderGeometry(0.05, 0.05, 1, 6), mat({ color: 0x2a2420, roughness: 0.6, metalness: 0.4 }, WORLD), rods.length), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), m4 = new T.Matrix4();
        rods.forEach(([a, b], i) => { const d = b.clone().sub(a); q.setFromUnitVectors(up, d.clone().normalize()); m4.compose(a.clone().add(b).multiplyScalar(0.5), q, new T.Vector3(1, d.length(), 1)); rm.setMatrixAt(i, m4); });
        rm.castShadow = false; naveIn.add(rm); }
      // controfacciata: orologio di Paolo Uccello (1443), rosone dell'Assunta (Ghiberti), porta centrale
      const clk = add(new T.PlaneGeometry(7, 6.9), mat({ map: imgTex('orologio'), roughness: 0.7 }, WORLD), naveIn, false);
      clk.rotation.y = PI / 2; clk.position.set(X0 + 0.95, GROUND + 26, 0);
      const ros = add(new T.CircleGeometry(4.2, 48), new T.MeshBasicMaterial({ map: imgTex('rosone'), side: T.DoubleSide, clippingPlanes: WORLD }), naveIn, false);   // Assunta, su disegno di Ghiberti (foto Zairon)
      add(new T.TorusGeometry(4.45, 0.35, 8, 48), serena, naveIn, false).rotation.y = PI / 2; naveIn.children.at(-1).position.set(X0 + 1.0, GROUND + 35.5, 0);
      add(new T.BoxGeometry(1.5, 1.0, 2 * ZN), serena, naveIn).position.set(X0 + 1.6, GROUND + 30.4, 0);   // ballatoio della controfacciata sotto il rosone
      add(new T.BoxGeometry(0.12, 0.9, 2 * ZN), serena, naveIn, false).position.set(X0 + 2.3, GROUND + 31.35, 0); ros.rotation.y = PI / 2; ros.position.set(X0 + 0.95, GROUND + 35.5, 0);
      add(new T.BoxGeometry(0.4, 9, 5), mat({ color: 0x3a2a1e }, WORLD), naveIn, false).position.set(X0 + 0.95, GROUND + 4.5, 0);        // porta centrale
      for (const sg of [-1, 1]) add(new T.BoxGeometry(0.4, 6.5, 3), mat({ color: 0x3a2a1e }, WORLD), naveIn, false).position.set(X0 + 0.95, GROUND + 3.25, sg * 15.5);   // porte laterali
      // parete nord: Giovanni Acuto (Paolo Uccello, 1436), Niccolò da Tolentino (Andrea del Castagno, 1456), Dante (Domenico di Michelino, 1465)
      const panel = (name, x, y, w, hgt) => { const p = add(new T.PlaneGeometry(w, hgt), mat({ map: imgTex(name), roughness: 0.75 }, WORLD), naveIn, false); p.position.set(x, y, -ZA + 0.5); };
      panel('acuto', -82, GROUND + 11.1, 5.15, 8.2); panel('tolentino', -73.5, GROUND + 11.1, 5.12, 8.33);   // misure reali degli affreschi
      panel('dante', -58, GROUND + 3.6, 2.9, 2.32);
    }
    let inChurch = false, cityOn = true, choirModern = null;   // inChurch: camera dentro la cattedrale (a cantiere finito), interno di oggi al posto del modello esterno
    function setCity(on) { cityOn = !!on; houses.visible = roofs.visible = cityOn; shadowsDirty(); }
    function updNave() { const open = (sectionOn && !interiorOn) || inChurch; naveSolid.forEach(o => { o.visible = !open; }); naveIn.visible = open || interiorOn; }
    // facciata sagomata davanti alla navata: Arnolfo (incompiuta) durante il cantiere, quella di oggi a fine cantiere
    const FH = 47.1;   // sagoma misurata sulla foto raddrizzata: lati 29 m, corpo centrale 46,2 m, timpano 47,1 m
    const fShape = new T.Shape([[-21, 0], [21, 0], [21, 29.1], [10.85, 29.1], [10.85, 46.2], [0, FH], [-10.85, 46.2], [-10.85, 29.1], [-21, 29.1]].map(([u, v]) => new T.Vector2(u, v)));
    const fGeo = new T.ShapeGeometry(fShape); { const p = fGeo.attributes.position, uv = fGeo.attributes.uv; for (let k = 0; k < p.count; k++) uv.setXY(k, (p.getX(k) + 21) / 42, p.getY(k) / FH); }
    const facTex = today => { const t = canvasTex(1024, 1220, (g, w, h) => window.Fresco && window.Fresco.facade(g, w, h, { today }), { repeat: false }); return t; };
    const facArn = facTex(false), facM = mat({ map: facArn, roughness: 0.6 }, WORLD); let facIsToday = false;   // Arnolfo (incompiuta), piatta
    const fac = add(fGeo, facM, nave); fac.rotation.y = -PI / 2; fac.position.set(-109.1, GROUND, 0);
    const portone = add(new T.PlaneGeometry(3.9, 6.2), mat({ map: imgTex('portone'), roughness: 0.5 }, WORLD), nave, false);   // porta di Passaglia in alta risoluzione
    portone.rotation.y = -PI / 2; portone.position.set(-109.24, GROUND + 3.1, 0); portone.visible = false;
    // facciata di oggi in rilievo 3D (build3d.js), costruita la prima volta che serve
    let fac3d = null;
    function setFacade(today) {
      if (today === facIsToday) return; facIsToday = today;
      if (today && !fac3d && window.Build3D) {
        const B = window.Build3D;
        fac3d = B.facade(T, { photo: mat({ map: imgTex('facciata'), roughness: 0.6 }, WORLD), side: mat({ map: tx.poly, roughness: 0.55 }, WORLD),
          marble: mat({ map: tx.marble, roughness: 0.45 }, WORLD), dark: mat({ color: 0x2a2622, roughness: 0.9 }, WORLD), stone: mat({ color: 0xebe5d9, roughness: 0.55 }, WORLD) });
        fac3d.rotation.y = -PI / 2; fac3d.position.set(-109.1, GROUND, 0); nave.add(fac3d);
      }
      fac.visible = !today || !fac3d; if (fac3d) fac3d.visible = today; portone.visible = today; shadowsDirty();
    }
    tx.tile.repeat.set(1, 1);
    // Campanile di Giotto (84,7 m, lato 14,45 m): fusto con i registri, pilastri d'angolo ottagonali, cornicione su beccatelli, terrazza
    const campG = new T.Group(); campG.position.set(-95.4, GROUND, 33); scene.add(campG);
    const campM = mat({ map: imgTex('campanile'), roughness: 0.6 }, []);   // foto raddrizzata della faccia ovest
    const camp = add(new T.BoxGeometry(14.45, 80.6, 14.45), campM, campG); camp.position.y = 40.3;
    const pilM = mat({ map: imgTex('campanile-pilastro'), roughness: 0.6 }, []);   // pilastri d'angolo con la stessa fascia di marmi della foto
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(new T.CylinderGeometry(1.0, 1.0, 80.6, 8), pilM, campG).position.set(x * 7.2, 40.3, z * 7.2);
    add(new T.BoxGeometry(16.9, 1.4, 16.9), M.marble, campG).position.y = 81.4;                     // cornicione a sbalzo
    if (window.Build3D) campG.add(window.Build3D.campanile(T, { marble: M.marble, dark: mat({ color: 0x24211f, roughness: 0.9 }, []), stone: mat({ color: 0xebe5d9, roughness: 0.55 }, []) }));   // rilievi: finestre, cornici, statue
    for (let k = 0; k < 4; k++) for (let j = -7; j <= 7; j++) {                                      // beccatelli
      const b = add(new T.BoxGeometry(0.35, 1.2, 1.2), M.marble, campG, false), a = k * PI / 2;
      b.position.set(Math.cos(a) * 7.8 - Math.sin(a) * j * 1.0, 80.1, Math.sin(a) * 7.8 + Math.cos(a) * j * 1.0); b.rotation.y = -a;
    }
    for (let k = 0; k < 4; k++) { const pw = add(new T.BoxGeometry(16.9, 1.5, 0.4), M.marble, campG); const a = k * PI / 2; pw.position.set(Math.cos(a) * 8.25, 82.8, Math.sin(a) * 8.25); pw.rotation.y = -a + PI / 2; }   // parapetto
    const camp0 = camp;
    // Battistero di San Giovanni, davanti alla facciata
    const bat = new T.Group(); bat.position.set(-148, 0, 0); scene.add(bat);
    add(prism(13.85, GROUND, GROUND + 26, true), mat({ map: imgTex('battistero'), roughness: 0.55 }, []), bat);   // foto raddrizzata di una faccia: tre ordini e attico
    add(prism(14.3, GROUND, GROUND + 0.9, false, 4), M.marble, bat);                                       // gradino
    const scT = imgTex('battistero'); scT.repeat.set(1, 0.42);                                          // stessi marmi dell'ordine basso
    const scars = add(new T.BoxGeometry(9.5, 14, 10), mat({ map: scT, roughness: 0.55 }, []), bat); scars.position.set(-13.85 * COS8 - 4.6, GROUND + 7, 0);   // scarsella verso ovest
    add(new T.BoxGeometry(10.4, 0.8, 10.8), M.marble, bat).position.set(-13.85 * COS8 - 4.6, GROUND + 14.2, 0);
    // rilievi: lesene d'angolo a fasce bianche e verdi, cornici marcapiano, porte di bronzo, piramide con costoloni, lanterna
    const stripes = canvasTex(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = (y / 16) % 2 ? '#3f5648' : '#eeeae2'; g.fillRect(0, y, w, 16); } });
    stripes.repeat.set(1, 26 / 7);
    const strM = mat({ map: stripes, roughness: 0.5 }, []);
    for (let i = 0; i < 8; i++) {
      const [x, , z] = corner(i, 13.85 + 0.15, 0), pil = add(new T.BoxGeometry(1.1, 18.4, 1.1), strM, bat); pil.position.set(x, GROUND + 9.2, z); pil.rotation.y = -ang(i);
    }
    for (const [y, r, t] of [[9.3, 14.25, 0.45], [18.6, 14.45, 0.7], [26, 14.6, 0.8]]) { const c = add(prism(r, GROUND + y, GROUND + y + t, false, 4), M.marble, bat); }
    for (const [y, r] of [[9.3, 14.25], [18.6, 14.45], [26, 14.6]]) { const top = octRing(() => 13.8, () => r); top.userData.update(GROUND + y + (y === 26 ? 0.8 : y === 18.6 ? 0.7 : 0.45)); add(top, M.marble, bat); }
    const bronze = mat({ color: 0xb08a3e, roughness: 0.35, metalness: 0.8 }, []);
    for (const k of [7, 1, 5]) {                                       // porte: est (verso il Duomo), sud, nord
      const a = k * PI / 4 + PI / 4, d = 13.85 * COS8 + 0.06, door = new T.Group(); door.position.set(Math.cos(a) * d, GROUND, Math.sin(a) * d); door.rotation.y = -a + PI / 2; bat.add(door);
      add(new T.BoxGeometry(4.2, 7.4, 0.3), M.marble, door).position.set(0, 3.7, 0.05);
      add(new T.BoxGeometry(3.2, 6.2, 0.12), bronze, door).position.set(0, 3.2, 0.24);
      for (let r = 0; r < 5; r++) for (const c of [-0.78, 0.78]) add(new T.BoxGeometry(1.2, 1.05, 0.06), bronze, door, false).position.set(c, 0.85 + r * 1.2, 0.32);   // formelle
    }
    const roof = add(new T.ConeGeometry(14.5, 8.5, 8, 1, false, P8), mat({ map: tx.marble, color: 0xf2efe8, roughness: 0.5 }, []), bat); roof.position.y = GROUND + 26.8 + 4.25;
    for (let i = 0; i < 8; i++) {                                      // costoloni della piramide
      const [x, , z] = corner(i, 14.5, 0), a = new T.Vector3(x, GROUND + 26.8, z), b = new T.Vector3(0, GROUND + 35.3, 0);
      const rib = add(new T.CylinderGeometry(0.22, 0.22, a.distanceTo(b), 6), M.marble, bat);
      rib.position.copy(a).add(b).multiplyScalar(0.5); rib.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    }
    const lanG = new T.Group(); lanG.position.y = GROUND + 34.2; bat.add(lanG);
    add(new T.CylinderGeometry(1.9, 1.9, 0.5, 8), M.marble, lanG).position.y = 0.25;
    for (let k = 0; k < 8; k++) add(new T.CylinderGeometry(0.14, 0.14, 2.6, 8), M.marble, lanG).position.set(Math.cos(k * PI / 4) * 1.55, 1.8, Math.sin(k * PI / 4) * 1.55);
    add(new T.CylinderGeometry(1.1, 1.1, 2.6, 8), mat({ color: 0x2a2622 }, []), lanG).position.y = 1.8;
    add(new T.CylinderGeometry(2.0, 2.0, 0.4, 8), M.marble, lanG).position.y = 3.3;
    add(new T.ConeGeometry(1.7, 2.6, 8), M.marble, lanG).position.y = 4.8;
    add(new T.SphereGeometry(0.35, 12, 8), M.gold, lanG).position.y = 6.3;
    // La piazza nel Quattrocento: Loggia del Bigallo (1352-58) a sud del Battistero, colonna di San Zanobi a nord,
    // I sarcofagi attorno al Battistero erano già stati tolti.
    // Bigallo: loggia a piano terra (due arcate verso il Battistero, una sulla via dei Calzaiuoli), piano alto con bifore, marmi bianchi e verdi
    const big = new T.Group(); big.position.set(-150, GROUND, 31); scene.add(big);
    const bigT = canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#ece6d8'; g.fillRect(0, 0, w, w);
      g.strokeStyle = '#4c6656'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, w - 20); g.lineWidth = 2; g.strokeRect(30, 30, w - 60, w - 60);   // un riquadro di marmo verde ogni 4 m
    });
    const bigM = mat({ map: bigT, roughness: 0.5 }, []), bigDark = mat({ color: 0x3e5a48, roughness: 0.5 }, []);
    const arcWall = (len, arches, h) => {                                             // parete con arcate a tutto sesto (archi su colonne)
      const sh = new T.Shape([[-len / 2, 0], [len / 2, 0], [len / 2, h], [-len / 2, h]].map(([x, y]) => new T.Vector2(x, y)));
      for (const cx of arches) { const p = new T.Path(); p.moveTo(cx - 2.5, 0.01); p.lineTo(cx - 2.5, 4.2); p.absarc(cx, 4.2, 2.5, PI, 0, true); p.lineTo(cx + 2.5, 0.01); p.lineTo(cx - 2.5, 0.01); sh.holes.push(p); }
      const g = new T.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false, curveSegments: 16 }); g.translate(0, 0, -0.35);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4 + 0.5, uv.getY(i) / 3.8);
      return g;
    };
    const nW = add(arcWall(15, [-3.4, 3.4], 7.6), bigM, big); nW.position.z = -4;                                  // nord, verso il Battistero
    const eW = add(arcWall(8, [0], 7.6), bigM, big); eW.rotation.y = PI / 2; eW.position.x = 7.5;               // est
    const shade = mat({ color: 0x6e665a, roughness: 0.9 }, []);                                                 // fondo e soffitto della loggia, in ombra
    add(new T.BoxGeometry(15, 7.6, 0.7), shade, big).position.set(0, 3.8, 4);
    add(new T.BoxGeometry(0.7, 7.6, 8), shade, big).position.set(-7.5, 3.8, 0);
    add(new T.BoxGeometry(15, 0.4, 8), shade, big, false).position.set(0, 7.4, 0);
    for (const [x, z] of [[-7.2, -3.7], [0, -3.7], [7.2, -3.7], [7.2, 3.7]]) add(new T.CylinderGeometry(0.4, 0.45, 4.2, 12), M.marble, big).position.set(x, 2.1, z);   // colonne
    add(new T.BoxGeometry(15.6, 0.6, 8.6), bigDark, big).position.y = 7.9;                                         // cornice tra i piani
    const up2 = add(boxUV(15, 4.8, 8, 4.8), bigM, big); up2.position.y = 10.6;
    for (const x of [-4.6, 0, 4.6]) {                                                                              // bifore del piano alto
      for (const dx of [-0.6, 0.6]) { const wd = add(new T.BoxGeometry(0.9, 2.2, 0.1), mat({ color: 0x2a231c }, []), big, false); wd.position.set(x + dx, 10.4, -4.06); }
      const ar = add(new T.CylinderGeometry(1.25, 1.25, 0.12, 16, 1, false, 0, PI), bigDark, big, false); ar.rotation.x = PI / 2; ar.rotation.z = PI / 2; ar.position.set(x, 11.5, -4.08);
    }
    add(new T.BoxGeometry(17.4, 0.5, 10.4), mat({ color: 0x6b4a32, roughness: 0.8 }, []), big).position.y = 13.2;  // gronda in legno
    const bigR = add(new T.ConeGeometry(11.6, 3, 4, 1, false, PI / 4), M.roof, big); bigR.position.y = 14.9; bigR.scale.set(1.0, 1, 0.6);
    add(new T.CylinderGeometry(0.45, 0.55, 8, 12), M.marble, scene).position.set(-148, GROUND + 4, -24);                      // colonna di San Zanobi
    add(new T.BoxGeometry(0.15, 1.2, 0.8), M.marble, scene).position.set(-148, GROUND + 8.6, -24);
    // ponytail: le colonne di porfido accanto alla porta est sono nella scalinata del modello del Battistero: le mie toglievano più che aggiungere
    // Palazzo Vecchio con la torre (94 m), a sud
    const pv = new T.Group(); pv.position.set(60, 0, 520); scene.add(pv);
    const stoneM = new T.MeshStandardMaterial({ color: 0xa89a82, roughness: 0.95 });
    add(new T.BoxGeometry(48, 32, 44), stoneM, pv).position.y = GROUND + 16;
    add(new T.BoxGeometry(8, 62, 8), stoneM, pv).position.set(0, GROUND + 63, -18);
    add(new T.BoxGeometry(10, 6, 10), stoneM, pv).position.set(0, GROUND + 95 - 3, -18);

    // Città: isolati irregolari, case con tetto a due falde e qualche casa-torre (instanced)
    const N = 9000;
    const houseGeo = new T.BoxGeometry(1, 1, 1);
    { const p = houseGeo.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const v = p.getY(i) < 0 ? 0.55 : 1; c.push(v, v, v); } houseGeo.setAttribute('color', new T.Float32BufferAttribute(c, 3)); } // AO finta alla base
    // Facciate fiorentine del Quattrocento (una texture per faccia, adattata alla misura con le UV dell'istanza):
    // A casa intonacata con finestre centinate e botteghe ad arco; B palazzo in pietraforte bugnata con bifore; C casa-torre a filaretto
    const facadeTex = kind => canvasTex(256, 256, (g, w) => {
      const noise = (n, c, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${c},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * w, 2 + Math.random() * 3, 2); } };
      const arched = (x, y, ww, hh, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + ww / 2); g.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0); g.lineTo(x + ww, y + hh); g.fill(); };
      if (kind === 'A') {
        g.fillStyle = '#fff'; g.fillRect(0, 0, w, w); noise(2500, '120,100,80', 0.09);
        g.fillStyle = '#d6cdbb'; g.fillRect(0, 196, w, 60);                                    // zoccolo in pietra
        for (const y of [62, 128]) { g.fillStyle = '#cfc5b2'; g.fillRect(0, y + 44, w, 4); }    // davanzali continui (marcapiano)
        for (const y of [14, 80, 146]) for (let c = 0; c < 4; c++) { const x = 22 + c * 58; g.fillStyle = '#cfc6b4'; g.fillRect(x - 4, y - 4, 30, 44); arched(x, y, 22, 36, '#2b241e'); g.fillStyle = 'rgba(110,70,40,.55)'; g.fillRect(x, y + 14, 22, 3); }
        for (const x of [14, 140]) { arched(x, 206, 100, 50, '#3a2f26'); g.strokeStyle = '#b5ab98'; g.lineWidth = 5; g.beginPath(); g.arc(x + 50, 256, 50, Math.PI, 0); g.stroke(); }
      } else if (kind === 'B') {
        g.fillStyle = '#b3a58b'; g.fillRect(0, 0, w, w); noise(3000, '60,50,35', 0.12);
        g.strokeStyle = 'rgba(70,60,45,.55)'; g.lineWidth = 2;
        for (let y = 0; y < w; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 12 % 2) * 14; x < w; x += 28) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 12); g.stroke(); } }
        g.fillStyle = 'rgba(40,32,24,.25)'; for (let y = 176; y < w; y += 20) for (let x = (y / 20 % 2) * 22; x < w; x += 44) g.fillRect(x + 2, y + 2, 40, 16);   // bugnato rustico al piano terra
        g.fillStyle = '#c9bc9f'; g.fillRect(0, 170, w, 6); g.fillRect(0, 88, w, 5); g.fillRect(0, 0, w, 8);
        for (const y of [22, 102]) for (let c = 0; c < 3; c++) { const x = 30 + c * 76; g.fillStyle = '#c9bc9f'; g.fillRect(x - 5, y - 6, 50, 62); arched(x, y, 40, 50, '#2a231c'); g.fillStyle = '#c9bc9f'; g.fillRect(x + 18, y + 10, 4, 40); }   // bifore
        arched(98, 196, 60, 60, '#2e261f');
      } else {
        g.fillStyle = '#a89a80'; g.fillRect(0, 0, w, w); noise(3500, '50,40,30', 0.14);
        g.strokeStyle = 'rgba(60,50,40,.5)'; g.lineWidth = 1.5; for (let y = 0; y < w; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.fillStyle = '#2a231c'; for (const y of [30, 90, 150]) for (const x of [60, 170]) g.fillRect(x, y, 22, 30);
        g.fillStyle = '#5a4c3c'; for (const y of [24, 84, 144]) for (let x = 12; x < w; x += 40) g.fillRect(x, y, 4, 4);          // buche pontaie
        arched(100, 200, 56, 56, '#2e261f');
      }
    }, { repeat: false });
    const winTex = facadeTex('A');
    const houses = new T.Group(), KIND = { A: 0, B: 1, C: 2 };
    const hm = ['A', 'B', 'C'].map(k => { const m = new T.InstancedMesh(houseGeo, new T.MeshStandardMaterial({ roughness: 0.95, vertexColors: true, map: k === 'A' ? winTex : facadeTex(k) }), N); m.count = 0; houses.add(m); return m; });
    // sporti: piani alti in aggetto su travi (beccatelli) verso la strada, tipici delle case fiorentine prima delle leggi che li vietarono
    const jetTex = canvasTex(128, 128, (g, w) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, w); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(120,100,80,${Math.random() * 0.09})`; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
      for (let c = 0; c < 3; c++) { g.fillStyle = '#2b241e'; g.fillRect(14 + c * 40, 22, 20, 30); g.fillRect(14 + c * 40, 72, 20, 30); }
      g.fillStyle = '#4a3624'; g.fillRect(0, w - 12, w, 12); for (let x = 2; x < w; x += 12) g.fillRect(x, w - 18, 5, 6); }, { repeat: false });
    const jets = new T.InstancedMesh(houseGeo, new T.MeshStandardMaterial({ roughness: 0.95, vertexColors: true, map: jetTex }), 2500); jets.count = 0; houses.add(jets);
    const roofGeo = new T.ExtrudeGeometry(new T.Shape([new T.Vector2(-0.5, 0), new T.Vector2(0.5, 0), new T.Vector2(0, 1)]), { depth: 1, bevelEnabled: false }); roofGeo.translate(0, 0, -0.5);
    const roofs = new T.InstancedMesh(roofGeo, new T.MeshStandardMaterial({ roughness: 0.85 }), N);
    // Calibrata sulla Pianta della Catena (c. 1470): muri chiari, molti tetti a padiglione, torri sottili sparse, altane sui tetti
    const hipGeo = new T.ConeGeometry(Math.SQRT1_2, 1, 4, 1, false, PI / 4); hipGeo.translate(0, 0.5, 0);
    const hips = new T.InstancedMesh(hipGeo, new T.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), N); hips.count = 0;
    const altT = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#efe7d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2f26'; for (let x = 8; x < w; x += 40) { g.beginPath(); g.moveTo(x, h); g.lineTo(x, 26); g.arc(x + 14, 26, 14, PI, 0); g.lineTo(x + 28, h); g.fill(); } }, { repeat: false });
    const altane = new T.InstancedMesh(houseGeo, new T.MeshStandardMaterial({ roughness: 0.9, map: altT }), 1500); altane.count = 0;
    const m4 = new T.Matrix4(), q = new T.Quaternion(), col = new T.Color(), up = new T.Vector3(0, 1, 0);
    // isolati compatti sulla griglia delle strade (come dall'alto): case continue lungo i lati, cortili all'interno,
    // piazze libere attorno al Duomo, al campanile e al Battistero
    let n = 0;
    const GR = 0.06, cG = Math.cos(GR), sG = Math.sin(GR), PX = 64, PZ = 52, ST = 9;
    const free = (x, z) => (x > -122 && x < -18 && Math.abs(z) < 38) || Math.hypot(x, z) < 76 || Math.hypot(x + 148, z) < 46 ||
      (x > -195 && x < -108 && Math.abs(z) < 54) || (x > -110 && x < -78 && z > 14 && z < 56) || Math.hypot(x - 60, z - 520) < 58;
    const put = (x, z, w, d, rotY, hh, tower, side = 0) => {   // w lungo l'asse x locale (profondità, verso la strada), d lungo la facciata
      if (n >= N || free(x, z)) return;
      const r = Math.hypot(x, z); if (r > 600) return;
      q.setFromAxisAngle(up, rotY);
      const kind = tower ? 'C' : rnd() < 0.16 ? 'B' : 'A', im = hm[KIND[kind]], i = im.count++;
      if (kind === 'C') { hh = 28 + rnd() * 14; w = Math.min(w, 6.5); d = Math.min(d, 6.5); }   // torre sottile (nella Catena se ne contano molte tra le case)
      else hh = 8 + rnd() * 13;                                                      // da 2 a 5 piani
      m4.compose(new T.Vector3(x, GROUND + hh / 2, z), q, new T.Vector3(w, hh, d)); im.setMatrixAt(i, m4);
      im.setColorAt(i, kind === 'A' ? col.setHSL(0.08 + rnd() * 0.05, 0.08 + rnd() * 0.18, 0.78 + rnd() * 0.12) : col.setHSL(0.09, 0.1, 0.8 + rnd() * 0.15));   // intonaci chiari, come nella Catena
      if (kind === 'A' && side && rnd() < 0.35 && jets.count < jets.instanceMatrix.count) {   // sporto verso la strada (asse x locale)
        const k = jets.count++, jh = hh - 5.5, off = new T.Vector3(side * (w / 2 + 0.6), 0, 0).applyQuaternion(q);
        m4.compose(new T.Vector3(x + off.x, GROUND + 5.5 + jh / 2, z + off.z), q, new T.Vector3(1.2, jh, d * 0.96));
        jets.setMatrixAt(k, m4); jets.setColorAt(k, col.setHSL(0.08 + rnd() * 0.05, 0.2 + rnd() * 0.25, 0.68 + rnd() * 0.14));
      }
      const rc = col.setHSL(0.02 + rnd() * 0.025, 0.62 + rnd() * 0.15, 0.3 + rnd() * 0.1).clone(), rh = Math.min(w, d) * 0.2;   // coppi rosso cotto, come nella Catena
      if (!tower && rnd() < 0.45) {                                                  // tetto a padiglione (quattro falde), come in molte case della Catena
        const k = hips.count++; m4.compose(new T.Vector3(x, GROUND + hh, z), q, new T.Vector3(w + 2, rh * 1.1, d + 2)); hips.setMatrixAt(k, m4); hips.setColorAt(k, rc);
        m4.makeScale(0, 0, 0);
      } else m4.compose(new T.Vector3(x, GROUND + hh, z), q, new T.Vector3(w + 2, tower ? 1.2 : rh, d + 2));   // gronde sporgenti (circa 1 m)
      roofs.setMatrixAt(n, m4); roofs.setColorAt(n, rc);
      if (kind !== 'C' && rnd() < 0.07 && altane.count < altane.instanceMatrix.count) {   // altana: loggetta coperta sul tetto
        const k = altane.count++, off = new T.Vector3(0, 0, d * 0.25).applyQuaternion(q);
        m4.compose(new T.Vector3(x + off.x, GROUND + hh + 1.4, z + off.z), q, new T.Vector3(w * 0.45, 2.8, d * 0.35)); altane.setMatrixAt(k, m4);
      }
      n++;
    };
    for (let bx = -10; bx <= 10; bx++) for (let bz = -12; bz <= 12; bz++) {
      const ox = bx * PX, oz = bz * PZ, bw = PX - ST - (rnd() < 0.15 ? 8 : 0), bd = PZ - ST;     // centro e misure dell'isolato (coordinate griglia)
      const toW = (u, v) => { const gu = ox + u, gv = oz + v; return [gu * cG - gv * sG, gu * sG + gv * cG]; };
      const D = 11 + rnd() * 3;
      // lati lunghi (lungo x): facciate su strada, colmo parallelo alla strada
      for (const sv of [-1, 1]) for (let u = -bw / 2; u < bw / 2 - 4;) {
        const w = Math.min(7 + rnd() * 7, bw / 2 - u), [x, z] = toW(u + w / 2, sv * (bd / 2 - D / 2));
        put(x, z, D, w, -GR + PI / 2, 12 + rnd() * 9, rnd() < 0.03, -sv); u += w;
      }
      // lati corti (lungo z), tra i due lati lunghi
      for (const su of [-1, 1]) for (let v = -bd / 2 + D; v < bd / 2 - D - 3;) {
        const w = Math.min(7 + rnd() * 6, bd / 2 - D - v), [x, z] = toW(su * (bw / 2 - D / 2), v + w / 2);
        put(x, z, D, w, -GR, 12 + rnd() * 9, rnd() < 0.02, su); v += w;
      }
    }
    roofs.count = n;
    houses.add(hips, altane);
    for (const m of [...hm, jets, roofs, hips, altane]) m.castShadow = m.receiveShadow = true;
    scene.add(houses, roofs);
    const ground = add(new T.CircleGeometry(2600, 48), new T.MeshStandardMaterial({ color: 0x8c7d66, roughness: 1 }), scene);
    ground.rotation.x = -PI / 2; ground.position.y = GROUND;
    const paveT = canvasTex(256, 256, (g, w) => {                  // lastrico di pietraforte (dal Duecento): lastre irregolari a corsi sfalsati
      g.fillStyle = '#5e5850'; g.fillRect(0, 0, w, w);
      for (let y = 0; y < w; y += 32) for (let x = -((y / 32) % 2) * 24; x < w; x += 48) { const t = 80 + Math.random() * 30; g.fillStyle = `rgb(${t + 18},${t + 12},${t})`; g.fillRect(x + 2, y + 2, 44 + Math.random() * 3, 28); }
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(30,25,20,${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
    });
    paveT.repeat.set(480, 480);                                       // lastre di circa 1,5 × 1 m
    const paving = add(new T.CircleGeometry(640, 64), new T.MeshStandardMaterial({ map: paveT, roughness: 0.95 }), scene);   // strade e piazze lastricate
    paving.rotation.x = -PI / 2; paving.position.y = GROUND + 0.05;
    const aoTex = canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, w * 0.12, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(30,20,10,.45)'); r.addColorStop(1, 'rgba(30,20,10,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, { repeat: false });
    const ao = new T.Mesh(new T.PlaneGeometry(240, 150), new T.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }));
    ao.rotation.x = -PI / 2; ao.position.set(-40, GROUND + 0.15, 0); scene.add(ao);
    // Arno e colline all'orizzonte
    const arno = new T.Mesh(new T.PlaneGeometry(4000, 70), new T.MeshStandardMaterial({ color: 0x6f7f78, roughness: 0.15, metalness: 0.1 }));
    arno.rotation.x = -PI / 2; arno.position.set(0, GROUND + 0.3, 660); scene.add(arno);
    const hillM = new T.MeshStandardMaterial({ color: 0x6d7558, roughness: 1 });
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * PI * 2 + rnd() * 0.2, d = 1500 + rnd() * 500, hl = new T.Mesh(new T.SphereGeometry(1, 16, 8), hillM);
      hl.scale.set(380 + rnd() * 300, (a > PI ? 260 : 150) + rnd() * 140, 380 + rnd() * 300);      // più alte a nord (Fiesole)
      hl.position.set(Math.cos(a) * d, GROUND - 40, Math.sin(a) * d); scene.add(hl);
    }

    // --- Lanterna (1446-1471) ---
    const lant = new T.Group(); lant.position.y = YTOP + 1.1; scene.add(lant);
    add(prism(5.6, 0, 1.6), M.lantern, lant);
    const lr = octRing(() => 3.2, () => 5.6); lr.userData.update(1.6); add(lr, M.lantern, lant);
    add(new T.CylinderGeometry(3.4, 3.4, 10.5, 8, 1, false, P8), M.lantern, lant).position.y = 6.85;
    for (let i = 0; i < 8; i++) {                       // contrafforti radiali con volute
      const a = ang(i), b = add(new T.BoxGeometry(2.6, 9.5, 0.8), M.lantern, lant);
      b.position.set(Math.cos(a) * 4.2, 6.4, Math.sin(a) * 4.2); b.rotation.y = -a;
      const v = add(new T.TorusGeometry(0.9, 0.35, 8, 16, PI), M.lantern, lant);
      v.position.set(Math.cos(a) * 4.9, 1.9, Math.sin(a) * 4.9); v.rotation.y = -a + PI / 2;
      const win = add(new T.PlaneGeometry(1.5, 6.5), mat({ color: 0x202528 }, LANT), lant);
      const wa = a + P8; win.position.set(Math.cos(wa) * 3.16, 7, Math.sin(wa) * 3.16); win.rotation.y = -wa + PI / 2;
    }
    add(new T.CylinderGeometry(4.0, 4.0, 1.1, 8, 1, false, P8), M.lantern, lant).position.y = 12.6;
    add(new T.ConeGeometry(3.6, 7.2, 8, 1, false, P8), M.lantern, lant).position.y = 16.8;
    const ballG = new T.Group(); lant.add(ballG);
    add(new T.CylinderGeometry(0.5, 0.9, 1.4, 8), M.gold, ballG).position.y = 20.8;
    add(new T.SphereGeometry(1.25, 32, 16), M.gold, ballG).position.y = 22.6;
    add(new T.BoxGeometry(0.35, 3.6, 0.35), M.gold, ballG).position.y = 25.4;
    add(new T.BoxGeometry(1.9, 0.35, 0.35), M.gold, ballG).position.y = 26.3;
    // Gru girevole per la lanterna (diversa dal "castello" usato nel 1423 per la cupola)
    const crane = new T.Group(); lant.add(crane);
    add(new T.BoxGeometry(0.6, 28, 0.6), M.wood, crane).position.set(0, 13, 0);              // albero sull'asse: la lanterna cresce attorno
    const arm = add(new T.BoxGeometry(14, 0.5, 0.5), M.wood, crane); arm.position.set(3, 26.5, 0);
    add(new T.BoxGeometry(0.3, 0.3, 9), M.wood, crane, false).position.set(0, 25.2, 0);
    const crRope = add(new T.CylinderGeometry(0.05, 0.05, 7, 5), M.rope, crane, false); crRope.position.set(9.4, 23, 0);
    const crLoad = add(new T.BoxGeometry(1.4, 1, 1), M.marble, crane); crLoad.position.set(9.4, 19.2, 0);

    // ---------- Etichette HTML ancorate al 3D ----------
    const labelLayer = document.createElement('div'); labelLayer.className = 'labels'; container.appendChild(labelLayer);
    let labels = [];
    function setLabels(list) {
      labelLayer.innerHTML = '';
      labels = (list || []).map(l => {
        const el = document.createElement('div'); el.className = 'tag' + (l.ring ? ' ring' : ''); const t = document.createElement('span'); t.className = 'tag-text'; t.textContent = l.text; el.appendChild(t); if (l.lh) el.style.setProperty('--lh', l.lh + 'px'); labelLayer.appendChild(el);
        return { ...l, el, v: new T.Vector3(...l.pos), vg: l.posGlb && new T.Vector3(...l.posGlb) };
      });
    }

    // ---------- Camera: ruota, sposta, avvicina (mouse, touch, tastiera, pulsanti) ----------
    const cam = { theta: 0.9, phi: 1.15, dist: 230, tx: 0, ty: 0, tz: 0 }, goal = { ...cam };
    let autoRotate = !!opts.autoRotate, lastInput = 0, home = { ...cam };
    const DMIN = 8, DMAX = 600, clampD = d => Math.min(DMAX, Math.max(DMIN, d));
    const el = renderer.domElement, pts = new Map(); let pinch0 = 0, mid0 = null, panMode = false;
    el.style.touchAction = 'none';
    el.addEventListener('contextmenu', e => e.preventDefault());
    const _r = new T.Vector3(), _u = new T.Vector3();
    function pan(dx, dy) {                                   // sposta il punto guardato nel piano dello schermo
      const k = goal.dist * 2 * Math.tan(camera.fov * PI / 360) / el.clientHeight;
      _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
      goal.tx -= (_r.x * dx - _u.x * dy) * k; goal.ty -= (_r.y * dx - _u.y * dy) * k; goal.tz -= (_r.z * dx - _u.z * dy) * k;
      goal.tx = Math.max(-260, Math.min(260, goal.tx)); goal.tz = Math.max(-260, Math.min(260, goal.tz)); goal.ty = Math.max(GROUND, Math.min(120, goal.ty));
    }
    const midOf = () => { const [a, b] = [...pts.values()]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); lastInput = performance.now();
      panMode = e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey; pinch0 = 0; mid0 = null;
    });
    const release = e => { pts.delete(e.pointerId); pinch0 = 0; mid0 = null; };
    el.addEventListener("pointerup", release); el.addEventListener("pointercancel", release);
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1];
      pts.set(e.pointerId, [e.clientX, e.clientY]); lastInput = performance.now();
      if (pts.size === 1) {
        if (panMode) pan(dx, dy);
        else if (walk) { goal.theta += dx * 0.004; goal.phi = Math.min(2.95, Math.max(0.15, goal.phi - dy * 0.004)); Object.assign(cam, { theta: goal.theta, phi: goal.phi }); }
        else { goal.theta += dx * 0.006; goal.phi = Math.min(2.5, Math.max(0.2, goal.phi - dy * 0.005)); }
      } else if (pts.size === 2) {                           // due dita: pizzico = avvicina, trascina = sposta
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = midOf();
        if (pinch0) goal.dist = clampD(goal.dist * pinch0 / d); pinch0 = d;
        if (mid0) pan(m[0] - mid0[0], m[1] - mid0[1]); mid0 = m;
      }
    });
    el.addEventListener('wheel', e => { e.preventDefault(); lastInput = performance.now(); if (walk) step(-Math.sign(e.deltaY) * 2.5, 0); else goal.dist = clampD(goal.dist * (1 + Math.sign(e.deltaY) * 0.12)); }, { passive: false });
    // doppio clic: vola sul punto cliccato
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const clipped = (m, p) => (m.clippingPlanes || []).some(pl => pl.distanceToPoint(p) < 0);
    el.addEventListener('dblclick', e => {
      const rc = el.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(scene.children, true).find(x => x.object.isMesh && x.object !== sky && x.distance < 1500 && shown(x.object) && !clipped(x.object.material, x.point));
      if (!hit) return;
      lastInput = performance.now();
      if (walk) { const d = Math.max(0, hit.distance - 2) / hit.distance; goal.tx += (hit.point.x - goal.tx) * d; goal.tz += (hit.point.z - goal.tz) * d; return; }   // cammina fin lì
      Object.assign(goal, { tx: hit.point.x, ty: hit.point.y, tz: hit.point.z, dist: clampD(Math.min(goal.dist, hit.distance) * 0.6) });
    });
    function flyTo(v, instant) {
      if (walk) setWalk(false);
      Object.assign(goal, v); if (!instant) home = { ...goal };
      if (instant) { Object.assign(cam, goal); home = { ...goal }; }
      if (v.theta !== undefined) { while (goal.theta - cam.theta > PI) goal.theta -= 2 * PI; while (goal.theta - cam.theta < -PI) goal.theta += 2 * PI; }
    }
    function move(fwd, side, rise) {
      lastInput = performance.now(); const st = Math.max(3, goal.dist * 0.12), c = Math.cos(goal.theta), sn = Math.sin(goal.theta);
      goal.tx += (-c * fwd + sn * side) * st; goal.tz += (-sn * fwd - c * side) * st; goal.ty += rise * st;
      goal.tx = Math.max(-260, Math.min(260, goal.tx)); goal.tz = Math.max(-260, Math.min(260, goal.tz)); goal.ty = Math.max(GROUND, Math.min(120, goal.ty));
    }
    // Movimento continuo: i tasti (e i pulsanti a schermo) si tengono premuti; la velocità dipende dalla distanza.
    const held = new Set(), KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, PageUp: 1, PageDown: 1, TurnL: 1, TurnR: 1 };
    const TURNKEY = { q: 'TurnL', Q: 'TurnL', e: 'TurnR', E: 'TurnR' };   // Q/E: girarsi sul posto, in entrambe le modalità
    function hold(key, on) { if (!key) { held.clear(); return; } key = TURNKEY[key] || key; if (!KEYS[key]) return false; if (on) held.add(key); else held.delete(key); lastInput = performance.now(); return true; }
    // Collisioni a piedi: due raggi orizzontali (ginocchio e petto) contro edifici, interni e case; il portale centrale del Duomo è aperto
    const walkRay = new T.Raycaster(), _wo = new T.Vector3(), _wd = new T.Vector3();
    function blocked(dx, dz) {
      const len = Math.hypot(dx, dz); if (!len) return false;
      _wd.set(dx / len, 0, dz / len); walkRay.far = len + 0.45;
      const objs = [glb, campG, bat, big, naveIn, interior, houses, cath].filter(o => o && shown(o));
      for (const hgt of [1.2, 1.65]) {                          // sopra i gradini del sagrato
        _wo.set(goal.tx, GROUND + hgt, goal.tz); walkRay.set(_wo, _wd);
        if (walkRay.intersectObjects(objs, true).some(x => shown(x.object) && !(Math.abs(x.point.z) < 2.2 && x.point.x > -104.5 && x.point.x < -100))) return true;
      }
      return false;
    }
    function step(fwd, side) {                                   // a piedi: avanti/indietro e di lato, nel verso in cui si guarda
      const c = Math.cos(goal.theta), sn = Math.sin(goal.theta);
      let dx = -c * fwd + sn * side, dz = -sn * fwd - c * side;
      if (walk && goal.ty < GROUND + EYE + 0.5 && blocked(dx, dz)) {   // contro un muro si scivola lungo il muro
        if (!blocked(dx, 0)) dz = 0; else if (!blocked(0, dz)) dx = 0; else return;
      }
      goal.tx += dx; goal.tz += dz;
      goal.tx = Math.max(-400, Math.min(400, goal.tx)); goal.tz = Math.max(-400, Math.min(400, goal.tz));
    }
    function heldMove(dt) {
      if (!held.size) return;
      const f = (held.has('ArrowUp') ? 1 : 0) - (held.has('ArrowDown') ? 1 : 0), sd = (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0), up = (held.has('PageUp') ? 1 : 0) - (held.has('PageDown') ? 1 : 0), turn = (held.has('TurnR') ? 1 : 0) - (held.has('TurnL') ? 1 : 0);
      lastInput = performance.now();
      if (turn) { goal.theta += turn * 1.5 * dt; if (walk) cam.theta = goal.theta; }
      if (walk) {                                                // frecce: avanti/indietro e girarsi; Pag su/giù: salire (per vedere dall'alto)
        step(f * 7 * dt, 0); goal.theta += sd * 1.5 * dt; cam.theta = goal.theta;
        goal.ty = Math.max(GROUND + EYE, Math.min(GROUND + 140, goal.ty + up * 8 * dt));
      } else {
        const v = Math.max(8, goal.dist * 0.3) * dt; move(f * v / Math.max(3, goal.dist * 0.12), sd * v / Math.max(3, goal.dist * 0.12), up * v / Math.max(3, goal.dist * 0.12));
      }
    }
    // Cammina: vista in prima persona ad altezza d'occhio. Trascina per guardare, frecce per camminare, doppio clic per andare lì.
    const EYE = 1.7; let walk = false, orbitBack = null;
    const hint = document.createElement('div'); hint.className = 'walkhint'; hint.hidden = true;
    hint.textContent = 'Cammina: trascina per guardarti intorno · frecce per camminare e girarti · Q/E per girarti · doppio clic per andare in un punto · Pag su/giù per salire in volo (senza muri)';
    container.appendChild(hint);
    function setWalk(on, at) {
      if (on === walk) return; walk = on; held.clear(); hint.hidden = !on;
      if (on) {
        orbitBack = { ...goal };
        const p = at || { tx: -128, tz: 0, theta: PI };          // di solito in piazza, davanti alla porta centrale, verso est
        Object.assign(goal, { tx: p.tx, ty: GROUND + EYE, tz: p.tz, theta: p.theta, phi: PI / 2 - 0.08, dist: 0.01 });
        Object.assign(cam, goal); autoRotate = false;
      } else if (orbitBack) { Object.assign(goal, orbitBack); }
      camera.fov = on ? 62 : interiorOn ? 55 : 38; camera.near = on ? 0.2 : 2; camera.updateProjectionMatrix();
      container.classList.toggle('walking', on); document.dispatchEvent(new CustomEvent('cupola-walk'));
    }
    function nudge(dTheta, dPhi, zoom) { lastInput = performance.now(); goal.theta += dTheta || 0; goal.phi = Math.min(2.5, Math.max(0.2, goal.phi + (dPhi || 0))); if (zoom) goal.dist = clampD(goal.dist * zoom); }
    // pulsanti a schermo (LIM e touch)
    const nav = document.createElement('div'); nav.className = 'navpad';
    nav.innerHTML = '<button data-k="in" title="Avvicina (rotella)" aria-label="Avvicina">+</button><button data-k="out" title="Allontana (rotella)" aria-label="Allontana">−</button>'
      + '<button data-k="f" aria-label="Avanti" title="Avanti (freccia su)">▲</button><button data-k="l" aria-label="A sinistra" title="A sinistra (freccia sinistra)">◀</button><button data-k="r" aria-label="A destra" title="A destra (freccia destra)">▶</button><button data-k="b" aria-label="Indietro" title="Indietro (freccia giù)">▼</button>'
      + '<button data-k="up" aria-label="Sali" title="Sali (Pag su)">⤒</button><button data-k="down" aria-label="Scendi" title="Scendi (Pag giù)">⤓</button>'
      + '<button data-k="home" title="Torna alla vista della tappa" aria-label="Torna alla vista della tappa">⌂</button>'
      + '<button data-k="tl" aria-label="Girati a sinistra" title="Girati a sinistra (Q)">⟲</button><button data-k="tr" aria-label="Girati a destra" title="Girati a destra (E)">⟳</button>';
    const PADKEY = { f: 'ArrowUp', b: 'ArrowDown', l: 'ArrowLeft', r: 'ArrowRight', up: 'PageUp', down: 'PageDown', tl: 'TurnL', tr: 'TurnR' };
    nav.addEventListener('pointerdown', e => { const k = PADKEY[e.target.dataset && e.target.dataset.k]; if (k) { e.preventDefault(); hold(k, true); e.target.setPointerCapture(e.pointerId); } });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) nav.addEventListener(ev, e => { const k = PADKEY[e.target.dataset && e.target.dataset.k]; if (k) hold(k, false); });
    nav.onclick = e => {
      const k = e.target.dataset && e.target.dataset.k; if (!k) return; lastInput = performance.now();
      if (PADKEY[k] && e.detail !== 0) return;                  // col mouse/touch conta il tenere premuto; da tastiera (Invio) fa un passo
      if ((walk || k[0] === 't' && k !== 'home') && PADKEY[k]) { hold(PADKEY[k], true); setTimeout(() => hold(PADKEY[k], false), 350); return; }
      if (k === 'home' && walk) { setWalk(false); return; }
      if (k === 'in') goal.dist = clampD(goal.dist * 0.75); else if (k === 'out') goal.dist = clampD(goal.dist * 1.33);
      else if (k === 'f') move(1, 0, 0); else if (k === 'b') move(-1, 0, 0); else if (k === 'l') move(0, -1, 0); else if (k === 'r') move(0, 1, 0);
      else if (k === 'up') move(0, 0, 1); else if (k === 'down') move(0, 0, -1);
      else if (k === 'home') Object.assign(goal, home);
    };
    container.appendChild(nav);

    // ---------- Stato guidato dall'anno ----------
    let year = 1418, focus = null, h = -1, jibTip = 0;
    // ---------- Il Duomo di oggi: modello «Florence Duomo» (3D Warehouse), texture fotografiche ----------
    // Si mostra a cantiere finito, senza taglio e senza interni; per tagli, interni e anni del cantiere resta il modello ricostruito.
    // Asse della cupola nel modello: x 42,33, z 11,08; terreno a y = 0; facciata verso −x (ovest), come qui.
    let glb = null, glbLoading = false;
    // Modelli di Enrico Dalbosco (3D Warehouse): migliaia di mesh fuse per materiale al caricamento (meno draw call)
    function loadGlb(name, done, tune) {
      const url = (window.CUPOLA_MODELS || {})[name]; if (!url || !window.THREE_GLTFLoader) return false;
      new window.THREE_GLTFLoader().load(url, g => {
        const root = g.scene, merge = window.__BGU && window.__BGU.mergeGeometries, groups = new Map(), out = new T.Group();
        root.updateMatrixWorld(true);
        root.traverse(o => {
          if (!o.isMesh) return;
          const m = o.material;
          if (Array.isArray(m) || (m.name || '').startsWith('Google Earth Snapshot')) return;   // foto aerea di Google: esclusa
          m.side = T.DoubleSide; m.metalness = 0; m.roughness = Math.max(0.6, m.roughness ?? 0.8); if (m.map) m.map.anisotropy = 8;
          if (m.transparent && m.map) { m.transparent = false; m.alphaTest = 0.5; }   // statue in PNG ritagliate: ombre col profilo giusto
          if (tune && !m.userData.tuned) { m.userData.tuned = true; tune(m); }
          const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
          const key = m.uuid + '|' + Object.keys(geo.attributes).sort().join();
          if (!groups.has(key)) groups.set(key, { m, gs: [] }); groups.get(key).gs.push(geo);
        });
        for (const { m, gs } of groups.values()) {
          const geo = merge && gs.length > 1 ? merge(gs, false) : null;
          for (const gg of geo ? [geo] : gs) { const o = new T.Mesh(gg, m); o.castShadow = o.receiveShadow = true; out.add(o); }
        }
        done(out); shadowsDirty();
      }, undefined, () => {});
      return true;
    }
    // Campanile e Battistero esistevano già: si mostrano sempre; le ricostruzioni restano finché il modello non è pronto
    loadGlb('campanile', m => { campG.children.forEach(c => { c.visible = false; }); m.position.set(30.21, 0, -44.33); campG.add(m); });
    loadGlb('battistero', m => {
      bat.children.forEach(c => { c.visible = false; }); m.position.set(5.88, GROUND, -9.73); bat.add(m);
      // Porta del Paradiso (Ghiberti, 1452): la foto dei battenti sulla porta est del modello (2,80 × 5,15 m, come la vera)
      const pd = add(new T.PlaneGeometry(2.8, 5.15, 160, 296), reliefMat('paradiso', 0.05, { roughness: 0.35, metalness: 0.3 }), bat, false);
      pd.rotation.y = PI / 2; pd.position.set(14.5, GROUND + 1.45 + 2.575, 0);
      // stipite di bronzo (Ghiberti) attorno ai battenti: fregio di foglie, frutti e animali, dorato, sopra la cornice grigia del modello
      const fr = canvasTex(256, 360, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#4a3418'); gr.addColorStop(0.5, '#6b4d24'); gr.addColorStop(1, '#4a3418');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '200,160,80' : '30,20,10'},${Math.random() * 0.25})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }   // grana del bronzo cesellato
        const bw = 47, bt = 53; g.clearRect(bw, bt, w - 2 * bw, h - bt);   // luce un po' più stretta dei battenti: copre la fessura
        g.strokeStyle = '#b98d3c'; g.lineWidth = 3; g.strokeRect(bw - 4, bt - 4, w - 2 * bw + 8, h); g.strokeRect(6, 6, w - 12, h);   // filetti dorati
      }, { repeat: false });
      const frM = new T.MeshStandardMaterial({ map: fr, roughness: 0.4, metalness: 0.35, transparent: true, alphaTest: 0.5, side: T.DoubleSide });
      const pf = add(new T.PlaneGeometry(4.2, 5.95), frM, bat, false); pf.rotation.y = PI / 2; pf.position.set(14.69, GROUND + 1.45 + 2.975, 0);
    }, m => m.color.setScalar(/^JPG_cupola_lato/.test(m.name) ? 1.55 : 1.15));   // le texture del modello sono più grigie del marmo vero (foto Commons)
    function updGlb() {
      const want = year >= 1471 && !sectionOn && !interiorOn && !inChurch;
      if (want && !glb && !glbLoading) {
        glbLoading = loadGlb('duomo', m => {
          glb = m; glb.position.set(-42.33, GROUND, -11.08);
          // porta centrale: la foto ad alta risoluzione delle ante di Passaglia sopra la texture piccola del modello
          // tutto il portale (stipiti, architrave e battenti) dalla stessa foto: la texture del modello è troppo piccola per vederlo da vicino
          const door = new T.Mesh(new T.PlaneGeometry(6.12, 9.84, 192, 308), reliefMat('portale', 0.07));
          door.rotation.y = -PI / 2; door.position.set(-60.16, 5.64, 11.06); glb.add(door);
          scene.add(glb); glbLoading = false; updGlb();
        });
      }
      const show = want && !!glb;
      if (glb) glb.visible = show;
      dome.visible = drumOut.visible = !show; cath.visible = !show && !inChurch;   // da dentro i gusci esterni chiuderebbero gli arconi
      if (show) lant.visible = false;
    }
    function setSection(on) {
      sectionOn = on;
      DOME[1] = on ? cutZ : off; WORLD[0] = on ? cutZ : off;
      for (const m of Object.values(M)) if (m.clippingPlanes === DOME || m.clippingPlanes === WORLD) m.needsUpdate = true;
      tribS.visible = !on || interiorOn; allEx.forEach(g => { g.visible = (year >= 1439 || interiorOn) && !(on && (interiorOn ? g.position.x < 0 : southEx.includes(g))); }); sect.visible = drumSect.visible = on; updGlb(); shadowsDirty();
      houses.visible = roofs.visible = cityOn; updNave();
    }
    function setYear(y) {
      if (Math.abs(y - year) > 0.02) shadowsDirty();
      year = y; if (interiorOn) y = Math.max(y, 1600); h = heightAt(y); modernIn.visible = y >= 1471; if (choirModern) choirModern.visible = y >= 1471;
      setFacade(y >= 1471);   // a cantiere finito: la cattedrale com'è oggi
      const built = h >= YTOP;
      cutH.constant = built ? 1e6 : h;
      ghostMat.clippingPlanes[0].constant = -Math.max(h, 0);
      ghostMat.visible = !built;
      topIn.userData.update(Math.max(h, 0)); topOut.userData.update(Math.max(h, 0));
      workTop.visible = h > 0 && !built;
      ring.visible = built;
      allEx.forEach(g => { g.visible = y >= 1439 && !(sectionOn && (interiorOn ? g.position.x < 0 : southEx.includes(g))); });   // tribune morte dal 1439
      const covered = y >= 1436.6;
      shellOut.material = covered ? M.tiles : M.brick;
      marbleRibs.visible = covered;
      site.visible = h > 0.5 && !built;
      if (site.visible) {
        const py = h - 1.6;
        plat.userData.update(py); rail.userData.update(py + 1.1);
        const V = (a, r, y) => new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        beams.children.forEach(b => {
          const { a, k } = b.userData, r0 = R[0](py);
          if (k === 'beam') { b.position.copy(V(a, r0 - 1.0, py - 0.32)); b.rotation.y = -a; }
          else if (k === 'strut') between(b, V(a, R[0](py - 2.6) * 0.96, py - 2.6), V(a, r0 - 2.2, py - 0.45));
          else if (k === 'post') b.position.copy(V(a, r0 - 2.5, py + 0.55));
          else if (k === 'pile') { b.position.copy(V(a, r0 - 1.0, py + 0.3)); b.rotation.y = -a; }
          else if (k === 'tub') b.position.copy(V(a, r0 - 1.3, py + 0.25));
          else if (k === 'man') { b.position.copy(V(a, r0 - 1.5, py)); b.rotation.y = -a; }
        });
        const jx = -(R[0](py) * COS8 - 1.6), reach = Math.min(10, -jx); jib.position.set(jx, py, 0);
        const L = reach + 3; beamsB.forEach(b => { b.scale.x = L; b.position.x = (reach - 3) / 2; });
        screw.scale.y = reach - 1; screw.position.x = reach / 2; carr.position.x = pulley.position.x = reach;
        between(stays[0], new T.Vector3(0, 11, 0), new T.Vector3(reach, JY + 0.2, 0)); between(stays[1], new T.Vector3(0, 11, 0), new T.Vector3(-3, JY + 0.2, 0));
        jibTip = jx + reach;
      }
      const lp = clamp01((y - 1446) / (1461 - 1446));
      lant.visible = y >= 1446;
      cutLantern.constant = YTOP + 1.1 + 0.4 + lp * 20.5;
      ballG.visible = y >= 1471;
      crane.visible = y >= 1446 && y < 1471;
      updGlb();
    }
    function setFocus(f) { focus = f; }

    // impronta interna della cattedrale: navata (dalla facciata del modello, −102,4), crociera e tribune
    function churchHas(P) {
      if (P.y > GROUND + 40 && Math.hypot(P.x, P.z) > AP) return false;
      if (P.x > -102.4 && P.x < -AP + 0.5 && Math.abs(P.z) < 20.5 && P.y < GROUND + (Math.abs(P.z) < 8.6 ? 40 : 21)) return true;   // navata alta 40 m, navatelle 23
      if (P.y < YTOP && Math.hypot(P.x, P.z) < AP) return true;
      return P.y < -14 && [[36, 0], [0, 36], [0, -36]].some(([x, z]) => Math.hypot(P.x - x, P.z - z) < 13.2);
    }
    // ---------- Ciclo ----------
    const tmp = new T.Vector3();
    function resize() {
      const w = container.clientWidth, hh = container.clientHeight;
      renderer.setSize(w, hh, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(container); resize();
    let t0 = performance.now(); const _oc = new T.Vector3();
    function frame(now) {
      const dt = Math.min(0.05, Math.max(0, (now - t0) / 1000)); t0 = now;   // il timestamp di rAF può precedere performance.now()
      if (autoRotate && now - lastInput > 4000) goal.theta += dt * 0.06;
      const s = 1 - Math.pow(0.02, dt);
      heldMove(dt);
      for (const key in cam) cam[key] += (goal[key] - cam[key]) * s;
      const dx = Math.sin(cam.phi) * Math.cos(cam.theta), dy = Math.cos(cam.phi), dz = Math.sin(cam.phi) * Math.sin(cam.theta);
      if (walk) { camera.position.set(cam.tx, cam.ty, cam.tz); camera.lookAt(cam.tx - dx, cam.ty - dy, cam.tz - dz); }
      else {
        camera.position.set(cam.tx + cam.dist * dx, cam.ty + cam.dist * dy, cam.tz + cam.dist * dz);
        if (camera.position.y < GROUND + 1.7) camera.position.y = GROUND + 1.7;
        // orbita con il centro dentro la chiesa: la camera resta dentro i muri (uscendo, interno ed esterno si scambiavano a ogni giro)
        if (inChurch && cam.dist < 70 && churchHas(_oc.set(cam.tx, cam.ty, cam.tz)) && !churchHas(camera.position)) {   // solo se eri già dentro e l'orbita è corta: le viste esterne restano libere
          let lo = 0, hi = 1;
          for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (churchHas(_oc.set(cam.tx + m * cam.dist * dx, cam.ty + m * cam.dist * dy, cam.tz + m * cam.dist * dz))) lo = m; else hi = m; }
          const t = Math.max(0, lo - 1.5 / cam.dist);
          camera.position.set(cam.tx + t * cam.dist * dx, Math.max(GROUND + 1.7, cam.ty + t * cam.dist * dy), cam.tz + t * cam.dist * dz);
        }
        camera.lookAt(cam.tx, cam.ty, cam.tz);
      }
      { const P = camera.position, ic = year >= 1471 && !sectionOn && !interiorOn && churchHas(P);
        if (ic !== inChurch) { inChurch = ic; if (ic && !interiorBuilt) buildInterior(); hemi.intensity = ic ? 2.4 : 1.1; updNave(); updGlb(); shadowsDirty(); } }
      // a cantiere finito gli affreschi di oggi compaiono quando si taglia il 3D o si entra nella cupola
      const P = camera.position, inside = P.y > GROUND && P.y < YTOP && Math.hypot(P.x, P.z) < R[0](Math.max(P.y, 0)) * COS8;
      const showIn = interiorOn || inChurch || (year >= 1471 && (sectionOn || inside));
      if (showIn !== interior.visible) { if (showIn && !interiorBuilt) buildInterior(); interior.visible = showIn; shadowsDirty(); }
      const cr = interior.visible ? MODEL_CREDIT + '<br>' + FRESCO_CREDIT : MODEL_CREDIT; if (credit.dataset.k !== cr) { credit.dataset.k = cr; credit.innerHTML = cr; }   // i crediti dei modelli restano sempre visibili (licenza)
      // carico che sale e scende
      if (site.visible) {
        const top = h - 1.6 + JY - 0.6, bot = GROUND + 2, ph = (now / 9000) % 1, f = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        const ly = bot + (top - 3 - bot) * (0.5 - 0.5 * Math.cos(f * PI));
        load.position.set(jibTip, ly, 0);
        rope.scale.y = top - ly - 0.45; rope.position.set(jibTip, (top + ly + 0.45) / 2, 0);
      }
      if (crane.visible) crane.rotation.y = Math.sin(now / 3000) * 0.6;
      hoist.visible = rope2.visible = site.visible;
      if (site.visible) {
        spin.rotation.y = now / 2500;
        ropeA.set(3.4, GROUND + 4.7, 0); ropeB.set(jibTip - 0.4, h - 1.6 + JY - 0.55, 0);
        rope2.position.copy(ropeA).add(ropeB).multiplyScalar(0.5); rope2.scale.y = ropeA.distanceTo(ropeB);
        rope2.quaternion.setFromUnitVectors(UPV, ropeB.clone().sub(ropeA).normalize());
      }
      // evidenziazione didattica
      const pulse = 0.25 + 0.25 * Math.sin(now / 300);
      const hl = (m, on, c) => m.emissive.setHex(on ? c : 0).multiplyScalar(on ? pulse : 0);
      hl(M.stoneChain, focus === 'chains', 0x88aaff); hl(M.chainSec, focus === 'chains', 0x88aaff);
      hl(M.woodChain, focus === 'chains', 0xffaa44); hl(M.woodSec, focus === 'chains', 0xffaa44);
      hl(M.rib, focus === 'ribs', 0xffcc66); hl(M.brickSec, focus === 'shells', 0xff7733);
      hl(M.wood, focus === 'scaffold', 0xffcc55); hl(M.site, focus === 'scaffold', 0xffcc55); hl(M.lantern, focus === 'lantern', 0xffeeaa);
      renderer.render(scene, camera);
      // etichette
      const W = container.clientWidth, H = container.clientHeight;
      for (const l of labels) {
        if (l.live === 'top') l.v.set(0, Math.max(h, 0), R[3](Math.max(h, 0)) * COS8);
        if (l.live === 'rope') l.v.set(jibTip, h - 1.6 + JY, 0);
        tmp.copy(l.vg && glb && glb.visible ? l.vg : l.v).project(camera);   // il modello glb ha la palla più in alto
        const vis = tmp.z < 1 && (l.minH === undefined || h >= l.minH) && (!l.section || sectionOn) && (l.minYear === undefined || year >= l.minYear);
        l.el.style.opacity = vis ? 1 : 0;
        l.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px,${(-tmp.y * 0.5 + 0.5) * H}px)`;
      }
      requestAnimationFrame(frame);
    }
    setSection(false); setYear(opts.year || 1418);
    requestAnimationFrame(frame);
    function setLight(low) {
      renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.75));
      renderer.shadowMap.enabled = !low; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
      shadowsDirty(); resize();
    }
    shadowsDirty();
    return { scene, camera, setLight, setYear, setSection, setInterior, setWalk, get walking() { return walk; }, hold, setCity, get city() { return cityOn; }, get interior() { return interiorOn; }, view: () => ({ ...goal }), setFocus, setLabels, flyTo, nudge, move, setAutoRotate: v => { autoRotate = v; }, heightAt, get height() { return h; }, YTOP, GROUND, R: y => R.map(f => f(y) * COS8) };
  }
  window.Cupola = {
    create, heightAt,
    geom: { R, YTOP, GROUND, RD: 27.4, COS8, STONE_Y: [0.6, 11, 19.5, 27.5], WOOD_Y: 7.8, mid: (i, y) => R[i](y) * COS8, heightAt }
  };
})();
