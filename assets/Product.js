/**
 * PDP layout, variant selection, and section rendering for price and buy button.
 */

import { OnVariantSelectedEvent } from '@theme/events';
import { CSSUtils, TemplateHandler, UrlUtils } from '@theme/utilities';
import { HTMLComponent } from '@theme/HTMLComponent';

/**
 * @typedef {Object} ProductVariantQuantityRule
 * @property {number} min
 * @property {number | null} max
 * @property {number} increment
 */

/**
 * @typedef {Object} ProductVariant
 * @property {number} id
 * @property {string} title
 * @property {string} option1
 * @property {string | null} option2
 * @property {string | null} option3
 * @property {string | null} sku
 * @property {boolean} requires_shipping
 * @property {boolean} taxable
 * @property {Object | null} featured_image
 * @property {boolean} available
 * @property {string} name
 * @property {string} public_title
 * @property {string[]} options
 * @property {number} price
 * @property {number} weight
 * @property {number | null} compare_at_price
 * @property {string | null} inventory_management
 * @property {string | null} barcode
 * @property {boolean} requires_selling_plan
 * @property {unknown[]} selling_plan_allocations
 * @property {ProductVariantQuantityRule} quantity_rule
 */

/**
 * @extends {HTMLComponent}
 */
class ProductPage extends HTMLComponent {
  static REF_NAMES = ['price', 'galleryPrice', 'buyButton'];
  static SECTION_SELECTOR = 'product-page';

  /** @returns {Element | null} */
  get breadcrumb() {
    return document.querySelector('.breadcrumb-wrapper');
  }

  constructor() {
    super();

    this.requestId = 0;
    this.layoutObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.updateLayout()) : null;
    this.onVariantSelected = this.onVariantSelected.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    this.observeLayout();
    this.updateLayout();
    document.addEventListener(OnVariantSelectedEvent.TYPE, this.onVariantSelected);

    const defaultVariantId = this.dataset.defaultVariantId;

    defaultVariantId && this.selectDefaultVariant(defaultVariantId);

    const preselectId = this.dataset.preselectVariantId;
    const url = new URL(window.location.href);

    preselectId && !url.searchParams.get('variant') && this.selectDefaultVariant(preselectId);
  }

  disconnectedCallback() {
    document.removeEventListener(OnVariantSelectedEvent.TYPE, this.onVariantSelected);
    this.layoutObserver?.disconnect();

    super.disconnectedCallback();
  }

  /** @param {string} variantId */
  selectDefaultVariant(variantId) {
    const url = new URL(window.location.href);

    url.searchParams.set('variant', variantId);
    window.history.replaceState({}, '', url.toString());
    this.renderSection(Number(variantId));
  }

  observeLayout() {
    this.layoutObserver?.observe(this);

    this.refs.dossier instanceof HTMLElement && this.layoutObserver?.observe(this.refs.dossier);
    this.refs.gallery instanceof HTMLElement && this.layoutObserver?.observe(this.refs.gallery);
    this.refs.info instanceof HTMLElement && this.layoutObserver?.observe(this.refs.info);
    this.breadcrumb instanceof HTMLElement && this.layoutObserver?.observe(this.breadcrumb);
  }

  onResize() {
    this.updateLayout();
  }

  /** @param {OnVariantSelectedEvent} event */
  onVariantSelected(event) {
    if (!(event instanceof OnVariantSelectedEvent)) return;
    if (event.source !== this.dataset.source) return;

    const url = new URL(window.location.href);

    url.searchParams.set('variant', String(event.variant.id));
    window.history.pushState({}, '', url.toString());
    this.renderSection(event.variant.id);
  }

  /**
   * @param {number} variantId
   * @returns {Promise<boolean>}
   */
  async renderSection(variantId) {
    const sectionId = this.dataset.sectionId;

    if (!sectionId) return false;

    const requestId = this.requestId + 1;

    this.requestId = requestId;

    const url = new URL(window.location.href);

    url.searchParams.set('variant', String(variantId));

    const sectionUrl = UrlUtils.withSectionId(url, sectionId);
    const section =
      (await TemplateHandler.fetch(sectionUrl, ProductPage.SECTION_SELECTOR))
      ?? (await TemplateHandler.fetch(sectionUrl, `#shopify-section-${sectionId} ${ProductPage.SECTION_SELECTOR}`));

    if (!this.isConnected) return false;
    if (requestId !== this.requestId) return false;
    if (!(section instanceof HTMLElement)) return false;

    this.replaceRefs(section, ProductPage.REF_NAMES);
    this.updateLayout();

    return true;
  }

  updateLayout() {
    const gallery = this.refs.gallery;

    if (!(gallery instanceof HTMLElement)) return;

    const spacing = CSSUtils.getNumber(CSSUtils.VAR.SPACING, this);
    const breadcrumb = this.breadcrumb;
    const breadcrumbHeight = breadcrumb instanceof HTMLElement ? breadcrumb.offsetHeight : 0;
    const top = HTMLComponent.isMobile() ? spacing : this.getStickyTop(spacing);
    const availableHeight = CSSUtils.getViewportHeight() - top - spacing;
    const height = Math.max(0, availableHeight);

    CSSUtils.setValue(CSSUtils.VAR.BREADCRUMB_HEIGHT, breadcrumbHeight, this);
    CSSUtils.setValue(CSSUtils.VAR.PDP_CARD_HEIGHT, height, this);
    CSSUtils.setValue(CSSUtils.VAR.STICKY_TOP, top, this);
  }

  /**
   * @param {number} spacing
   * @returns {number}
   */
  getStickyTop(spacing) {
    return CSSUtils.getNumber(CSSUtils.VAR.HEADER_HEIGHT) + spacing + spacing;
  }
}

