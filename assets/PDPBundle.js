import { HTMLComponent } from '@theme/HTMLComponent';
import { CartHandler } from '@theme/CartHandler';
import { CartDrawer } from '@theme/CartDrawer';
import { DialogComponent } from '@theme/DialogComponent';

/**
 * @typedef {Object} PDPBundleRefs
 * @property {HTMLScriptElement} bundleData
 * @property {HTMLButtonElement} add
 */

/**
 * PDP bundle add-to-cart with shared bundle instance id.
 * @extends {HTMLComponent<PDPBundleRefs>}
 */
export class PDPBundle extends HTMLComponent {
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
