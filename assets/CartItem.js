import { HTMLComponent } from '@theme/HTMLComponent';
import { CartHandler } from '@theme/CartHandler';

/**
 * @typedef {Object} CartItemRefs
 * @property {HTMLElement} quantity
 */

/**
 * Cart line item quantity controls with optimistic UI.
 * @extends {HTMLComponent<CartItemRefs>}
 */
export class CartItem extends HTMLComponent {
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
