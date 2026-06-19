import { CSSUtils } from '@theme/utilities';

class ProductPage extends HTMLElement {
  static MOBILE_MEDIA = '(max-width: 749px)';
  static MIN_GALLERY_HEIGHT = 420;
  static DEFAULT_SPACING = 20;
  static DEFAULT_MOBILE_BAR_HEIGHT = 58;
  static DEFAULT_MOBILE_MENU_GAP = 8;
  static DEFAULT_SAFE_AREA = 0;

  get gallery() {
    return this.querySelector('[ref="gallery"]');
  }

  get breadcrumb() {
    return document.querySelector('.breadcrumb-wrapper');
  }

  get mobileDock() {
    return document.querySelector('.uyn-header');
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
    window.visualViewport?.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
    window.visualViewport?.removeEventListener('resize', this.onResize);
  }

  observe() {
    this.resizeObserver?.observe(this);

    this.gallery instanceof HTMLElement && this.resizeObserver?.observe(this.gallery);
    this.breadcrumb instanceof HTMLElement && this.resizeObserver?.observe(this.breadcrumb);
    this.mobileDock instanceof HTMLElement && this.resizeObserver?.observe(this.mobileDock);
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
    const safeAreaBottom = this.getNumber('--safe-area-bottom', ProductPage.DEFAULT_SAFE_AREA, this);
    const breadcrumbHeight = this.getElementHeight(this.breadcrumb);
    const breadcrumbArea = this.isMobile ? breadcrumbHeight + spacing : spacing + breadcrumbHeight + spacing;
    const mobileDockHeight = this.getElementHeight(this.mobileDock);
    const dockHeight = mobileDockHeight || mobileBarHeight + mobileMenuGap;
    const dockArea = this.isMobile ? dockHeight + spacing + safeAreaBottom : mobileBarHeight + mobileMenuGap + spacing;
    const top = this.isMobile ? breadcrumbArea : this.getStickyTop(spacing);
    const reservedBottom = this.isMobile ? dockArea : spacing;
    const availableHeight = this.getViewportHeight() - top - reservedBottom;
    const height = this.isMobile ? Math.max(0, availableHeight) : Math.max(ProductPage.MIN_GALLERY_HEIGHT, availableHeight);

    CSSUtils.setValue('--breadcrumb-height', breadcrumbHeight, this);
    CSSUtils.setValue('--dock-clearance', dockArea, this);
    CSSUtils.setValue('--gallery-height', height, this);
    CSSUtils.setValue('--sticky-top', top, this);
  }

  getRootNumber(property, fallback) {
    return this.getNumber(property, fallback);
  }

  getNumber(property, fallback, element = document.documentElement) {
    const value = Number(CSSUtils.getProperty(property, element));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  getElementHeight(element) {
    if (!(element instanceof HTMLElement)) return 0;

    return element.offsetHeight;
  }

  getViewportHeight() {
    return window.visualViewport?.height || window.innerHeight;
  }

  getStickyTop(spacing) {
    const breadcrumbHeight = this.getElementHeight(this.breadcrumb);

    if (this.isMobile) return breadcrumbHeight + spacing;

    return this.getRootNumber('--header-height', 0) + spacing + breadcrumbHeight + spacing;
  }
}

if (!customElements.get('product-page')) {
  customElements.define('product-page', ProductPage);
}
