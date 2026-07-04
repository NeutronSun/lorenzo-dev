# Liquid e HTML

Guida operativa per markup, theme blocks, schema e integrazione con Custom Elements.

## Principi

- **Block-first**: feature componibile nell'editor → `blocks/` + `{% content_for 'block' %}`.
- **Snippet** per frammenti piccoli e riusabili, con parametri espliciti.
- **Liquid prima di JS**: `blank`, `default`, `escape`, `json`, `handleize` e filtri Shopify per dati server-side.
- **Markup + schema + CSS** vicini nello stesso file quando appartengono allo stesso componente.
- **CE markup**: ogni host gestito da `HTMLComponent` include `ref` e `on:*` per il JS — non `onclick`, non listener manuali sui figli.

## Gerarchia layout

```
layout/theme.liquid
├── header group
├── dialog-group          ← {% sections 'dialog-group' %}
├── content_for_layout
└── footer group
```

`sections/dialog-group.json` (type `aside`) ordina:

1. `search-dialog`
2. `localization-drawer`
3. `cart-drawer`

Ogni dialog è una section autonoma con `dialog-component` host.

## Theme blocks

```liquid
{% content_for 'block', type: 'pdp-gallery', id: 'gallery', product: product %}
```

- `type`: handle block in `blocks/`.
- `id`: istanza stabile nel template.
- Passa oggetti Shopify espliciti (`product`, `collection`).

Nested blocks:

```liquid
{% content_for 'blocks' %}
```

Usato in `pdp-product-dossier` per comporre edition, stats, description, tech.

## Markup Custom Element minimo

```liquid
<cart-drawer data-section-id="{{ section.id }}">
  <div ref="body">…</div>
  <button type="button" on:click="increase">+</button>
</cart-drawer>
```

| Attributo | Uso |
|---|---|
| `ref="nome"` | Nodo stabile → `this.refs.nome` |
| `ref="items[]"` | Lista → `this.refs.items` |
| `on:click="method"` | Handler delegato sulla classe CE |
| `on:submit="onSubmit"` | Su host o `<form>` |
| `on:change` / `on:input` | Input e select |

`data-section-id` per Section Rendering async (`CartDrawer.updateBodyFromSection`).

## Dialog e Invoker Commands

Pattern standard per drawer e modal:

```liquid
<dialog-component name="cart-drawer" non-modal>
  <dialog ref="dialog" id="cart-drawer" class="drawer from-right cart-drawer">
    <cart-drawer>…</cart-drawer>
  </dialog>
</dialog-component>
```

| Elemento | Regola |
|---|---|
| Host | `dialog-component` o `search-dialog` |
| `<dialog>` | `ref="dialog"`, `id` = `name` del component |
| Apri | `<button type="button" commandfor="cart-drawer" command="show-modal">` |
| Chiudi | `<button type="button" commandfor="cart-drawer" command="request-close">` |
| Non-modale | attributo `non-modal` sull'host (drawer: cart, localization, filtri) |

**Solo `<button type="button">`** per open/close — mai `<a>` o `<label>`.

**Mai `on:click`** sui bottoni open/close: usa Invoker Commands nativi.

Apertura programmatica: `DialogComponent.showModal('cart-drawer')` da JS (es. post add-to-cart).

`dialog-opener` solo per target senza `<dialog>` nativo (menu mobile header).

## Form e product

```liquid
<div class="buy-button-block" {{ block.shopify_attributes }}>
  <product-form on:submit="onSubmit">
    {% form 'product', product %}
      <input type="hidden" name="id" value="{{ variant.id }}">
      <button type="submit">Add to bag</button>
    {% endform %}
  </product-form>
</div>
```

`{% form 'localization' %}` in `localization-drawer`; host `localization-form` con `on:input="handleInput"`.

## Variante prodotto e preselect

**Un solo posto risolve la variante:** [`sections/product.liquid`](../sections/product.liquid).

```liquid
{% liquid
  assign variant = product.selected_variant
  if variant == blank and section.settings.preselect_variant
    assign variant = product.selected_or_first_available_variant
  endif
%}

{% content_for 'block', type: 'pdp-gallery', id: 'gallery', product: product, variant: variant %}
```

I block e snippet figli ricevono `variant` — **non** ricalcolano preselect:

```liquid
assign current_variant = variant | default: closest.variant
```

Setting `preselect_variant` solo sulla section product. Bootstrap JS: `data-preselect-variant-id` su `product-page` quando preselect ON e nessun `?variant=`.

## Variant picker — source via Liquid

`data-source` **mai** in block settings. Il caller passa il param:

```liquid
{% render 'variant-picker', product: product, variant: variant, source: 'pdp' %}
```

PDP: [`blocks/pdp-product-configurator.liquid`](../blocks/pdp-product-configurator.liquid) passa `variant` dal `closest`. Block globale [`blocks/variant-picker.liquid`](../blocks/variant-picker.liquid) senza source.


## `{% doc %}` nei componenti riusabili

```liquid
{% doc %}
  Renders variant picker block wrapper.
  @param {product} product - Product object
{% enddoc %}
```

## Naming

### Global vs scoped

| Livello | Handle | Display name (schema) |
|---|---|---|
| Block type | `kebab-case`; prefisso dominio se scoped | sentence case |
| Section | `kebab-case`; prefisso se feature-specifica | `t:general.*` o sentence case |
| Snippet | stesso schema del componente | n/a |
| CE tag | `kebab-case` | n/a |
| JS file | PascalCase se dominio principale | n/a |

**Global** (riusabile ovunque): `variant-picker`, `buy-button`, `product-card-*`, `filters`, `text`, `group`, `breadcrumb`, `schema-*`.

**Scoped** (prefisso dominio): `pdp-gallery`, `pdp-product-info`, `pdp-dossier-*`, `pdp-siblings`, `pdp-bundle`.

**Shopify** (non rinominare): `product`, `collection`, `cart`.

### Block wrapper

Se block type = CE tag → wrapper `.nome-block` (vedi [12-css.md](12-css.md)).

### Checklist pre-rename

1. `rg 'type_handle' templates/ blocks/`
2. Verificare global vs scoped
3. Aggiornare [20-feature-map.md](20-feature-map.md)

## Accessibilità HTML

- `<button>` per azioni, `<a>` per navigazione, `<form>` per submit.
- Label accessibili su link e bottoni; `aria-label` dove il testo visivo non basta.
- Immagini: `alt`, `width`, `height`, `loading`.
- Non trasformare `div` in controlli interattivi.
- Dialog: `aria-label` sul `<dialog>`; `role="listbox"` / `role="option"` dove serve (search).

## Schema JSON

- Label e info con chiavi `t:` per traduzioni.
- `presets` con `category` coerente.
- `tag: null` sui block wrapper senza tag HTML proprio.

## Anti-pattern

- Snippet monolitici al posto di blocks componibili
- Logica business in Liquid che dovrebbe stare in filtri/oggetti Shopify
- `onclick` inline su elementi gestiti da CE
- `commandfor` diverso dall'`id` del `<dialog>`
- Duplicare markup dialog invece di riusare il pattern `dialog-component`
