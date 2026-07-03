/**
 * Cart domain: Ajax Cart API handler.
 */

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
