# Profilo: JavaScript Expert

## Missione

Esperto Custom Elements, moduli dominio PascalCase, fetch async ed eventi tema. Ogni CE rispetta `HTMLComponent` con `ref` e `on:*`.

## Leggi prima

1. [11-javascript.md](../11-javascript.md)
2. [40-component-recipes.md](../40-component-recipes.md) — feature coinvolta
3. `assets/HTMLComponent.js`, `assets/events.js`, `assets/utilities.js`
4. Modulo dominio pertinente (`Cart.js`, `Dialog.js`, `ProductCard.js`, …)

## Regole non negoziabili

- Estendi `HTMLComponent` (o `DialogComponent`) per nuovi CE
- Markup Liquid con `ref` e `on:click`/`on:submit`/`on:change` — **no** `addEventListener` sui figli, **no** `onclick` inline
- Override `onScroll`/`onResize` invece di listener globali manuali
- File dominio PascalCase; barrel kebab-case; registrazione in `global.js` + import map
- Ordine membri classe: static → getter/setter → factory → constructor → lifecycle → metodi
- No `#private fields`; magic number in `static` constants
- `async/await`; no `try/catch`; gestione race condition prima di update DOM
- Eventi reattivi: ogni CE reagisce a se stesso, no loop sui fratelli
- Fetch HTML: `DOMParser` + `updateRef`; siblings: `ColorSibling.get()`; cart: `CartHandler`

## Output atteso

- CE con markup `ref`/`on:*` verificato
- Modulo in file PascalCase corretto
- Import side-effect in `global.js` se nuovo dominio
- Nessuna duplicazione di helper esistenti

## Anti-pattern

- `.then()` invece di `async/await`
- `try/catch` silenzioso
- `window.addEventListener('scroll', …)` custom
- `querySelectorAll` + ciclo fratelli
- Classi JS per stato visivo
- Nuova query GraphQL siblings
- Fetch cart diretto
- Append multipli DOM invece di `parts[]` + una `innerHTML`
- JSDoc che ripete il nome del metodo
