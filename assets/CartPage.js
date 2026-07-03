import { HTMLComponent } from '@theme/HTMLComponent';
import { OnCartErrorEvent, OnCartLoadingEvent, OnCartUpdateEvent } from '@theme/events';
import { TemplateHandler, UrlUtils } from '@theme/utilities';
import { CartHandler } from '@theme/CartHandler';

/**
 * @typedef {Object} CartPageRefs
 * @property {HTMLElement} count
 * @property {HTMLElement} items
 * @property {HTMLElement} overview
 */

/**
 * Cart page section synced to Ajax cart events.
 * @extends {HTMLComponent<CartPageRefs>}
 */
export class CartPage extends HTMLComponent {
  static CART_ITEM_SELECTOR = 'cart-item';
  static SECTION_SELECTOR = 'cart-page';
  static REF_NAMES = Object.freeze(['count', 'items', 'overview']);

  constructor() {
    super();

    this.cart = null;
    this.pendingKey = '';
    this.requestId = 0;
    this.onCartEvent = this.onCartEvent.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(OnCartLoadingEvent.TYPE, this.onCartEvent);
    document.addEventListener(OnCartUpdateEvent.TYPE, this.onCartEvent);
    document.addEventListener(OnCartErrorEvent.TYPE, this.onCartEvent);
  }

  disconnectedCallback() {
    document.removeEventListener(OnCartLoadingEvent.TYPE, this.onCartEvent);
    document.removeEventListener(OnCartUpdateEvent.TYPE, this.onCartEvent);
    document.removeEventListener(OnCartErrorEvent.TYPE, this.onCartEvent);
    super.disconnectedCallback();
  }

  /**
   * Handles cart loading, update, and error theme events on the cart page.
   * @param {OnCartLoadingEvent | OnCartUpdateEvent | OnCartErrorEvent} event
   */
  onCartEvent(event) {
    switch (event.type) {
      case OnCartLoadingEvent.TYPE:
        this.requestId += 1;
        this.pendingKey = event.key || '';
        this.toggleAttribute('pending', true);
        this.updatePendingItems();
        break;
      case OnCartUpdateEvent.TYPE:
        this.handleCartUpdate(event);
        break;
      case OnCartErrorEvent.TYPE:
        this.handleCartError(event);
        break;
    }
  }

  /**
   * @param {OnCartUpdateEvent} event
   */
  async handleCartUpdate(event) {
    const requestId = this.requestId + 1;

    this.requestId = requestId;
    this.cart = event.cart;
    this.pendingKey = '';

    const updated = await this.render(requestId);

    if (!updated) return;

    this.toggleAttribute('pending', false);
    this.updatePendingItems();
  }

  /**
   * @param {OnCartErrorEvent} event
   */
  async handleCartError(event) {
    const requestId = this.requestId + 1;

    this.requestId = requestId;
    this.pendingKey = '';

    if (event.cart) {
      this.cart = event.cart;
      await this.render(requestId);
    }

    if (requestId !== this.requestId) return;

    this.toggleAttribute('pending', false);
    this.updatePendingItems();
  }

  /**
   * @param {number} requestId
   * @returns {Promise<boolean>}
   */
  async render(requestId) {
    if (!this.cart) return false;

    const sectionId = this.dataset.sectionId;

    if (!sectionId) return false;

    const url = UrlUtils.withSectionId(window.Theme?.routes?.cart_url || '/cart', sectionId);
    const section = await TemplateHandler.fetch(url, CartPage.SECTION_SELECTOR);

    if (!this.isConnected) return false;
    if (requestId !== this.requestId) return false;
    if (!(section instanceof HTMLElement)) return false;

    TemplateHandler.replaceRefs(this, section, CartPage.REF_NAMES);
    this.updateRefs();
    this.toggleAttribute('empty', (this.cart.item_count || 0) === 0);

    return true;
  }

  updatePendingItems() {
    for (const item of this.querySelectorAll(CartPage.CART_ITEM_SELECTOR)) {
      item.toggleAttribute('pending', Boolean(this.pendingKey) && item.getAttribute('key') === this.pendingKey);
    }
  }
}

if (!customElements.get('cart-page')) {
  customElements.define('cart-page', CartPage);
}
