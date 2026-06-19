# Checklists

## Prima di modificare

- Ho cercato file e simboli esistenti con `rg`.
- Ho controllato se esiste gia' un block, snippet, custom element o helper.
- Ho letto la feature map piu' vicina alla modifica.
- Ho verificato se Liquid puo' renderizzare il dato senza JS.
- Ho verificato se CSS puo' gestire stato/layout senza JS.
- Ho scelto block-first se la feature e' componibile nell'editor.
- Ho controllato naming e classi gia' presenti.

## Durante la modifica

- Modifica mirata, niente refactor laterali.
- Nessuna libreria nuova senza necessita' reale.
- Correttezza e stabilita' prima dell'ottimizzazione.
- `ref` nel markup e `this.refs.nome` nel JS.
- Early return e fallback espliciti, niente nuovo `try/catch`.
- `async/await`, niente `.then()`.
- Timing e race condition gestiti prima di applicare risultati asincroni al DOM.
- Magic number, stringhe di stato e valori ripetuti raccolti in costanti `static` o CSS custom properties.
- Helper senza stato con metodi statici; factory statiche ed enum-like immutabili quando utili.
- Fetch HTML con `response`, `result`, `html`, `DOMParser`.
- Fetch JSON/GraphQL con controlli su `response.ok`, `result.errors` e dati mancanti.
- Query/fetch Storefront riusati da helper esistenti, soprattutto `ColorSibling`.
- DOM update con `parts[]` e una sola `innerHTML` quando si genera markup.
- Listener, observer e timer rimossi in `disconnectedCallback`.
- Nessun commento che ripete codice gia' evidente.

## CSS e UI

- Mobile-first.
- Flex-first.
- Grid solo per table, product grid o layout che cambiano drasticamente.
- CSS custom properties per valori configurabili o dinamici.
- Stato via CSS quando possibile: `:has()`, `:is()`, `:not()`, pseudo-classi, attributi.
- CSS nested nel componente, con padre scoped e classi figlie.
- Se serve un selettore univoco, usare anche attributi tipo `[data-title]`, `[data-state]`, `[data-tab]`.
- Testo e controlli non si sovrappongono su mobile e desktop.
- Link, bottoni e immagini restano accessibili.

## Verifica

- Esegui `npm run check`.
- Se tocchi PDP, prova product page desktop e mobile.
- Se tocchi siblings, prova PDP siblings e product card swatches.
- Se tocchi cart, prova add to cart, remove, quantity, drawer e bundle fusion.
- Se tocchi collection/filter, prova cambio filtro, clear e navigazione URL.
- Se non puoi verificare una parte, scrivilo chiaramente nel riepilogo.
