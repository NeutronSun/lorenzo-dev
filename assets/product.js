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

  get isMobile() {
    return window.matchMedia(ProductPage.MOBILE_MEDIA).matches;
  }

  constructor() {
    super();

    this.resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.updateLayout()) : null;
    this.onResize = this.onResize.bind(this);
    this.onScroll = this.onScroll.bind(this);
  }

  connectedCallback() {
    this.observe();
    this.updateLayout();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
  }

  observe() {
    this.resizeObserver?.observe(this);

    this.gallery instanceof HTMLElement && this.resizeObserver?.observe(this.gallery);
  }

  onResize() {
    this.updateLayout();
  }

  onScroll() {
    this.updateLayout();
  }

  updateLayout() {
    const gallery = this.gallery;

    if (!(gallery instanceof HTMLElement)) return;

    const spacing = this.getRootNumber('--spacing', ProductPage.DEFAULT_SPACING);
    const mobileBarHeight = this.getRootNumber('--header-mobile-bar-height', ProductPage.DEFAULT_MOBILE_BAR_HEIGHT);
    const mobileMenuGap = this.getRootNumber('--header-mobile-menu-gap', ProductPage.DEFAULT_MOBILE_MENU_GAP);
    const dockClearance = mobileBarHeight + mobileMenuGap + spacing;
    const rect = gallery.getBoundingClientRect();
    const top = this.isMobile ? spacing : Math.max(spacing, rect.top);
    const reservedBottom = this.isMobile ? dockClearance : spacing;
    const minHeight = this.isMobile ? ProductPage.MOBILE_MIN_GALLERY_HEIGHT : ProductPage.MIN_GALLERY_HEIGHT;
    const height = Math.max(minHeight, window.innerHeight - top - reservedBottom);

    CSSUtils.setValue('--dock-clearance', dockClearance, this);
    CSSUtils.setValue('--gallery-height', height, this);
  }

  getRootNumber(property, fallback) {
    const value = Number(CSSUtils.getProperty(property));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}

if (!customElements.get('product-page')) {
  customElements.define('product-page', ProductPage);
}
