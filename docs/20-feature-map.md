# Feature Map

## PDP

File principali:

- `sections/product.liquid`
- `sections/product-breadcrumb.liquid`
- `blocks/pdp-product-dossier.liquid`
- `blocks/pdp-dossier-edition.liquid`
- `blocks/pdp-dossier-stats.liquid`
- `blocks/pdp-dossier-description.liquid`
- `blocks/pdp-dossier-tech.liquid`
- `blocks/pdp-dossier-tech-row.liquid`
- `blocks/pdp-gallery.liquid`
- `blocks/pdp-product-info.liquid`
- `blocks/variant-picker.liquid`
- `blocks/buy-button.liquid`
- `blocks/pdp-sibling-tab.liquid`
- `snippets/pdp-valerio-trait.liquid`
- `assets/Product.js`
- `assets/PdpSiblings.js`

La PDP e' composta da tre blocchi dentro `product-page`: dossier, gallery e info. Le altezze sticky/mobile sono coordinate da `assets/Product.js` (`ProductPage`) tramite CSS custom properties, non da layout JS invasivo.

Il dossier (`pdp-product-dossier`) compone nested blocks via `{% content_for 'blocks' %}`:

- `pdp-dossier-edition` — season, number, series
- `pdp-dossier-stats` — combat, meters (health/mana/energy), tratti valerio
- `pdp-dossier-description` — note prodotto
- `pdp-dossier-tech` — righe tecniche (`pdp-dossier-tech-row`)

Gli orb valerio sono renderizzati dal snippet `pdp-valerio-trait` dentro `pdp-dossier-stats`.

Quando aggiungi una parte PDP, preferisci un block se deve essere gestibile in editor. Usa snippet solo per un frammento interno riusabile.

## Siblings

File principali:

- `assets/ColorSibling.js`
- `assets/PdpSiblings.js`
- `assets/ProductCard.js`
- `blocks/pdp-sibling-tab.liquid`
- `snippets/product-card-swatches.liquid`

`GraphQL` in `assets/GraphQL.js` centralizza config Storefront, headers e fetch. `ColorSibling` e' l'helper per siblings: query per tag, mapping e cache `sessionStorage`. Non duplicare fetch GraphQL in componenti specifici: usa `ColorSibling.get(tag, limit)` o `GraphQL.request(payload, label)` per altre query.

`pdp-siblings` legge tab da blocchi `pdp-sibling-tab` (solo tag + label) e fa N query via `ColorSibling`. Template e chip restano in `pdp-product-info`.

## Product card

File principali:

- `blocks/product-card.liquid`
- `snippets/product-card.liquid`
- `snippets/product-card-media.liquid`
- `snippets/product-card-info.liquid`
- `snippets/product-card-swatches.liquid`
- `templates/product.card.liquid`
- `assets/ProductCard.js`

Le card cambiano sibling caricando il partial `view=card` e sostituendo refs specifici. Mantieni questo modello: fetch HTML, `DOMParser`, `updateRef`, cache breve in `sessionStorage`.

## Collection e filters

File principali:

- `sections/collection.liquid`
- `blocks/filters.liquid`
- `snippets/filters.liquid`
- `templates/collection.grid.liquid`
- `templates/collection.filters.liquid`
- `assets/Collection.js`

I filtri pubblicano `OnFiltersApplyEvent`; la griglia ascolta e aggiorna HTML via partial view. Prima di aggiungere nuovi stati JS, verifica se un input, un attributo o CSS `:has()` bastano.

## Cart drawer

File principali:

- `snippets/cart-drawer.liquid`
- `sections/cart-drawer.liquid`
- `snippets/cart-line-price.liquid`
- `assets/Cart.js`

`CartHandler` centralizza Ajax Cart API e pubblica eventi cart. `cart-drawer` ascolta gli eventi e aggiorna count, body e totals. Non fare fetch cart diretto fuori da `CartHandler` se puoi estenderlo.

## Bundle fusion

File principali:

- `blocks/pdp-product-info.liquid`
- `snippets/bundle-fusion-line-item.liquid`
- `assets/Cart.js`

`pdp-bundle` legge JSON da `ref="bundleData"` e aggiunge piu' item con proprieta' `_bundleId`. Le righe cart bundle usano `bundle-fusion-line-item`. Mantieni il collegamento via proprieta' cart, non tramite stato globale JS.

## Dialog, header e layout globale

File principali:

- `assets/Dialog.js`
- `assets/StickyHeader.js`
- `sections/header.liquid`
- `snippets/header-menu.liquid`
- `assets/components.css`
- `assets/critical.css`

Header e dialog: `commandfor` deve essere identico all'`id` del `<dialog>` target (uguale al `name` del component). Solo `<button type="button">` per open/close. Nessun `on:click` sui bottoni open/close. Open programmatico via `DialogComponent.showModal(name)`. `dialog-opener` solo per menu mobile senza `<dialog>`.

Modalita' non-modale: l'attributo `non-modal` sull'host (`<dialog-component name="..." non-modal>`) apre il dialog con `dialog.show()` invece di `showModal()`, lasciando la pagina (e l'header) interattivi. Usato dai drawer (cart, localization, filtri), non dal search-dialog. In non-modale non c'e' `::backdrop` nativa: il dim resta `body:has(...[open])::after`. Chiusura: bottone `command="request-close"` ed Esc (`onEscape` in `DialogComponent`). Non c'e' chiusura al click sull'overlay.

## Swiper carousel

File principali:

- `assets/DeferredSection.js`
- `assets/swiper-element-bundle.min.js`
- `snippets/swiper.liquid`
- `snippets/deferred-section-skeleton.liquid`
- `sections/product-recommendations-carousel.liquid`

`deferred-section` fetcha `routes.product_recommendations_url` con `section_id`, `product_id`, `limit` e `intent`. Le card usano `{% content_for 'block', type: 'product-card' %}` come collection/search.
