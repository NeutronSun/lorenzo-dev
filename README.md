# lorenzo-dev

Tema Shopify custom, basato su Liquid, CSS nativo e JavaScript vanilla. Il progetto usa theme blocks, snippets piccoli, Custom Elements e Storefront API solo dove il dato non puo' arrivare da Liquid.

## Setup

Prerequisiti:

- Node.js
- Shopify CLI
- accesso allo store `lorenzo-dev`

Comandi principali:

```bash
npm run check
npm run store:dev
npm run store:share
npm run prod:pull
```

Ambienti Shopify:

- `store`: sviluppo locale sullo store `lorenzo-dev`
- `prod`: tema `129904967726` sullo store `lorenzo-dev`

Nota: `prod:push` esiste in `package.json`, ma punta a `prod:push-only`, che al momento non e' definito.

## Struttura

- `layout/`: wrapper pagina, include CSS/JS globali e gruppi header/dialog/footer.
- `sections/`: sezioni Shopify montate dai template o dai group.
- `blocks/`: theme blocks componibili, da preferire quando una feature deve vivere nell'editor.
- `snippets/`: frammenti Liquid riusabili e rendering piccoli.
- `assets/`: JS modules, CSS globali, icone e utility.
- `templates/`: JSON/liquid templates e partial view tipo `product.card`.
- `config/`: settings Shopify globali.
- `locales/`: traduzioni e schema locale.
- `src/branding/`: configurazione checkout/accounts.

## Entry point principali

- `layout/theme.liquid`: monta `theme-css`, `theme-js`, meta tags e section groups.
- `snippets/theme-css.liquid`: include variabili e CSS globali.
- `snippets/theme-js.liquid`: definisce import map, modulepreload e `global.js`.
- `assets/global.js`: importa i custom elements globali.
- `snippets/variables-js.liquid`: espone `window.Theme` e `window.storefront`.

## Docs operative

Prima di modificare il tema:

1. [Contesto progetto](docs/00-project-context.md)
2. [Convenzioni](docs/10-conventions.md)
3. [Mappa feature](docs/20-feature-map.md)
4. [Checklist](docs/30-checklists.md)

Le regole importanti sono: block-first, CSS-first, mobile-first, flex-first, riuso prima di nuovo codice, `ref`/`this.refs.nome` nei Custom Elements, niente nuovo `try/catch`.
