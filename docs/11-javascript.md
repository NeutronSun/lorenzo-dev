# JavaScript

Guida operativa per Custom Elements, `HTMLComponent` e moduli di dominio nel tema.

## Principi

- **CSS-first**: stato e layout visivo in CSS; JS solo per runtime, fetch, sync async e interazioni che Liquid non può fare.
- **Vanilla CE**: niente librerie; un file PascalCase per dominio (`Cart.js`, `ProductCard.js`).
- **Un solo percorso**: niente fallback browser legacy; il tema mira a browser moderni con Invoker Commands, `<dialog>`, `async/await`.
- **Reattività**: i componenti reagiscono a eventi tema invece di ciclare fratelli con `querySelectorAll`.
- **API simmetriche**: open/close, show/hide usano lo stesso meccanismo (eventi trigger o invoker nativo).

## Stack

| Pezzo | Ruolo |
|---|---|
| `assets/HTMLComponent.js` | Base CE: `ref`, eventi delegati `on:*`, `onScroll`/`onResize`, `updateRef` |
| `assets/global.js` | Entrypoint; import side-effect dei moduli PascalCase |
| `snippets/theme-js.liquid` | Import map `@theme/*` → `assets/*.js` |
| `assets/utilities.js` | `TemplateHandler`, `HtmlUtils`, `UrlUtils` |
| `assets/events.js` | Eventi tema custom (`OnCartUpdateEvent`, `OnDialogOpenEvent`, …) |
| `assets/GraphQL.js` | Config Storefront, headers, `GraphQL.request` |
| `assets/ColorSibling.js` | Query siblings per tag; cache `sessionStorage` |

**File di dominio** (PascalCase): un file raggruppa le classi/CE dello stesso dominio.

- `Cart.js` → `CartHandler`, `CartDrawer`, `CartItem`, `ProductForm`, `PdpBundle`, `CartMoney`
- `Dialog.js` → `DialogComponent`, `DialogOpener`
- `ProductCard.js`, `Product.js`, `Collection.js`, …

**Barrel** (kebab-case): `utilities.js`, `events.js`, `global.js`.

Import map: `@theme/Cart` → `Cart.js`.

## Anatomia classe

Ordine membri:

1. `static` constants
2. getter / setter (solo se DOM o dato condizionale)
3. static factory
4. `constructor`
5. `connectedCallback` / `disconnectedCallback`
6. altri metodi

Regole:

- **No `#private fields`** — usa `this.*` inizializzato nel constructor.
- **Getter** solo se il nodo può cambiare o non esiste a construction time.
- **Riferimenti stabili**: leggi `this.refs.nome` in `connectedCallback`, senza getter difensivi o `getNodo()`.
- **Magic numbers** in `static` constants; eccezione token DOM usati una volta (`'toggle'`, `'Escape'`).
- **Helper senza stato**: classe con soli metodi `static`.
- **`async/await`**, mai `.then()`.
- **No `try/catch`** nel nuovo codice: early return, `response.ok`, fallback vuoti.
- **Race condition**: verifica che richiesta, componente e DOM siano ancora attuali prima di applicare risultati async.
- **DOM update**: accumula `parts[]`, una sola `innerHTML`.
- **Cleanup**: rimuovi listener, observer e timer in `disconnectedCallback`.
- **JSDoc**: solo `@param`/`@returns` utili al tooling; niente prosa che ripete il nome del metodo.

---

## Custom Element con `HTMLComponent`

**Regola:** ogni nuovo CE che estende `HTMLComponent` usa `ref` + `on:*` nel markup Liquid. Non `onclick` inline, non `addEventListener` manuali sui figli per azioni utente.

### `ref` → `this.refs`

| Markup | JS |
|---|---|
| `ref="dialog"` | `this.refs.dialog` |
| `ref="items[]"` | `this.refs.items` (array di elementi) |

`HTMLComponent` raccoglie i ref in `connectedCallback` e li aggiorna via `MutationObserver` (utile dopo Section Rendering Shopify).

```liquid
<cart-drawer data-section-id="{{ section.id }}">
  <header>
    <p ref="count">{{ cart.item_count }} items</p>
  </header>
  <div class="cart-drawer-body" ref="body">…</div>
  <cart-money ref="subtotal" value="{{ cart.total_price }}"></cart-money>
</cart-drawer>
```

```js
connectedCallback() {
  super.connectedCallback();
  // this.refs.count, this.refs.body, this.refs.subtotal già disponibili
}
```

### `on:*` — eventi delegati

| Markup | JS |
|---|---|
| `on:click="increase"` | `increase(event, element) { … }` |
| `on:submit="onSubmit"` | `async onSubmit(event) { … }` |
| `on:change="onChange"` | `onChange(event) { … }` |
| `on:input="handleInput"` | `handleInput(event) { … }` |

Eventi supportati da `bindEvents()` in `HTMLComponent.js`: **`click`**, **`change`**, **`input`**, **`submit`**, **`keydown`**, **`keyup`**.

La delegazione avviene sull'host: `handleDelegatedEvent` trova il `[on:event]` più vicino e invoca il metodo omonimo sulla classe.

```liquid
<button type="button" on:click="decrease" aria-label="Decrease quantity">-</button>
<span ref="quantity"></span>
<button type="button" on:click="increase" aria-label="Increase quantity">+</button>
```

```js
increase(event) {
  // event.target è il bottone; il metodo è sulla classe CartItem
}
```

