/**
 * Theme entrypoint: loads shared utilities and registers feature modules.
 */

import { CSSUtils } from "@theme/utilities";
import "@theme/StickyHeader";
import "@theme/Dialog";
import "@theme/Search";
import "@theme/Localization";
import "@theme/Collection";
import "@theme/Cart";
import "@theme/Product";
import "@theme/ColorSibling";
import "@theme/PdpSiblings";
import "@theme/ProductCard";
import "@theme/DeferredSection";
import "@theme/MetaobjectsHandler";

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
