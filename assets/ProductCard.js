/**
 * Product card async partial updates and color swatches via sibling-change events.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { ColorSibling } from '@theme/ColorSibling';
import { OnSiblingChangeEvent } from '@theme/events';
import { MetaobjectsHandler } from '@theme/MetaobjectsHandler';
import { CacheHandler, HtmlUtils, TemplateHandler, UrlUtils } from '@theme/utilities';

/**
 * @typedef {Object} ProductCardSiblingsRefs
 * @property {HTMLTemplateElement} siblingTemplate
 * @property {HTMLFieldSetElement} fieldset
 * @property {HTMLInputElement[]} input
 */

/** @extends {HTMLComponent<ProductCardSiblingsRefs>} */
class ProductCardSiblings extends HTMLComponent {
  
  get name() {
    return `product-card-sibling-${this.dataset.cardId || 'default'}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.load();
  }

  /** @param {Event} event @param {Element} element */
  select(event, element) {
    if (!(element instanceof HTMLInputElement)) return;
    if (!element.checked) return;

    event.preventDefault();
    event.stopPropagation();

    const handle = element.dataset.handle;
    const productUrl = element.dataset.url;
    const cardId = this.dataset.cardId;

    if (!handle || !productUrl || !cardId) return;

    document.dispatchEvent(new OnSiblingChangeEvent({
      cardId,
      handle,
      url: productUrl,
    }));
  }

  async load() {
    const tag = this.dataset.matchTag;
    const limit = Number(this.dataset.limit || 10);

    if (!tag) return;

    const siblings = await ColorSibling.get(tag, limit);

    if (!siblings.length) return;

    this.render(siblings);
  }

  /** @param {Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }>} siblings */
  render(siblings) {
    if (!this.refs.fieldset) return;

    const currentInput = this.refs.fieldset.querySelector('input[checked], input:checked');
    const activeHandle = currentInput instanceof HTMLInputElement ? currentInput.dataset.handle || '' : '';
    const parts = [];

    for (const sibling of siblings) {
      if (sibling.handle === activeHandle) continue;

      const node = ProductCardSiblings.createSibling(
        sibling,
        this.name,
        activeHandle,
        this.refs.siblingTemplate,
      );

      node && parts.push(node.outerHTML);
    }

    const currentHtml = currentInput?.closest('.product-card-sibling')?.outerHTML || '';

    if (!currentHtml && !parts.length) return;

    this.refs.fieldset.innerHTML = currentHtml + parts.join('');
    this.updateRefs();
  }

  /**
   * @param {{ handle: string, title: string, url: string, image: string, imageAlt: string }} sibling
   * @param {string} name
   * @param {string} activeHandle
   * @param {HTMLTemplateElement | undefined} template
   * @returns {HTMLElement | null}
   */
  static createSibling(sibling, name, activeHandle, template) {
    if (!(template instanceof HTMLTemplateElement)) return null;

    const node = TemplateHandler.clone(template);

    if (!(node instanceof HTMLElement) || !node.matches('.product-card-sibling')) return null;

    const input = node.querySelector('input[type="radio"]');

    if (input instanceof HTMLInputElement) {
      input.name = name;
      input.value = sibling.handle;
      input.dataset.handle = sibling.handle;
      input.dataset.url = sibling.url;
      input.checked = sibling.handle === activeHandle;
    }

    const label = node.querySelector('span[aria-label]');

    label && label.setAttribute('aria-label', sibling.title);

    const image = node.querySelector('img');

    if (image instanceof HTMLImageElement) {
      if (sibling.image) {
        image.src = sibling.image;
        image.alt = sibling.imageAlt;
        image.hidden = false;
      } else {
        image.remove();
      }
    }

    return node;
  }
}

/** @extends {HTMLComponent<{}>} */
class ProductCardLabels extends HTMLComponent {
  get newIn() {
    return this.hasAttribute('data-new-in');
  }

  get soldOut() {
    return this.hasAttribute('data-sold-out');
  }

  get rarityHandle() {
    return this.dataset.rarityHandle || '';
  }

  get themeHandle() {
    return this.dataset.themeHandle || '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  render() {
    const stackHtml = this.buildLabelsStackHtml();
    const themeHtml = ProductCardLabels.buildThemeLogo(this.themeHandle);
    const hasContent = stackHtml.length > 0 || themeHtml.length > 0;

    this.hidden = !hasContent;
    this.innerHTML = hasContent ? `${stackHtml}${themeHtml}` : '';
    hasContent && this.updateRefs();
  }

  /** @returns {string} */
  buildLabelsStackHtml() {
    const parts = [];

    this.newIn && parts.push(ProductCardLabels.buildNewInLabel());
    this.soldOut && parts.push(ProductCardLabels.buildSoldOutLabel());
    this.rarityHandle && parts.push(ProductCardLabels.buildRarityLabel(this.rarityHandle));

    const labels = parts.filter(Boolean);

    return labels.length
      ? `<div data-labels-stack ref="labelsStack">${labels.join('')}</div>`
      : '';
  }

  /** @returns {string} */
  static buildNewInLabel() {
    return '<span data-label data-new-in>New in</span>';
  }

  /** @returns {string} */
  static buildSoldOutLabel() {
    return `<span data-label data-sold-out>
      <span data-swatch></span>
      Sold out
    </span>`;
  }

  /** @param {string} handle @returns {string} */
  static buildRarityLabel(handle) {
    const rarity = MetaobjectsHandler.getRarity(handle);

    if (!rarity) return '';

    const label = HtmlUtils.escape(rarity.label || rarity.name || 'Rarity');

    return `<span data-label data-rarity style="--rarity-color: var(--rarity-${handle});">
      <span data-swatch></span>
      ${label}
    </span>`;
  }

  /** @param {string} handle @returns {string} */
  static buildThemeLogo(handle) {
    if (!handle) return '';

    const theme = MetaobjectsHandler.getTheme(handle);

    if (!theme?.icon) return '';

    return `<img
      data-theme-logo
      src="${HtmlUtils.escape(theme.icon)}"
      alt="${HtmlUtils.escape(theme.name)}"
      width="48"
      height="48"
      loading="lazy"
    >`;
  }
}

/**
 * @typedef {Object} ProductCardRefs
 * @property {HTMLElement} media
 * @property {HTMLElement} details
 * @property {HTMLAnchorElement} link
 */

/** @extends {HTMLComponent<ProductCardRefs>} */
class ProductCard extends HTMLComponent {
  static PARTIAL_VIEW = 'card';
  static CACHE_PREFIX = 'product-card:';
  static PARTIAL_REFS = Object.freeze(['media', 'details', 'link']);
  static VIEW_TRANSITION_SELECTOR = '[data-view-transition]';
  static VIEW_TRANSITION_RESET_DELAY = 1200;

  static STATE = Object.freeze({
    IDLE: 'idle',
    LOADING: 'loading',
  });

  get handle() {
    return this.dataset.handle || '';
  }

  get isLoading() {
    return this.dataset.state === ProductCard.STATE.LOADING;
  }

  constructor() {
    super();
    this.transitionTimer = 0;

    /** @param {OnSiblingChangeEvent} event */
    this.onSiblingChange = (event) => {
      if (event.cardId !== this.dataset.id) return;

      this.changeSibling(event.handle, event.url);
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(OnSiblingChangeEvent.TYPE, this.onSiblingChange);
  }

  disconnectedCallback() {
    this.clearTransitionTimer();
    document.removeEventListener(OnSiblingChangeEvent.TYPE, this.onSiblingChange);
    super.disconnectedCallback();
  }

  prepareViewTransition() {
    this.clearViewTransitionNames();
    this.clearTransitionTimer();

    for (const element of this.querySelectorAll(ProductCard.VIEW_TRANSITION_SELECTOR)) {
      if (!(element instanceof HTMLElement)) continue;

      element.style.viewTransitionName = element.dataset.viewTransition || '';
    }

    this.transitionTimer = window.setTimeout(() => {
      this.clearViewTransitionNames();
      this.transitionTimer = 0;
    }, ProductCard.VIEW_TRANSITION_RESET_DELAY);
  }

  /** @param {string} handle @param {string} productUrl */
  async changeSibling(handle, productUrl) {
    if (handle === this.handle) return;

    this.setState(ProductCard.STATE.LOADING);

    const nextCard = await this.fetch(handle, productUrl);

    if (!(nextCard instanceof HTMLElement)) {
      this.setState(ProductCard.STATE.IDLE);
      return;
    }

    this.render(nextCard);
    this.setState(ProductCard.STATE.IDLE);
  }

  /** @param {string} state */
  setState(state) {
    this.dataset.state = state;
  }

  clearTransitionTimer() {
    this.transitionTimer && window.clearTimeout(this.transitionTimer);
    this.transitionTimer = 0;
  }

  clearViewTransitionNames() {
    for (const element of document.querySelectorAll(ProductCard.VIEW_TRANSITION_SELECTOR)) {
      if (!(element instanceof HTMLElement)) continue;

      element.style.viewTransitionName = '';
    }
  }

  /** @param {HTMLElement} nextCard */
  render(nextCard) {
    for (const name of ProductCard.PARTIAL_REFS) {
      this.updateRef(name, nextCard);
    }

    this.dataset.handle = nextCard.dataset.handle || this.handle;
    this.updateRefs();
  }

  /** @param {string} handle @param {string} productUrl @returns {Promise<HTMLElement | null>} */
  async fetch(handle, productUrl) {
    const cacheKey = `${ProductCard.CACHE_PREFIX}${handle}`;
    let text = CacheHandler.get(cacheKey);
    const fromCache = typeof text === 'string';

    if (!fromCache) {
      const url = UrlUtils.withView(productUrl, ProductCard.PARTIAL_VIEW);
      text = await TemplateHandler.fetchText(url.toString());
    }

    if (!text) return null;

    !fromCache && CacheHandler.set(cacheKey, text);

    const parsed = TemplateHandler.parseHtml(text);
    const card = parsed.querySelector('product-card');

    return card instanceof HTMLElement ? card : null;
  }
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}

if (!customElements.get('product-card-swatches')) {
  customElements.define('product-card-swatches', ProductCardSiblings);
}

if (!customElements.get('product-card-labels')) {
  customElements.define('product-card-labels', ProductCardLabels);
}
