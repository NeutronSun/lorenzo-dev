/**
 * PDP layout: computes sticky card height from header, breadcrumb, and viewport.
 */

import { CSSUtils } from '@theme/utilities';
import { HTMLComponent } from '@theme/HTMLComponent';

/**
 * @extends {HTMLElement}
 */
class ProductPage extends HTMLElement {
  static MOBILE_MEDIA = '(max-width: 749px)';
  static DEFAULT_SPACING = 20;

  /** @returns {Element | null} */
  get dossier() {
    return this.querySelector('[ref="dossier"]');
  }

  /** @returns {Element | null} */
  get gallery() {
    return this.querySelector('[ref="gallery"]');
  }

  /** @returns {Element | null} */
  get info() {
    return this.querySelector('[ref="info"]');
  }

  /** @returns {Element | null} */
  get breadcrumb() {
    return document.querySelector('.breadcrumb-wrapper');
  }

  /** @returns {boolean} */
  get isMobile() {
    return window.matchMedia(ProductPage.MOBILE_MEDIA).matches;
  }

  constructor() {
    super();

    this.resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.updateLayout()) : null;
    this.onResize = this.onResize.bind(this);
  }

  connectedCallback() {
    this.observe();
    this.updateLayout();
    window.addEventListener('resize', this.onResize);
    window.visualViewport?.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
    window.visualViewport?.removeEventListener('resize', this.onResize);
  }

  /** Starts observing layout-affecting elements for size changes. */
  observe() {
    this.resizeObserver?.observe(this);

    this.dossier instanceof HTMLElement && this.resizeObserver?.observe(this.dossier);
    this.gallery instanceof HTMLElement && this.resizeObserver?.observe(this.gallery);
    this.info instanceof HTMLElement && this.resizeObserver?.observe(this.info);
    this.breadcrumb instanceof HTMLElement && this.resizeObserver?.observe(this.breadcrumb);
  }

  /** Recomputes layout when the viewport or observed elements resize. */
  onResize() {
    this.updateLayout();
  }

  /** Writes PDP layout custom properties from current viewport and element sizes. */
  updateLayout() {
    const gallery = this.gallery;

    if (!(gallery instanceof HTMLElement)) return;

    const spacing = this.getRootNumber('--spacing', ProductPage.DEFAULT_SPACING);
    const breadcrumbHeight = this.getElementHeight(this.breadcrumb);
    const top = this.isMobile ? spacing : this.getStickyTop(spacing);
    const availableHeight = this.getViewportHeight() - top - spacing;
    const height = Math.max(0, availableHeight);

    CSSUtils.setValue('--breadcrumb-height', breadcrumbHeight, this);
    CSSUtils.setValue('--pdp-card-height', height, this);
    CSSUtils.setValue('--sticky-top', top, this);
  }

  /**
   * Reads a numeric CSS custom property from the document root.
   * @param {string} property
   * @param {number} fallback
   * @returns {number}
   */
  getRootNumber(property, fallback) {
    return this.getNumber(property, fallback);
  }

  /**
   * Reads a numeric CSS custom property from an element.
   * @param {string} property
   * @param {number} fallback
   * @param {HTMLElement} [element]
   * @returns {number}
   */
  getNumber(property, fallback, element = document.documentElement) {
    const value = Number(CSSUtils.getProperty(property, element));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  /**
   * @param {Element | null} element
   * @returns {number}
   */
  getElementHeight(element) {
    if (!(element instanceof HTMLElement)) return 0;

    return element.offsetHeight;
  }

  /** @returns {number} */
  getViewportHeight() {
    return window.visualViewport?.height || window.innerHeight;
  }

  /**
   * Computes the sticky top offset for the gallery card.
   * @param {number} spacing
   * @returns {number}
   */
  getStickyTop(spacing) {
    const breadcrumbHeight = this.getElementHeight(this.breadcrumb);

    if (this.isMobile) return breadcrumbHeight + spacing;

    return this.getRootNumber('--header-height', 0) + spacing  + spacing;
  }
}

if (!customElements.get('product-page')) {
  customElements.define('product-page', ProductPage);
}



// @ts-ignore
export class VariantPicker extends HTMLComponent {

  get variants() {
    if (!(this.refs.variants instanceof HTMLScriptElement)) return [];

    return JSON.parse(this.refs.variants.textContent || '[]');
  }

  get selectedVariants() {
    return this.refs.options.map(fieldset => fieldset.querySelector('input:checked')).filter(Boolean);
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  onChange() {}

}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}