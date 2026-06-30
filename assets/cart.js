/**
 * Cart domain: Ajax Cart API handler, drawer/page UI, PDP bundle, line items, and money formatting.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { DialogComponent } from '@theme/dialog';
import {
  OnCartErrorEvent,
  OnCartLoadingEvent,
  OnCartUpdateEvent,
} from '@theme/events';
import { HtmlUtils, TemplateHandler, UrlUtils } from '@theme/utilities';

/**
 * @typedef {Object} ShopifyCartItem
 * @property {string} key
 * @property {number} id
 * @property {number} quantity
 * @property {string} title
 * @property {string} product_title
 * @property {string} variant_title
 * @property {string} url
 * @property {string} image
 * @property {number} price
 * @property {number} line_price
 * @property {number} final_line_price
 * @property {number} original_line_price
 * @property {Record<string, string>} properties
 */

/**
 * @typedef {Object} ShopifyCart
 * @property {ShopifyCartItem[]} items
 * @property {number} item_count
 * @property {number} total_price
 */

/** Ajax Cart API client with theme-wide cart events. */
export class CartHandler {
  static CART_URL = '/cart.js';
  static ADD_URL = '/cart/add.js';
  static CHANGE_URL = '/cart/change.js';
  static UPDATE_URL = '/cart/update.js';
  static CLEAR_URL = '/cart/clear.js';
  static JSON_HEADERS = { Accept: 'application/json' };

  /** @type {ShopifyCart | null} */
  static cart = null;

  static get routes() {
    return window.Theme?.routes || {};
  }

  /**
   * Fetches the current cart and dispatches cart events.
   * @returns {Promise<ShopifyCart | null>}
   */
  static async get() {
    const request = async () => {
      return await CartHandler.fetchCart(CartHandler.CART_URL);
    };

    return await CartHandler.mutate('get', request());
  }

  /**
   * Adds line items to the cart from form data.
   * @param {FormData} formData
   * @returns {Promise<ShopifyCart | null>}
   */
  static async add(formData) {
    const request = async () => {
      const response = await fetch(CartHandler.routes.cart_add_url || CartHandler.ADD_URL, {
        method: 'POST',
        headers: CartHandler.JSON_HEADERS,
        body: formData,
      });

      if (!response.ok) return null;

      return await CartHandler.fetchCart(CartHandler.CART_URL);
    };

    return await CartHandler.mutate('add', request());
  }

  /**
   * Updates quantity for a cart line item by key.
   * @param {string} key
   * @param {number} quantity
   * @returns {Promise<ShopifyCart | null>}
   */
  static async change(key, quantity) {
    const detail = { key, quantity };
    const request = async () => {
      return await CartHandler.fetchCart(CartHandler.routes.cart_change_url || CartHandler.CHANGE_URL, {
        method: 'POST',
        headers: {
          ...CartHandler.JSON_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: key, quantity }),
      });
    };

