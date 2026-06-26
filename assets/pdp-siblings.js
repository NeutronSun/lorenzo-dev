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
 */

/**
 * @typedef {Object} PdpSiblingsRefs
 * @property {HTMLScriptElement} currentProduct
 * @property {HTMLTemplateElement} groupTemplate
 * @property {HTMLTemplateElement} tabTemplate
 * @property {HTMLTemplateElement} panelTemplate
 * @property {HTMLTemplateElement} chipTemplate
 * @property {HTMLElement} mount
 * @property {HTMLElement[]} tabs
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

  get labelColor() {
    return this.dataset.labelColor || 'Color';
  }

  get labelVariants() {
    return this.dataset.labelVariants || 'Variants';
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

  /** @returns {PdpSiblingTabConfig[]} */
  getTabConfigs() {
    const configs = [];

    for (const node of this.refs.tabs || []) {
      if (!(node instanceof HTMLElement)) continue;

      const tag = node.dataset.tag?.trim() || '';
      const label = node.dataset.label?.trim() || tag;
      const id = node.dataset.id?.trim() || tag;

      if (!tag) continue;

      configs.push({
        id,
        tag,
        label,
        includeCurrent: node.dataset.includeCurrent === 'true',
      });
    }

    return configs;
  }

  /** Fetches sibling data and renders tabs into the mount node. */
  async render() {
    const renderId = ++this.renderId;
    const tabConfigs = this.getTabConfigs();

    if (!tabConfigs.length) {
      this.isLoading = false;
      this.hidden = true;
      return;
    }

    this.isLoading = true;
    this.hidden = false;

    const productGroups = await Promise.all(
      tabConfigs.map((config) => ColorSibling.fetchPdp(config.tag, this.limit))
    );

    if (!this.isConnected || renderId !== this.renderId) return;

    const tabs = [];

    for (const [index, config] of tabConfigs.entries()) {
      const tab = this.buildTab(config, productGroups[index]);

      tab && tabs.push(tab);
    }

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
      const tabNode = this.buildTabNode(tab, tabName, index === 0);
      const panelNode = this.buildPanel(tab, index === 0);

      tabNode && tablist.appendChild(tabNode);
      panelNode && panels.appendChild(panelNode);
    }

    this.refs.mount.replaceChildren(group);
    this.bindPanelSync(group, tabs[0]?.name || '');
  }

  /**
   * @param {HTMLElement} group
   * @param {string} activeId
   */
  bindPanelSync(group, activeId) {
    const tablist = group.querySelector('.tabs');
    const panels = group.querySelector('.panels');

    if (!(tablist instanceof HTMLElement) || !(panels instanceof HTMLElement)) return;

    const syncPanels = (value) => {
      for (const panel of panels.querySelectorAll('.panel')) {
        if (!(panel instanceof HTMLElement)) continue;

        panel.toggleAttribute('hidden', panel.dataset.tab !== value);
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
   * @param {{ name: string, label: string }} tab
   * @param {string} tabName
   * @param {boolean} checked
   * @returns {HTMLElement | null}
   */
  buildTabNode(tab, tabName, checked) {
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
   * @param {{ name: string, products: Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }> }} tab
   * @param {boolean} visible
   * @returns {HTMLElement | null}
   */
  buildPanel(tab, visible) {
    if (!(this.refs.panelTemplate instanceof HTMLTemplateElement)) return null;
    if (!(this.refs.chipTemplate instanceof HTMLTemplateElement)) return null;

    const panel = TemplateHandler.clone(this.refs.panelTemplate);
    const values = panel?.querySelector('.values');

    if (!(panel instanceof HTMLElement)) return null;
    if (!(values instanceof HTMLElement)) return null;

    panel.dataset.tab = tab.name;
    panel.toggleAttribute('hidden', !visible);

    for (const product of tab.products) {
      const chip = this.buildChip(product);

      chip && values.appendChild(chip);
    }

    return panel;
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
