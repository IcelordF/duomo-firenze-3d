/* Contenuti condivisi dalle due pagine: tappe, schemi SVG, glossario, quiz.
   Fonti principali: Museo Galileo (brunelleschi.imss.fi.it), Opera di Santa Maria del Fiore. */
(function () {
  const C = window.Cupola.geom;           // misure del modello 3D (per ancorare le etichette)
  const mid = (i, y) => C.mid(i, y);
  const H = C.YTOP;

  // ---------- Schemi SVG (inchiostro su carta) ----------
  const svg = (body, vb = '0 0 320 200') => `<svg viewBox="${vb}" class="dg" role="img">${body}</svg>`;
  // profilo reale della cupola (metà destra), scala 5 px/m
  const prof = (i, sx = 5, x0 = 30, y0 = 186) => {
    const p = [];
    for (let j = 0; j <= 30; j++) { const y = H * j / 30; p.push(`${(x0 + C.mid(i, y) * sx).toFixed(1)},${(y0 - y * sx).toFixed(1)}`); }
    return p;
  };
  const band = (a, b, cls, sx, x0, y0) => `<polygon class="${cls}" points="${[...prof(a, sx, x0, y0), ...prof(b, sx, x0, y0).reverse()].join(' ')}"/>`;
  const bricks = (x, y, w, h, n, cls = 'br') => { let s = ''; for (let i = 0; i < n; i++) s += `<rect class="${cls}" x="${x + i * w}" y="${y}" width="${w - 1.5}" height="${h}" rx="0.8"/>`; return s; };

  const D = {
    centina: svg(`
      <path class="ghost" d="M40 170 Q40 40 160 30 Q280 40 280 170"/>
      <g class="wood">${Array.from({ length: 17 }, (_, i) => `<line x1="${48 + i * 14}" y1="172" x2="${48 + i * 14}" y2="${170 - Math.sin(Math.PI * (i + 0.5) / 17) * 125}"/>`).join('')}
      ${Array.from({ length: 16 }, (_, i) => `<line x1="${48 + i * 14}" y1="${150 - (i % 3) * 30}" x2="${62 + i * 14}" y2="${120 - (i % 3) * 30}"/>`).join('')}</g>
      <rect class="wall" x="22" y="100" width="18" height="76"/><rect class="wall" x="280" y="100" width="18" height="76"/>
      <line class="ground" x1="8" y1="176" x2="312" y2="176"/>
      <g class="no"><line x1="100" y1="60" x2="220" y2="160"/><line x1="220" y1="60" x2="100" y2="160"/></g>
      <text x="160" y="194" class="cap">centina di legno: servirebbe un bosco intero</text>`),
    uovo: svg(`
      <ellipse cx="110" cy="100" rx="34" ry="46" class="egg" transform="rotate(-14 110 100)"/><text x="110" y="170" class="cap">cade…</text>
      <path class="egg" d="M210 150 L250 150 Q264 110 248 78 Q232 52 216 70 Q198 98 210 150 Z"/>
      <line class="ground" x1="40" y1="150" x2="290" y2="150"/><text x="232" y="170" class="cap">…oppure no!</text>
      <text x="160" y="30" class="cap">Batti la punta sul tavolo: l'uovo sta in piedi</text>`),
    calotte: svg(`
      ${band(0, 1, 'sec-in', 4.4, 20, 188)}${band(2, 3, 'sec-out', 4.4, 20, 188)}
      ${Array.from({ length: 9 }, (_, i) => { const y = 4 + i * 3.2, x = 20 + (C.mid(1, y) + 0.3) * 4.4; return `<path class="stair" d="M${x} ${188 - y * 4.4} h4 v-5"/>`; }).join('')}
      <line class="axis" x1="20" y1="10" x2="20" y2="192"/>
      <text x="96" y="70" class="lab">calotta interna</text><text x="96" y="84" class="lab sm">spessa, regge il peso</text>
      <text x="200" y="34" class="lab">calotta esterna</text><text x="200" y="48" class="lab sm">sottile, ripara dalla pioggia</text>
      <path class="lead" d="M150 120 L122 128"/><text x="152" y="118" class="lab sm">intercapedine con le scale</text>
      <text x="22" y="198" class="cap" text-anchor="start">asse della cupola</text>`),
    argano: svg(`
      <line class="ground" x1="10" y1="176" x2="310" y2="176"/>
      <rect class="wood-f" x="128" y="40" width="10" height="136"/>
      <g class="spin" style="transform-origin:133px 60px"><circle cx="133" cy="60" r="26" class="gear"/>${Array.from({ length: 12 }, (_, i) => `<line class="wood" x1="133" y1="60" x2="${133 + Math.cos(i * Math.PI / 6) * 26}" y2="${60 + Math.sin(i * Math.PI / 6) * 26}"/>`).join('')}</g>
      <rect class="drum-r" x="168" y="46" width="54" height="28" rx="4"/>
      <line class="rope" x1="222" y1="50" x2="282" y2="50"/><line class="rope run" x1="282" y1="50" x2="282" y2="8"/>
      <line class="wood" x1="133" y1="150" x2="40" y2="150"/>
      <g class="ox"><ellipse cx="54" cy="142" rx="22" ry="12"/><circle cx="34" cy="134" r="7"/><line x1="40" y1="152" x2="40" y2="174"/><line x1="48" y1="152" x2="48" y2="174"/><line x1="62" y1="152" x2="62" y2="174"/><line x1="70" y1="152" x2="70" y2="174"/></g>
      <path class="arrow" d="M60 112 A70 22 0 0 1 200 112" marker-end="url(#ah)"/>
      <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ahead"/></marker></defs>
      <text x="230" y="102" class="lab">una vite inverte il moto</text><text x="230" y="116" class="lab sm">i buoi non si girano mai</text>
      <text x="160" y="194" class="cap">i buoi girano sempre nello stesso verso</text>`),
    sbalzo: svg(`
      <path class="sec-in" d="M220 192 Q230 110 196 18 L224 14 Q262 110 250 192 Z"/>
      <g class="wood">${[0, 1, 2].map(i => `<line x1="${206 - i * 12}" y1="${150 - i * 48}" x2="${120 - i * 12}" y2="${150 - i * 48}"/><line x1="${150 - i * 12}" y1="${150 - i * 48}" x2="${196 - i * 12}" y2="${178 - i * 48}"/><line x1="${120 - i * 12}" y1="${150 - i * 48}" x2="${120 - i * 12}" y2="${136 - i * 48}"/>`).join('')}</g>
      <g class="man"><circle cx="160" cy="${132 - 48}" r="5"/><line x1="160" y1="${137 - 48}" x2="160" y2="${150 - 48 - 2}"/><line x1="160" y1="${142 - 48}" x2="172" y2="${136 - 48}"/></g>
      <text x="16" y="60" class="lab" text-anchor="start">impalcature "appese"</text><text x="16" y="74" class="lab sm" text-anchor="start">salgono insieme al muro,</text><text x="16" y="88" class="lab sm" text-anchor="start">niente travi da terra</text>
      <text x="160" y="198" class="cap">travi infilate nel muro già costruito</text>`),
    spina: (() => {
      let s = ''; const rows = 8, bw = 30, bh = 11;
      for (let r = 0; r < rows; r++) {
        const y = 168 - r * (bh + 2), shift = (r % 2) * bw / 2;
        s += `<g class="${r === rows - 1 ? 'lay' : ''}">` + bricks(10 - shift, y, bw, bh, 11) + '</g>';
        for (const base of [52, 172]) s += `<rect class="br v" x="${base + r * 9}" y="${y - 1}" width="9" height="${bh + 2}"/>`;
      }
      return svg(`<clipPath id="cp"><rect x="10" y="60" width="300" height="122"/></clipPath><g clip-path="url(#cp)">${s}</g>
        <path class="lead" d="M58 176 L118 70"/><text x="124" y="54" class="lab">mattoni "a coltello"</text><text x="124" y="40" class="lab sm">fanno da fermo agli altri</text>
        <text x="160" y="196" class="cap">le file di mattoni in piedi salgono in diagonale</text>`);
    })(),
    catene: svg(`
      <polygon class="plan" points="${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + Math.PI / 8; return `${160 + Math.cos(a) * 80},${100 + Math.sin(a) * 80}`; }).join(' ')}"/>
      <polygon class="chain" points="${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + Math.PI / 8; return `${160 + Math.cos(a) * 70},${100 + Math.sin(a) * 70}`; }).join(' ')}"/>
      ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line class="push" x1="${160 + Math.cos(a) * 40}" y1="${100 + Math.sin(a) * 40}" x2="${160 + Math.cos(a) * 62}" y2="${100 + Math.sin(a) * 62}" marker-end="url(#ah2)"/>`; }).join('')}
      <defs><marker id="ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ahead2"/></marker></defs>
      <text x="160" y="104" class="lab sm">la cupola spinge</text>
      <text x="160" y="194" class="cap">la catena stringe come il cerchio di una botte</text>`),
    acuto: svg(`
      <line class="ground" x1="40" y1="170" x2="280" y2="170"/>
      <path class="ghost" d="M60 170 A100 100 0 0 1 260 170"/>
      <path class="arc" d="M60 170 A160 160 0 0 1 160 ${170 - Math.sqrt(160 * 160 - 60 * 60)} A160 160 0 0 1 260 170"/>
      <circle class="pt" cx="100" cy="170" r="3"/><circle class="pt" cx="220" cy="170" r="3"/>
      <line class="dash" x1="220" y1="170" x2="160" y2="${170 - Math.sqrt(160 * 160 - 60 * 60)}"/>
      <text x="218" y="110" class="lab sm">raggio = 4/5 del diametro</text>
      <text x="160" y="190" class="cap">"quinto acuto": più slanciato di una mezza sfera</text>`),
    lanterna: svg(`
      <path class="tile" d="M40 196 Q90 90 140 70 L180 70 Q230 90 280 196 Z"/>
      <rect class="marble" x="136" y="20" width="48" height="50"/><polygon class="marble" points="130,20 190,20 160,-4"/>
      <line class="wood" x1="160" y1="-4" x2="160" y2="-10"/><line class="wood" x1="150" y1="-8" x2="250" y2="-8"/>
      <g class="lift"><line class="rope" x1="244" y1="-8" x2="244" y2="40"/><rect class="marble" x="236" y="40" width="16" height="12"/></g>
      <text x="40" y="40" class="lab" text-anchor="start">una gru girevole</text><text x="40" y="54" class="lab sm" text-anchor="start">porta i blocchi di marmo</text>`, '0 -10 320 210'),
    palla: svg(`
      <polygon class="marble" points="120,196 200,196 160,90"/>
      <line class="wood" x1="160" y1="90" x2="160" y2="8"/><line class="wood" x1="150" y1="12" x2="250" y2="12"/>
      <g class="lift"><line class="rope" x1="236" y1="12" x2="236" y2="40"/><circle class="gold" cx="236" cy="56" r="16"/></g>
      <text x="60" y="60" class="lab">palla di rame</text><text x="60" y="74" class="lab sm">dorata, bottega</text><text x="60" y="88" class="lab sm">del Verrocchio</text>`)
  };

  // ---------- Tappe ----------
  const CAM = {
    city: { theta: 1.25, phi: 1.2, dist: 250, tx: 0, ty: -8, tz: 0 },
    near: { theta: 1.05, phi: 1.2, dist: 165, tx: 0, ty: 0, tz: 0 },
    sect: { theta: Math.PI / 2, phi: 1.36, dist: 82, tx: 0, ty: 9, tz: 0 },
    sectR: { theta: Math.PI / 2 - 0.12, phi: 1.38, dist: 64, tx: 16, ty: 10, tz: 0 },
    top: { theta: 1.15, phi: 0.78, dist: 95, tx: 0, ty: 12, tz: 0 },
    lant: { theta: 1.3, phi: 1.3, dist: 105, tx: 0, ty: 40, tz: 0 },
    inside: { theta: Math.PI, phi: 2.08, dist: 40, tx: 6, ty: 9, tz: 0 }   // dalla navata verso l'abside, dentro la cupola tagliata, guardando in su
  };
  const STAGES = [
    { id: 'problema', v2: 'whole', l2: [{ text: 'tamburo (già costruito)', at: [-C.mid(0, 0) - 2.3, -11], dx: -40, dy: -70 }, { text: 'il vuoto da coprire', at: [0, 2], dx: -60, dy: -70 }, { text: 'tribuna', at: [-38, -40], dx: -30, dy: -50 }], year: 1418, date: '1418', title: 'Un buco di 45 metri', cam: CAM.city, section: false, dg: 'centina',
      text: 'La cattedrale di Firenze è quasi finita, ma sopra l\'altare c\'è un enorme buco a forma di ottagono. Il tamburo, cioè la base della cupola, è già pronto. Nessuno però sa come coprirlo.',
      more: ['Di solito una volta si costruiva su una <b>centina</b>: un\'armatura di legno che regge le pietre finché la malta non fa presa. Per un buco largo circa 45 metri, a più di 50 metri da terra, sarebbe servito un bosco intero di travi.', 'Dai tempi del Pantheon di Roma nessuno aveva mai costruito una cupola così grande.'],
      fact: 'La forma della cupola era stata decisa già nel 1367: ottagonale, appuntita e senza archi di sostegno all\'esterno. Mancava solo il "come".',
      labels: [{ text: 'tamburo', pos: [0, -5, 26.5] }, { text: 'il buco: circa 45 m', pos: [0, 0, 0] }] },
    { id: 'concorso', v2: 'whole', l2: [{ text: 'la cupola progettata nel 1367', at: [-C.mid(3, 20), 20], dx: -40, dy: -50 }], year: 1419, date: '1418–1420', title: 'Il concorso', cam: CAM.near, section: false, dg: 'uovo',
      text: 'Nel 1418 l\'Opera del Duomo indice un concorso. Filippo Brunelleschi, orafo e architetto, propone l\'idea più audace: costruire la cupola senza centina.',
      more: ['Presenta un modello in mattoni, costruito anche con l\'aiuto degli scultori Donatello e Nanni di Banco.', 'Nel 1420 viene nominato responsabile dei lavori insieme a Lorenzo Ghiberti, il suo vecchio rivale nel concorso per le porte del Battistero.'],
      fact: 'Secondo il pittore Giorgio Vasari (ma forse è una leggenda), Brunelleschi sfidò i rivali a far stare in piedi un uovo. Nessuno ci riuscì. Lui lo batté leggermente sul tavolo e l\'uovo restò dritto. "Così farò la cupola", avrebbe detto.',
      labels: [] },
    { id: 'calotte', v2: 'shells', l2: [{ text: 'calotta interna', at: [-C.mid(0, 2) - 1.1, 2], dx: 110, dy: 50 }, { text: 'intercapedine', at: [-C.mid(1, 3.5) - 0.6, 3.5], dx: 110, dy: -70 }, { text: 'calotta esterna', at: [-C.mid(3, 1) + 0.35, 1], dx: 140, dy: -150 }], year: 1424, date: '1420–1424', title: 'Due cupole in una', cam: CAM.sect, section: true, focus: 'shells', dg: 'calotte',
      text: 'Il 7 agosto 1420 cominciano i lavori. L\'idea di Brunelleschi: due cupole, una dentro l\'altra.',
      more: ['La <b>calotta interna</b> è spessa più di 2 metri e regge il peso. Quella <b>esterna</b> è più sottile: protegge dalla pioggia e fa sembrare la cupola ancora più grande.', 'In mezzo c\'è uno spazio vuoto, l\'<b>intercapedine</b>, con le scale per salire. Le due calotte sono unite da 24 costoloni: 8 sugli spigoli e 16 nascosti dentro.'],
      fact: 'Ancora oggi si sale in cima passando tra le due calotte: sono 463 gradini.',
      labels: [{ text: 'calotta interna', pos: [-mid(0, 5) - 1.1, 5, 0] }, { text: 'calotta esterna', pos: [mid(3, 6) - 0.4, 6, 0], lh: 80 }, { text: 'intercapedine', pos: [mid(1, 2) + 0.6, 2, 0] }] },
    { id: 'macchine', v2: 'hoist', f2: 'hoist', l2: [{ text: 'bue-argano', at: [0, C.GROUND + 6.2], dx: 60, dy: -50 }, { text: 'ingranaggi', at: [-1.6, C.GROUND + 4.6], dx: -70, dy: -60 }, { text: 'buoi', at: [-3, C.GROUND + 1.2], dx: -60, dy: 30 }], year: 1426, date: 'dal 1421', title: 'Le macchine', cam: { theta: Math.PI / 2 - 0.25, phi: 1.25, dist: 150, tx: 0, ty: -22, tz: 0 }, section: true, dg: 'argano',
      text: 'Come portare a 50 metri d\'altezza milioni di mattoni e grossi blocchi di pietra? Brunelleschi inventa nuove macchine.',
      more: ['Il <b>bue-argano</b> sta sul pavimento della chiesa. Dei buoi girano in tondo e fanno ruotare un albero di legno. Ingranaggi e un grande tamburo avvolgono la fune che solleva i carichi.', 'Il trucco geniale: girando una grande vite si alza o si abbassa l\'albero, che così aggancia una ruota o l\'altra. La fune cambia verso e il carico sale o scende, ma i buoi non devono mai girarsi. Il tamburo aveva tre diametri, cioè tre velocità.'],
      fact: 'Anni dopo, nella bottega di Verrocchio, un giovane apprendista disegnò queste macchine: si chiamava Leonardo da Vinci.',
      labels: [{ text: 'bue-argano', pos: [0, C.GROUND + 6.6, 0], minH: 0.5 }, { text: 'gru a braccio', pos: [0, 0, 0], live: 'rope', minH: 1 }] },
    { id: 'sbalzo', v2: 'work', l2: [{ text: 'ponteggio a sbalzo', at: h => [-(C.mid(0, h - 1.6) - 1.4), h - 1.6], dx: 80, dy: 70 }, { text: 'gru a braccio', at: h => [-(C.mid(0, h - 1.6) - 1.6), h + 3], dx: 80, dy: -40 }], year: 1428, date: '1420–1436', title: 'Senza centina', cam: CAM.top, section: false, focus: 'scaffold', dg: 'sbalzo',
      text: 'Al posto della centina, Brunelleschi usa impalcature agganciate alla muratura stessa. Sono ponti "a sbalzo" che salgono insieme alla cupola.',
      more: ['Gli operai lavorano su queste piattaforme di legno, all\'interno, a più di 50 metri dal suolo. Brunelleschi fa montare dei parapetti per la loro sicurezza.', 'La cupola cresce un anello alla volta. Ogni anello deve reggersi da solo, perché sotto non c\'è niente.'],
      fact: 'Si racconta che per non perdere tempo gli operai pranzassero lassù, senza scendere a terra.',
      labels: [{ text: 'ponteggio a sbalzo', pos: [0, 13.2, -(mid(0, 13) - 1.4)], minH: 2 }] },
    { id: 'spina', v2: 'work', l2: [{ text: 'mattoni a coltello', at: h => [-(C.mid(0, h - 3) + 0.9), h - 3], dx: 120, dy: 30 }, { text: 'corsi inclinati verso il centro', at: h => [-(C.mid(2, h - 6) + 0.3), h - 6], dx: 140, dy: 80 }], year: 1430, date: '1426–1436', title: 'La spina di pesce', cam: { ...CAM.top, phi: 0.95, dist: 70, ty: 18 }, section: false, dg: 'spina',
      text: 'Più la cupola sale, più le pareti si piegano verso l\'interno. Come fanno i mattoni a non scivolare giù mentre la malta è ancora fresca?',
      more: ['Ogni tanto, tra i mattoni stesi, Brunelleschi ne mette uno <b>in piedi</b> ("a coltello"). Questi mattoni verticali formano linee diagonali che girano intorno alla cupola.', 'Ogni nuovo anello resta incastrato tra i mattoni in piedi e non può scivolare: la cupola si regge da sola mentre cresce.'],
      fact: 'Si pensa che anche le file di mattoni non fossero dritte, ma leggermente incurvate ("corda blanda"). Gli studiosi ne discutono ancora.',
      labels: [{ text: 'anello appena posato', pos: [0, 0, 0], live: 'top' }] },
    { id: 'catene', v2: 'shells', l2: [{ text: 'catena di legno', at: [-C.mid(1, 7.8) - 0.38, 8.0], dx: 120, dy: -40 }, { text: 'catena di pietra', at: [-C.mid(1, 11) + 0.1, 11.3], dx: 120, dy: -50 }, { text: 'catena di pietra (base)', at: [-C.mid(1, 0.6) + 0.1, 0.9], dx: 120, dy: 40 }], year: 1433, date: '1420–1435', title: 'Le catene', cam: CAM.sect, section: true, focus: 'chains', dg: 'catene',
      text: 'Una cupola spinge verso l\'esterno, come se volesse aprirsi. Per tenerla stretta, Brunelleschi la "lega" con delle catene nascoste nella muratura.',
      more: ['Ci sono <b>catene di pietra</b>: blocchi di arenaria uniti da grappe di ferro, che girano tutto intorno nella calotta interna. Quante siano (3 o 4) gli studiosi non sono concordi.', 'Nel 1423-24 si posa anche una <b>catena di legno</b>: 24 travi di castagno con giunti di quercia e staffe di ferro, a circa 8 metri dalla base. Funzionano come i cerchi di ferro di una botte.'],
      fact: 'Nel modello, le catene di pietra sono azzurre e quella di legno è arancione. Le altezze sono indicative.',
      labels: [{ text: 'catena di legno', pos: [mid(1, 8) + 0.4, 8.1, 0] }, { text: 'catena di pietra', pos: [-mid(1, 11), 11.3, 0] }, { text: 'catena di pietra', pos: [-mid(1, 19.5), 19.8, 0], minH: 20, lh: 90 }] },
    { id: 'chiusura', v2: 'dome', f2: 'geometry', l2: [{ text: 'centro dell\'arco', at: [-13.65 * C.COS8, 0], dx: -40, dy: 60 }, { text: 'anello di chiusura', at: [4, H + 0.5], dx: 50, dy: -40 }], year: 1440, date: '1436', title: 'La cupola è chiusa', cam: CAM.near, section: false, dg: 'acuto',
      text: 'Nel 1436, dopo 16 anni, la cupola è finita. Il 25 marzo il papa Eugenio IV consacra la cattedrale e il 30 agosto viene chiuso l\'anello in cima.',
      more: ['La curva di ogni spigolo è un arco con raggio pari a 4/5 del diametro: si chiama "quinto acuto". Così la cupola è più slanciata e spinge meno verso l\'esterno di una mezza sfera.', 'All\'esterno la cupola viene coperta di tegole in cotto. Gli 8 spigoli sono segnati da costoloni di marmo bianco.'],
      fact: 'Ancora oggi è la più grande cupola in muratura mai costruita.',
      labels: [{ text: 'costolone di marmo', pos: [C.mid(3, 14) / Math.cos(Math.PI / 8) * Math.cos(Math.PI * 3 / 8), 14, C.mid(3, 14) / Math.cos(Math.PI / 8) * Math.sin(Math.PI * 3 / 8)] }, { text: 'tegole in cotto', pos: [0, 10, mid(3, 10)] }] },
    { id: 'lanterna', v2: 'lantern', l2: [{ text: 'voluta', at: [4.75, H + 3.6], dx: 60, dy: 20 }, { text: 'gru girevole', at: [0, H + 26], dx: -60, dy: -30 }], year: 1456, date: '1446–1461', title: 'La lanterna', cam: CAM.lant, section: false, focus: 'lantern', dg: 'lanterna',
      text: 'In cima serve un "tappo" pesante che chiuda e tenga ferma la cupola: la lanterna di marmo, da cui entra la luce.',
      more: ['Brunelleschi vince anche questo concorso, ma nell\'aprile del 1446 muore. Viene sepolto nella cattedrale: un grande onore.', 'Altri capomastri, tra cui Michelozzo e Antonio Manetti Ciaccheri, portano avanti il suo progetto: la lanterna è finita nel 1461. Per sollevare i blocchi di marmo si usa una gru girevole montata in cima, al centro.'],
      fact: 'La lanterna è alta circa 21 metri, più o meno come un palazzo di 7 piani. Con la palla e la croce si arriva a circa 116 metri da terra.',
      labels: [{ text: 'lanterna', pos: [0, H + 6, 4], minYear: 1446 }, { text: 'gru', pos: [6.8, H + 24, 0], minYear: 1446 }] },
    { id: 'palla', v2: 'lantern', l2: [{ text: 'palla di rame dorato', at: [1.2, H + 23.7], dx: 60, dy: -20 }, { text: 'cuspide', at: [1.5, H + 18], dx: 60, dy: 20 }], year: 1471, date: '1471', title: 'La palla d\'oro', cam: { ...CAM.lant, dist: 135, ty: 35 }, section: false, dg: 'palla',
      text: 'Nel maggio 1471 viene issata in cima la palla di rame dorato con la croce, opera della bottega di Andrea del Verrocchio. Il cantiere è finito.',
      more: ['Per sollevarla si usano ancora le macchine di Brunelleschi, a 25 anni dalla sua morte.', 'Dalla base alla croce la cattedrale è alta circa 116 metri e domina ancora oggi il panorama di Firenze.'],
      fact: 'Il 27 gennaio 1601 un fulmine fece cadere la palla. Fu rimessa al suo posto il 21 ottobre 1602.',
      labels: [{ text: 'palla del Verrocchio', pos: [0, H + 23.7, 0], posGlb: [0, H + 27.1, 0], ring: true, minYear: 1471 }] }   // anello vuoto attorno alla palla: non la copre
  ];

  const NUMBERS = [
    ['≈ 116 m', 'altezza fino alla croce'], ['≈ 45 m', 'larghezza interna tra gli spigoli (42 m tra i lati)'], ['≈ 55 m', 'quota da cui parte la cupola'],
    ['16 anni', 'per costruire la cupola (1420–1436)'], ['> 4 milioni', 'di mattoni'], ['25.000–37.000 t', 'peso stimato (le stime variano)'], ['463', 'gradini per salire in cima']
  ];

  const GLOSSARY = [
    ['Tamburo', 'Il muro a forma di ottagono su cui poggia la cupola. È decorato con grandi finestre rotonde, gli "occhi".'],
    ['Centina', 'Armatura provvisoria di legno che regge un arco o una volta durante la costruzione.'],
    ['Calotta', 'Il guscio della cupola. A Firenze ce ne sono due: una interna e una esterna.'],
    ['Intercapedine', 'Lo spazio vuoto tra le due calotte, dove passano le scale.'],
    ['Vela', 'Ognuna delle 8 facce curve della cupola.'],
    ['Costolone', 'Nervatura che sale dal basso fino in cima. Ce ne sono 24: 8 sugli spigoli (bianchi, visibili da fuori) e 16 nascosti tra le due calotte.'],
    ['Spina di pesce', 'Modo di posare i mattoni mettendone alcuni in piedi, in diagonale, per bloccare quelli stesi.'],
    ['Catena', 'Anello di pietra, legno o ferro che stringe la cupola e le impedisce di allargarsi.'],
    ['Argano', 'Macchina per sollevare pesi avvolgendo una fune attorno a un cilindro.'],
    ['Braccio fiorentino', 'Unità di misura dell\'epoca: circa 58 cm.'],
    ['Quinto acuto', 'Arco appuntito il cui raggio è 4/5 del diametro della cupola.'],
    ['Lanterna', 'La piccola torre di marmo in cima alla cupola, da cui entra la luce.'],
    ['Opera del Duomo', 'L\'ente che dal Medioevo si occupa di costruire e curare la cattedrale.']
  ];

  const QUIZ = [
    { q: 'Perché Brunelleschi non usò la centina?', a: ['Sarebbe servito troppo legno', 'Era vietata dalla legge', 'Il legno costava meno della pietra'], ok: 0 },
    { q: 'Quante cupole ci sono, una dentro l\'altra?', a: ['Una', 'Due', 'Tre'], ok: 1 },
    { q: 'A cosa servono i mattoni messi in piedi, a spina di pesce?', a: ['Sono solo decorazione', 'Fanno passare l\'aria', 'Impediscono ai mattoni di scivolare'], ok: 2 },
    { q: 'Chi faceva girare il grande argano?', a: ['Una ruota ad acqua', 'Dei buoi', 'Il vento'], ok: 1 },
    { q: 'Quanti anni ci vollero per costruire la cupola, lanterna esclusa?', a: ['16', '5', '60'], ok: 0 },
    { q: 'Di chi era la bottega che realizzò la palla d\'oro in cima?', a: ['Michelangelo', 'Verrocchio', 'Giotto'], ok: 1 },
    { q: 'Chi finì di dipingere il Giudizio universale nella cupola?', a: ['Giorgio Vasari', 'Federico Zuccari', 'Michelangelo'], ok: 1 }
  ];

  // ---------- Storie e curiosità (racconto) ----------
  // Gli aneddoti che vengono da Vasari o da Manetti sono introdotti con "si racconta".
  const CURIOSITA = [
    { id: 'c-grasso', year: 1418, date: '1409', title: 'Lo scherzo al Grasso', cam: CAM.near,
      text: ['Brunelleschi amava gli scherzi. Una sera, con un gruppo di amici, organizzò una burla a un falegname soprannominato "il Grasso".', 'Tutti, dal vicino di casa al fornaio, fecero finta che lui fosse un\'altra persona, un certo Matteo. Alla fine il povero falegname si convinse davvero di essere diventato qualcun altro!', 'Si racconta che, per la vergogna, se ne andò a lavorare in Ungheria. La storia fu scritta da Antonio Manetti, il primo biografo di Brunelleschi.'] },
    { id: 'c-roma', year: 1418, date: 'dopo il 1401', title: 'Cacciatori di tesori a Roma', cam: CAM.city,
      text: ['Nel 1401 Brunelleschi perse il concorso per le porte del Battistero: vinse Lorenzo Ghiberti.', 'Deluso, partì per Roma con l\'amico scultore Donatello. Per anni misurarono e disegnarono le rovine antiche, scavando tra i ruderi.', 'Si racconta che i romani li chiamassero "quelli del tesoro", convinti che cercassero oro sepolto. In realtà cercavano i segreti degli architetti antichi.'] },
    { id: 'c-malato', year: 1423, date: 'anni Venti del Quattrocento', title: 'Il malato immaginario', cam: CAM.top,
      text: ['Brunelleschi non sopportava di dividere il comando del cantiere con Ghiberti, che secondo lui ne sapeva poco.', 'Si racconta (lo scrive Vasari) che un giorno si mise a letto fingendosi malato. I muratori chiedevano a Ghiberti che cosa fare, ma lui non sapeva rispondere e i lavori si fermarono.', 'Così tutti capirono chi era davvero indispensabile.'] },
    { id: 'c-badalone', year: 1428, date: '1421–1428', title: 'Il Badalone, la barca mostro', cam: CAM.city,
      text: ['Per portare il marmo da Pisa a Firenze lungo l\'Arno, Brunelleschi progettò una grande barca, chiamata "il Badalone".', 'Nel 1421 la Repubblica di Firenze gli concesse il diritto esclusivo di usarla: è considerato uno dei primi brevetti della storia.', 'Ma nel 1428 la barca non arrivò mai a Firenze: si fermò dalle parti di Empoli e il suo carico di marmo andò perduto nell\'Arno.'] },
    { id: 'c-sciopero', year: 1430, date: 'durante i lavori', title: 'Lo sciopero dei muratori', cam: CAM.top,
      text: ['Lavorare sulla cupola era faticoso e pericoloso. Si racconta che un giorno i muratori incrociarono le braccia per chiedere paghe più alte.', 'Brunelleschi non si scompose: li licenziò e chiamò al loro posto muratori lombardi, insegnando loro il mestiere.', 'Pochi giorni dopo i fiorentini tornarono a chiedere il lavoro… accettando una paga più bassa di prima.'] },
    { id: 'c-arresto', year: 1434, date: 'agosto 1434', title: 'Brunelleschi in prigione!', cam: CAM.near,
      text: ['Nell\'agosto del 1434, mentre la cupola era quasi finita, Brunelleschi fu arrestato e messo in carcere dalla corporazione dei maestri di pietra e legname, forse perché non aveva pagato la quota.', 'L\'Opera del Duomo si arrabbiò moltissimo: giudicò l\'arresto ingiusto e fece arrestare a sua volta il console della corporazione!', 'Pochi giorni dopo Filippo era di nuovo libero e tornò al cantiere.'] },
    { id: 'c-sonetti', year: 1426, date: 'intorno al 1425', title: 'Litigi in rima', cam: CAM.sect,
      text: ['Non tutti credevano nella cupola. Giovanni di Gherardo da Prato, un esperto che lavorava al cantiere, scrisse un sonetto per prendere in giro Brunelleschi e disegnò una pergamena con tutti i "difetti" del progetto.', 'Brunelleschi gli rispose… con un altro sonetto, altrettanto pungente.', 'Alla fine fu la cupola, ancora in piedi dopo seicento anni, a dare ragione a Filippo.'] },
    { id: 'c-tomba', year: 1471, date: '1446 e 1972', title: 'La tomba ritrovata', cam: CAM.near,
      text: ['Quando Brunelleschi morì, nel 1446, ricevette un onore rarissimo: essere sepolto dentro la cattedrale.', 'Col passare dei secoli però nessuno sapeva più dove fosse la sua tomba.', 'Fu ritrovata solo nel 1972, durante gli scavi sotto il pavimento del Duomo, dove si trovano i resti dell\'antica chiesa di Santa Reparata.'] }
  ];

  // ---------- La storia degli affreschi (racconto) ----------
  // Fonti: Opera di Santa Maria del Fiore (schede Giudizio universale, Zuccari, vetrate), Treccani (Zuccari).
  // Le scene si mostrano con l'interno di oggi (interior: true).
  CURIOSITA.push({ id: 'c-ponteggio', year: 1437, date: 'fine Seicento', title: 'Il ponteggio immaginato', cam: CAM.sect, v2: 'dome', scaffold2d: true,
    text: ['Nello spaccato vedi una grande impalcatura di travi dentro la cupola: è la ricostruzione di un disegno attribuito a Giovan Battista Nelli, della fine del Seicento, oggi agli Uffizi.',
      'Mostra come si immaginava il ponteggio di Brunelleschi circa 250 anni dopo: una piramide di travi poggiata all\'imposta, un albero centrale, piani di tavole sospesi verso le vele.',
      'Non sappiamo se fosse davvero così. Sappiamo però che Brunelleschi pensò anche al futuro: lasciò nella cupola i punti d\'appoggio per montare ponti, se un giorno si fosse voluto decorarla.'] });
  const AFFRESCHI = [
    { id: 'a-vasari', date: '1436–1574', title: 'Una cupola bianca, poi Vasari', cam: CAM.inside,
      text: ['Finita la cupola, per circa 130 anni il suo interno restò bianco: solo intonaco. Si racconta che Brunelleschi pensasse a un mosaico d\'oro come quello del Battistero, ma non ci sono documenti che lo provino.',
        'Nel 1572 il granduca Cosimo I de\' Medici affida l\'impresa al suo pittore di corte, Giorgio Vasari. Cosa dipingere lo decide un monaco molto colto, Vincenzo Borghini: un enorme Giudizio universale, la fine del mondo.',
        'Vasari comincia dall\'alto, vicino all\'occhio della lanterna, a circa 90 metri da terra. Dipinge a buon fresco: stende i colori sull\'intonaco ancora bagnato, che asciugando li fissa nel muro.',
        'Fa la finta architettura in cima, i 24 Vegliardi dell\'Apocalisse e comincia gli angeli. Il 27 giugno 1574 muore, due mesi dopo Cosimo: ha dipinto circa un terzo della cupola.'] },
    { id: 'a-zuccari', date: '1575–1579', title: 'Zuccari e la fine del mondo', cam: { ...CAM.inside, phi: 2.05, ty: 10 },
      text: ['Il nuovo granduca, Francesco I, chiama nel 1575 Federico Zuccari, un pittore di Urbino cresciuto a Roma. I lavori ripartono il 30 agosto 1576.',
        'Zuccari cambia tecnica: dipinge «a secco», a tempera sull\'intonaco già asciutto. È più veloce, ma resiste meno: con il tempo molti colori si sono sbiaditi.',
        'Il 19 agosto 1579 la pittura viene scoperta: circa 3.600 metri quadrati e più di 700 figure. Dall\'alto in basso si vedono i Vegliardi, gli angeli con gli strumenti della Passione, i santi, le Virtù e, in fondo, l\'Inferno con i sette peccati capitali.',
        'Cristo giudice è sulla vela est, sopra l\'altare: lo vede chi entra dalla navata. Sopra la navata, invece, c\'è il grande Lucifero. E proprio sopra Lucifero Zuccari ha dipinto sé stesso, con i suoi familiari e amici come Vasari, Borghini e lo scultore Giambologna.',
        'In basso, sotto Cristo, c\'è un\'idea bellissima: il Tempo con la clessidra rotta e la Morte che spezza la sua falce. Alla fine del mondo anche il tempo finisce.'] },
    { id: 'a-oggi', date: '1579 – oggi', title: 'Prese in giro, un fulmine e il restauro', cam: { theta: Math.PI, phi: 1.15, dist: 40, tx: 6, ty: -36, tz: 0 },   // giù: tamburo con gli occhi, coro, pavimento
      text: ['Appena scoperta, la pittura fu presa in giro con sonetti e madrigali. Il poeta Anton Francesco Grazzini, detto il Lasca, propose addirittura di imbiancare tutto. Per fortuna nessuno gli diede retta.',
        'Nel tamburo, sotto la pittura, ci sono otto grandi occhi larghi quasi 5 metri. Le loro vetrate colorate, fatte tra il 1434 e il 1445, furono disegnate da Donatello, Lorenzo Ghiberti, Paolo Uccello e Andrea del Castagno. Nel 1828 un fulmine distrusse quella sopra la navata, che non fu mai rifatta.',
        'Tra il 1980 e il 1995 un grande restauro ha pulito e consolidato tutta la pittura. Da vicino si è visto che la parte di Vasari, a buon fresco, era quasi intatta, mentre quella a secco di Zuccari era sbiadita e in parte staccata.',
        'Sotto la cupola c\'è il coro ottagonale di marmo di Baccio Bandinelli: oggi è un recinto basso, perché la sua parte alta fu smontata nel 1842.'] }
  ];
  GLOSSARY.push(['Buon fresco', 'Pittura sull\'intonaco ancora bagnato: asciugando, il colore resta fissato nel muro. Così dipinse Vasari.'],
    ['A secco', 'Pittura sull\'intonaco già asciutto: è più rapida ma meno resistente. Così dipinse Zuccari.']);

  // ---------- La basilica (seconda parte della guida) ----------
  // Fatti verificati da Fable (Opera del Duomo, Wikipedia IT/EN, Treccani); quelli da una sola fonte sono detti con prudenza.
  // Coordinate: facciata a x = −122 (ovest), campanile a (−112, 33), Battistero a (−168, 0), navata sinistra (nord) a z < 0.
  const G0 = C.GROUND;
  const BASILICA = [
    { id: 'b-reparata', date: '1296', title: 'Prima del Duomo: Santa Reparata', cam: { theta: Math.PI + 0.7, phi: 1.0, dist: 230, tx: -70, ty: G0 + 15, tz: 0 },
      text: ['Dove oggi c\'è il Duomo, prima c\'era una chiesa più piccola e antica: Santa Reparata, la vecchia cattedrale di Firenze.',
        'L\'8 settembre 1296 viene posata la prima pietra della nuova cattedrale, progettata da Arnolfo di Cambio. La chiesa vecchia resta in piedi e viene demolita a poco a poco, mentre quella nuova le cresce intorno.',
        'Con gli scavi del 1965-1974, sotto il pavimento sono ricomparsi i resti di Santa Reparata e, ancora più in basso, resti di epoca romana.',
        'Là sotto c\'è anche la tomba di Brunelleschi: una lastra semplice, per l\'uomo che aveva costruito la cupola.'],
      fact: 'Gli scavi di Santa Reparata si possono visitare: si scende sotto il pavimento della navata.' },
    { id: 'b-cantiere', date: '1296–1436', title: 'Un cantiere lungo 140 anni', cam: { theta: Math.PI / 2 + 0.5, phi: 0.95, dist: 320, tx: -45, ty: G0 + 20, tz: 0 },
      text: ['Dopo Arnolfo, il cantiere passa a Giotto, che si occupa soprattutto del campanile, poi ad Andrea Pisano e a Francesco Talenti, che ingrandisce il progetto.',
        'Le navate vengono coperte verso il 1378-1380. Poi tocca al tamburo e, dal 1420, alla cupola di Brunelleschi.',
        'Il 25 marzo 1436 papa Eugenio IV consacra la cattedrale.',
        'All\'interno è lunga circa 153 metri e larga 38: è una delle chiese più grandi d\'Europa.'],
      fact: 'Le tre tribune attorno alla cupola fanno sembrare la pianta un grande fiore.' },
    { id: 'b-campanile', date: '1334–1359', title: 'Il Campanile di Giotto', cam: { theta: Math.PI - 0.6, phi: 1.32, dist: 150, tx: -95.4, ty: G0 + 38, tz: 33 },
      labels: [{ text: 'trifora', pos: [-102.8, G0 + 65, 33] }, { text: 'nicchie con statue', pos: [-102.8, G0 + 19, 33] }, { text: 'terrazza', pos: [-95.4, G0 + 84, 33] }],
      text: ['È alto 84,7 metri, ha la pianta quadrata di circa 15 metri di lato e pilastri ottagonali agli angoli.',
        'Giotto lo comincia nel 1334 ma muore nel 1337: fa in tempo a costruire solo la base. Andrea Pisano continua con il piano delle nicchie, e Francesco Talenti lo finisce nel 1359.',
        'Leggilo dal basso: formelle a esagoni e a losanghe, nicchie con statue, due piani di bifore, la cella delle campane con la grande trifora e, in cima, la terrazza.',
        'Per salire fino alla terrazza ci sono 414 gradini.'],
      fact: 'Doveva finire con una punta altissima e arrivare a circa 120 metri, ma la cuspide non fu mai costruita.' },
    { id: 'b-battistero', date: 'XI–XII secolo', title: 'Il Battistero di San Giovanni', cam: { theta: Math.PI / 2 + 0.65, phi: 1.22, dist: 95, tx: -148, ty: G0 + 14, tz: 0 },
      labels: [{ text: 'scarsella', pos: [-165, G0 + 12, 0] }, { text: 'lanterna', pos: [-148, G0 + 39, 0] }],
      text: ['È più antico del Duomo: un ottagono largo circa 25 metri, rivestito di marmo bianco e verde, con il tetto a piramide e la lanterna, terminata verso il 1150.',
        'Sul lato ovest ha una cappella rettangolare, la scarsella.',
        'Qui venivano battezzati tutti i bambini fiorentini, Dante compreso.',
        'Nel Medioevo i fiorentini erano convinti che fosse un antico tempio romano dedicato a Marte.'],
      fact: 'Dante lo ricorda nella Divina Commedia come «il mio bel San Giovanni».' },
    { id: 'b-paradiso', date: '1330–1452', title: 'Le porte del Battistero', cam: { theta: 0.12, phi: 1.5, dist: 22, tx: -133.5, ty: G0 + 4.5, tz: 0 },   // da est, davanti alla porta (fuori dalla scalinata)
      labels: [{ text: 'Porta del Paradiso', pos: [-133.4, G0 + 6.9, 0] }],
      text: ['Il Battistero ha tre porte di bronzo. A sud c\'è quella di Andrea Pisano, del 1330-1336.',
        'Nel 1401 si fa un concorso per una nuova porta: vince Lorenzo Ghiberti, che la realizza dal 1403 al 1424. Tra gli sconfitti c\'è proprio Brunelleschi.',
        'Poi Ghiberti fa la porta rivolta verso il Duomo, dal 1425 al 1452: dieci grandi riquadri dorati con storie dell\'Antico Testamento.',
        'Si racconta che Michelangelo la trovasse così bella da chiamarla «Porta del Paradiso». Oggi sul Battistero ci sono copie: gli originali sono al Museo dell\'Opera del Duomo.'],
      fact: 'Fino al 1452 verso il Duomo c\'era la prima porta di Ghiberti: fu spostata a nord per fare posto alla Porta del Paradiso.' },
    { id: 'b-facciata', date: '1296 · 1587 · 1887', title: 'La facciata perduta e quella nuova', cam: { theta: Math.PI - 0.5, phi: 1.22, dist: 82, tx: -102.4, ty: G0 + 24, tz: 0 },
      labels: [{ text: 'rosone', pos: [-102.8, G0 + 33, 0] }, { text: 'Madonna in trono', pos: [-102.8, G0 + 22, 0] }],
      text: ['La facciata di Arnolfo non fu mai finita: arrivava poco sopra i portali, con marmi colorati, mosaici e molte statue. Più in alto c\'era il muro grezzo.',
        'Nel 1587 il granduca Francesco I la fa demolire per sostituirla con una più moderna, che però non arriva. Per quasi 300 anni il Duomo resta con una facciata provvisoria, a volte soltanto dipinta.',
        'Nell\'Ottocento si fanno tre concorsi e vince Emilio De Fabris. I lavori cominciano nel 1876 e la nuova facciata viene inaugurata il 12 maggio 1887.',
        'Al centro, sotto il grande rosone, c\'è la Madonna in trono con il Bambino, in mezzo alla galleria degli apostoli.'],
      fact: 'Com\'era la facciata di Arnolfo lo sappiamo anche da un disegno di Bernardino Poccetti, fatto poco prima della demolizione.' },
    { id: 'b-portali', date: '1899–1903', title: 'Le porte di bronzo della facciata', cam: { theta: Math.PI - 0.15, phi: 1.48, dist: 22, tx: -102.4, ty: G0 + 6, tz: 0 },
      text: ['Le porte della facciata sono le più recenti della cattedrale: furono realizzate tra il 1899 e il 1903.',
        'Raccontano le storie della vita di Maria, a cui la cattedrale è dedicata.',
        'Quella centrale e quella di sinistra sono di Augusto Passaglia, quella di destra di Giuseppe Cassioli.',
        'Guardale da vicino: riquadri con scene, piccole figure di santi dentro nicchie gotiche, cornici fitte di decorazioni.'],
      fact: 'Si racconta che Cassioli abbia nascosto il proprio ritratto in una delle formelle della sua porta.' },
    { id: 'b-navate', date: '1296–1380', title: 'Dentro: le navate', cam: { theta: Math.PI, phi: 1.42, dist: 44, tx: -58, ty: G0 + 10, tz: 0 },   // da dentro, appena oltre la porta: l'interno si accende da solo
      text: ['Dentro, la cattedrale è grande e semplice: tre navate divise da enormi pilastri e quattro grandi campate.',
        'Le volte a crociera sono altissime, sorrette da archi a sesto acuto.',
        'Il pavimento a intarsi di marmi colorati fu fatto nel Cinquecento, su disegno di Baccio d\'Agnolo e di altri.',
        'Rispetto all\'esterno, così ricco di marmi, l\'interno sembra quasi spoglio: la meraviglia sta nelle dimensioni.'],
      fact: 'Molte vetrate colorate delle navate e della cupola furono disegnate da grandi artisti come Lorenzo Ghiberti.' },
    { id: 'b-orologio', date: '1443', title: 'L\'orologio di Paolo Uccello', cam: { theta: 0, phi: 1.5, dist: 36, tx: -108, ty: G0 + 24, tz: 0 },   // dalla navata verso la controfacciata
      labels: [{ text: 'orologio', pos: [-107.9, G0 + 29.7, 0] }],
      text: ['Sulla parete interna della facciata c\'è un grande orologio dipinto da Paolo Uccello nel 1443, con quattro teste di profeti agli angoli.',
        'Ha una sola lancetta e un quadrante con 24 ore.',
        'Segue l\'«ora italica»: la giornata finiva al tramonto, quindi la ventiquattresima ora era quella del calar del sole.'] },
    { id: 'b-cavalieri', date: '1436–1465', title: 'Cavalieri dipinti e Dante', cam: { theta: Math.PI / 2 + 0.1, phi: 1.52, dist: 32, tx: -76, ty: G0 + 9, tz: -19 },   // dalla navata centrale verso la parete nord
      labels: [{ text: 'Giovanni Acuto', pos: [-82, G0 + 15.4, -20.2] }, { text: 'Niccolò da Tolentino', pos: [-73.5, G0 + 15.4, -20.2] }, { text: 'Dante', pos: [-58, G0 + 5, -20.2] }],
      text: ['Sulla parete della navata sinistra ci sono due grandi monumenti a cavallo… dipinti: Giovanni Acuto, cioè l\'inglese John Hawkwood, di Paolo Uccello (1436), e Niccolò da Tolentino di Andrea del Castagno (1456).',
        'Sembrano statue, ma sono pitture: costavano molto meno di un vero monumento di bronzo o di marmo.',
        'Poco più avanti, il dipinto di Domenico di Michelino (1465) mostra Dante con la Divina Commedia aperta, davanti a Firenze.'],
      fact: 'Nel quadro di Dante si vede anche la cupola di Brunelleschi: ma Dante morì nel 1321 e non la vide mai.' },
    { id: 'b-sole', date: '1475', title: 'Il sole dentro la cupola', interior: true, section: true, cam: { theta: Math.PI, phi: 2.0, dist: 44, tx: 4, ty: 6, tz: 0 },
      text: ['Nel 1475 lo scienziato Paolo dal Pozzo Toscanelli fece un piccolo foro in alto, nella lanterna, a circa 90 metri da terra.',
        'Il sole lo attraversa e disegna una macchia di luce sul pavimento: intorno al solstizio d\'estate, a mezzogiorno, cade su un segno di marmo. Serviva a studiare il moto del sole.',
        'Per arrivare in cima alla cupola ci sono 463 gradini, senza ascensore: si sale passando tra le due calotte.'],
      fact: 'Lo strumento fu restaurato nel 1755 dallo scienziato Leonardo Ximenes.' }
  ];

  window.CUPOLA_DATA = { STAGES, DIAGRAMS: D, NUMBERS, GLOSSARY, QUIZ, CAM, CURIOSITA, AFFRESCHI, BASILICA };
})();
