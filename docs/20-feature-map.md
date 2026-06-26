# Feature Map

## PDP

File principali:

- `sections/product.liquid`
- `sections/product-breadcrumb.liquid`
- `blocks/pdp-product-dossier.liquid`
- `blocks/pdp-dossier-edition.liquid`
- `blocks/pdp-card-stats.liquid`
- `blocks/pdp-dossier-description.liquid`
- `blocks/pdp-dossier-tech.liquid`
- `blocks/pdp-dossier-tech-row.liquid`
- `blocks/pdp-gallery.liquid`
- `blocks/pdp-product-info.liquid`
- `snippets/pdp-variant-picker.liquid`
- `snippets/pdp-valerio-trait.liquid`
- `assets/product.js`
- `assets/pdp-siblings.js`

La PDP e' composta da tre blocchi dentro `product-page`: dossier, gallery e info. Le altezze sticky/mobile sono coordinate da `assets/product.js` tramite CSS custom properties, non da layout JS invasivo.

Il dossier (`pdp-product-dossier`) compone nested blocks via `{% content_for 'blocks' %}`:

- `pdp-dossier-edition` — season, number, series
- `pdp-card-stats` — combat, meters (health/mana/energy), tratti valerio
- `pdp-dossier-description` — note prodotto
- `pdp-dossier-tech` — righe tecniche (`pdp-dossier-tech-row`)

Gli orb valerio sono renderizzati dal snippet `pdp-valerio-trait` dentro `pdp-card-stats`.

Quando aggiungi una parte PDP, preferisci un block se deve essere gestibile in editor. Usa snippet solo per un frammento interno riusabile.

## Siblings

File principali:

- `assets/color-sibling.js`
- `assets/pdp-siblings.js`
- `assets/product-card.js`
- `snippets/pdp-variant-picker.liquid`
- `snippets/product-card-swatches.liquid`

`ColorSibling` e' l'helper globale per Storefront API, query per tag, mapping base e cache `sessionStorage`. Non duplicare fetch GraphQL in componenti specifici se puoi usare `ColorSibling.fetchQuery`.

`pdp-siblings` usa `ColorSibling` per tabs Tema/Fusion sul PDP. `product-card-swatches` usa lo stesso helper per swatches delle card. Se serve un nuovo sibling, parti da questi custom elements.

## Product card

File principali:

- `blocks/product-card.liquid`
- `snippets/product-card.liquid`
- `snippets/product-card-media.liquid`
- `snippets/product-card-info.liquid`
- `snippets/product-card-swatches.liquid`
- `templates/product.card.liquid`
- `assets/product-card.js`

Le card cambiano sibling caricando il partial `view=card` e sostituendo refs specifici. Mantieni questo modello: fetch HTML, `DOMParser`, `updateRef`, cache breve in `sessionStorage`.

## Collection e filters

File principali:

- `sections/collection.liquid`
- `blocks/filters.liquid`
- `snippets/filters.liquid`
- `templates/collection.grid.liquid`
- `templates/collection.filters.liquid`
- `assets/collection.js`

I filtri pubblicano `OnFiltersApplyEvent`; la griglia ascolta e aggiorna HTML via partial view. Prima di aggiungere nuovi stati JS, verifica se un input, un attributo o CSS `:has()` bastano.

## Cart drawer

File principali:

- `snippets/cart-drawer.liquid`
- `sections/cart-drawer.liquid`
- `snippets/cart-line-price.liquid`
- `assets/cart.js`

`CartHandler` centralizza Ajax Cart API e pubblica eventi cart. `cart-drawer` ascolta gli eventi e aggiorna count, body e totals. Non fare fetch cart diretto fuori da `CartHandler` se puoi estenderlo.

## Bundle fusion

File principali:

- `blocks/pdp-product-info.liquid`
- `snippets/bundle-fusion-line-item.liquid`
- `assets/cart.js`

`pdp-bundle` legge JSON da `ref="bundleData"` e aggiunge piu' item con proprieta' `_bundleId`. Le righe cart bundle usano `bundle-fusion-line-item`. Mantieni il collegamento via proprieta' cart, non tramite stato globale JS.

## Dialog, header e layout globale

File principali:

- `assets/dialog.js`
- `assets/header.js`
- `sections/header.liquid`
- `snippets/header-menu.liquid`
- `assets/components.css`
- `assets/critical.css`

Header e dialog hanno gia' custom elements e classi globali. Prima di aggiungere drawer, overlay, menu o azioni sticky, cerca questi componenti e riusa pattern, eventi e classi esistenti.
