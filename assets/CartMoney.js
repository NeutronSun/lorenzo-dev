
/**
 * Formats cart money amounts from cents using the active Shopify currency.
 * @extends {HTMLElement}
 */
export class CartMoney extends HTMLElement {
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
