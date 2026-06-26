import { HTMLComponent } from "@theme/HTMLComponent";
import { ColorSibling } from "@theme/color-sibling";

/**
 * @typedef {Object} ProductCardSiblingsRefs
 * @property {HTMLFieldSetElement} fieldset
 * @property {HTMLInputElement[]} input
 */

/**
 * @extends {HTMLComponent<ProductCardSiblingsRefs>}
 */
class ProductCardSiblings extends HTMLComponent {
  /**
   * @param {{ handle: string, title: string, url: string, image: string, imageAlt: string }} sibling
   * @param {string} name
   * @param {string} activeHandle
   * @returns {string}
   */
  static build(sibling, name, activeHandle) {
    const checked = sibling.handle === activeHandle ? ' checked' : '';
    const image = sibling.image
      ? `<img src="${ProductCardSiblings.escape(sibling.image)}" alt="${ProductCardSiblings.escape(sibling.imageAlt)}" loading="lazy" width="40" height="40">`
      : '';

    return `
      <label class="product-card-sibling">
        <input
          ref="input[]"
          type="radio"
          name="${ProductCardSiblings.escape(name)}"
          value="${ProductCardSiblings.escape(sibling.handle)}"
          data-handle="${ProductCardSiblings.escape(sibling.handle)}"
          data-url="${ProductCardSiblings.escape(sibling.url)}"
          on:change="select"
          ${checked}
        >
        <span aria-label="${ProductCardSiblings.escape(sibling.title)}">
          ${image}
        </span>
      </label>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  /**
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

    await this.publish(card, element);
  }

  async render() {
    const tag = this.dataset.matchTag;
    const limit = Number(this.dataset.limit || 10);
    const card = this.closestTag('product-card');

    if (!tag) return;
    if (!(card instanceof ProductCard)) return;
    if (!this.refs.fieldset) return;

    const siblings = await ColorSibling.fetch(tag, limit);

    if (!siblings.length) return;

    this.refs.fieldset.innerHTML = siblings
      .map((sibling) => ProductCardSiblings.build(sibling, this.name, card.handle))
      .join('');
  }

  get name() {
    return `product-card-sibling-${this.dataset.matchTag || 'default'}`;
  }

  /**
   * @param {ProductCard} card
   * @param {HTMLInputElement} input
   */
  async publish(card, input) {
    const handle = input.dataset.handle;
    const productUrl = input.dataset.url;

    if (!handle) return;
    if (!productUrl) return;

    await card.changeSibling(handle, productUrl);
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

/**
 * @typedef {Object} ProductCardRefs
 */

/**
 * @extends {HTMLComponent<ProductCardRefs>}
 */
class ProductCard extends HTMLComponent {
  static CACHE_PREFIX = 'product-card:';
  static TEMPLATE_VIEW = 'card';
  static VIEW_TRANSITION_SELECTOR = '[data-view-transition]';
  static VIEW_TRANSITION_RESET_DELAY = 1200;

  get handle() {
    return this.dataset.handle || '';
  }

  get isLoading() {
    return this.classList.contains('is-loading');
  }

  set isLoading(value) {
    this.classList.toggle('is-loading', value);
  }

  prepareViewTransition() {
    this.clearViewTransitionNames();

    for (const element of this.querySelectorAll(ProductCard.VIEW_TRANSITION_SELECTOR)) {
      if (!(element instanceof HTMLElement)) continue;

      element.style.viewTransitionName = element.dataset.viewTransition || '';
    }

    window.setTimeout(() => this.clearViewTransitionNames(), ProductCard.VIEW_TRANSITION_RESET_DELAY);
  }

  clearViewTransitionNames() {
    for (const element of document.querySelectorAll(ProductCard.VIEW_TRANSITION_SELECTOR)) {
      if (!(element instanceof HTMLElement)) continue;

      element.style.viewTransitionName = '';
    }
  }

  /**
   * @param {string} handle
   * @param {string} productUrl
   */
  async changeSibling(handle, productUrl) {
    if (handle === this.handle) return;
    if (this.isLoading) return;

    this.isLoading = true;

    const html = await this.fetchCard(handle, productUrl);
    const nextCard = html.querySelector('product-card');

    if (!(nextCard instanceof HTMLElement)) {
      this.isLoading = false;
      return;
    }

    this.render(nextCard);
    this.isLoading = false;
  }

  /**
   * @param {string} handle
   * @param {string} productUrl
   * @returns {Promise<Document>}
   */
  async fetchCard(handle, productUrl) {
    const cacheKey = `${ProductCard.CACHE_PREFIX}${handle}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) return new DOMParser().parseFromString(cached, 'text/html');

    const url = this.getCardUrl(productUrl);
    const response = await fetch(url.toString());
    const text = await response.text();

    sessionStorage.setItem(cacheKey, text);

    return new DOMParser().parseFromString(text, 'text/html');
  }

  /**
   * @param {string} productUrl
   * @returns {URL}
   */
  getCardUrl(productUrl) {
    const url = new URL(productUrl, window.location.origin);
    url.searchParams.set('view', ProductCard.TEMPLATE_VIEW);
    return url;
  }

  /**
   * @param {HTMLElement} nextCard
   */
  render(nextCard) {
    const sections = [
      'media',
      'details',
      'link',
    ]

    for (const section of sections) 
      this.updateRef(section, nextCard);
    this.dataset.handle = nextCard.dataset.handle || this.handle;
  }
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}

if (!customElements.get('product-card-swatches')) {
  customElements.define('product-card-swatches', ProductCardSiblings);
}
