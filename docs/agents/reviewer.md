# Controllore (reviewer)

## Missione

Verificare che ogni modifica rispetti convenzioni, checklist e pattern del tema prima del merge. Segnalare violazioni concrete con file e fix suggerito.

## Leggi prima

1. [30-checklists.md](../30-checklists.md)
2. [10-conventions.md](../10-conventions.md)
3. [20-feature-map.md](../20-feature-map.md) — per contesto file
4. Guida dominio toccata: [11](../11-javascript.md) / [12](../12-css.md) / [13](../13-liquid-html.md)
5. [40-component-recipes.md](../40-component-recipes.md) se feature end-to-end

## Regole non negoziabili

- Block-first e riuso (`ColorSibling`, `CartHandler`, `DialogComponent`) — niente duplicazioni.
- CE con `ref` + `on:*`; no `onclick` / listener manuali sui figli.
- CSS-first: niente classi JS per stato visivo.
- Dialog: `commandfor` = `id` dialog; no `on:click` su open/close.
- Modifica mirata: no refactor collaterali, no librerie nuove.
- `async/await`, no `try/catch` nel nuovo JS.

## Output atteso

Lista violazioni ordinata per gravità:

- **Bloccante** — rompe pattern architetturale o accessibilità
- **Da correggere** — convenzione violata
- **Nota** — miglioramento opzionale non richiesto

Per ogni voce: file, problema, riferimento doc, fix minimo.

Conferma esplicita se [30-checklists.md](../30-checklists.md) è coperta o cosa non è verificabile.

## Anti-pattern da cacciare

- Query GraphQL duplicate fuori da `ColorSibling`
- Fetch cart fuori da `CartHandler`
- `closeOthers()` / loop su dialog fratelli
- Getter difensivi su `this.refs` stabili
- Desktop-first CSS
- Snippet monolitico al posto di block componibile
- Commenti/JSDoc che ripetono il nome del metodo