if (!customElements.get('product-page')) {
  customElements.define('product-page', ProductPage);
}

/**
 * @extends {HTMLComponent}
 */
export class VariantPicker extends HTMLComponent {
  /** @type {('option1' | 'option2' | 'option3')[]} */
  static OPTION_KEYS = ['option1', 'option2', 'option3'];

  /** @returns {(string | null)[]} */
  get selectedCombo() {
    const options = Array.isArray(this.refs.options) ? this.refs.options : [];

    return options.map((fieldset) => fieldset.querySelector('input:checked')?.value || null);
  }

  constructor() {
    super();
    /** @type {ProductVariant[]} */
    this.variants = [];
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.refs.variants instanceof HTMLScriptElement) {
      this.variants = JSON.parse(this.refs.variants.textContent || '[]');
    }

    this.updateOptionStates();
  }

  onChange() {
    this.updateOptionStates();

    const complete = this.isSelectionComplete();

    this.toggleAttribute('complete', complete);

    if (!complete) return;

    const variant = this.getSelectedVariant();

    if (!variant) return;

    document.dispatchEvent(
      new OnVariantSelectedEvent({
        variant,
        source: this.dataset.source || '',
      }),
    );
  }

  /** @returns {boolean} */
  isSelectionComplete() {
    const options = this.refs.options;

    if (!Array.isArray(options) || !options.length) return false;

    return options.every((fieldset) => fieldset.querySelector('input:checked'));
  }

  updateOptionStates() {
    const options = Array.isArray(this.refs.options) ? this.refs.options : [];

    if (!options.length) return;

    const selected = this.selectedCombo;

    for (const fieldset of options) {
      const optionIndex = Number(fieldset.dataset.option) - 1;

      for (const label of fieldset.querySelectorAll('label.tab')) {
        const input = label.querySelector('input[type="radio"]');

        const combo = selected.slice();
        combo[optionIndex] = input.value;

        label.dataset.optionState = this.getOptionState(combo);
      }
    }
  }

  /** @returns {ProductVariant | undefined} */
  getSelectedVariant() {
    if (!this.isSelectionComplete()) return undefined;

    const values = this.selectedCombo;
    const options = this.refs.options;

    return this.variants.find((variant) =>
      options.every((fieldset, index) => {
        const key = VariantPicker.OPTION_KEYS[Number(fieldset.dataset.option) - 1];

        return variant[key] === values[index];
      }),
    );
  }

  /**
   * @param {(string | null)[]} combo
   * @returns {string}
   */
  getOptionState(combo) {
    const matches = this.variants.filter((variant) =>
      VariantPicker.OPTION_KEYS.every(
        (key, index) => !combo[index] || variant[key] === combo[index],
      ),
    );

    if (!matches.length) return 'unavailable';

    return matches.some((variant) => variant.available) ? 'available' : 'sold-out';
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
