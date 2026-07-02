/**
 * PDP variant picker: sibling tabs from theme blocks and Storefront API queries.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { ColorSibling } from '@theme/color-sibling';
import { TemplateHandler } from '@theme/utilities';

/**
 * @typedef {Object} PdpSiblingTabConfig
 * @property {string} id
 * @property {string} tag
 * @property {string} label
 * @property {boolean} includeCurrent
 * @property {HTMLElement} panel
 * @property {HTMLLabelElement} tab
 */

/**
 * @typedef {Object} PdpSiblingsRefs
 * @property {HTMLScriptElement} currentProduct
 * @property {HTMLTemplateElement} chipTemplate
 * @property {HTMLElement} mount
 * @property {HTMLFieldSetElement} group
 * @property {HTMLElement} tablist
 * @property {HTMLElement} panels
 * @property {HTMLElement} loadingPanel
 * @property {HTMLTemplateElement[]} panelTemplates
 */

/**
 * PDP variant picker with block-configured sibling tabs.
 * @extends {HTMLComponent<PdpSiblingsRefs>}
 */
class PdpSiblings extends HTMLComponent {
  static DEFAULT_LIMIT = 250;

  renderId = 0;
  currentProduct = null;

  get currentHandle() {
    return this.dataset.currentHandle || '';
  }

  get limit() {
    const limit = Number(this.dataset.limit || PdpSiblings.DEFAULT_LIMIT);

    return Number.isFinite(limit) && limit > 0 ? limit : PdpSiblings.DEFAULT_LIMIT;
  }

  set isLoading(value) {
    this.setAttribute('aria-busy', value ? 'true' : 'false');
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.refs.currentProduct instanceof HTMLScriptElement) {
      this.currentProduct = JSON.parse(this.refs.currentProduct.textContent || 'null');
    }

    this.hydratePanels();
    this.render();
  }

  hydratePanels() {
    const panels = this.refs.panels;
    const templates = this.refs.panelTemplates;

    if (!(panels instanceof HTMLElement)) return;
    if (!Array.isArray(templates)) return;

    for (const template of templates) {
      if (!(template instanceof HTMLTemplateElement)) continue;

      const panel = template.content.firstElementChild?.cloneNode(true);

      panel instanceof HTMLElement && panels.appendChild(panel);
    }
  }

  revealTabs(activeTabs) {
    const firstInput = activeTabs[0]?.tab.querySelector('input[type="radio"]');

    firstInput instanceof HTMLInputElement && (firstInput.checked = true);

    for (const [index, config] of activeTabs.entries()) {
      config.panel.toggleAttribute('hidden', index !== 0);
    }

    this.refs.loadingPanel instanceof HTMLElement && this.refs.loadingPanel.remove();

    const tablist = this.refs.tablist;

    tablist instanceof HTMLElement && tablist.removeAttribute('hidden');
    this.isLoading = false;
    this.bindPanelSync(activeTabs[0].id);
  }

  hidePicker() {
    this.refs.loadingPanel instanceof HTMLElement && this.refs.loadingPanel.remove();
    this.isLoading = false;
    this.hidden = true;
  }

  /** @returns {PdpSiblingTabConfig[]} */
  getTabConfigs() {
    const configs = [];
    const panels = this.refs.panels;

    if (!(panels instanceof HTMLElement)) return configs;

    for (const panel of panels.querySelectorAll('.panel[data-tag]')) {
      if (!(panel instanceof HTMLElement)) continue;

      const tag = panel.dataset.tag?.trim() || '';
      const id = panel.dataset.tab?.trim() || '';
      const tab = this.refs.tablist?.querySelector(`input[value="${id}"]`)?.closest('label.tab');

      if (!tag || !(tab instanceof HTMLLabelElement)) continue;

      const label = tab.querySelector('span')?.textContent?.trim() || tag;

      configs.push({
        id,
        tag,
        label,
        includeCurrent: this.includesCurrentProductTag(tag),
        panel,
        tab,
      });
    }

    return configs;
  }

  /**
   * @param {string} tag
   * @returns {boolean}
   */
  includesCurrentProductTag(tag) {
    const tags = this.currentProduct?.tags;

    return Array.isArray(tags) && tags.includes(tag);
  }

  /** Fetches sibling data and fills Liquid-rendered panels. */
  async render() {
    const renderId = ++this.renderId;
    const tabConfigs = this.getTabConfigs();

    if (!tabConfigs.length) {
      this.hidePicker();
      return;
    }

    this.isLoading = true;
    this.hidden = false;

    const productGroups = await Promise.all(
      tabConfigs.map((config) => ColorSibling.get(config.tag, this.limit)),
    );

    if (!this.isConnected || renderId !== this.renderId) return;

    const activeTabs = [];

    for (const [index, config] of tabConfigs.entries()) {
      const tab = this.buildTab(config, productGroups[index]);

      if (!tab) {
        config.tab.toggleAttribute('hidden', true);
        config.panel.toggleAttribute('hidden', true);
        continue;
      }

      this.fillPanel(config.panel, tab.products);
      config.tab.removeAttribute('hidden');
      activeTabs.push(config);
    }

    if (!activeTabs.length) {
      this.hidePicker();
      return;
    }

    this.hidden = false;
    this.revealTabs(activeTabs);
  }

  /**
   * @param {PdpSiblingTabConfig} config
   * @param {Array} products
   * @returns {{ name: string, label: string, products: Array } | null}
   */
  buildTab(config, products) {
    const siblings = products.filter((product) => product.handle !== this.currentHandle);
    const includeCurrent = config.includeCurrent && this.currentProduct;

    if (!siblings.length && !includeCurrent) return null;

    return {
      name: config.id,
      label: config.label,
      products: PdpSiblings.sortProducts([
        ...(includeCurrent ? [this.currentProduct] : []),
        ...siblings,
      ]),
    };
  }

  /**
   * @param {HTMLElement} panel
   * @param {Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }>} products
   */
  fillPanel(panel, products) {
    const values = panel.querySelector('.values');

    if (!(values instanceof HTMLElement)) return;

    values.replaceChildren();

    for (const product of products) {
      const chip = this.buildChip(product);

      chip && values.appendChild(chip);
    }
  }

  /**
   * @param {string} activeId
   */
  bindPanelSync(activeId) {
    const tablist = this.refs.tablist;
    const panels = this.refs.panels;

    if (!(tablist instanceof HTMLElement)) return;
    if (!(panels instanceof HTMLElement)) return;

    const syncPanels = (value) => {
      for (const panel of panels.querySelectorAll('.panel[data-tag]')) {
        if (!(panel instanceof HTMLElement)) continue;

        const id = panel.dataset.tab || '';
        const tab = tablist.querySelector(`input[value="${id}"]`)?.closest('label.tab');

        if (!(tab instanceof HTMLLabelElement) || tab.hasAttribute('hidden')) continue;

        panel.toggleAttribute('hidden', id !== value);
      }
    };

    syncPanels(activeId);

    tablist.addEventListener('change', (event) => {
      const input = event.target;

      if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;

      syncPanels(input.value);
    });
  }

  /**
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
