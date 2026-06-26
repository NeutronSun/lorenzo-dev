/**
 * PDP variant picker: theme/fusion sibling tabs built from Liquid templates and Storefront API data.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { ColorSibling } from '@theme/color-sibling';
import { TemplateHandler } from '@theme/utilities';

/**
 * @typedef {Object} PdpSiblingsRefs
 * @property {HTMLScriptElement} currentProduct
 * @property {HTMLTemplateElement} groupTemplate
 * @property {HTMLTemplateElement} tabTemplate
 * @property {HTMLTemplateElement} panelTemplate
 * @property {HTMLTemplateElement} chipTemplate
 * @property {HTMLElement} mount
 */

/**
 * PDP variant picker with theme and fusion sibling tabs.
 * @extends {HTMLComponent<PdpSiblingsRefs>}
 */
class PdpSiblings extends HTMLComponent {
  static DEFAULT_LIMIT = 250;
  static FUSION_TAG_PREFIX = 'Fusion_';
  static TAB_FUSION = 'fusion';
  static TAB_THEME = 'theme';

  renderId = 0;
  currentProduct = null;

  get themeTag() {
    return this.dataset.themeTag || '';
  }

  get currentHandle() {
    return this.dataset.currentHandle || '';
  }

  get fusionTag() {
    return this.currentHandle ? `${PdpSiblings.FUSION_TAG_PREFIX}${this.currentHandle}` : '';
  }

  get limit() {
    const limit = Number(this.dataset.limit || PdpSiblings.DEFAULT_LIMIT);

    return Number.isFinite(limit) && limit > 0 ? limit : PdpSiblings.DEFAULT_LIMIT;
  }

  get labelColor() {
    return this.dataset.labelColor || 'Color';
  }

  get labelVariants() {
    return this.dataset.labelVariants || 'Variants';
  }

  get labelTheme() {
    return this.dataset.labelTheme || 'Tema';
  }

  get labelFusion() {
    return this.dataset.labelFusion || 'Fusion';
  }

  set isLoading(value) {
    this.classList.toggle('is-loading', value);
    this.setAttribute('aria-busy', value ? 'true' : 'false');
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.refs.currentProduct instanceof HTMLScriptElement) {
      this.currentProduct = JSON.parse(this.refs.currentProduct.textContent || 'null');
    }

