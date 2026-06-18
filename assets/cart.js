import { HTMLComponent } from "@theme/HTMLComponent";
import { OnCartErrorEvent, OnCartLoadingEvent, OnCartUpdateEvent, OnDialogOpenEvent } from "@theme/events";

export class CartHandler {
  static CART_URL = '/cart.js';
  static ADD_URL = '/cart/add.js';
  static CHANGE_URL = '/cart/change.js';
  static UPDATE_URL = '/cart/update.js';
  static CLEAR_URL = '/cart/clear.js';
  static JSON_HEADERS = { Accept: 'application/json' };
  static lastCart = null;

  static get routes() {
    return window.Theme?.routes || {};
  }

  /**
   * @returns {Promise<Object>}
   */
  static async get() {
    document.dispatchEvent(new OnCartLoadingEvent({
      action: 'get',
      cart: CartHandler.lastCart,
    }));

    try {
      const cart = await CartHandler.fetchCart(CartHandler.CART_URL);

      CartHandler.lastCart = cart;
      document.dispatchEvent(new OnCartUpdateEvent({ cart, action: 'get' }));

      return cart;
    } catch (error) {
      document.dispatchEvent(new OnCartErrorEvent({
        action: 'get',
        error,
        cart: CartHandler.lastCart,
      }));

      throw error;
    }
  }

  /**
   * @param {FormData} formData
   * @returns {Promise<Object>}
   */
  static async add(formData) {
    return await CartHandler.mutate('add', async () => {
      const response = await fetch(CartHandler.routes.cart_add_url || CartHandler.ADD_URL, {
        method: 'POST',
        headers: CartHandler.JSON_HEADERS,
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.description || 'Cart add failed');
      }

      return await CartHandler.fetchCart(CartHandler.CART_URL);
    });
  }

  /**
   * @param {string} key
   * @param {number} quantity
   * @returns {Promise<Object>}
   */
  static async change(key, quantity) {
    return await CartHandler.mutate('change', async () => {
      return await CartHandler.fetchCart(CartHandler.routes.cart_change_url || CartHandler.CHANGE_URL, {
        method: 'POST',
        headers: {
          ...CartHandler.JSON_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: key, quantity }),
      });
    }, { key, quantity });
  }

  /**
   * @param {Record<string, number>} updates
   * @returns {Promise<Object>}
   */
  static async update(updates) {
    return await CartHandler.mutate('update', async () => {
      return await CartHandler.fetchCart(CartHandler.routes.cart_update_url || CartHandler.UPDATE_URL, {
        method: 'POST',
        headers: {
          ...CartHandler.JSON_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
    }, { updates });
  }

  /**
   * @returns {Promise<Object>}
   */
  static async clear() {
    return await CartHandler.mutate('clear', async () => {
      return await CartHandler.fetchCart(CartHandler.CLEAR_URL, {
        method: 'POST',
        headers: CartHandler.JSON_HEADERS,
      });
    });
  }

  /**
   * @param {string} action
   * @param {() => Promise<Object>} request
   * @param {Record<string, unknown>} detail
   * @returns {Promise<Object>}
   */
  static async mutate(action, request, detail = {}) {
    document.dispatchEvent(new OnCartLoadingEvent({
      action,
      cart: CartHandler.lastCart,
      ...detail,
    }));

    try {
      const cart = await request();

      CartHandler.lastCart = cart;
      document.dispatchEvent(new OnCartUpdateEvent({
        action,
        cart,
        ...detail,
      }));

      return cart;
    } catch (error) {
      document.dispatchEvent(new OnCartErrorEvent({
        action,
        error,
        cart: CartHandler.lastCart,
        ...detail,
      }));

      throw error;
    }
  }

  /**
   * @param {string} url
   * @param {RequestInit} options
   * @returns {Promise<Object>}
   */
  static async fetchCart(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.description || 'Cart request failed');
    }

    return result;
  }

}

/**
 * @typedef {Object} ProductFormRefs
 * @property {HTMLFormElement} form
 */

/**
 * @extends {HTMLComponent<ProductFormRefs>}
 */
class ProductForm extends HTMLComponent {
  constructor() {
    super();

    this.onSubmit = this.onSubmit.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('submit', this.onSubmit);
  }

  disconnectedCallback() {
    this.removeEventListener('submit', this.onSubmit);
    super.disconnectedCallback();
  }

  /**
   * @param {SubmitEvent} event
   */
  async onSubmit(event) {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) return;

    event.preventDefault();
    if (this.hasAttribute('pending')) return;

    this.toggleAttribute('pending', true);

    try {
      await CartHandler.add(ProductForm.getFormData(form, event.submitter));
      CartDrawer.closeHeaderMenu();
      document.dispatchEvent(new OnDialogOpenEvent({ name: CartDrawer.NAME }));
    } catch (error) {
      console.error(error);
    }

    this.toggleAttribute('pending', false);
  }

  /**
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
 * @property {HTMLElement} checkoutTotal
 */

/**
 * @extends {HTMLComponent<CartDrawerRefs>}
 */
class CartDrawer extends HTMLComponent {
  static NAME = 'cart-drawer';
  static CART_LINK_SELECTOR = 'a[href]';
  static MONEY_SELECTOR = 'cart-money';

