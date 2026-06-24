import { HTMLComponent } from "@theme/HTMLComponent";
import { ColorSibling } from "@theme/color-sibling";

class PDPsiblings extends HTMLComponent {
  static CACHE_PREFIX = 'pdp-siblings:v5:';
  static DEFAULT_LIMIT = 250;
  static FUSION_TAG_PREFIX = 'Fusion_';
  static TAB_FUSION = 'fusion';
  static TAB_THEME = 'theme';

  get themeTag() {
    return this.dataset.themeTag || '';
  }

  get currentHandle() {
    return this.dataset.currentHandle || '';
  }

  get fusionTag() {
    return this.currentHandle ? `${PDPsiblings.FUSION_TAG_PREFIX}${this.currentHandle}` : '';
  }

  get currentProduct() {
    if (!(this.refs.currentProduct instanceof HTMLScriptElement)) return null;

    return JSON.parse(this.refs.currentProduct.textContent || 'null');
  }

  get limit() {
    const limit = Number(this.dataset.limit || PDPsiblings.DEFAULT_LIMIT);

    return Number.isFinite(limit) && limit > 0 ? limit : PDPsiblings.DEFAULT_LIMIT;
  }

  set isLoading(value) {
    this.classList.toggle('is-loading', value);
    this.setAttribute('aria-busy', value ? 'true' : 'false');
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.render();
  }

  async render() {
    if (!this.themeTag && !this.fusionTag) {
      this.isLoading = false;
      this.hidden = true;
      return;
    }

    const currentProduct = this.currentProduct;
    const [themeProducts, fusionProducts] = await Promise.all([
      this.themeTag ? this.fetchProducts(this.themeTag) : [],
      this.fusionTag ? this.fetchProducts(this.fusionTag) : [],
    ]);

    if (!this.isConnected) return;

    const tabs = this.getTabs(themeProducts, fusionProducts, currentProduct);

    if (!tabs.length) {
      this.isLoading = false;
      this.hidden = true;
      this.innerHTML = '';
      return;
    }

    this.isLoading = false;
    this.hidden = false;
    this.renderTabs(tabs);
  }

  renderTabs(tabs) {
    const tabName = `pdp-siblings-${this.currentHandle}`;
    const parts = [
      '<div class="group">',
      '<div class="head font-mono">',
      '<span>Color</span>',
      '<span>Variants</span>',
      '</div>',
      '<div class="tabs font-mono" role="tablist">',
      tabs.map((tab, index) => PDPsiblings.buildTab(tab, tabName, index === 0)).join(''),
      '</div>',
      '<div class="panels">',
      tabs.map((tab) => PDPsiblings.buildPanel(tab, this.currentHandle)).join(''),
      '</div>',
      '</div>',
    ];

    this.innerHTML = parts.join('');
  }

  async fetchProducts(tag) {
    return ColorSibling.fetchQuery(tag, this.limit, this.getQuery(tag), PDPsiblings.mapNode, PDPsiblings.CACHE_PREFIX, 'PDP siblings');
  }

  getTabs(themeProducts, fusionProducts, currentProduct) {
    const themeSiblings = themeProducts.filter((product) => product.handle !== this.currentHandle);
    const fusionSiblings = fusionProducts.filter((product) => product.handle !== this.currentHandle);
    const tabs = [];

    themeSiblings.length && tabs.push({
      name: PDPsiblings.TAB_THEME,
      label: 'Tema',
      products: PDPsiblings.sortProducts([
        ...(currentProduct ? [currentProduct] : []),
        ...themeSiblings,
      ]),
    });

    fusionSiblings.length && tabs.push({
      name: PDPsiblings.TAB_FUSION,
      label: 'Fusion',
      products: PDPsiblings.sortProducts(fusionSiblings),
    });

    return tabs;
  }

  getQuery(tag) {
    return {
      query: `
        query PDPSiblings($first: Int!, $query: String!) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                handle
                title
                onlineStoreUrl
                tags
                microCategory: metafield(namespace: "valeverce", key: "micro_category") {
                  value
                }
                elasticMicroCategory: metafield(namespace: "elastick", key: "filter_microcategory") {
                  value
                }
                pm: metafield(namespace: "valeverce", key: "pm") {
                  value
                }
                featuredImage {
                  url(transform: { maxWidth: 96, maxHeight: 96, crop: CENTER })
                  altText
                }
              }
            }
          }
        }
      `,
      variables: {
        first: this.limit,
        query: ColorSibling.getSearchQuery(tag),
      },
    };
  }

  /**
   * @param {any} node
   * @returns {{ id: string, handle: string, title: string, url: string, tags: string[], microCategory: string, pm: string, image: string, imageAlt: string }}
   */
  static mapNode(node) {
    return {
      id: node.id,
      handle: node.handle,
      title: node.title,
      url: node.onlineStoreUrl || `/products/${node.handle}`,
      tags: node.tags || [],
      microCategory: node.microCategory?.value || node.elasticMicroCategory?.value || '',
      pm: node.pm?.value || '',
      image: node.featuredImage?.url || '',
      imageAlt: node.featuredImage?.altText || node.title,
    };
  }

  /**
   * @param {Array<{ id: string | number }>} products
   * @returns {Array}
   */
  static sortProducts(products) {
    return [...products].sort((product, nextProduct) => (
      Number(String(product.id).split('/').pop()) - Number(String(nextProduct.id).split('/').pop())
    ));
  }

  /**
   * @param {{ name: string, label: string }} tab
   * @param {string} tabName
   * @param {boolean} checked
   * @returns {string}
   */
  static buildTab(tab, tabName, checked) {
    return `
      <label class="tab" role="tab" aria-label="${PDPsiblings.escape(tab.label)}">
        <input
          type="radio"
          name="${PDPsiblings.escape(tabName)}"
          value="${PDPsiblings.escape(tab.name)}"
          ${checked ? 'checked' : ''}
        >
        <span>${PDPsiblings.escape(tab.label)}</span>
      </label>
    `;
  }

  /**
   * @param {{ name: string, products: Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }> }} tab
   * @param {string} currentHandle
   * @returns {string}
   */
  static buildPanel(tab, currentHandle) {
    return `
      <div class="panel" data-tab="${PDPsiblings.escape(tab.name)}">
        <div class="values">
          ${tab.products.map((product) => PDPsiblings.buildProduct(product, currentHandle)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * @param {{ handle: string, title: string, url: string, image: string, imageAlt: string }} product
   * @param {string} currentHandle
   * @returns {string}
   */
  static buildProduct(product, currentHandle) {
    const isActive = product.handle === currentHandle;
    const image = product.image
      ? `<img src="${PDPsiblings.escape(product.image)}" alt="${PDPsiblings.escape(product.imageAlt)}" loading="lazy" width="18" height="18">`
      : '';

    return `
      <a class="chip${isActive ? ' is-active' : ''}" href="${PDPsiblings.escape(product.url)}" aria-label="${PDPsiblings.escape(product.title)}"${isActive ? ' aria-current="page"' : ''}>
        <span class="swatch">${image}</span>
        <span class="chip-label">${PDPsiblings.escape(product.title)}</span>
      </a>
    `;
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  static escape(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

if (!customElements.get('pdp-siblings')) {
  customElements.define('pdp-siblings', PDPsiblings);
}
