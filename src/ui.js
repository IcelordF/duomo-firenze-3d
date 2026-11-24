/* Pezzi di interfaccia comuni alle due pagine. */
(function () {
  const { STAGES, DIAGRAMS, GLOSSARY } = window.CUPOLA_DATA;
  const $ = s => document.querySelector(s);

  // Monta 3D (se WebGL c'è) e spaccato 2D.
  function mount() {
    const v3el = $('#v3'), main = $('main.stage');
    const v3 = window.Cupola.create(v3el, { year: STAGES[0].year });
    if (!v3) main.classList.add('no3d');               // senza WebGL resta lo spaccato a tutta larghezza
    const v2 = window.Section2D.create($('#v2'));
    const card = $('#card');
    const syncInset = () => v2.setInset(card.classList.contains('hidden') ? 0 : card.offsetWidth + 24);
    new ResizeObserver(syncInset).observe(card); syncInset();
    $('#cardHide').onclick = () => { card.classList.add('hidden'); syncInset(); };
    $('#cardShow').onclick = () => { card.classList.remove('hidden'); syncInset(); };
    $('#zIn').onclick = () => v2.zoom(0.8); $('#zOut').onclick = () => v2.zoom(1.25);
    window.__cupola = { v3, v2 };   // per il debug da console
    return { v3, v2 };
  }

  // Applica una tappa a 3D e 2D. cam = sposta anche la telecamera 3D.
  function applyStage(st, v3, v2, { cam = true } = {}) {
    if (v3 && !!st.interior !== v3.interior) setInterior(!!st.interior, { fly: false });
    if (v3) {
      if (cam) { v3.flyTo(st.cam); v3.setSection(!!st.section); syncToggle('#bSect', !!st.section); }
      v3.setFocus(st.focus); v3.setLabels(st.labels);
    }
    v2.setView(st.v2); v2.setFocus(st.f2 || st.focus); v2.setLabels(st.l2); v2.setScaffold(!!st.scaffold2d);
  }
  // Interni di oggi: affreschi, vetrate e coro; spaccato acceso e camera dentro la cupola
  let before = null;
  function setInterior(on, { fly = true } = {}) {
    const v3 = window.__cupola && window.__cupola.v3; if (!v3) return;
    if (on && !v3.interior) before = v3.view();
    v3.setInterior(on); syncToggle('#bInt', on);
    v3.setSection(on); syncToggle('#bSect', on);
    if (fly) v3.flyTo(on ? window.CUPOLA_DATA.CAM.inside : (before || window.CUPOLA_DATA.CAM.near));
    if (on) { v3.setLabels([]); badgeToday(v3); }
    else if (window.UI.refresh) window.UI.refresh(fly);             // spegnendo: torna l'anno; dal pulsante anche le etichette della tappa
  }
  function badgeToday(v3) {
    if (!v3 || !v3.interior) return false;
    $('#yearBig').textContent = 'oggi'; $('#hBig').textContent = 'affreschi del 1572–1579';
    return true;
  }
  // tastiera per la vista 3D: frecce = avanti, indietro, lati; Pag su/giù = sali e scendi; Q/E = girati
  function moveKeys(e, v3) {
    if (!v3) return false;
    if (!/^(Arrow(Up|Down|Left|Right)|Page(Up|Down)|[qQeE])$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return false;
    e.preventDefault(); v3.hold(e.key, true); return true;   // movimento continuo finché il tasto resta giù (keyup in setupCommon)
  }
  function syncToggle(sel, on) { const b = $(sel); if (b) b.setAttribute('aria-pressed', on); }

  function cardHTML(st, i, n, full) {
    const more = full ? st.more.map(p => `<p>${p}</p>`).join('')
      : `<details class="more"><summary>Approfondisci</summary>${st.more.map(p => `<p>${p}</p>`).join('')}</details>`;
    const au = (window.CUPOLA_AUDIO || {})[st.id] ? `<button class="listen" data-audio="${st.id}" title="Tasto A">▶ Ascolta</button>` : '';
    return {
      head: `<span class="card-date">${st.date}</span>${au}<span class="card-step">tappa ${i + 1} di ${n}</span><h2>${st.title}</h2>`,
      body: `<p class="lead">${st.text}</p>${DIAGRAMS[st.dg] || ''}${more}<div class="fact"><strong>Lo sapevi?</strong>${st.fact}</div>`
    };
  }
  // lettura ad alta voce (una sola traccia alla volta; si ferma cambiando scheda)
  const player = new Audio();
  const btnLabel = () => { const b = document.querySelector('.listen'); if (b) b.textContent = !player.paused && player.dataset.id === b.dataset.audio ? '❚❚ Pausa' : '▶ Ascolta'; };
  ['play', 'pause', 'ended'].forEach(e => player.addEventListener(e, btnLabel));
  // Legge la tappa: risolve true a fine lettura, false se interrotta, null se non c'è audio.
  function narrate(id) {
    const src = (window.CUPOLA_AUDIO || {})[id];
    if (!src) return Promise.resolve(null);
    player.pause(); player.src = src; player.dataset.id = id;
    return new Promise(res => {
      const done = ok => { player.removeEventListener('ended', onEnd); player.removeEventListener('pause', onPause); res(ok); };
      const onEnd = () => done(true), onPause = () => { if (!player.ended) done(false); };
      player.addEventListener('ended', onEnd); player.addEventListener('pause', onPause);
      player.play().catch(() => done(null));
    });
  }
  function listen(btn) {
    if (!btn) return;
    if (!player.paused && player.dataset.id === btn.dataset.audio) player.pause(); else narrate(btn.dataset.audio);
  }
  function fillCard(head, body) {
    player.pause();
    $('#cardHead').innerHTML = head; $('#cardBody').innerHTML = body; $('#cardBody').scrollTop = 0;
    const lb = document.querySelector('.listen'); if (lb) lb.onclick = () => listen(lb);
    $('#card').classList.remove('hidden');
  }

  // Anno animato (per vedere la cupola crescere).
  let tw = 0;
  function tweenYear(from, to, dur, set) {
    const id = ++tw, t0 = performance.now();
    return new Promise(res => {
      const step = now => {
        if (id !== tw) return res(false);
        const k = Math.min(1, (performance.now() - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        set(from + (to - from) * e);
        k < 1 ? requestAnimationFrame(step) : res(true);
      };
      requestAnimationFrame(step);
    });
  }
  const stopTween = () => { tw++; };

  function setupCommon(v3) {
    const dlg = $('#gloss');
    $('#glossList').innerHTML = GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')
      + `<dt class="cred">Crediti delle immagini</dt><dd>Foto e riproduzioni da Wikimedia Commons, usate secondo la loro licenza.<ul class="cred"><li>Modelli 3D di cattedrale, campanile e Battistero: Enrico Dalbosco (Arrigo Silva), 3D Warehouse (<a href="https://3dwarehouse.sketchup.com/model/8f187dc09654501c70f2373efbf66671/Florence-Duomo" target="_blank" rel="noopener">Florence Duomo</a>, <a href="https://3dwarehouse.sketchup.com/model/a6bb0f9c555bbab490da2fe60070b981/Campanile-di-Giotto" target="_blank" rel="noopener">Campanile di Giotto</a>, <a href="https://3dwarehouse.sketchup.com/model/e0cebb9d97a2101d69a7efa28ad69d0e/Florence-Baptistry" target="_blank" rel="noopener">Florence Baptistry</a>), General Model License</li>${Object.values(window.CUPOLA_CREDITS || {}).map(c => `<li>${c.what}: <a href="${c.url}" target="_blank" rel="noopener">${c.author}</a>, ${c.license}</li>`).join('')}</ul></dd>`;
    $('#bGloss').onclick = () => dlg.showModal();
    $('#glossClose').onclick = () => dlg.close();
    const fs = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    $('#bFull').onclick = fs;
    const bLight = $('#bLight');
    if (!v3) { $('#bSect').hidden = bLight.hidden = $('#bInt').hidden = $('#bWalk').hidden = $('#bCity').hidden = true; }
    else {
      addEventListener('keyup', e => v3.hold(e.key, false));
      addEventListener('blur', () => v3.hold(null));
      const walk = on => { if (on && v3.interior) setInterior(false); if (on && $('#bSect').getAttribute('aria-pressed') === 'true') $('#bSect').click(); v3.setWalk(on); syncToggle('#bWalk', on); };
      const city = () => { v3.setCity(!v3.city); syncToggle('#bCity', !v3.city); };
      $('#bWalk').onclick = () => walk(!v3.walking);
      $('#bCity').onclick = city;
      addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('dialog,input,textarea'))) return;
        if (e.key === 'p' || e.key === 'P') walk(!v3.walking);
        else if (e.key === 'c' || e.key === 'C') city();
        else if (e.key === 'Escape' && v3.walking) walk(false);
      });
      document.addEventListener('cupola-walk', () => syncToggle('#bWalk', v3.walking));   // il motore esce da solo dalla camminata (cambio di tappa)
      bLight.onclick = () => { const on = bLight.getAttribute('aria-pressed') !== 'true'; syncToggle('#bLight', on); v3.setLight(on); };
      $('#bInt').onclick = () => setInterior(!v3.interior);
      $('#bSect').onclick = () => { const on = $('#bSect').getAttribute('aria-pressed') !== 'true'; syncToggle('#bSect', on); v3.setSection(on); };
    }
    return { fs };
  }

  window.UI = { moveKeys, setInterior, badgeToday, listen: () => listen(document.querySelector('.listen')), narrate, stopAudio: () => player.pause(), $, mount, applyStage, cardHTML, fillCard, tweenYear, stopTween, setupCommon, syncToggle };
})();
