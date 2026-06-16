import { HTMLComponent } from '@theme/HTMLComponent';
import { CSSUtils } from '@theme/utilities';


/**
 * @typedef {Object} StickyHeaderRefs
 * @property {HTMLElement} header - The header element.
 * @property {HTMLElement} mobileBar - The mobile bottom navigation.
 * @property {HTMLElement} mobileDockActions - The mobile floating dock actions.
 * @property {HTMLElement} mobileMenuHeader - The mobile drawer header.
 * @property {HTMLElement} mobileMenuFooter - The mobile drawer footer.
 */

/**
 * Sticky header component.
 * 
 * @extends {HTMLComponent<StickyHeaderRefs>}
 */
class StickyHeader extends HTMLComponent {
  static MOBILE_MENU_GAP = 8;
  static MOBILE_MEDIA_QUERY = '(max-width: 749px)';
  static REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';
  static DOCK_MODE_SEARCH = 'search';
  static DOCK_MODE_FILTER_SEARCH = 'filter-search';

  static getDockModeFromUrl(value) {
    const url = new URL(value, window.location.href);
    const parts = url.pathname.split('/').filter(Boolean);
    const collectionIndex = parts.indexOf('collections');
    const productIndex = parts.indexOf('products');
    const isCollection = collectionIndex > -1 && !!parts[collectionIndex + 1] && productIndex === -1;

    return isCollection ? StickyHeader.DOCK_MODE_FILTER_SEARCH : StickyHeader.DOCK_MODE_SEARCH;
  }

  static isDockMode(mode) {
    return mode === StickyHeader.DOCK_MODE_SEARCH || mode === StickyHeader.DOCK_MODE_FILTER_SEARCH;
  }

  /**
   * @type {ResizeObserver | null}
   */
  resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.onResize()) : null;
  mobileQuery = window.matchMedia(StickyHeader.MOBILE_MEDIA_QUERY);
  reducedMotionQuery = window.matchMedia(StickyHeader.REDUCED_MOTION_MEDIA_QUERY);

  connectedCallback() {
    super.connectedCallback();

    this.onResize();
    this.onScroll();
    this.initializeDockMode();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  updateRefs() {
    super.updateRefs();
    this.observeLayout();
  }

  onScroll() {
    const sticking = !(window.scrollY > 0);
    this.toggleAttribute('sticking', sticking);
  }

  onResize() {
    CSSUtils.setValue('--header-height', this.offsetHeight);
    CSSUtils.setValue('--header-mobile-menu-gap', StickyHeader.MOBILE_MENU_GAP, this);

    this.setElementHeight('--header-mobile-bar-height', this.refs.mobileBar);
    this.setElementHeight('--header-mobile-menu-header-height', this.refs.mobileMenuHeader);
    this.setElementHeight('--header-mobile-menu-footer-height', this.refs.mobileMenuFooter);
  }

  initializeDockMode() {
    const currentMode = StickyHeader.getDockModeFromUrl(window.location.href);

    this.setDockReady(false);
    this.setDockMode(currentMode);
    this.setDockReadyAfterFrame();
  }

  setDockMode(mode) {
    this.dataset.dockMode = mode;
    this.refs.header instanceof HTMLElement && (this.refs.header.dataset.dockMode = mode);
    this.updateFilterButtonAccessibility(mode);
  }

  setDockReady(ready) {
    this.toggleAttribute('data-dock-ready', ready);
    this.refs.header instanceof HTMLElement && this.refs.header.toggleAttribute('data-dock-ready', ready);
  }

  setDockReadyAfterFrame() {
    requestAnimationFrame(() => requestAnimationFrame(() => this.setDockReady(true)));
  }

  getDockMode() {
    const mode = this.dataset.dockMode;
    if (StickyHeader.isDockMode(mode)) return mode;

    return StickyHeader.getDockModeFromUrl(window.location.href);
  }

  updateFilterButtonAccessibility(mode) {
    const filterButton = this.querySelector('.header-mobile-filter-button');
    if (!(filterButton instanceof HTMLElement)) return;

    const hidden = mode !== StickyHeader.DOCK_MODE_FILTER_SEARCH;
    filterButton.toggleAttribute('aria-hidden', hidden);
    hidden && filterButton.setAttribute('tabindex', '-1');
    !hidden && filterButton.removeAttribute('tabindex');
  }

  observeLayout() {
    this.resizeObserver?.disconnect();
    this.resizeObserver?.observe(this);

    this.observeElement(this.refs.mobileBar);
    this.observeElement(this.refs.mobileDockActions);
    this.observeElement(this.refs.mobileMenuHeader);
    this.observeElement(this.refs.mobileMenuFooter);
  }

  observeElement(element) {
    if (!(element instanceof HTMLElement)) return;

    this.resizeObserver?.observe(element);
  }

  setElementHeight(property, element) {
    if (!(element instanceof HTMLElement)) return;

    CSSUtils.setValue(property, element.offsetHeight, this);
  }

}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', StickyHeader);
}