    return await CartHandler.mutate('change', request(), detail);
  }

  /**
   * Updates multiple cart line items by key.
   * @param {Record<string, number>} updates
   * @returns {Promise<ShopifyCart | null>}
   */
  static async update(updates) {
    const detail = { updates };
    const request = async () => {
      return await CartHandler.fetchCart(CartHandler.routes.cart_update_url || CartHandler.UPDATE_URL, {
        method: 'POST',
        headers: {
          ...CartHandler.JSON_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
    };

    return await CartHandler.mutate('update', request(), detail);
  }

  /**
   * Clears all items from the cart.
   * @returns {Promise<ShopifyCart | null>}
   */
  static async clear() {
    const request = async () => {
      return await CartHandler.fetchCart(CartHandler.CLEAR_URL, {
        method: 'POST',
        headers: CartHandler.JSON_HEADERS,
      });
    };

    return await CartHandler.mutate('clear', request());
  }

  /**
   * Runs a cart mutation with loading, update, and error events.
   * @param {'get' | 'add' | 'change' | 'update' | 'clear'} action
   * @param {Promise<ShopifyCart | null>} request
   * @param {Record<string, unknown>} [detail]
   * @returns {Promise<ShopifyCart | null>}
   */
  static async mutate(action, request, detail = {}) {
    document.dispatchEvent(new OnCartLoadingEvent({
      action,
      cart: CartHandler.cart,
      ...detail,
    }));

    const cart = await request;

    if (!cart) {
      document.dispatchEvent(new OnCartErrorEvent({
        action,
        error: new Error('Cart request failed'),
        cart: CartHandler.cart,
        ...detail,
      }));

      return null;
    }

    CartHandler.cart = cart;
    document.dispatchEvent(new OnCartUpdateEvent({
      action,
      cart,
      ...detail,
    }));

    return cart;
  }

  /**
   * Fetches cart JSON from a Shopify Ajax endpoint.
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<ShopifyCart | null>}
   */
  static async fetchCart(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) return null;

    return result;
  }
}

/**
 * @typedef {Object} ProductFormRefs
 * @property {HTMLFormElement} form
 */

/**
 * PDP add-to-cart form with cart drawer open on success.
 * @extends {HTMLComponent<ProductFormRefs>}
 */
class ProductForm extends HTMLComponent {
  /**
   * Submits the product form through CartHandler.add.
   * @param {SubmitEvent} event
   */
  async onSubmit(event) {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) return;

    event.preventDefault();
    if (this.hasAttribute('pending')) return;

    this.toggleAttribute('pending', true);

    const cart = await CartHandler.add(ProductForm.getFormData(form, event.submitter));

    if (cart) {
      CartDrawer.closeHeaderMenu();
      DialogComponent.showModal(CartDrawer.NAME);
    }

    this.toggleAttribute('pending', false);
  }

  /**
   * Builds FormData from a form and optional submitter button.
   * @param {HTMLFormElement} form
   * @param {HTMLElement | null} submitter
   * @returns {FormData}
   */
  static getFormData(form, submitter) {
    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
      return new FormData(form, submitter);
    }

    return new FormData(form);
  }
}

if (!customElements.get('product-form')) {
  customElements.define('product-form', ProductForm);
}

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
class CartDrawer extends HTMLComponent {
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
class CartPage extends HTMLComponent {
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

/**
 * @typedef {Object} PDPBundleRefs
 * @property {HTMLScriptElement} bundleData
 * @property {HTMLButtonElement} add
 */

/**
 * PDP bundle add-to-cart with shared bundle instance id.
 * @extends {HTMLComponent<PDPBundleRefs>}
 */
class PDPBundle extends HTMLComponent {
  static BUNDLE_PROPERTY = '_bundleId';
  static BUNDLE_ID_SEPARATOR = '||';
  static RANDOM_RADIX = 36;
  static RANDOM_SLICE_START = 2;

  get bundleData() {
    if (!(this.refs.bundleData instanceof HTMLScriptElement)) return null;

    return JSON.parse(this.refs.bundleData.textContent || 'null');
  }

  get bundleId() {
    return String(this.bundleData?.bundleId || '');
  }

  get items() {
    const items = this.bundleData?.items;

    return Array.isArray(items) ? items : [];
  }

  get availableItems() {
    return this.items.filter((item) => item?.available && Number(item.id) > 0);
  }

  get allItemsAvailable() {
    return Boolean(this.bundleId) && this.items.length > 0 && this.availableItems.length === this.items.length;
  }

  set isPending(value) {
    this.toggleAttribute('pending', value);
    this.refs.add instanceof HTMLButtonElement && (this.refs.add.disabled = value || !this.allItemsAvailable);
  }

