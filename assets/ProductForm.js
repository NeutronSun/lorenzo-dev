import { HTMLComponent } from '@theme/HTMLComponent';
import { CartHandler } from '@theme/CartHandler';
import { CartDrawer } from '@theme/CartDrawer';
import { DialogComponent } from '@theme/DialogComponent';

/**
 * @typedef {Object} ProductFormRefs
 * @property {HTMLFormElement} form
 */

/**
 * PDP add-to-cart form with cart drawer open on success.
 * @extends {HTMLComponent<ProductFormRefs>}
 */
export class ProductForm extends HTMLComponent {
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
