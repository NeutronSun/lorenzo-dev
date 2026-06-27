/**
 * PDP layout: computes sticky card height and clearance from header, breadcrumb, and dock.
 */

import { CSSUtils } from '@theme/utilities';

/**
 * @extends {HTMLElement}
 */
class ProductPage extends HTMLElement {
  static MOBILE_MEDIA = '(max-width: 749px)';
  static DEFAULT_SPACING = 20;
  static DEFAULT_MOBILE_BAR_HEIGHT = 58;
  static DEFAULT_MOBILE_MENU_GAP = 8;
  static DEFAULT_SAFE_AREA = 0;

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

  /** @returns {Element | null} */
  get mobileDock() {
    return document.querySelector('.uyn-header');
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
    this.mobileDock instanceof HTMLElement && this.resizeObserver?.observe(this.mobileDock);
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
    const mobileBarHeight = this.getRootNumber('--header-mobile-bar-height', ProductPage.DEFAULT_MOBILE_BAR_HEIGHT);
    const mobileMenuGap = this.getRootNumber('--header-mobile-menu-gap', ProductPage.DEFAULT_MOBILE_MENU_GAP);
    const safeAreaBottom = this.getNumber('--safe-area-bottom', ProductPage.DEFAULT_SAFE_AREA, this);
    const breadcrumbHeight = this.getElementHeight(this.breadcrumb);
    const breadcrumbArea = this.isMobile ? breadcrumbHeight + spacing : spacing + breadcrumbHeight + spacing;
    const mobileDockHeight = this.getElementHeight(this.mobileDock);
    const dockHeight = mobileDockHeight || mobileBarHeight + mobileMenuGap;
    const dockArea = this.isMobile ? dockHeight + spacing + safeAreaBottom : mobileBarHeight + mobileMenuGap + spacing;
    const top = this.isMobile ? breadcrumbArea : this.getStickyTop(spacing);
    const reservedBottom = this.isMobile ? dockArea : spacing;
    const availableHeight = this.getViewportHeight() - top - reservedBottom;
    const height = Math.max(0, availableHeight);

    CSSUtils.setValue('--breadcrumb-height', breadcrumbHeight, this);
    CSSUtils.setValue('--dock-clearance', dockArea, this);
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

    return this.getRootNumber('--header-height', 0) + spacing + breadcrumbHeight + spacing;
  }
}

if (!customElements.get('product-page')) {
  customElements.define('product-page', ProductPage);
}
