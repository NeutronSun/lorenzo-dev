# CSS

Guida operativa per stili nel tema: mobile-first, flex-first, CSS-first.

## Principi

- **Mobile-first**: stili base per mobile; media query `min-width` per viewport più grandi.
- **Flex-first**: `display: flex` come default per layout; `grid` solo per tabelle, griglie prodotto reali o layout che cambiano drasticamente tra breakpoint.
- **CSS-first**: stato e varianti con `:has()`, `:is()`, `:not()`, pseudo-classi, attributi e custom properties prima di togglare classi da JS.
- **Scoped**: CSS nested dentro `{% stylesheet %}` del componente; padre = tag CE, classe block o wrapper dedicato.
- **Token condivisi**: variabili in `assets/critical.css`, `assets/components.css`; override locali con custom properties.

## Nested `{% stylesheet %}`

Scrivi CSS nel file Liquid del componente (section, block, snippet) quando appartiene a quel componente.

```liquid
{% stylesheet %}
  product-page {
    --layout-gap: 20px;
    display: grid;

    .layout {
      display: flex;
      flex-direction: column;
      gap: var(--layout-gap);
    }

    @media screen and (min-width: 990px) {
      .layout {
        flex-direction: row;
      }
    }
  }
{% endstylesheet %}
```

Regole:

- **Padre scoped** (tag CE, es. `cart-drawer`, o classe wrapper).
- **Figli nested** sotto il padre — niente selettori globali generici.
- Attributi dati (`[data-title]`, `[data-state]`, `[data-tab]`) quando servono selettori univoci.
- **Custom properties** per spacing, altezze sticky, stati numerici e valori condivisi tra regole.
- Evita animazioni/transizioni se non servono.
- Verifica sempre che testo, bottoni e contenitori non si sovrappongano su mobile e desktop.

## Stato senza JS

### Attributi su custom elements

```css
cart-drawer[pending] cart-money {
  opacity: 0.42;
}

cart-drawer[empty] .cart-drawer-body {
  display: grid;
}

cart-item[pending] {
  opacity: 0.45;
  pointer-events: none;
}
```

JS usa `toggleAttribute('pending', bool)` — non classi `.is-pending`.

### `:has()` per stato strutturale

```css
.cart-drawer-body:has(.cart-empty) {
  display: grid;
}

body:has(.cart-drawer[open])::after {
  content: "";
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.2);
  pointer-events: auto;
}

label:has(input:checked) {
  font-weight: 700;
}
```

### Custom properties dinamiche

Valori numerici calcolati in JS (es. altezze sticky PDP) vanno in CSS variables, non in style inline multipli:

```js
this.style.setProperty('--pdp-card-height', `${height}px`);
```

```css
.pdp-product-info {
  max-height: var(--pdp-card-height);
}
```

## Drawer (`.drawer` + `.from-*`)

Pattern condiviso in `assets/components.css` sotto `dialog-component dialog`.

| Classe | Effetto |
|---|---|
| `.drawer` | Dimensioni, spacing token, transform base |
| `.from-left` | Slide da sinistra |
| `.from-right` | Slide da destra (cart, localization, filtri) |
| `.from-top` | Slide dall'alto |
| `.from-bottom` | Slide dal basso |
| `.full-height` | Altezza viewport meno spacing |

```liquid
<dialog ref="dialog" id="cart-drawer" class="drawer from-right cart-drawer">
```

Token drawer comuni:

```css
--drawer-spacing: 20px;
--drawer-width: min(440px, calc(100dvw - var(--spacing) * 2));
--drawer-height: calc(100dvh - var(--drawer-top-spacing) - var(--drawer-bottom-spacing));
--origin-x: calc(100% + var(--drawer-right-spacing)); /* chiuso, from-right */
```

Stato aperto: `[open]` sul `<dialog>`. Overlay non-modale: `body:has(.nome-drawer[open])::after` nel CSS della section (non `::backdrop` nativo).

Animazioni: `transition` su `transform`, `opacity`, `overlay`, `display` con `allow-discrete` dove serve.

## Wrapper `-block`

Se il block type coincide col tag del custom element, il wrapper editor usa suffisso `-block` per non collidere col selettore CE:

| Block type | Wrapper CSS | CE tag |
|---|---|---|
| `variant-picker` | `.variant-picker-block` | (snippet interno) |
| `buy-button` | `.buy-button-block` | `product-form` |

```liquid
<div class="variant-picker-block" {{ block.shopify_attributes }}>
  {% render 'variant-picker', product: product %}
</div>
```

```css
.buy-button-block product-form {
  display: block;
  padding: 16px 20px 8px;
}
```

## Token e file globali

| File | Contenuto |
|---|---|
| `assets/critical.css` | Reset, tipografia, layout pagina, variabili root |
| `assets/components.css` | Dialog, drawer, pattern UI condivisi |
| `assets/animations.css` | Keyframe riusabili |

Preferisci variabili tema (`--spacing`, `--border-color`, `--z-index-drawer`, `--font-mono--family`) invece di valori hardcoded ripetuti.

## Grid — quando usarlo

- Griglia prodotto collection (`product-grid`)
- Layout interno drawer a righe fisse (`grid-template-rows: auto minmax(0, 1fr) auto` su `cart-drawer`)
- Tabelle dati
- `cart-item`: colonne immagine / info / meta

Per tutto il resto: flex con `gap`, `min-width: 0` sui figli flessibili.

## Anti-pattern

- Classi togglate da JS solo per colore/stato visivo
- Selettori globali tipo `.title`, `.button` senza scope
- `grid` per layout semplici che bastano con flex
- Desktop-first (`max-width` come default)
- Inline style multipli invece di una custom property
- Duplicare regole drawer fuori da `components.css` senza motivo