    this.render();
  }

  /** Fetches sibling data and renders tabs into the mount node. */
  async render() {
    const renderId = ++this.renderId;

    if (!this.themeTag && !this.fusionTag) {
      this.isLoading = false;
      this.hidden = true;
      return;
    }

    this.isLoading = true;

    const [themeProducts, fusionProducts] = await Promise.all([
      this.themeTag ? ColorSibling.fetchPdp(this.themeTag, this.limit) : [],
      this.fusionTag ? ColorSibling.fetchPdp(this.fusionTag, this.limit) : [],
    ]);

    if (!this.isConnected || renderId !== this.renderId) return;

    const tabs = this.getTabs(themeProducts, fusionProducts, this.currentProduct);

    if (!tabs.length) {
      this.isLoading = false;
      this.hidden = true;

      if (this.refs.mount instanceof HTMLElement) {
        this.refs.mount.innerHTML = '';
      }

      return;
    }

    this.isLoading = false;
    this.hidden = false;
    this.renderTabs(tabs);
  }

  /**
   * Builds and mounts the tab group from Liquid templates.
   * @param {Array<{ name: string, label: string, products: Array }>} tabs
   */
  renderTabs(tabs) {
    if (!(this.refs.groupTemplate instanceof HTMLTemplateElement)) return;
    if (!(this.refs.mount instanceof HTMLElement)) return;

    const tabName = `pdp-siblings-${this.currentHandle}`;
    const group = TemplateHandler.clone(this.refs.groupTemplate);

    if (!(group instanceof HTMLElement)) return;

    const tablist = group.querySelector('.tabs');
    const panels = group.querySelector('.panels');

    TemplateHandler.fill(group, {
      colorLabel: this.labelColor,
      variantsLabel: this.labelVariants,
    });

    if (!(tablist instanceof HTMLElement) || !(panels instanceof HTMLElement)) return;

    for (const [index, tab] of tabs.entries()) {
      const tabNode = this.buildTab(tab, tabName, index === 0);
      const panelNode = this.buildPanel(tab);

      tabNode && tablist.appendChild(tabNode);
      panelNode && panels.appendChild(panelNode);
    }

    this.refs.mount.replaceChildren(group);
  }

  /**
   * Builds a tab label from the tab template.
   * @param {{ name: string, label: string }} tab
   * @param {string} tabName
   * @param {boolean} checked
   * @returns {HTMLElement | null}
   */
  buildTab(tab, tabName, checked) {
    if (!(this.refs.tabTemplate instanceof HTMLTemplateElement)) return null;

    const label = TemplateHandler.clone(this.refs.tabTemplate);

    if (!(label instanceof HTMLLabelElement)) return null;

    const input = label.querySelector('input[type="radio"]');
    const text = label.querySelector('[data-ref="label"]');

    if (!(input instanceof HTMLInputElement)) return null;

    input.name = tabName;
    input.value = tab.name;
    input.checked = checked;
    label.setAttribute('aria-label', tab.label);

    text instanceof HTMLElement && (text.textContent = tab.label);

    return label;
  }

  /**
   * Builds a tab panel with product chips.
   * @param {{ name: string, products: Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }> }} tab
   * @returns {HTMLElement | null}
   */
  buildPanel(tab) {
    if (!(this.refs.panelTemplate instanceof HTMLTemplateElement)) return null;
    if (!(this.refs.chipTemplate instanceof HTMLTemplateElement)) return null;

    const panel = TemplateHandler.clone(this.refs.panelTemplate);
    const values = panel?.querySelector('.values');

    if (!(panel instanceof HTMLElement)) return null;
    if (!(values instanceof HTMLElement)) return null;

    panel.dataset.tab = tab.name;

    for (const product of tab.products) {
      const chip = this.buildChip(product);

      chip && values.appendChild(chip);
    }

    return panel;
  }

  /**
   * Builds a single product chip link from the chip template.
   * @param {{ handle: string, title: string, url: string, image: string, imageAlt: string }} product
   * @returns {HTMLElement | null}
   */
  buildChip(product) {
    if (!(this.refs.chipTemplate instanceof HTMLTemplateElement)) return null;

    const chip = TemplateHandler.clone(this.refs.chipTemplate);
    const image = chip?.querySelector('img');
    const title = chip?.querySelector('[data-ref="title"]');
    const isActive = product.handle === this.currentHandle;

    if (!(chip instanceof HTMLAnchorElement)) return null;

    chip.href = product.url;
    chip.setAttribute('aria-label', product.title);
    chip.classList.toggle('is-active', isActive);
    isActive && chip.setAttribute('aria-current', 'page');

    if (image instanceof HTMLImageElement && product.image) {
      image.src = product.image;
      image.alt = product.imageAlt;
      image.hidden = false;
    }

    title instanceof HTMLElement && (title.textContent = product.title);

    return chip;
  }

  /**
   * Builds theme and fusion tabs from fetched sibling products.
   * @param {Array} themeProducts
   * @param {Array} fusionProducts
   * @param {Object | null} currentProduct
   * @returns {Array<{ name: string, label: string, products: Array }>}
   */
  getTabs(themeProducts, fusionProducts, currentProduct) {
    const themeSiblings = themeProducts.filter((product) => product.handle !== this.currentHandle);
    const fusionSiblings = fusionProducts.filter((product) => product.handle !== this.currentHandle);
    const tabs = [];

    themeSiblings.length || currentProduct
      ? tabs.push({
        name: PdpSiblings.TAB_THEME,
        label: this.labelTheme,
        products: PdpSiblings.sortProducts([
          ...(currentProduct ? [currentProduct] : []),
          ...themeSiblings,
        ]),
      })
      : null;

    fusionSiblings.length && tabs.push({
      name: PdpSiblings.TAB_FUSION,
      label: this.labelFusion,
      products: PdpSiblings.sortProducts(fusionSiblings),
    });

    return tabs;
  }

  /**
   * Sorts sibling products by numeric Shopify id.
   * @param {Array<{ id: string | number }>} products
   * @returns {Array<{ id: string | number }>}
   */
  static sortProducts(products) {
    return [...products].sort((product, nextProduct) => (
      Number(String(product.id).split('/').pop()) - Number(String(nextProduct.id).split('/').pop())
    ));
  }
}

if (!customElements.get('pdp-siblings')) {
  customElements.define('pdp-siblings', PdpSiblings);
}
