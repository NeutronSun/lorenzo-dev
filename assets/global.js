/**
 * Theme entrypoint: loads shared utilities and registers feature modules.
 */

import { CSSUtils } from "@theme/utilities";
import "@theme/header";
import "@theme/dialog";
import "@theme/search";
import "@theme/localization";
import "@theme/collection";
import "@theme/cart";
import "@theme/product";
import "@theme/color-sibling";
import "@theme/pdp-siblings";
import "@theme/product-card";
import "@theme/deferred-section";
import "@theme/metaobjects-handler";
import { MetaobjectsHandler } from "@theme/metaobjects-handler";

console.log(`
                      __
                     // \\
                     \\\\_/ //
                    -(||)(')
                     '''

  ███████╗██╗   ██╗███╗   ██╗██╗   ██╗██╗  ██╗
  ██╔════╝██║   ██║████╗  ██║╚██╗ ██╔╝╚██╗██╔╝
  ███████╗██║   ██║██╔██╗ ██║ ╚████╔╝  ╚███╔╝
  ╚════██║██║   ██║██║╚██╗██║  ╚██╔╝   ██╔██╗
  ███████║╚██████╔╝██║ ╚████║   ██║   ██╔╝ ██╗
  ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝
`);


console.log(MetaobjectsHandler.getRarity('rare'));