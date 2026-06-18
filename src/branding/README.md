# Checkout and Accounts branding

Payload Shopify Admin GraphQL per allineare checkout e customer accounts al design corrente del tema.

## Files

- `checkout-and-accounts-configuration-update.graphql`: mutation `checkoutAndAccountsConfigurationUpdate`.
- `checkout-and-accounts-branding.variables.json`: variables pronte con `id` configurazione e `configuration.branding`.

## Scope

Il sito resta la sorgente di verita'. Questi file non modificano Liquid, CSS o JavaScript del tema.

## Requisiti Shopify

La mutation richiede uno scope tra `write_checkout_and_accounts_configurations` e `write_checkout_settings`, oltre ai permessi admin per gestire checkout e accounts.

## Verifica locale

```sh
node -e "JSON.parse(require('fs').readFileSync('src/branding/checkout-and-accounts-branding.variables.json','utf8'))"
```

## Esecuzione

Esegui la mutation con il client GraphQL Admin usato per lo store, passando il contenuto di `checkout-and-accounts-branding.variables.json` come variables.
