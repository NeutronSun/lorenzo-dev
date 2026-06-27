# Conventions

## Approccio

- Dai priorita' a correttezza e stabilita'; ottimizza solo dopo che il comportamento e' verificato.
- Mantieni i fix circoscritti ed evita refactor collaterali.
- Preferisci strumenti nativi e pattern gia' presenti a librerie o astrazioni nuove.
- Aggiungi commenti solo per decisioni o vincoli non evidenti, mai per descrivere cosa fa una riga leggibile.

## Liquid

- Preferisci theme blocks e `{% content_for 'block' %}` quando la UI deve essere componibile o configurabile nell'editor Shopify.
- Usa snippets per frammenti piccoli e riusabili, non per feature monolitiche.
- Passa dati espliciti agli snippets.
- Aggiungi `{% doc %}` nei componenti riusabili con parametri chiari.
- Usa `blank`, `default`, `escape`, `json`, `handleize` e filtri Shopify prima di spostare logica in JS.
- Mantieni markup, schema e CSS vicini quando appartengono allo stesso componente.
- Per una singola proprieta' configurabile, usa CSS custom property inline.
- Per varianti multiple, usa classi o attributi dichiarativi.

## JavaScript

- Usa JavaScript vanilla e Custom Elements.
- Per nuovi componenti estendi `HTMLComponent` quando servono `ref`, eventi delegati o update parziali.
- Usa `ref` nel markup e accedi via `this.refs.nome`; per array usa `ref="items[]"` e `this.refs.items`.
- Usa getter per dati o DOM ref che possono cambiare.
- Ordine membri nelle classi: static constants, getter/setter, static factory, constructor, lifecycle, altri metodi.
- Non usare `#private fields`.
- Sposta magic number, stringhe di stato e valori ripetuti in costanti `static` con nomi espliciti.
- Per helper senza stato usa classi non istanziate con soli metodi `static`.
- Usa factory statiche quando la creazione richiede validazione, normalizzazione o scelta dell'implementazione.
- Rappresenta insiemi chiusi di stati con enum-like immutabili, ad esempio una costante `static` basata su `Object.freeze()`.
- Preferisci loop e condizioni semplici a catene o wrapper indiretti quando risultano piu' leggibili.
- Usa `async/await`, mai `.then()`.
- Nel nuovo codice non usare `try/catch`: usa early return, controlli su `response.ok`, fallback vuoti e stato errore esplicito.
- Considera timing, richieste concorrenti, risposte obsolete e componenti disconnessi prima di aggiornare stato o DOM; usa `AbortController` o un request id quando serve.
- Per fetch HTML usa `response`, `result`, `html` con `await response.text()` e `DOMParser`.
- Per fetch JSON/GraphQL usa `await response.json()` e controlli espliciti su `result.errors` o dati mancanti.
- Non duplicare query GraphQL o fetch gia' presenti: estendi helper come `ColorSibling`.
- Evita append multipli: crea `parts[]` e assegna una sola volta `innerHTML`.
- Rimuovi listener, observer e timer in `disconnectedCallback`.

## CSS

- Mobile-first: base per mobile, media query per viewport piu' grandi.
- Flex-first: usa `display: flex` come default per layout.
- Usa `grid` solo per tabelle, griglie prodotto vere o layout che cambiano drasticamente tra breakpoint.
- CSS-first: stato con `:has()`, `:is()`, `:not()`, pseudo-classi, attributi e custom properties prima di JS.
- Scrivi CSS nested dentro `{% stylesheet %}` del componente quando appartiene a section/block/snippet.
- Usa un padre scoped, poi classi figlie sotto: tag custom, classe di block o wrapper specifico.
- Usa attributi come `[data-title]`, `[data-state]`, `[data-tab]` quando aiutano a rendere un selettore univoco.
- Usa CSS custom properties per spacing, altezze, stati numerici e valori condivisi.
- Evita selettori globali generici.
- Evita animazioni e transizioni se non servono.
- Controlla sempre che testo, bottoni e contenitori non si sovrappongano su mobile e desktop.

## Riuso

- Prima di creare un file, cerca componenti e classi esistenti con `rg`.
- Prima di creare un custom element, cerca `customElements.define`.
- Prima di creare una query Storefront, cerca `ColorSibling`, `window.storefront` e query simili.
- Prima di aggiungere CSS, cerca classi gia' presenti e verifica se sono documentate qui.
- Se devi introdurre un pattern nuovo, documenta il motivo nel file docs piu' vicino.

## Accessibilita' e HTML

- Usa elementi HTML corretti: button per azioni, link per navigazione, form per submit.
- Link e bottoni devono avere label accessibile.
- Immagini con `alt`, `width`, `height`, `loading` quando applicabile.
- Evita overlay che intercettano click senza motivo.
- Non trasformare `div` in controlli interattivi.

## Dialog

- Host: `dialog-component` o `search-dialog` con `<dialog ref="dialog" id="{name}">` — `id` uguale al `name` del component.
- Apri: `<button type="button" commandfor="{name}" command="show-modal">` — `commandfor` = `id` del `<dialog>`. Solo `<button>`, mai `<a>` o `<label>`.
- Chiudi: `<button type="button" commandfor="{name}" command="request-close">`.
- Tutti i drawer sono modal nativi (`show-modal`); niente attributo `non-modal`, niente `dialog.show()`.
- Apertura programmatica (add-to-cart, shortcut search ⌘F): `DialogComponent.showModal(name)`.
- Chiusura programmatica: `DialogComponent.requestClose(name)`.
- `DialogComponent` sincronizza solo eventi tema (`dialog:opened` / `dialog:closed`) e `closeOthers` sul `toggle` del `<dialog>`.
- Invoker Commands nativi quando il browser li supporta; fallback click in `dialog.js` (`handleInvokerClick`) se il dialog resta chiuso.
- `dialog-opener` solo per target senza `<dialog>` nativo, es. menu mobile header (`header-menu`).
