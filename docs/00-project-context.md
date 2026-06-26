# Project Context

## Profilo

`lorenzo-dev` e' un tema Shopify custom. La direzione tecnica e' conservativa: Liquid quando il dato e' disponibile server-side, CSS per stato/layout/varianti, JavaScript vanilla solo per interazioni runtime e dati async.

Stack reale del repo:

- Shopify Liquid
- Theme blocks e snippets
- CSS nativo in `{% stylesheet %}`
- JavaScript modules con import map
- Custom Elements
- Storefront GraphQL API per siblings prodotto
- Ajax Cart API Shopify

## Architettura tema

- `layout/theme.liquid` e' il wrapper principale: carica CSS, JS, meta tags, header group, dialog group, footer group e `content_for_layout`.
- `snippets/theme-js.liquid` definisce gli alias `@theme/*`, preload dei moduli e carica `assets/global.js`.
- `assets/global.js` registra i moduli principali: header, dialog, collection, cart, product, siblings e product card.
- `snippets/variables-js.liquid` espone `window.Theme` con routes/template/traduzioni e `window.storefront` con endpoint GraphQL.
- `sections/` compone pagine e aree principali.
- `blocks/` contiene componenti configurabili Shopify; sono la prima scelta quando la feature deve essere componibile.
- `snippets/` contiene rendering riusabili piccoli, senza stato complesso.
- `assets/HTMLComponent.js` e' la base per custom elements con `ref`, eventi delegati e update parziali.

## Flussi principali

PDP:

- `sections/product.liquid` monta tre blocchi: dossier, gallery e info.
- `blocks/pdp-product-info.liquid` contiene prezzo, form, variant picker e bundle fusion.
- `snippets/pdp-variant-picker.liquid` monta `pdp-siblings`.
- `assets/product.js` calcola variabili CSS dinamiche per altezze sticky/mobile.
- `assets/pdp-siblings.js` costruisce tab e chips usando `ColorSibling`.

Collection:

- `sections/collection.liquid` monta filtro e `product-grid`.
- `templates/collection.grid.liquid` e `templates/collection.filters.liquid` sono partial render per aggiornamenti async.
- `assets/collection.js` gestisce eventi filtro, fetch HTML e replace del contenuto.

Product card:

- `blocks/product-card.liquid` compone media/info/swatches via blocks.
- `snippets/product-card.liquid` definisce wrapper `product-card`.
- `assets/product-card.js` aggiorna card e swatches tramite partial `view=card`.

Cart e bundle:

- `snippets/cart-drawer.liquid` e `sections/cart-drawer.liquid` renderizzano il drawer.
- `assets/cart.js` contiene `CartHandler`, `product-form`, `cart-drawer`, `pdp-bundle`, `cart-item`, `cart-money`.
- `snippets/bundle-fusion-line-item.liquid` renderizza le righe bundle nel cart.

## Principio operativo

Ogni modifica parte dal componente piu' vicino al dominio. Se esiste gia' un block, custom element, helper o partial view, si usa quello. Nuovo codice solo quando il pattern esistente non copre il caso.
