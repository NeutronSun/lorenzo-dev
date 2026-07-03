/**
 * Theme entrypoint: loads shared utilities and registers feature modules.
 */

import { CSSUtils } from "@theme/utilities";
import "@theme/StickyHeader";
import "@theme/DialogComponent";
import "@theme/DialogOpener";
import "@theme/SearchDialog";
import "@theme/SearchForm";
import "@theme/LocalizationForm";
import "@theme/CollectionFilters";
import "@theme/ProductGrid";
import "@theme/CartHandler";
import "@theme/ProductForm";
import "@theme/CartDrawer";
import "@theme/CartPage";
import "@theme/PDPBundle";
import "@theme/CartItem";
import "@theme/CartMoney";
import "@theme/ProductPage";
import "@theme/VariantPicker";
import "@theme/ColorSibling";
import "@theme/PdpSiblings";
import "@theme/ProductCard";
import "@theme/ProductCardSwatches";
import "@theme/ProductCardLabels";
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
