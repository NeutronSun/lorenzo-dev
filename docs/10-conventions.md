# Conventions

## Approccio

- Dai priorita' a correttezza e stabilita'; ottimizza solo dopo che il comportamento e' verificato.
- Mantieni i fix circoscritti ed evita refactor collaterali.
- Preferisci strumenti nativi e pattern gia' presenti a librerie o astrazioni nuove.
- Implementa il minimo che soddisfa la richiesta: niente opzioni, configurabilita' o feature speculative non chieste.
- Calibra il livello di astrazione: meglio una cosa concreta e leggibile che generica e gonfia; astrai solo quando il riuso e' reale.
- Preferisci primitive ed eventi nativi a logica custom; un solo percorso di codice, niente fallback per browser non supportati salvo richiesta.
- API simmetriche e reattive: coppie come open/close usano lo stesso meccanismo; i componenti reagiscono a eventi invece di ciclare i fratelli.
- Aggiungi commenti solo per decisioni o vincoli non evidenti, mai per descrivere cosa fa una riga leggibile o per ripetere il nome di un metodo. Tieni le annotazioni di tipo (`@param`/`@returns`) solo dove servono al tooling.

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
- Usa getter solo per dati o DOM ref che possono cambiare o sono condizionali; per riferimenti stabili leggi `this.refs.nome` direttamente, senza getter o metodi fallback difensivi.
- Preferisci eventi e API native (Invoker Commands `command`, `toggle`, `closedby`) a listener globali, capture o fallback fatti a mano.
- Ordine membri nelle classi: static constants, getter/setter, static factory, constructor, lifecycle, altri metodi.
- Non usare `#private fields`.
- Sposta magic number, stringhe di stato e valori di dominio ripetuti in costanti `static` con nomi espliciti. Eccezione: token standard DOM/piattaforma usati una volta sola (`'toggle'`, `'command'`, `'Escape'`) restano inline.
- Niente JSDoc/commenti che ripetono il nome del metodo: il nome deve bastare. Metti `@param`/`@returns` solo se il tipo serve al linter, o una nota se l'intent non e' ovvio.

```js
// no: la prosa ripete il nome
/** Opens the dialog. */
open() { ... }

// si: il nome basta; il tipo solo dove serve al tooling
open() { ... }

/** @param {string} name */
static showModal(name) { ... }
```
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

- Come mi aspetto una classe ipotetica:

```js

/*
 * wellmade JSDoc
 */
class TemplateClass extends HTMLComponent {
  
  get attribute() {
    return // getter for this.dataset, this.ref.x.dataset...
    return CacheHandler[key] = value; // since i use key only there, no needs of static attribute
  } 

  set attribute(value) {
    this.dataset = value;
    CacheHandler.x = value
  }

  constructor() {
    super();
    //usually empty, just call super();

    // maybe i can just prepare some observer, listeners
    this.onChange = (event) => {

    };
  }

  connectedCallback() {
    //everything must be done on element rendering
    this.setListeners();
    this.fetch() || this.render();
  }

  setListener() {
    //first, for click, submit remember that <form on:submit> so its the HTMLElement to handle the events
    //here i just want to listen to specific event
  }

  onScroll() {
    //here i can override the generic onScroll event declared on HTMLComponent abstract Class
    //yes, its js so its not abstract but you got it
  }

  async fetch() {
    //all the logic about fetching that
    const sibling = SiblingHandler.get(tag);
    const response = await fetch('my-section-id0');

    return html || json;
  }

  async render(html) {
    //from the html we can declare the section to be update then override it
    //from the context we can use the TemplateHandler or the 
    //super.update() method
  }
} 
```
- questa è la struttura base, ovviamente in base alla complessità della classe
- ci possono essere variazioni, ma di base se una di queste core feature viene fatta
- in un modo differente da come descritto la PR sarà rifiutata automaticamente.

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

- ora un esempio di come mi aspetto siano fatte le cose

```html
<custom-elements>
  <div data-header-wrapper>
    <h2 class="font-mono">Title</h2>
  </div>
  <div data-content>
    <div data-element>1</div>
    <div data-element>2</div>
  </div>
</custom-elements>
```
```css

  custom-elements {
    [data-header-wrapper] {
      text-trasfrom: capitalize;

      @media screen (min-width: 750px) {
        color: red;
      }
    }

    [data-content] {
      display: flex;
      flex-direction: column;

      @media screen (min-width: 750px) {
        --gap: 5px;
        flex-direction: row;
        gap: var(--gap);

        [data-element] {
          flex: 0 0 calc((100% / 2) - var(--gap));
        }
      }

    }
  }

```
- come per il JS, qualcosa di diverso sarà canellato.

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
- Default modal (`showModal`); i drawer che devono lasciare la pagina interattiva hanno l'attributo `non-modal` sull'host (apre con `dialog.show()`). La scelta vive nel getter `isModal`.
- Apertura/chiusura programmatica simmetriche: `DialogComponent.showModal(name)` dispatcha `dialog:open`, `DialogComponent.requestClose(name)` dispatcha `dialog:close`. I listener (`onDialogOpenEvent`/`onDialogCloseEvent`) filtrano sul `name` e chiamano `open()`/`close()`.
- Apertura anche via evento `command` nativo dell'invoker (sul `<dialog>`) → `open()`.
- Mutua esclusione senza loop: ogni dialog ascolta `dialog:opened` e si chiude da solo quando se ne apre un altro (`persistent` esclude). Niente `closeOthers`/`SELECTOR`.
- In non-modale Esc chiude via listener (`onEscape`); il modale usa Esc nativo. `dialog:opened`/`dialog:closed` restano per la sync dell'header.
- Richiede Invoker Commands nativi (`command` event); niente fallback click.
- `dialog-opener` solo per target senza `<dialog>` nativo, es. menu mobile header (`header-menu`).

Esempio del pattern (simmetria + reattivita' + evento nativo), da `assets/dialog.js`:

```js
// Apertura/chiusura programmatiche: stesso meccanismo, trigger event con check sul name
static showModal(name)   { document.dispatchEvent(new OnDialogOpenEvent({ name })); }
static requestClose(name){ document.dispatchEvent(new OnDialogCloseEvent({ name })); }

this.onDialogOpenEvent  = (e) => e.name === this.name && this.open();
this.onDialogCloseEvent = (e) => e.name === this.name && this.close();

// Mutua esclusione reattiva: nessun loop sui fratelli, ognuno si chiude da solo
this.onSiblingOpened = (e) => e.name !== this.name && !this.hasAttribute('persistent') && this.close();

// Invoker nativo: l'evento command arriva gia' sul <dialog> giusto, niente check di id
this.onInvokerEvent = (e) => { if (e.command !== 'show-modal') return; e.preventDefault(); this.open(); };

// Una sola scelta modal/non-modal, nel getter
get isModal() { return !this.hasAttribute('non-modal'); }
open() { this.isModal ? this.refs.dialog.showModal() : this.refs.dialog.show(); }
```
