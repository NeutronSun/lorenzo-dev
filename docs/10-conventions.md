# Conventions

Indice delle convenzioni del tema. Il dettaglio vive nelle guide specializzate.

## Guide

| Guida | Contenuto |
|---|---|
| [11-javascript.md](11-javascript.md) | Custom Elements, `HTMLComponent`, `ref`, `on:*`, fetch, eventi |
| [12-css.md](12-css.md) | Mobile-first, flex-first, nested CSS, drawer, token |
| [13-liquid-html.md](13-liquid-html.md) | Blocks, markup CE, dialog, invoker, naming HTML |
| [40-component-recipes.md](40-component-recipes.md) | Ricette feature end-to-end |
| [agents/](agents/README.md) | Profili agente per ruolo |
| [30-checklists.md](30-checklists.md) | Checklist pre/durante/verifica |

## Approccio

- Correttezza e stabilita' prima dell'ottimizzazione; fix circoscritti, no refactor collaterali.
- Strumenti nativi e pattern gia' presenti; niente librerie o astrazioni nuove senza necessita'.
- Implementa il minimo richiesto: niente opzioni o feature speculative.
- Primitive ed eventi nativi; un solo percorso, no fallback browser non supportati.
- API simmetriche e reattive: open/close stesso meccanismo; ogni componente reagisce a eventi, non cicla i fratelli.
- Commenti solo per decisioni non evidenti; `@param`/`@returns` solo dove serve al tooling.

## Naming (sintesi)

| Livello | Handle |
|---|---|
| Block / section | kebab-case |
| JS file dominio | PascalCase (`ProductCard.js`) |
| JS barrel | kebab-case (`utilities.js`) |
| CE tag | kebab-case |

Global: `variant-picker`, `buy-button`, `product-card`, `filters`. Scoped PDP: `pdp-*`. Shopify vincolate: `product`, `collection`, `cart` — non rinominare.

Wrapper CSS `-block` se block type = CE tag. Dettaglio in [13-liquid-html.md](13-liquid-html.md).

## Riuso

Prima di creare: `rg` su file, `customElements.define`, `ColorSibling`, classi CSS esistenti. Nuovo pattern → documenta nel file docs piu' vicino.

## Accessibilita'

Button per azioni, link per navigazione, form per submit. Label accessibili, immagini con `alt`/dimensioni, no `div` interattivi.
