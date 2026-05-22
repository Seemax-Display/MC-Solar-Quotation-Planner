FV Shop - Promo e Negozio Fotovoltaico
======================================

Contenuto:
- index.html: applicazione principale, apribile direttamente nel browser.
- assets/: CSS, JavaScript e immagini prodotto estratte dal PDF listino.
- data/products.js: catalogo prodotti (#AdminEditabile) con prezzi IVA esclusa.
- data/promos.js: promo preimpostate (#AdminEditabile).

Uso:
1. Estrarre lo ZIP in una cartella locale.
2. Aprire index.html con Chrome, Edge o altro browser moderno.
3. Usare Negozio e Promo per aggiungere articoli al carrello.
4. Usare Stampa commessa per generare PDF/stampa dal browser.

Note:
- I prezzi del catalogo sono IVA esclusa, come indicato nel listino MC Solar Maggio 2026.
- Alcuni articoli del listino non dispongono di una foto individuale nel PDF; in quei casi viene usata una immagine rappresentativa della stessa famiglia o un placeholder grafico.
- Per aggiornare prezzi/prodotti cercare #AdminEditabile nei file data/*.js.


Versione 1.0.0.3:
- Logo MC Solar nel topbar.
- Filtro Negozio Monofase/Trifase.
- Sconto commerciale Negozio con popup 45/48/50 e regola 50 -> 51 per SOLIS/DYNESS.
- IVA automatica: 10% per componenti kit, 22% per altri articoli.
- Provvigione calcolata sull'imponibile totale dell'ordine.
- Animazione aggiunta al carrello.


Versione 1.0.0.3: IVA negozio al 22% di default; IVA 10% solo sui componenti kit quando il carrello contiene un kit completo; logo e carrello hero ridimensionati.