  /**
   * @param {string} baseBundleId
   * @returns {string}
   */
  static createBundleInstanceId(baseBundleId) {
    const randomId = window.crypto?.randomUUID?.() || `${Date.now().toString(PDPBundle.RANDOM_RADIX)}-${Math.random().toString(PDPBundle.RANDOM_RADIX).slice(PDPBundle.RANDOM_SLICE_START)}`;

    return `${baseBundleId}${PDPBundle.BUNDLE_ID_SEPARATOR}${randomId}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateButton();
  }

  /**
   * @param {Event} event
   */
  async addToCart(event) {
    PDPBundle.stop(event);

    if (this.hasAttribute('pending')) return;
    if (!this.allItemsAvailable) {
      this.updateButton();
      return;
    }

    this.isPending = true;

    const cart = await CartHandler.add(this.getFormData(PDPBundle.createBundleInstanceId(this.bundleId)));

    if (cart) {
      CartDrawer.closeHeaderMenu();
      DialogComponent.showModal(CartDrawer.NAME);
    }

    this.isPending = false;
  }

  /**
   * @param {string} bundleId
   * @returns {FormData}
   */
  getFormData(bundleId) {
    const formData = new FormData();

    for (const [index, item] of this.availableItems.entries()) {
      formData.append(`items[${index}][id]`, String(item.id));
      formData.append(`items[${index}][quantity]`, '1');
      formData.append(`items[${index}][properties][${PDPBundle.BUNDLE_PROPERTY}]`, bundleId);
    }

    return formData;
  }

  updateButton() {
    if (!(this.refs.add instanceof HTMLButtonElement)) return;

    this.refs.add.disabled = !this.allItemsAvailable;
  }

  /**
   * @param {Event | undefined} event
   */
  static stop(event) {
    event?.preventDefault();
    event?.stopPropagation();
  }
}

if (!customElements.get('pdp-bundle')) {
  customElements.define('pdp-bundle', PDPBundle);
}

/**
 * @typedef {Object} CartItemRefs
 * @property {HTMLElement} quantity
 */

/**
 * Cart line item quantity controls with optimistic UI.
 * @extends {HTMLComponent<CartItemRefs>}
 */
class CartItem extends HTMLComponent {
  get key() {
    return this.getAttribute('key') || '';
  }

  get quantity() {
    return Number(this.getAttribute('quantity') || 0);
  }

  get removeOne() {
    return this.hasAttribute('remove-one');
  }

  /**
   * Increments line item quantity.
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async increase(event) {
    CartItem.stop(event);
    await this.change(this.quantity + 1);
  }

  /**
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async decrease(event) {
    CartItem.stop(event);
    await this.change(Math.max(this.quantity - 1, 0));
  }

  /**
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async removeItem(event) {
    CartItem.stop(event);
    await this.change(this.removeOne && this.quantity > 1 ? this.quantity - 1 : 0);
  }

  /**
   * @param {number} quantity
   * @returns {Promise<void>}
   */
  async change(quantity) {
    if (!this.key) return;
    if (this.hasAttribute('pending')) return;

    this.optimistic(quantity);
    await CartHandler.change(this.key, quantity);
  }

  /**
   * @param {number} quantity
   */
  optimistic(quantity) {
    this.setAttribute('quantity', String(quantity));
    this.toggleAttribute('pending', true);
    this.refs.quantity && (this.refs.quantity.textContent = String(quantity));
  }

  /**
   * @param {Event | undefined} event
   */
  static stop(event) {
    event?.preventDefault();
    event?.stopPropagation();
  }
}

if (!customElements.get('cart-item')) {
  customElements.define('cart-item', CartItem);
}

/**
 * Formats cart money amounts from cents using the active Shopify currency.
 * @extends {HTMLElement}
 */
class CartMoney extends HTMLElement {
  static observedAttributes = ['value'];

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    this.textContent = CartMoney.format(Number(this.getAttribute('value') || 0));
  }

  /**
   * Formats cents into a localized currency string.
   * @param {number} cents
   * @returns {string}
   */
  static format(cents) {
    const currency = window.Shopify?.currency?.active || 'EUR';
    const locale = document.documentElement.lang || 'en';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(cents / 100);
  }
}

if (!customElements.get('cart-money')) {
  customElements.define('cart-money', CartMoney);
}
