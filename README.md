# La cupola di Brunelleschi · Santa Maria del Fiore in 3D

Pagine didattiche (pensate per la seconda media) sulla cattedrale di Firenze: un modello 3D navigabile, uno spaccato 2D
e una narrazione a voce, in italiano e in inglese. Ogni pagina è un unico file HTML che funziona anche offline.

| Pagina | Contenuto |
| --- | --- |
| `dist/cupola-cantiere.html` | il cantiere della cupola anno per anno (1418-1471), con la tavola dei ponteggi interni |
| `dist/cupola-racconto.html` | la storia di Brunelleschi, curiosità e quiz finale |
| `dist/cupola-basilica.html` | la basilica capitolo per capitolo: facciata, porte, campanile, Battistero, interno |

Le versioni inglesi hanno il suffisso `-en`. Per provarle basta aprire i file nel browser (serve WebGL).

## Comandi

Trascina per ruotare, rotella per avvicinarti, doppio clic per andare in un punto, frecce e Pag su/giù per muoverti,
Q/E per girarti. **P** attiva «Cammina» (prima persona, con i muri; Esc per uscire), **C** nasconde le case,
**S** taglia il modello, **I** mostra l'interno di oggi.

## Struttura

- `src/`: motore 3D (`engine.js`, three.js r170), spaccato 2D (`section2d.js`), contenuti (`data.js`, `i18n-en.js`), interfaccia
- `build.mjs`: assembla le pagine in `dist/` inlineando librerie, font, immagini, modelli e audio
- `scripts/tts.mjs`: genera la narrazione con ElevenLabs (chiave in `.env.local`, non inclusa)
- `scripts/slim-glb.py`: alleggerisce i modelli glb (texture ricompresse, foto aerea tolta)
- `vendor/`: three.js, GLTFLoader, font, foto Wikimedia Commons (`img/`, crediti in `img/credits.json`), audio
- `verifica/`: confronti tra il modello e le foto

## Rifare la build

```bash
node build.mjs
```

I tre modelli `.glb` non sono nel repository (vedi sotto): scarica da 3D Warehouse
[Florence Duomo](https://3dwarehouse.sketchup.com/model/8f187dc09654501c70f2373efbf66671/Florence-Duomo),
[Campanile di Giotto](https://3dwarehouse.sketchup.com/model/a6bb0f9c555bbab490da2fe60070b981/Campanile-di-Giotto) e
[Florence Baptistry](https://3dwarehouse.sketchup.com/model/e0cebb9d97a2101d69a7efa28ad69d0e/Florence-Baptistry),
esportali in glb, passali a `scripts/slim-glb.py` e salvali come `vendor/model/{duomo,campanile,battistero}.glb`.

## Crediti e licenze

- **Codice** (cartelle `src/`, `scripts/`, `build.mjs`): licenza MIT.
- **Modelli 3D** di Duomo, Campanile e Battistero: Enrico Dalbosco (Arrigo Silva), 3D Warehouse, *General Model License*.
  Sono usati solo dentro le pagine come opera combinata; la licenza non consente di ridistribuirli da soli, per questo i
  file glb sono esclusi dal repository. I crediti restano sempre visibili nel modello 3D.
- **Foto** da Wikimedia Commons: autori e licenze (pubblico dominio, CC BY, CC BY-SA) sono in `vendor/img/credits.json`
  e nel glossario di ogni pagina. Le versioni modificate (raddrizzate, ritagliate) mantengono la licenza dell'originale.
- **Ricostruzione dei ponteggi**: disegno attribuito a Giovan Battista Nelli (pubblico dominio).
- **Città quattrocentesca**: ricostruita per tipi sulla *Pianta della Catena* (c. 1470, pubblico dominio).
- **three.js**: MIT (`vendor/three-LICENSE`). Font Cormorant Garamond e Lexend: SIL Open Font License.
- **Voce**: generata con ElevenLabs.

Progetto didattico, senza scopo di lucro.
