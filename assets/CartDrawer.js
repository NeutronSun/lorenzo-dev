import { HTMLComponent } from '@theme/HTMLComponent';
import { DialogComponent } from '@theme/DialogComponent';
import { OnCartErrorEvent, OnCartLoadingEvent, OnCartUpdateEvent } from '@theme/events';
import { HtmlUtils, TemplateHandler, UrlUtils } from '@theme/utilities';
import { CartHandler } from '@theme/CartHandler';

/**
 * @typedef {Object} CartDrawerRefs
 * @property {HTMLElement} count
 * @property {HTMLElement} body
 * @property {HTMLElement} subtotal
 * @property {HTMLButtonElement} checkout
 * @property {HTMLTemplateElement} emptyTemplate
 * @property {HTMLTemplateElement} itemTemplate
 */

/**
 * Cart drawer UI synced to Ajax cart events.
 * @extends {HTMLComponent<CartDrawerRefs>}
 */
export class CartDrawer extends HTMLComponent {
  static NAME = 'cart-drawer';
  static SECTION_BODY_SELECTOR = 'cart-drawer [ref="body"]';

  constructor() {
    super();

    this.cart = null;
    this.pendingKey = '';
    this.onCartEvent = this.onCartEvent.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(OnCartLoadingEvent.TYPE, this.onCartEvent);
    document.addEventListener(OnCartUpdateEvent.TYPE, this.onCartEvent);
    document.addEventListener(OnCartErrorEvent.TYPE, this.onCartEvent);
    CartHandler.get();
  }

  disconnectedCallback() {
    document.removeEventListener(OnCartLoadingEvent.TYPE, this.onCartEvent);
    document.removeEventListener(OnCartUpdateEvent.TYPE, this.onCartEvent);
    document.removeEventListener(OnCartErrorEvent.TYPE, this.onCartEvent);
    super.disconnectedCallback();
  }

  /**
   * Handles cart loading, update, and error theme events.
   * @param {OnCartLoadingEvent | OnCartUpdateEvent | OnCartErrorEvent} event
   */
  onCartEvent(event) {
    switch (event.type) {
      case OnCartLoadingEvent.TYPE:
        this.pendingKey = event.key || '';
        this.toggleAttribute('pending', true);
        this.updatePendingItems();
        break;
      case OnCartUpdateEvent.TYPE:
        this.cart = event.cart;
        this.pendingKey = '';
        this.toggleAttribute('pending', false);
        this.render();
        break;
      case OnCartErrorEvent.TYPE:
        this.pendingKey = '';
        this.toggleAttribute('pending', false);

        if (event.cart) {
          this.cart = event.cart;
          this.render();
        }

        break;
    }
  }

  /** Re-renders drawer count, body, totals, and header badges. */
  render() {
    if (!this.cart) return;

    this.updateCount();
    this.updateBody();
    this.updateTotals();
    this.updateHeaderCounts();
  }

  updateCount() {
    if (!this.refs.count) return;

    const itemCount = this.cart.item_count || 0;
    this.refs.count.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  }

  updateBody() {
    if (!this.refs.body) return;

    const items = this.cart.items || [];
    this.toggleAttribute('empty', !items.length);

    if (!items.length) {
      this.refs.body.innerHTML = this.buildEmpty();
      return;
    }

    this.updateBodyFromSection();
  }

  updateTotals() {
    const total = this.cart.total_price || 0;
    const itemCount = this.cart.item_count || 0;

    this.refs.subtotal?.setAttribute('value', total);
    this.refs.checkout && (this.refs.checkout.disabled = itemCount === 0);
  }

  updateHeaderCounts() {
    const itemCount = this.cart.item_count || 0;

    for (const element of document.querySelectorAll('[data-cart-count]')) {
      element.textContent = String(itemCount);
    }

    for (const element of document.querySelectorAll('[data-cart-bubble]')) {
      element.toggleAttribute('hidden', itemCount === 0);
    }
  }

  updatePendingItems() {
    if (!this.pendingKey) return;

    for (const item of this.querySelectorAll('cart-item')) {
      item.toggleAttribute('pending', item.getAttribute('key') === this.pendingKey);
    }
  }

  async updateBodyFromSection() {
    const sectionId = this.dataset.sectionId;

    if (!sectionId) return;

    const url = UrlUtils.withSectionId(window.location.href, sectionId);
    const body = await TemplateHandler.fetch(url, CartDrawer.SECTION_BODY_SELECTOR);

    if (body instanceof HTMLElement) {
      this.refs.body.innerHTML = body.innerHTML;
      return;
    }

    this.refs.body.innerHTML = (this.cart.items || []).map((item) => this.buildItem(item)).join('');
  }

