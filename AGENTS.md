# AGENTS.md

## Profilo progetto

Questo repository e' un tema Shopify. Le modifiche devono restare mirate, conservative e coerenti con l'architettura Liquid/CSS/JS gia' presente.

Stack principale di riferimento:

- Shopify Liquid
- CSS nativo dentro `{% stylesheet %}` quando il CSS appartiene a snippet, block o section
- JavaScript vanilla
- Custom Elements
- GraphQL Storefront API quando serve leggere dati Shopify lato storefront
- Algolia solo se gia' presente o richiesto

Clienti e contesto Shopify abituale:

- Pomellato
- SlamJam
- Rick Owens
- Antonioli
- Montura
- Kappa

## Approccio generale

- Fare fix mirati, senza refactor inutili.
- Prima far funzionare la feature o il bugfix, poi ottimizzare solo se serve davvero.
- Non aggiungere librerie se una soluzione semplice in Liquid, CSS o JS vanilla e' sufficiente.
- Prestare attenzione a timing, race condition, stato del DOM e rimpiazzi HTML parziali.
- Non cambiare naming, struttura o pattern esistenti se non e' necessario.
- Non introdurre commenti inutili nel codice.
- Quando si propone codice all'utente, fornire sempre il file completo e non solo il punto da cambiare.

## Liquid

- Tenere i componenti piccoli e componibili tramite snippet, block e section.
- Usare `{% render %}` per comporre blocchi riutilizzabili.
- Passare dati espliciti agli snippet, evitando dipendenze implicite quando possibile.
- Includere `{% doc %}` nei componenti riutilizzabili con parametri chiari.
- Usare `blank`, `escape`, `default`, `json` e filtri Shopify invece di logica JS quando il dato e' gia' disponibile server-side.
- Evitare logica complessa nei template: spostarla in snippet dedicati o in JS solo se dipende dallo stato runtime.
- Mantenere schema, impostazioni e markup vicini quando appartengono allo stesso componente.
- Per impostazioni che controllano una sola proprieta' CSS, preferire CSS custom properties inline.
- Per impostazioni che controllano piu' stili, preferire classi o attributi dichiarativi.

## CSS

- CSS-first: gestire stato e varianti con selettori, attributi, `:has()`, `:is()`, `:not()` e pseudo-classi quando possibile.
- Usare JS solo per stati realmente dinamici o per aggiornare CSS custom properties numeriche.
- Preferire CSS scoped nel file Liquid del componente tramite `{% stylesheet %}`.
- Usare asset CSS globali solo per reset, token, layout base o regole davvero condivise.
- Evitare selettori troppo generici che possono rompere altri componenti del tema.
- Non usare magic numbers senza motivo: se un valore e' parte della logica del componente, renderlo chiaro con variabile CSS o costante JS.
- Mantenere stati leggibili tramite classi semantiche solo quando CSS puro non basta.
- Evitare animazioni o transizioni non necessarie.
- Non creare UI card dentro altre card.
- Garantire che testo, bottoni e contenitori non si sovrappongano su mobile e desktop.

## JavaScript

- Usare JavaScript vanilla e Custom Elements.
- Scrivere i Custom Elements come classi Java: stessa logica, stesse strutture, metodi piccoli e responsabilita' chiare.
- Ordine membri nelle classi:
  1. static constants
  2. getters/setters
  3. static factory
  4. constructor
  5. connectedCallback/disconnectedCallback
  6. altri metodi
- Non usare `#private fields`.
- Usare getter per dati, DOM o valori dinamici.
- Usare `ref` per riferimenti DOM statici.
- Usare inline conditionals con `&&` e `!cond &&` quando rendono il codice piu' diretto.
- Usare sempre `async/await`, mai `.then()`.
- Mai usare `try/catch` in JavaScript.
- Per fetch HTML, usare sempre `const response = await fetch(...)`, `const result = await response.text()` e `new DOMParser().parseFromString(result, 'text/html')`.
- Per fetch JSON o GraphQL, usare sempre `const response = await fetch(...)` e `const result = await response.json()`.
- Usare nomi `response`, `result`, `html` per mantenere il pattern leggibile.
- Per GraphQL o JSON API, gestire errori e fallback con controlli espliciti sul `result`.
- Evitare append multipli al DOM: costruire `parts[]` e fare una singola assegnazione `innerHTML`.
- Le costanti numeriche o stringhe ripetute devono essere `static`.
- Non aggiungere stato JS se puo' essere rappresentato con attributi, classi o CSS.
- Rimuovere listener, observer e timer in `disconnectedCallback` quando vengono creati dal componente.

## Custom Elements

- Ogni elemento custom deve avere una responsabilita' chiara.
- Preferire nomi coerenti con il markup Shopify e con il dominio del componente.
- Usare attributi `data-*` per dati serializzati dal Liquid.
- Usare `ref` per elementi statici del componente.
- Usare getter quando il riferimento puo' cambiare o dipende dallo stato runtime.
- Non interrogare il DOM globale se il componente puo' lavorare nel proprio scope.
- Validare gli elementi letti dal DOM con `instanceof` quando il metodo dipende dal tipo.
- Evitare side effect in constructor: il DOM va letto in `connectedCallback`.

## Fetch, cache e Storefront API

- Gestire sempre fallback vuoti o stato di errore.
- Cache in `sessionStorage` solo per dati di breve durata e non sensibili.
- Chiavi cache con prefisso statico leggibile.
- Non duplicare query GraphQL: centralizzare la costruzione della query nel componente o in una utility locale.
- Non esporre token o configurazioni sensibili nel codice.

## HTML e accessibilita'

- Link e bottoni devono avere un'etichetta accessibile.
- Le immagini devono avere `alt`, `width`, `height` e `loading` quando applicabile.
- Non trasformare elementi interattivi in `div` cliccabili se esiste un elemento HTML corretto.
- Mantenere il markup il piu' semantico possibile.
- Evitare overlay che intercettano click senza motivo chiaro.

## Performance

- Ridurre il lavoro in `connectedCallback`.
- Evitare query DOM ripetute se il riferimento e' stabile.
- Evitare layout thrashing: leggere misure e scrivere stili in blocchi separati quando serve.
- Lazy-load immagini e contenuti non critici.
- Non scaricare dati via API se Liquid puo' gia' renderizzarli.
- Non introdurre dipendenze di build o runtime non necessarie.

## Java backend

Quando si lavora su codice Java nel package `com.safjnest`:

- Usare switch expressions con `->` e multi-case con virgole.
- Preferire static utility classes con soli metodi statici quando non serve stato.
- Usare `List.of` o `Arrays.asList` per costanti statiche.
- Preferire factory static methods.
- Enum con fields, constructor, getters e `getFromOrdinal`.
- Usare generics `<T>` dove servono davvero.
- Usare `Objects.hash` e `Objects.equals`.
- Mettere `final` sui campi immutabili.
- Usare constructor overloads quando rendono l'API piu' chiara.
- Non usare Lombok su classi operative.
- Non introdurre DI framework.
- Non usare `Optional` come wrapper.
- Evitare stream quando un loop e' piu' leggibile.

## Formato delle risposte

- Risposte brevi e concise.
- Dire chiaramente cosa e' stato cambiato e dove.
- Se si modifica codice, includere il file completo quando si mostra la soluzione all'utente.
- Se non e' stato possibile verificare, dirlo esplicitamente.
- Evitare spiegazioni lunghe se non richieste.
