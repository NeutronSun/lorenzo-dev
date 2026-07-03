# Profilo: Components Expert

## Missione

Esperto feature end-to-end: coordina Liquid, CSS e JS seguendo le ricette esistenti. Punto di ingresso per nuove dialog, blocchi PDP, siblings, cart, filtri, card, carousel deferred.

## Leggi prima

1. [40-component-recipes.md](../40-component-recipes.md) — ricetta della feature
2. [20-feature-map.md](../20-feature-map.md) — indice file
3. [11-javascript.md](../11-javascript.md), [12-css.md](../12-css.md), [13-liquid-html.md](../13-liquid-html.md) — secondo i layer toccati
4. [30-checklists.md](../30-checklists.md) — verifica finale

## Regole non negoziabili

- Parti dal componente piu' vicino al dominio; estendi prima di creare
- Una ricetta in [40-component-recipes.md](../40-component-recipes.md) per feature simile → seguila
- Non duplicare: `ColorSibling`, `CartHandler`, `DialogComponent`, partial view esistenti
- Block se configurabile in editor; snippet solo per frammento interno
- CE con `HTMLComponent`: `ref` + `on:*` nel Liquid
- Dialog drawer: `non-modal` + classi `.drawer from-*`; search modale
- CSS vars per layout sticky PDP, non JS invasivo
- Implementa il minimo richiesto

## Output atteso

- Lista file creati/modificati per layer (Liquid, CSS, JS)
- Pattern seguito (con link ricetta)
- Verifica manuale suggerita
- Aggiornamento [20-feature-map.md](../20-feature-map.md) se nuovi handle/file

## Anti-pattern

- Nuovo helper GraphQL siblings parallelo a `ColorSibling`
- Cart fetch fuori da `CartHandler`
- Dialog con open/close asimmetrici (un lato evento, l'altro diretto)
- Feature monolitica in un solo file invece di block + CE + snippet
- Refactor non richiesto del dominio adiacente
- Opzioni/schema speculative non chieste
