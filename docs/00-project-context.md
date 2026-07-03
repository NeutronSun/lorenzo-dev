# Project Context

## Profilo

`lorenzo-dev` e' un tema Shopify custom. La direzione tecnica e' conservativa, paragonabile ad una DITTATURA: Liquid quando il dato e' disponibile server-side, CSS per stato/layout/varianti, JavaScript vanilla solo per interazioni runtime e dati async.
JS deve essere usato il meno possibile, solo per gestire layout, prendere heigths, fetch, robe secondarie.
L'obiettivo è avere tutte le feature possibile di un tema premium di Shopify ma fatte a regola d'arte, dando priorità all'esperienza utente ma anche allo sviluppatore.

Ricorda, siamo andati sulla luna con meno di 4kb di ram... se il JS di una dialog è lungo quanto
l'assembly dell'apollo 11 c'è qualcosa di molto sbagliato.

Il codice deve essere sempre pulito, elegante e performante.

Se l'utente clicca su una product card non si deve nemmeno accorgere del cambio pagina per quanto il sito è reattivo, tutto ciò che l'utente vede deve essere già lì e generato server side.
Siblings, voci interne al menu (numero prodotti collection), section deferred al di fuori della viewport in questo caso sono tutte cose secondarie che:
- 1: non generano layout shifting
- 2: non sono vitali
- 3: sono in display none, nasconde da un details...

è importante evitare che i primi 1/2 secondi di caricamento del sito siano tutti pezzi che arrivano uno dopo l'altro (nabla, antonioli...)

ovviamente, in caso di PLP custom (vedi algolia), ci possiamo fare poco. In quel caso, allora, prevedere SEMPRE uno skeleton loader, se nelle viewport vedo 3 righe, skeleton di 3 righe, e così via...

JS non è il male assoluto, ma i JS dev si.

CSS non è una merda, anche se lo sembra, quindi usalo.

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
- `assets/global.js` registra i moduli PascalCase via import map (`StickyHeader`, `Dialog`, `Collection`, `Cart`, `Product`, `PdpSiblings`, `ProductCard`, …).
- `snippets/variables-js.liquid` espone `window.Theme` con routes/template/traduzioni e `window.storefront` con endpoint GraphQL.
- `sections/` compone pagine e aree principali.
- `blocks/` contiene componenti configurabili Shopify; sono la prima scelta quando la feature deve essere componibile.
- `snippets/` contiene rendering riusabili piccoli, senza stato complesso.
- `assets/HTMLComponent.js` e' la base per custom elements con `ref`, eventi delegati e update parziali.

## Flussi principali

PDP:

- `sections/product.liquid` monta tre blocchi: dossier, gallery e info.
- `blocks/pdp-product-info.liquid` contiene prezzo, form, variant picker e bundle fusion.
- `blocks/pdp-product-info.liquid` monta `pdp-siblings` con tab configurabili via `pdp-sibling-tab`.
- `assets/Product.js` calcola variabili CSS dinamiche per altezze sticky/mobile.
- `assets/PdpSiblings.js` costruisce tab e chips usando `ColorSibling`.

Collection:

- `sections/collection.liquid` monta filtro e `product-grid`.
- `templates/collection.grid.liquid` e `templates/collection.filters.liquid` sono partial render per aggiornamenti async.
- `assets/Collection.js` gestisce eventi filtro, fetch HTML e replace del contenuto.

Product card:

- `blocks/product-card.liquid` compone media/info/swatches via blocks.
- `snippets/product-card.liquid` definisce wrapper `product-card`.
- `assets/ProductCard.js` aggiorna card e swatches tramite partial `view=card`.

Cart e bundle:

- `snippets/cart-drawer.liquid` e `sections/cart-drawer.liquid` renderizzano il drawer.
- `assets/Cart.js` contiene `CartHandler`, `product-form`, `cart-drawer`, `pdp-bundle`, `cart-item`, `cart-money`.
- `snippets/bundle-fusion-line-item.liquid` renderizza le righe bundle nel cart.

## Principio operativo

Ogni modifica parte dal componente piu' vicino al dominio. Se esiste gia' un block, custom element, helper o partial view, si usa quello. Nuovo codice solo quando il pattern esistente non copre il caso.
