/**
 * Product card async partial updates and color swatches via sibling-change events.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { ColorSibling } from '@theme/ColorSibling';
import { TemplateHandler } from '@theme/utilities';

/**
 * @typedef {Object} ProductCardSiblingsRefs
 * @property {HTMLTemplateElement} siblingTemplate
 * @property {HTMLFieldSetElement} fieldset
 * @property {HTMLInputElement[]} input
 */

/** @extends {HTMLComponent<ProductCardSiblingsRefs>} */
class ProductCardSiblings extends HTMLComponent {
  
  get name() {
    return `product-card-sibling-${this.dataset.cardId || 'default'}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.load();
  }

  /** @param {Event} event @param {Element} element */
  select(event, element) {
    if (!(element instanceof HTMLInputElement)) return;
    if (!element.checked) return;

    event.preventDefault();
    event.stopPropagation();

    const handle = element.dataset.handle;
    const productUrl = element.dataset.url;
    const cardId = this.dataset.cardId;

    if (!handle || !productUrl || !cardId) return;

    document.dispatchEvent(new OnSiblingChangeEvent({
      cardId,
      handle,
      url: productUrl,
    }));
  }

  async load() {
    const tag = this.dataset.matchTag;
    const limit = Number(this.dataset.limit || 10);

    if (!tag) return;

    const siblings = await ColorSibling.get(tag, limit);

    if (!siblings.length) return;

    this.render(siblings);
  }

  /** @param {Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }>} siblings */
  render(siblings) {
    if (!this.refs.fieldset) return;

    const currentInput = this.refs.fieldset.querySelector('input[checked], input:checked');
    const activeHandle = currentInput instanceof HTMLInputElement ? currentInput.dataset.handle || '' : '';
    const parts = [];

    for (const sibling of siblings) {
      if (sibling.handle === activeHandle) continue;

      const node = ProductCardSiblings.createSibling(
        sibling,
        this.name,
        activeHandle,
        this.refs.siblingTemplate,
      );

      node && parts.push(node.outerHTML);
    }

    const currentHtml = currentInput?.closest('.product-card-sibling')?.outerHTML || '';

    if (!currentHtml && !parts.length) return;

    this.refs.fieldset.innerHTML = currentHtml + parts.join('');
    this.updateRefs();
  }

  /**
   * @param {{ handle: string, title: string, url: string, image: string, imageAlt: string }} sibling
   * @param {string} name
   * @param {string} activeHandle
   * @param {HTMLTemplateElement | undefined} template
   * @returns {HTMLElement | null}
   */
  static createSibling(sibling, name, activeHandle, template) {
    if (!(template instanceof HTMLTemplateElement)) return null;

    const node = TemplateHandler.clone(template);

    if (!(node instanceof HTMLElement) || !node.matches('.product-card-sibling')) return null;

    const input = node.querySelector('input[type="radio"]');

    if (input instanceof HTMLInputElement) {
      input.name = name;
      input.value = sibling.handle;
      input.dataset.handle = sibling.handle;
      input.dataset.url = sibling.url;
      input.checked = sibling.handle === activeHandle;
    }

    const label = node.querySelector('span[aria-label]');

    label && label.setAttribute('aria-label', sibling.title);

    const image = node.querySelector('img');

    if (image instanceof HTMLImageElement) {
      if (sibling.image) {
        image.src = sibling.image;
        image.alt = sibling.imageAlt;
        image.hidden = false;
      } else {
        image.remove();
      }
    }

    return node;
  }
}

if (!customElements.get('product-card-swatches')) {
  customElements.define('product-card-swatches', ProductCardSiblings);
}
