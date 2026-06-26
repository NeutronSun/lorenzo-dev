/**
 * Product card async partial updates and color swatches via sibling-change events.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { ColorSibling } from '@theme/color-sibling';
import { OnSiblingChangeEvent } from '@theme/events';
import { HtmlUtils, TemplateHandler, UrlUtils } from '@theme/utilities';

/**
 * @typedef {Object} ProductCardSiblingsRefs
 * @property {HTMLTemplateElement} siblingTemplate
 * @property {HTMLFieldSetElement} fieldset
 * @property {HTMLInputElement[]} input
 */

/**
 * Renders color swatches for a product card and emits sibling-change events.
 * @extends {HTMLComponent<ProductCardSiblingsRefs>}
 */
class ProductCardSiblings extends HTMLComponent {
  renderId = 0;

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  /** @returns {string} Radio group name scoped to the parent card id. */
  get name() {
    const card = this.closestTag('product-card');
    const cardId = card?.dataset.id || 'default';

    return `product-card-sibling-${cardId}`;
  }

  /**
   * Handles swatch selection and dispatches a sibling-change event.
   * @param {Event} event
   * @param {Element} element
   */
  async select(event, element) {
    if (!(element instanceof HTMLInputElement)) return;
    if (!element.checked) return;

    const card = this.closestTag('product-card');

    if (!(card instanceof ProductCard)) return;

    event.preventDefault();
    event.stopPropagation();

    const handle = element.dataset.handle;
    const productUrl = element.dataset.url;
    const cardId = card.dataset.id;

    if (!handle || !productUrl || !cardId) return;

    document.dispatchEvent(new OnSiblingChangeEvent({
      cardId,
      handle,
      url: productUrl,
    }));
  }

  /** Fetches sibling swatches and appends them to the fieldset. */
  async render() {
    const renderId = ++this.renderId;
    const tag = this.dataset.matchTag;
    const limit = Number(this.dataset.limit || 10);
    const card = this.closestTag('product-card');

    if (!tag) return;
    if (!(card instanceof ProductCard)) return;
    if (!this.refs.fieldset) return;

    const siblings = await ColorSibling.fetch(tag, limit);

    if (!this.isConnected || renderId !== this.renderId) return;
    if (!siblings.length) return;

    const parts = [];
    const activeHandle = card.handle;

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

    const currentInput = this.refs.fieldset.querySelector('input[checked], input:checked');
    const currentHtml = currentInput?.closest('.product-card-sibling')?.outerHTML || '';

    if (!currentHtml && !parts.length) return;

    this.refs.fieldset.innerHTML = currentHtml + parts.join('');
    this.updateRefs();
  }

  /**
   * Clones and fills a swatch node from the Liquid template.
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

/**
 * @typedef {Object} ProductCardRefs
 * @property {HTMLElement} media
 * @property {HTMLElement} details
 * @property {HTMLAnchorElement} link
 */

/**
 * Product card with async partial updates when a color sibling is selected.
 * @extends {HTMLComponent<ProductCardRefs>}
 */
class ProductCard extends HTMLComponent {
  static PARTIAL_VIEW = 'card';
  static CACHE_PREFIX = 'product-card:';
  static PARTIAL_REFS = Object.freeze(['media', 'details', 'link']);
  static VIEW_TRANSITION_SELECTOR = '[data-view-transition]';
  static VIEW_TRANSITION_RESET_DELAY = 1200;

  /** @type {((event: OnSiblingChangeEvent) => void) | null} */
  onSiblingChangeBound = null;

  /** @returns {string} Current product handle from data attribute. */
  get handle() {
    return this.dataset.handle || '';
  }

  /** @returns {boolean} Whether the card is loading a sibling partial. */
  get isLoading() {
    return this.classList.contains('is-loading');
  }

  set isLoading(value) {
    this.classList.toggle('is-loading', value);
  }

  connectedCallback() {
    super.connectedCallback();
    this.onSiblingChangeBound = (event) => this.onSiblingChange(event);
    document.addEventListener(OnSiblingChangeEvent.TYPE, this.onSiblingChangeBound);
  }

  disconnectedCallback() {
    this.onSiblingChangeBound && document.removeEventListener(OnSiblingChangeEvent.TYPE, this.onSiblingChangeBound);
    this.onSiblingChangeBound = null;
    super.disconnectedCallback();
  }

  /**
   * @param {OnSiblingChangeEvent} event
   */
  onSiblingChange(event) {
    if (event.cardId !== this.dataset.id) return;

    this.changeSibling(event.handle, event.url);
  }

  /**
   * Applies view-transition names before sibling partial swap.
   */
  prepareViewTransition() {
    this.clearViewTransitionNames();

    for (const element of this.querySelectorAll(ProductCard.VIEW_TRANSITION_SELECTOR)) {
      if (!(element instanceof HTMLElement)) continue;

      element.style.viewTransitionName = element.dataset.viewTransition || '';
    }

    window.setTimeout(() => this.clearViewTransitionNames(), ProductCard.VIEW_TRANSITION_RESET_DELAY);
  }

  /** Clears temporary view-transition names from card media elements. */
  clearViewTransitionNames() {
    for (const element of document.querySelectorAll(ProductCard.VIEW_TRANSITION_SELECTOR)) {
      if (!(element instanceof HTMLElement)) continue;

      element.style.viewTransitionName = '';
    }
  }

  /**
   * Loads and renders a sibling product partial into the card.
   * @param {string} handle
   * @param {string} productUrl
   */
  async changeSibling(handle, productUrl) {
    if (handle === this.handle) return;
    if (this.isLoading) return;

    this.isLoading = true;

    const nextCard = await this.fetchCard(handle, productUrl);

    if (!this.isConnected) {
      this.isLoading = false;
      return;
    }

    if (!(nextCard instanceof HTMLElement)) {
      this.isLoading = false;
      return;
    }

    this.render(nextCard);
    this.isLoading = false;
  }

  /**
   * Fetches a product card partial by handle, with sessionStorage caching.
   * @param {string} handle
   * @param {string} productUrl
   * @returns {Promise<HTMLElement | null>}
   */
  async fetchCard(handle, productUrl) {
    const cacheKey = `${ProductCard.CACHE_PREFIX}${handle}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      const parsed = TemplateHandler.parseHtml(cached);
      const card = parsed.querySelector('product-card');

      return card instanceof HTMLElement ? card : null;
    }

    const url = UrlUtils.withView(productUrl, ProductCard.PARTIAL_VIEW);
    const text = await TemplateHandler.fetchText(url.toString());

    if (!text) return null;

    sessionStorage.setItem(cacheKey, text);

    const parsed = TemplateHandler.parseHtml(text);
    const card = parsed.querySelector('product-card');

    return card instanceof HTMLElement ? card : null;
  }

  /**
   * Replaces card refs from a fetched sibling partial.
   * @param {HTMLElement} nextCard
   */
  render(nextCard) {
    for (const name of ProductCard.PARTIAL_REFS) {
      this.updateRef(name, nextCard);
    }

    this.dataset.handle = nextCard.dataset.handle || this.handle;
    this.updateRefs();
  }
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}

if (!customElements.get('product-card-swatches')) {
  customElements.define('product-card-swatches', ProductCardSiblings);
}
