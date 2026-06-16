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
  static MOBILE_NAV_MENU_VALUE = 'menu';
  static DOCK_MODE_SEARCH = 'search';
  static DOCK_MODE_FILTER_SEARCH = 'filter-search';
  static DOCK_MORPH_ENTER_MS = 520;
  static DOCK_MORPH_EXIT_MS = 600;
  static DOCK_MORPH_FALLBACK_MS = 700;
  static MOBILE_BAR_HOME = 'home';
  static MOBILE_BAR_ACCOUNT = 'account';
  static MOBILE_BAR_CART = 'cart';
  static MOBILE_BAR_MENU = 'menu';

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
   * @param {string} value
   * @returns {'home' | 'account' | 'cart' | 'menu'}
   */
  static getMobileBarTargetFromUrl(value) {
    const url = new URL(value, window.location.href);
    const path = url.pathname;

    if (path === '/' || path === '') return StickyHeader.MOBILE_BAR_HOME;
    if (path.startsWith('/cart')) return StickyHeader.MOBILE_BAR_CART;
    if (path.startsWith('/account') || path.includes('/customers/')) return StickyHeader.MOBILE_BAR_ACCOUNT;

    return StickyHeader.MOBILE_BAR_MENU;
  }

  /**
   * @param {string} value
   * @returns {boolean}
   */
  static isInternalNavigationLink(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * @type {ResizeObserver | null}
   */
  resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.onResize()) : null;
  mobileQuery = window.matchMedia(StickyHeader.MOBILE_MEDIA_QUERY);
  reducedMotionQuery = window.matchMedia(StickyHeader.REDUCED_MOTION_MEDIA_QUERY);

  /**
   * @type {HTMLInputElement | null}
   */
  menuToggle = null;

  /**
   * @type {HTMLInputElement | null}
   */
  savedNavRadio = null;

  /**
   * @type {number | null}
   */
  dockNavigationTimer = null;

  /**
   * @type {number | null}
   */
  dockNavigationFallbackTimer = null;

  /**
   * @type {((event: TransitionEvent) => void) | null}
   */
  dockTransitionEndHandler = null;

  /**
   * @param {MouseEvent} event
   */
  onDocumentClick = (event) => {
    if (this.hasAttribute('data-dock-navigating')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (!this.mobileQuery.matches) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    if (!StickyHeader.isInternalNavigationLink(link.href)) return;

    const url = new URL(link.href, window.location.href);
    const barTarget = StickyHeader.getMobileBarTargetFromUrl(url.href);
    const targetDockMode = StickyHeader.getDockModeFromUrl(url.href);
    const currentDockMode = this.getDockMode();

    this.checkMobileBarRadio(barTarget);
    this.closeMobileMenu();

    const enteringCollection = currentDockMode === StickyHeader.DOCK_MODE_SEARCH
      && targetDockMode === StickyHeader.DOCK_MODE_FILTER_SEARCH;
    const leavingCollection = currentDockMode === StickyHeader.DOCK_MODE_FILTER_SEARCH
      && targetDockMode === StickyHeader.DOCK_MODE_SEARCH;
    const dockModeChanges = targetDockMode !== currentDockMode;

    if ((enteringCollection || leavingCollection) && !this.reducedMotionQuery.matches) {
      if (link.closest('.header-mobile-dock-actions')) return;

      event.preventDefault();
      event.stopPropagation();
      this.navigateWithDockMorph(url.href, targetDockMode);
      return;
    }

    dockModeChanges && this.setDockMode(targetDockMode);
  };

  /**
   * @param {'home' | 'account' | 'cart' | 'menu'} target
   */
  checkMobileBarRadio(target) {
    const radio = this.querySelector(`.header-mobile-nav-radio[value="${target}"]`);
    radio instanceof HTMLInputElement && (radio.checked = true);
  }

  closeMobileMenu() {
    const toggle = this.querySelector('.header-nav-toggle');
    toggle instanceof HTMLInputElement && (toggle.checked = false);
  }

  onMenuToggleChange = () => {
    const menuRadio = this.getMenuNavRadio();
    if (!(this.menuToggle instanceof HTMLInputElement) || !(menuRadio instanceof HTMLInputElement)) return;

    if (this.menuToggle.checked) {
      const checked = this.querySelector('.header-mobile-nav-radio:checked');
      this.savedNavRadio = checked instanceof HTMLInputElement ? checked : null;
      menuRadio.checked = true;
      return;
    }

    this.savedNavRadio instanceof HTMLInputElement && (this.savedNavRadio.checked = true);
    this.savedNavRadio = null;
  };

  /**
   * @param {PageTransitionEvent} event
   */
  onPageShow = (event) => {
    if (!event.persisted) return;

    this.clearDockNavigation();
    const targetMode = StickyHeader.getDockModeFromUrl(window.location.href);
    this.removeAttribute('data-dock-animate');
    this.dataset.dockMode = targetMode;
    this.updateFilterButtonAccessibility(targetMode);
  };

  connectedCallback() {
    super.connectedCallback();

    this.menuToggle = this.querySelector('.header-nav-toggle');
    this.menuToggle?.addEventListener('change', this.onMenuToggleChange);

    this.onResize();
    this.onScroll();
    this.updateFilterButtonAccessibility(this.getDockMode());

    document.addEventListener('click', this.onDocumentClick, true);
    window.addEventListener('pageshow', this.onPageShow);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.clearDockNavigation();
    this.menuToggle?.removeEventListener('change', this.onMenuToggleChange);
    document.removeEventListener('click', this.onDocumentClick, true);
    window.removeEventListener('pageshow', this.onPageShow);
    this.menuToggle = null;
    this.savedNavRadio = null;
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

  /**
   * @param {string} mode
   */
  setDockMode(mode) {
    if (!StickyHeader.isDockMode(mode) || this.dataset.dockMode === mode) return;

    this.toggleAttribute('data-dock-animate', true);
    requestAnimationFrame(() => {
      this.dataset.dockMode = mode;
      this.updateFilterButtonAccessibility(mode);
    });
  }

  getDockMode() {
    const mode = this.dataset.dockMode;
    if (StickyHeader.isDockMode(mode)) return mode;

    return StickyHeader.DOCK_MODE_SEARCH;
  }

  getMenuNavRadio() {
    return this.querySelector(`.header-mobile-nav-radio[value="${StickyHeader.MOBILE_NAV_MENU_VALUE}"]`);
  }

  /**
   * @param {string} mode
   */
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

  /**
   * @param {HTMLElement | undefined} element
   */
  observeElement(element) {
    if (!(element instanceof HTMLElement)) return;

    this.resizeObserver?.observe(element);
  }

  /**
   * @param {string} property
   * @param {HTMLElement | undefined} element
   */
  setElementHeight(property, element) {
    if (!(element instanceof HTMLElement)) return;

    CSSUtils.setValue(property, element.offsetHeight, this);
  }

  /**
   * @param {string} href
   * @param {'search' | 'filter-search'} mode
   */
  navigateWithDockMorph(href, mode) {
    this.clearDockNavigation();
    this.setDockNavigating(true);
    this.setDockMode(mode);

    const dock = this.refs.mobileDockActions;
    const entering = mode === StickyHeader.DOCK_MODE_FILTER_SEARCH;
    const delayMs = entering
      ? StickyHeader.DOCK_MORPH_ENTER_MS
      : StickyHeader.DOCK_MORPH_EXIT_MS;

    let navigated = false;

    const finish = () => {
      if (navigated) return;
      navigated = true;
      this.clearDockNavigation();
      window.location.assign(href);
    };

    if (!(dock instanceof HTMLElement)) {
      this.dockNavigationTimer = window.setTimeout(finish, delayMs);
      return;
    }

    this.dockTransitionEndHandler = (event) => {
      if (event.target !== dock || event.propertyName !== 'width') return;
      finish();
    };

    dock.addEventListener('transitionend', this.dockTransitionEndHandler);
    this.dockNavigationTimer = window.setTimeout(finish, delayMs);
    this.dockNavigationFallbackTimer = window.setTimeout(finish, StickyHeader.DOCK_MORPH_FALLBACK_MS);
  }

  /**
   * @param {boolean} active
   */
  setDockNavigating(active) {
    this.toggleAttribute('data-dock-navigating', active);
  }

  clearDockNavigation() {
    this.clearDockNavigationTimer();
    this.dockNavigationFallbackTimer && window.clearTimeout(this.dockNavigationFallbackTimer);
    this.dockNavigationFallbackTimer = null;

    const dock = this.refs.mobileDockActions;
    this.dockTransitionEndHandler
      && dock instanceof HTMLElement
      && dock.removeEventListener('transitionend', this.dockTransitionEndHandler);
    this.dockTransitionEndHandler = null;
    this.setDockNavigating(false);
  }

  clearDockNavigationTimer() {
    this.dockNavigationTimer && window.clearTimeout(this.dockNavigationTimer);
    this.dockNavigationTimer = null;
  }

}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', StickyHeader);
}