  /**
   * Builds empty-state markup from the Liquid template or fallback HTML.
   * @returns {string}
   */
  buildEmpty() {
    const template = this.refs.emptyTemplate;

    if (template instanceof HTMLTemplateElement) {
      const fragment = TemplateHandler.clone(template);
      const empty = fragment.querySelector('.cart-empty');

      if (empty instanceof HTMLElement) return empty.outerHTML;
    }

    return `
      <div class="cart-empty">
        <span class="cart-empty-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
            <path d="M3 6h18"></path>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </span>
        <p class="cart-empty-title font-mono">YOUR BAG IS EMPTY</p>
        <p class="cart-empty-text">Add a piece to start. Free EU shipping over €120.</p>
      </div>
    `;
  }

  /**
   * Builds fallback cart line item markup when section rendering fails.
   * @param {ShopifyCartItem} item
   * @returns {string}
   */
  buildItem(item) {
    const image = item.image
      ? `<img src="${HtmlUtils.escape(item.image)}" alt="${HtmlUtils.escape(item.product_title || item.title)}" width="96" height="96" loading="lazy">`
      : '';
    const variantTitle = item.variant_title && item.variant_title !== 'Default Title'
      ? `<p class="cart-item-variant font-mono">${HtmlUtils.escape(item.variant_title)}</p>`
      : '';
    const properties = CartDrawer.buildProperties(item.properties || {});
    const price = CartDrawer.buildLinePrice(item.final_line_price ?? item.line_price ?? 0, item.original_line_price ?? item.line_price ?? 0);

    return `
      <cart-item key="${HtmlUtils.escape(item.key)}" quantity="${item.quantity}">
        <a class="cart-item-image" href="${HtmlUtils.escape(item.url || '#')}">${image}</a>
        <div class="cart-item-info">
          <div class="cart-item-copy">
            <a class="cart-item-title" href="${HtmlUtils.escape(item.url || '#')}">${HtmlUtils.escape(item.product_title || item.title)}</a>
            ${variantTitle}
            ${properties}
          </div>
          <div class="cart-item-actions">
            <button type="button" on:click="decrease" aria-label="Decrease quantity">-</button>
            <span ref="quantity">${item.quantity}</span>
            <button type="button" on:click="increase" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-item-meta">
          ${price}
          <button type="button" class="cart-item-remove font-mono" on:click="removeItem" aria-label="Remove ${HtmlUtils.escape(item.product_title || item.title)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="M6 6l1 16h10l1-16"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
            </svg>
            <span>REMOVE</span>
          </button>
        </div>
      </cart-item>
    `;
  }

  /**
   * Renders visible line item properties, skipping internal keys.
   * @param {Record<string, string>} properties
   * @returns {string}
   */
  static buildProperties(properties) {
    const parts = [];

    for (const [name, value] of Object.entries(properties)) {
      if (!value || name.startsWith('_')) continue;

      parts.push(`<span>${HtmlUtils.escape(name)}: ${HtmlUtils.escape(String(value))}</span>`);
    }

    if (!parts.length) return '';

    return `<p class="cart-item-properties font-mono">${parts.join('')}</p>`;
  }

  /**
   * Builds line price markup with optional compare-at price.
   * @param {number} price
   * @param {number} compareAtPrice
   * @returns {string}
   */
  static buildLinePrice(price, compareAtPrice) {
    const compare = compareAtPrice > price
      ? `<s><cart-money value="${compareAtPrice}"></cart-money></s>`
      : '';

    return `
      <span class="cart-item-price">
        <cart-money value="${price}"></cart-money>
        ${compare}
      </span>
    `;
  }

  static close() {
    DialogComponent.requestClose(CartDrawer.NAME);
  }

  /**
   * @returns {HTMLDialogElement | null}
   */
  static getDialog() {
    return DialogComponent.getDialogElement(CartDrawer.NAME);
  }

  static closeHeaderMenu() {
    for (const input of document.querySelectorAll('.header-nav-toggle')) {
      if (!(input instanceof HTMLInputElement)) continue;

      input.checked = false;
    }

    for (const details of document.querySelectorAll('.header-menu-item[open]')) {
      if (!(details instanceof HTMLDetailsElement)) continue;

      details.open = false;
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