  constructor() {
    super();

    this.cart = null;
    this.pendingKey = '';
    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onCartLoading = this.onCartLoading.bind(this);
    this.onCartUpdated = this.onCartUpdated.bind(this);
    this.onCartError = this.onCartError.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.onDocumentClick);
    document.addEventListener(OnCartLoadingEvent.TYPE, this.onCartLoading);
    document.addEventListener(OnCartUpdateEvent.TYPE, this.onCartUpdated);
    document.addEventListener(OnCartErrorEvent.TYPE, this.onCartError);
    CartHandler.get();
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onDocumentClick);
    document.removeEventListener(OnCartLoadingEvent.TYPE, this.onCartLoading);
    document.removeEventListener(OnCartUpdateEvent.TYPE, this.onCartUpdated);
    document.removeEventListener(OnCartErrorEvent.TYPE, this.onCartError);
    super.disconnectedCallback();
  }

  /**
   * @param {MouseEvent} event
   */
  onDocumentClick(event) {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;

    const target = event.target;

    if (!(target instanceof Element)) return;

    const link = target.closest(CartDrawer.CART_LINK_SELECTOR);

    if (!(link instanceof HTMLAnchorElement)) return;
    if (!CartDrawer.isCartUrl(link.href)) return;

    event.preventDefault();

    if (CartDrawer.isOpen()) {
      CartDrawer.close();
      return;
    }

    if (CartDrawer.isCartPage()) return;

    CartDrawer.closeHeaderMenu();
    document.dispatchEvent(new OnDialogOpenEvent({ name: CartDrawer.NAME }));
  }

  /**
   * @param {OnCartLoadingEvent} event
   */
  onCartLoading(event) {
    this.pendingKey = event.key || '';
    this.toggleAttribute('pending', true);
    this.updatePendingItems();
  }

  /**
   * @param {OnCartUpdateEvent} event
   */
  onCartUpdated(event) {
    this.cart = event.cart;
    this.pendingKey = '';
    this.toggleAttribute('pending', false);
    this.render();
  }

  /**
   * @param {OnCartErrorEvent} event
   */
  onCartError(event) {
    this.pendingKey = '';
    this.toggleAttribute('pending', false);

    if (event.cart) {
      this.cart = event.cart;
      this.render();
    }
  }

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
      this.refs.body.innerHTML = CartDrawer.buildEmpty();
      return;
    }

    this.refs.body.innerHTML = items.map((item) => CartDrawer.buildItem(item)).join('');
  }

  updateTotals() {
    const total = this.cart.total_price || 0;
    const itemCount = this.cart.item_count || 0;

    this.refs.subtotal?.setAttribute('value', total);
    this.refs.checkoutTotal?.setAttribute('value', total);
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

  /**
   * @param {Object} item
   * @returns {string}
   */
  static buildItem(item) {
    const image = item.image
      ? `<img src="${CartDrawer.escape(item.image)}" alt="${CartDrawer.escape(item.product_title || item.title)}" width="96" height="96" loading="lazy">`
      : '';
    const variantTitle = item.variant_title && item.variant_title !== 'Default Title'
      ? `<p class="cart-item-variant font-mono">${CartDrawer.escape(item.variant_title)}</p>`
      : '';
    const properties = CartDrawer.buildProperties(item.properties || {});

    return `
      <cart-item key="${CartDrawer.escape(item.key)}" quantity="${item.quantity}">
        <a class="cart-item-image" href="${CartDrawer.escape(item.url || '#')}">${image}</a>
        <div class="cart-item-info">
          <div class="cart-item-copy">
            <a class="cart-item-title" href="${CartDrawer.escape(item.url || '#')}">${CartDrawer.escape(item.product_title || item.title)}</a>
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
          <cart-money class="cart-item-price" value="${item.final_line_price ?? item.line_price ?? 0}"></cart-money>
          <button type="button" class="cart-item-remove font-mono" on:click="removeItem" aria-label="Remove ${CartDrawer.escape(item.product_title || item.title)}">
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
   * @param {Record<string, string>} properties
   * @returns {string}
   */
  static buildProperties(properties) {
    const parts = [];

    for (const [name, value] of Object.entries(properties)) {
      if (!value || name.startsWith('_')) continue;

      parts.push(`<span>${CartDrawer.escape(name)}: ${CartDrawer.escape(String(value))}</span>`);
    }

    if (!parts.length) return '';

    return `<p class="cart-item-properties font-mono">${parts.join('')}</p>`;
  }

  /**
   * @returns {string}
   */
  static buildEmpty() {
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

  static close() {
    const dialog = CartDrawer.getDialog();

    dialog?.open && dialog.close();
  }

  static isOpen() {
    return CartDrawer.getDialog()?.open || false;
  }

  /**
   * @returns {HTMLDialogElement | null}
   */
  static getDialog() {
    const dialog = document.querySelector(`dialog-component[name="${CartDrawer.NAME}"] dialog`);

    if (!(dialog instanceof HTMLDialogElement)) return null;

    return dialog;
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

  static isCartPage() {
    return window.Theme?.template?.name === 'cart' || CartDrawer.isCartUrl(window.location.href);
  }

  /**
   * @param {string} href
   * @returns {boolean}
   */
  static isCartUrl(href) {
    const url = new URL(href, window.location.origin);
    const cartUrl = new URL(window.Theme?.routes?.cart_url || '/cart', window.location.origin);

    return url.origin === window.location.origin && url.pathname === cartUrl.pathname;
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  static escape(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}

/**
 * @typedef {Object} CartItemRefs
 * @property {HTMLElement} quantity
 */

/**
 * @extends {HTMLComponent<CartItemRefs>}
 */
class CartItem extends HTMLComponent {
  get key() {
    return this.getAttribute('key') || '';
  }

  get quantity() {
    return Number(this.getAttribute('quantity') || 0);
  }

  /**
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
    await this.change(0);
  }

  /**
   * @param {number} quantity
   * @returns {Promise<void>}
   */
  async change(quantity) {
    if (!this.key) return;
    if (this.hasAttribute('pending')) return;

    this.optimistic(quantity);

    try {
      await CartHandler.change(this.key, quantity);
    } catch (error) {
      console.error(error);
    }
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
