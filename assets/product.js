import { CSSUtils } from '@theme/utilities';

class ProductPage extends HTMLElement {
  static MOBILE_MEDIA = '(max-width: 749px)';
  static MIN_GALLERY_HEIGHT = 420;
  static MOBILE_MIN_GALLERY_HEIGHT = 480;
  static DEFAULT_SPACING = 20;
  static DEFAULT_MOBILE_BAR_HEIGHT = 58;
  static DEFAULT_MOBILE_MENU_GAP = 8;

  get gallery() {
    return this.querySelector('[ref="gallery"]');
  }

  get breadcrumb() {
    return document.querySelector('[data-pdp-breadcrumb]');
  }

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
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
  }

  observe() {
    this.resizeObserver?.observe(this);

    this.gallery instanceof HTMLElement && this.resizeObserver?.observe(this.gallery);
    this.breadcrumb instanceof HTMLElement && this.resizeObserver?.observe(this.breadcrumb);
  }

  onResize() {
    this.updateLayout();
  }

  updateLayout() {
    const gallery = this.gallery;

    if (!(gallery instanceof HTMLElement)) return;

    const spacing = this.getRootNumber('--spacing', ProductPage.DEFAULT_SPACING);
    const mobileBarHeight = this.getRootNumber('--header-mobile-bar-height', ProductPage.DEFAULT_MOBILE_BAR_HEIGHT);
    const mobileMenuGap = this.getRootNumber('--header-mobile-menu-gap', ProductPage.DEFAULT_MOBILE_MENU_GAP);
    const breadcrumbHeight = this.getElementHeight(this.breadcrumb);
    const dockClearance = mobileBarHeight + mobileMenuGap + spacing;
    const top = this.getStickyTop(spacing);
    const reservedBottom = this.isMobile ? dockClearance : spacing;
    const minHeight = this.isMobile ? ProductPage.MOBILE_MIN_GALLERY_HEIGHT : ProductPage.MIN_GALLERY_HEIGHT;
    const height = Math.max(minHeight, window.innerHeight - top - reservedBottom);

    CSSUtils.setValue('--breadcrumb-height', breadcrumbHeight, this);
    CSSUtils.setValue('--dock-clearance', dockClearance, this);
    CSSUtils.setValue('--gallery-height', height, this);
    CSSUtils.setValue('--sticky-top', top, this);
  }

  getRootNumber(property, fallback) {
    const value = Number(CSSUtils.getProperty(property));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  getElementHeight(element) {
    if (!(element instanceof HTMLElement)) return 0;

    return element.offsetHeight;
  }

  getStickyTop(spacing) {
    const breadcrumbHeight = this.getElementHeight(this.breadcrumb);

    if (this.isMobile) return spacing + breadcrumbHeight + spacing;

    return this.getRootNumber('--header-height', 0) + spacing + breadcrumbHeight + spacing;
  }
}

if (!customElements.get('product-page')) {
  customElements.define('product-page', ProductPage);
}