**Form submit:** metti `on:submit` sull'host CE o sul `<form>`; il target dell'evento è il form.

```liquid
<product-form on:submit="onSubmit">
  {% form 'product', product %}…{% endform %}
</product-form>
```

**Non usare** `on:click` sui bottoni open/close dei dialog: usa Invoker Commands (`commandfor` + `command`).

### `onScroll()` / `onResize()` — hook globali

`HTMLComponent` espone `onScroll()` e `onResize()` vuoti. Se la sottoclasse li ridefinisce, `bindGlobalEvents()` li collega a `window` in `connectedCallback` e li rimuove in `disconnectedCallback`.

```js
// sì: override — il listener è gestito dalla base
onScroll() {
  this.toggleAttribute('sticking', window.scrollY > 0);
}

// no: listener manuale duplicato
connectedCallback() {
  window.addEventListener('scroll', this.handleScroll);
}
```

### Checklist nuovo CE

1. Estendi `HTMLComponent` (o `DialogComponent` se è un dialog host).
2. Markup Liquid con `ref` su ogni nodo che il JS legge o aggiorna.
3. Interazioni utente con `on:click` / `on:change` / `on:submit` — nome metodo = nome handler.
4. `if (!customElements.get('tag')) customElements.define(...)` in fondo al file PascalCase.
5. Import side-effect in `assets/global.js` + voce import map in `snippets/theme-js.liquid`.
6. Scroll/resize pagina: override `onScroll` / `onResize`, non listener globali custom.
7. Listener document/tema aggiuntivi solo in `connectedCallback`, rimossi in `disconnectedCallback`.

---

## Esempi reali

### `Dialog.js` — dialog host

```liquid
<dialog-component name="cart-drawer" non-modal>
  <dialog ref="dialog" id="cart-drawer" class="drawer from-right cart-drawer">
    …
  </dialog>
</dialog-component>
```

```js
export class DialogComponent extends HTMLComponent {
  get name() { return this.getAttribute('name') || ''; }
  get isModal() { return !this.hasAttribute('non-modal'); }

  connectedCallback() {
    super.connectedCallback();
    this.refs.dialog.addEventListener('toggle', this.onToggle);
    this.refs.dialog.addEventListener('command', this.onInvokerEvent);
    // eventi document per apertura/chiusura programmatica e mutua esclusione
  }

  open() {
    this.isModal ? this.refs.dialog.showModal() : this.refs.dialog.show();
  }

  static showModal(name) {
    document.dispatchEvent(new OnDialogOpenEvent({ name }));
  }
}
```

Pattern chiave: `ref="dialog"`, invoker nativo su `<dialog>`, apertura programmatica simmetrica via eventi document.

### `sections/cart-drawer.liquid` + `Cart.js`

- Template refs: `ref="emptyTemplate"`, `ref="itemTemplate"` per clone client-side.
- Azioni riga: `on:click="increase"`, `on:click="decrease"`, `on:click="removeItem"` su `<cart-item>`.
- Chiusura drawer: `commandfor="cart-drawer"` + `command="request-close"` (non `on:click`).
- `CartDrawer` ascolta `OnCartUpdateEvent` e aggiorna `this.refs.count`, `this.refs.body`, `this.refs.subtotal`.

---

## Eventi tema (`events.js`)

Pattern reattivo: un componente pubblica, gli altri ascoltano e agiscono su se stessi.

```js
// pubblica
document.dispatchEvent(new OnCartUpdateEvent({ action: 'add', cart }));

// ascolta
this.onCartEvent = (event) => {
  if (event.type === OnCartUpdateEvent.TYPE) this.render();
};
document.addEventListener(OnCartUpdateEvent.TYPE, this.onCartEvent);
```

Non ciclare fratelli: ogni dialog ascolta `dialog:opened` e si chiude da solo (`onSiblingOpened` in `Dialog.js`).

### Variant selection PDP

```js
// VariantPicker dispatch
document.dispatchEvent(new OnVariantSelectedEvent({ variant, source: this.dataset.source }));

// ProductPage ascolta se event.source === dataset.source
```

- `data-source` sul CE valorizzato dal Liquid caller (`source: 'pdp'`), non da block settings.
- `data-preselect-variant-id` su `product-page` quando section `preselect_variant` ON e nessuna variante in URL → `selectDefaultVariant` al connect (replaceState + section render).

## Fetch e update parziali

| Caso | Pattern |
|---|---|
| HTML partial | `fetch` → `response.text()` → `DOMParser` → `updateRef(name, source)` o `TemplateHandler` |
| JSON cart | `CartHandler.mutate` con eventi loading/update/error |
| GraphQL siblings | `ColorSibling.get(tag, limit)` — non duplicare query |
| Section render | `TemplateHandler` con `section_id` |

Prima di applicare un risultato async: verifica `AbortController`, request id, o che il componente sia ancora connesso.

## Anti-pattern

- `try/catch` silenziosi o `.then()` chains
- `window.addEventListener('scroll', …)` quando basta override `onScroll`
- `addEventListener` su ogni bottone figlio invece di `on:click`
- `onclick` inline su controlli gestiti dal CE
- Classi JS per stato visivo (usa attributi + CSS)
- `querySelectorAll` + loop per sincronizzare fratelli
- Duplicare query GraphQL o fetch cart fuori da `ColorSibling` / `CartHandler`
- Append multipli al DOM invece di `parts[]` + una `innerHTML`
