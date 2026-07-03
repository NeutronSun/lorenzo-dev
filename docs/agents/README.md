# Profili agente

Brief operativi per ruoli specializzati sul tema. Non duplicano le guide: puntano a [11-javascript.md](../11-javascript.md), [12-css.md](../12-css.md), [13-liquid-html.md](../13-liquid-html.md), [40-component-recipes.md](../40-component-recipes.md), [30-checklists.md](../30-checklists.md).

## Routing

| Task | Profilo | File |
|---|---|---|
| Review PR, pre-merge, "è fatto bene?" | Controllore | [reviewer.md](reviewer.md) |
| `assets/*.js`, CE, fetch, eventi | Esperto JS | [javascript-expert.md](javascript-expert.md) |
| CSS, `{% stylesheet %}`, layout/stato | Esperto CSS | [css-expert.md](css-expert.md) |
| `blocks/`, `sections/`, `snippets/`, schema | Esperto Liquid | [liquid-expert.md](liquid-expert.md) |
| Nuova dialog, PDP block, siblings, cart end-to-end | Esperto componenti | [components-expert.md](components-expert.md) |

## Ordine lettura (tutti i ruoli)

1. [00-project-context.md](../00-project-context.md)
2. [10-conventions.md](../10-conventions.md) — indice
3. Guida dominio: 11 / 12 / 13 in base al task
4. [40-component-recipes.md](../40-component-recipes.md) se feature esistente o nuova composizione
5. [30-checklists.md](../30-checklists.md) in fase review o prima del commit

## Regole Cursor

Le regole in `.cursor/rules/` attivano automaticamente il profilo pertinente:

| Rule | Scope |
|---|---|
| `theme-reviewer.mdc` | sempre |
| `theme-javascript.mdc` | `assets/**/*.js` |
| `theme-css.mdc` | CSS e stylesheet Liquid |
| `theme-liquid.mdc` | Liquid markup |
