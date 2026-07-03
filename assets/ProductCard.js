import { HTMLComponent } from '@theme/HTMLComponent';
import { OnSiblingChangeEvent } from '@theme/events';
import { CacheHandler, TemplateHandler, UrlUtils } from '@theme/utilities';

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
