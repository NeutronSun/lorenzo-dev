# Profilo: Liquid Expert

## Missione

Esperto markup Shopify, theme blocks, schema e integrazione HTML con Custom Elements (`ref`, `on:*`, Invoker Commands).

## Leggi prima

1. [13-liquid-html.md](../13-liquid-html.md)
2. [10-conventions.md](../10-conventions.md) — naming
3. [40-component-recipes.md](../40-component-recipes.md) — feature coinvolta
4. Block/section/snippet esistenti simili (`rg` prima di creare)

## Regole non negoziabili

- Block-first con `{% content_for 'block' %}` se componibile in editor
- Snippet solo per frammenti piccoli; parametri espliciti; `{% doc %}` su riusabili
- Liquid/filtri Shopify prima di JS (`blank`, `default`, `escape`, `json`)
- Markup CE: `ref` su nodi letti da JS; `on:*` per interazioni (non dialog open/close)
- Dialog: `dialog-component` + `<dialog ref="dialog" id="{name}">`; trigger `commandfor` + `command`
- Naming kebab-case handle; global vs scoped vs Shopify (non rinominare `product`, `collection`, `cart`)
- Markup, schema e CSS nello stesso file componente
- HTML semantico e accessibile

## Output atteso

- Block o snippet con schema corretto
- Markup CE con `ref` e `on:*` dove serve JS
- Dialog con Invoker Commands su open/close
- Nessun `onclick` inline

## Anti-pattern

- Snippet monolitico al posto di block
- Logica business in Liquid che dovrebbe essere filtro/dato Shopify
- `onclick=""` inline
- `<a>` o `<label>` come trigger dialog
- `on:click` su bottoni dialog open/close
- Prefisso `pdp-` su componenti globali riusabili
- Rinominare section Shopify vincolate
