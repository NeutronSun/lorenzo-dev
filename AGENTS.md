# AGENTS.md

## Prima di toccare codice

Leggi questi file in ordine:

1. [docs/00-project-context.md](docs/00-project-context.md)
2. [docs/10-conventions.md](docs/10-conventions.md)
3. [docs/20-feature-map.md](docs/20-feature-map.md)
4. [docs/30-checklists.md](docs/30-checklists.md)

Questo repository e' un tema Shopify. Le modifiche devono restare mirate, conservative e coerenti con Liquid, CSS nativo, JavaScript vanilla e Custom Elements gia' presenti.

## Regole non negoziabili

- Usa theme blocks e `{% content_for 'block' %}` dove possibile.
- Prima cerca classi, custom elements, helper, snippet e query gia' esistenti.
- Non duplicare logica centralizzata: per siblings e Storefront API usa `ColorSibling` e i custom elements gia' presenti.
- CSS-first: se uno stato, layout o variante si puo' fare in CSS, non aggiungere JS.
- Mobile-first e flex-first: usa `flex` di default; usa `grid` solo per tabelle, griglie prodotto reali o layout che cambiano drasticamente.
- Usa CSS custom properties per valori configurabili o condivisi.
- Usa nested CSS nel Liquid del componente, con classe/tag padre scoped e classi figlie sotto.
- Usa `ref` e `this.refs.nome` tramite `HTMLComponent`; per riferimenti stabili leggi `this.refs.nome` direttamente, senza getter difensivi o metodi `getNodo()` con fallback. Usa getter solo se il nodo cambia o e' condizionale.
- Preferisci primitive ed eventi nativi a logica JS custom: usa l'evento `command` degli Invoker Commands, il `toggle` del `<dialog>`, attributi e pseudo-classi invece di listener globali, capture o handler fatti a mano.
- Un solo percorso: niente fallback per browser non supportati salvo richiesta esplicita (il tema mira a browser moderni).
- API simmetriche: se l'apertura usa un meccanismo (es. trigger event con check sul `name`), anche la chiusura usa lo stesso; mai un lato diretto e l'altro a evento.
- Reattivita' invece di iterazione: invece di un metodo che fa `querySelectorAll` e cicla i fratelli per agire su di loro, fai reagire ogni componente a un evento e agire su se stesso.
- Implementa il minimo che soddisfa la richiesta: niente configurabilita', opzioni, selettori parametrizzabili o hook speculativi non chiesti.
- Niente wrapper di indirezione inutili: se un metodo si limita a chiamarne altri due, inline.
- Nel nuovo JS non usare `try/catch`: preferisci early return, fallback vuoti e controlli espliciti.
- Usa sempre `async/await`, mai `.then()`.
- Gestisci timing e race condition: prima di applicare un risultato asincrono verifica che richiesta, componente e DOM siano ancora attuali.
- Evita append DOM multipli: costruisci `parts[]` e fai una sola assegnazione `innerHTML`.
- Sposta magic number, stringhe di stato e valori di dominio ripetuti in costanti `static` o CSS custom properties. Eccezione: token standard DOM/piattaforma usati una volta sola (`'toggle'`, `'command'`, `'Escape'`, `'show-modal'`, `'non-modal'`) restano inline — non creare una `static` per qualcosa usato una volta.
- Per helper JS senza stato usa classi con metodi statici; usa factory statiche ed enum-like immutabili quando rendono il dominio piu' esplicito.
- Non aggiungere librerie se Liquid, CSS o JS vanilla bastano.
- Non fare refactor non richiesti.
- Dai priorita' a correttezza e stabilita'; ottimizza solo dopo che il comportamento e' verificato.
- Non aggiungere commenti che descrivono codice gia' evidente, inclusi JSDoc che ripetono il nome del metodo (`open()` che "apre", `showModal()` che "mostra"): i nomi devono autodocumentarsi. Tieni solo annotazioni di tipo (`@param`/`@returns`) utili al tooling e note su intent o vincoli non ovvi.

## Stile sintetico

- Risposte brevi e concrete.
- Dire cosa e' stato cambiato e dove.
- Se non e' stato possibile verificare, dirlo esplicitamente.
- Quando mostri codice all'utente, mostra il file completo, non solo il pezzo.

## Nota su codice non Shopify

Se in futuro compare codice Java nel package `com.safjnest`, applica il profilo personale Sunyx: utility statiche quando possibile, factory static methods, enum con fields/getters/`getFromOrdinal`, `final` sui campi immutabili, no Lombok operativo, no DI framework, no `Optional` wrapper, no stream quando un loop e' piu' chiaro.
