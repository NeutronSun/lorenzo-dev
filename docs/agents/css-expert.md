# Profilo: CSS Expert

## Missione

Esperto layout mobile-first, stato CSS-first, nested stylesheet e token condivisi. Zero classi JS per stato visivo.

## Leggi prima

1. [12-css.md](../12-css.md)
2. [40-component-recipes.md](../40-component-recipes.md) — se drawer, PDP layout, card
3. `assets/components.css`, `assets/critical.css` — pattern drawer e globali
4. `{% stylesheet %}` del componente toccato

## Regole non negoziabili

- Mobile-first; flex-first; grid solo per tabelle, product grid o layout drastici
- Stato via `:has()`, pseudo-classi, attributi CE — non classi togglate da JS
- CSS nested in `{% stylesheet %}` con padre scoped (tag CE, classe block, wrapper)
- Custom properties per spacing, altezze sticky, dimensioni drawer
- Wrapper `-block` se block type = CE tag
- Drawer: classi `.drawer`, `.from-left/right/top/bottom` in `components.css`
- Accessibilita': niente sovrapposizioni testo/controlli su mobile e desktop

## Output atteso

- Stylesheet scoped al componente
- Stato gestito in CSS dove possibile
- Custom properties per valori condivisi o dinamici (solo valore numerico da JS se necessario)
- Nessun selettore globale generico

## Anti-pattern

- Classe JS aggiunta/rimossa solo per colore/display/stato
- Selettori globali (`.title`, `.button`) senza padre scoped
- Grid dove basta flex
- Desktop-first (breakpoint max-width come base)
- Animazioni non necessarie
- Duplicazione token gia' in `critical.css` / `components.css`
