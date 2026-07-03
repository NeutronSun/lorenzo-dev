/**
 * Sticky header: desktop active indicator, mobile bar, dialog/cart/localization integration.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { DialogComponent } from '@theme/DialogComponent';
import { OnDialogClosedEvent, OnDialogOpenedEvent } from '@theme/events';
import { CSSUtils } from '@theme/utilities';

/**
 * @typedef {Object} StickyHeaderRefs
 * @property {HTMLHeadElement} header
 * @property {HTMLElement} desktopActive
 * @property {HTMLElement} mobileBar
 * @property {HTMLElement} mobileMenuHeader
 * @property {HTMLElement} mobileMenuFooter
 */

/**
 * Sticky header with desktop active indicator and mobile dialog integration.
 * @extends {HTMLComponent<StickyHeaderRefs>}
 */
class StickyHeader extends HTMLComponent {
  static MOBILE_MENU_GAP = 8;
  static DESKTOP_MEDIA_QUERY = '(min-width: 750px)';
  static DESKTOP_ACTIVE_TARGET_CLASS = 'header-desktop-active-target';
  static DESKTOP_MENU_SELECTOR = '.header-menu-item[open] > summary';
  static DESKTOP_BAG_SELECTOR = '.header-desktop-bag[commandfor="cart-drawer"]';
  static DESKTOP_DIALOG_TARGETS = Object.freeze({
    'cart-drawer': StickyHeader.DESKTOP_BAG_SELECTOR,
    localization: '.header-desktop-actions > .header-localization-trigger',
    search: '.header-desktop-actions [commandfor="search"]',
  });
  static LOCAL_STATE_INPUT_SELECTOR = '.header-nav-toggle, .header-product-dock-mode';
  static CART_DRAWER_NAME = 'cart-drawer';
  static LOCALIZATION_DRAWER_NAME = 'localization';
  static LOCALIZATION_FORM_SELECTOR = 'localization-form';

  constructor() {
    super();

    this.resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.onResize()) : null;
    this.desktopStateFrame = 0;
    this.boundMobileBarClick = (event) => this.transitionMobileBarState(event);
    this.boundDialogOpened = (event) => this.onDialogOpened(event);
    this.boundDesktopStateChange = () => this.scheduleDesktopStateUpdate();
    this.boundDesktopMenuToggle = (event) => this.onDesktopMenuToggle(event);
  }

  connectedCallback() {
    super.connectedCallback();

    this.onResize();
    this.onScroll();
    this.addEventListener('click', this.boundMobileBarClick, { capture: true });
    this.addEventListener('toggle', this.boundDesktopMenuToggle, { capture: true });
    document.addEventListener(OnDialogOpenedEvent.TYPE, this.boundDialogOpened);
    document.addEventListener(OnDialogClosedEvent.TYPE, this.boundDesktopStateChange);
    this.scheduleDesktopStateUpdate();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.removeEventListener('click', this.boundMobileBarClick, { capture: true });
    this.removeEventListener('toggle', this.boundDesktopMenuToggle, { capture: true });
    document.removeEventListener(OnDialogOpenedEvent.TYPE, this.boundDialogOpened);
    document.removeEventListener(OnDialogClosedEvent.TYPE, this.boundDesktopStateChange);
    this.desktopStateFrame && cancelAnimationFrame(this.desktopStateFrame);
    this.desktopStateFrame = 0;
    super.disconnectedCallback();
  }

  /** Re-collects refs and re-attaches layout observers after DOM changes. */
  updateRefs() {
    super.updateRefs();
    this.observeLayout();
  }

  /** Toggles the sticking attribute based on scroll position. */
  onScroll() {
    const sticking = !(window.scrollY > 0);
    this.toggleAttribute('sticking', sticking);
  }

  /** Writes header height custom properties from current layout. */
  onResize() {
    CSSUtils.setValue('--header-height', this.offsetHeight);
    CSSUtils.setValue('--header-mobile-menu-gap', StickyHeader.MOBILE_MENU_GAP, this);

    this.setElementHeight('--header-mobile-bar-height', this.refs.mobileBar);
    this.setElementHeight('--header-mobile-menu-header-height', this.refs.mobileMenuHeader);
    this.setElementHeight('--header-mobile-menu-footer-height', this.refs.mobileMenuFooter);
    this.scheduleDesktopStateUpdate();
  }

  /** Observes header elements that affect mobile layout custom properties. */
  observeLayout() {
    this.resizeObserver?.disconnect();
    this.resizeObserver?.observe(this);

    this.observeElement(this.refs.mobileBar);
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
   * @param {Event} event
   */
  onDialogOpened(event) {
    if (!(event instanceof OnDialogOpenedEvent)) return;

    StickyHeader.DESKTOP_DIALOG_TARGETS[event.name] && this.closeMobileMenu();

    event.name === StickyHeader.LOCALIZATION_DRAWER_NAME && this.resetLocalizationSearch();

    this.scheduleDesktopStateUpdate();
  }

  /**
   * @param {Event} event
   */
  onDesktopMenuToggle(event) {
    if (!window.matchMedia(StickyHeader.DESKTOP_MEDIA_QUERY).matches) return;

    const details = event.target;

    if (!(details instanceof HTMLDetailsElement)) return;
    if (!details.matches('.header-menu-item')) return;

    details.open && this.closeDesktopDialogs();
    this.scheduleDesktopStateUpdate();
  }

  /**
   * Defers desktop active indicator updates to the next animation frame.
   */
  scheduleDesktopStateUpdate() {
    if (this.desktopStateFrame) return;

    this.desktopStateFrame = requestAnimationFrame(() => {
      this.desktopStateFrame = 0;

      this.isConnected && this.updateDesktopState();
    });
  }

  /** Positions the desktop active indicator over the current target. */
  updateDesktopState() {
    const currentTarget = this.querySelector(`.${StickyHeader.DESKTOP_ACTIVE_TARGET_CLASS}`);

    currentTarget?.classList.remove(StickyHeader.DESKTOP_ACTIVE_TARGET_CLASS);

    if (!window.matchMedia(StickyHeader.DESKTOP_MEDIA_QUERY).matches) {
      this.removeAttribute('desktop-active-open');
      this.removeAttribute('desktop-active-ready');
      return;
    }

    const state = this.getDesktopState();

    if (!state || !(this.refs.desktopActive instanceof HTMLElement)) return;

    const rootRect = this.getBoundingClientRect();
    const targetRect = state.target.getBoundingClientRect();

    CSSUtils.setValue('--header-desktop-active-x', targetRect.left - rootRect.left - this.clientLeft, this);
    CSSUtils.setValue('--header-desktop-active-y', targetRect.top - rootRect.top - this.clientTop, this);
    CSSUtils.setValue('--header-desktop-active-width', targetRect.width, this);
    CSSUtils.setValue('--header-desktop-active-height', targetRect.height, this);

    state.target.classList.add(StickyHeader.DESKTOP_ACTIVE_TARGET_CLASS);
    this.toggleAttribute('desktop-active-open', state.open);
    this.toggleAttribute('desktop-active-ready', true);
  }

  /**
   * Resolves the current desktop active target from open dialogs or menus.
   * @returns {{ target: HTMLElement, open: boolean } | null}
   */
  getDesktopState() {
    for (const [name, selector] of Object.entries(StickyHeader.DESKTOP_DIALOG_TARGETS)) {
      if (!DialogComponent.getDialogElement(name)?.open) continue;

      const target = this.querySelector(selector);

      if (target instanceof HTMLElement) return { target, open: true };
    }

    const menu = this.querySelector(StickyHeader.DESKTOP_MENU_SELECTOR);

    if (menu instanceof HTMLElement) return { target: menu, open: true };

    const bag = this.querySelector(StickyHeader.DESKTOP_BAG_SELECTOR);

    if (bag instanceof HTMLElement) return { target: bag, open: false };

    return null;
  }

  /** Closes desktop dialogs when a menu item opens. */
  closeDesktopDialogs() {
    for (const name of Object.keys(StickyHeader.DESKTOP_DIALOG_TARGETS)) {
      DialogComponent.requestClose(name);
    }
  }

  /**
   * @param {MouseEvent} event
   */
  transitionMobileBarState(event) {
    if (!(event instanceof MouseEvent)) return;
    if (!('startViewTransition' in document)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const label = this.getLocalStateLabel(event);

    if (!label) return;

    const input = label.control;

    if (!(input instanceof HTMLInputElement)) return;
    if (!input.matches(StickyHeader.LOCAL_STATE_INPUT_SELECTOR)) return;
    if (input.type === 'radio' && input.checked) return;

    event.preventDefault();
    event.stopPropagation();

    document.startViewTransition(() => {
      this.setLocalStateInput(input);
      this.publishLocalDialog(label);
    });
  }

  /**
   * @param {MouseEvent} event
   * @returns {HTMLLabelElement | null}
   */
  getLocalStateLabel(event) {
    const target = event.target;

    if (!(target instanceof Element)) return null;

    const label = target.closest('label');

    if (!(label instanceof HTMLLabelElement)) return null;
    if (!this.contains(label)) return null;

    return label;
  }

  /**
   * @param {HTMLInputElement} input
   */
  setLocalStateInput(input) {
    if (input.type === 'checkbox') {
      input.checked = !input.checked;
    } else {
      input.checked = true;
    }

    if (input.matches('.header-nav-toggle') && input.checked) {
      this.closeCartDrawer();
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Closes the cart drawer from mobile header interactions. */
  closeCartDrawer() {
    DialogComponent.requestClose(StickyHeader.CART_DRAWER_NAME);
  }

  /** Resets the localization form search when opening the drawer. */
  resetLocalizationSearch() {
    const localizationForm = document.querySelector(StickyHeader.LOCALIZATION_FORM_SELECTOR);

    if (!localizationForm || typeof localizationForm.resetSearch !== 'function') return;

    localizationForm.resetSearch();
  }

  /** Closes the mobile navigation menu and open desktop menu items. */
  closeMobileMenu() {
    const input = this.querySelector('.header-nav-toggle');

    if (input instanceof HTMLInputElement && input.checked) {
      input.checked = false;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    for (const details of this.querySelectorAll('.header-menu-item[open]')) {
      if (!(details instanceof HTMLDetailsElement)) continue;

      details.open = false;
    }
  }

  /**
   * @param {HTMLLabelElement} label
   */
  publishLocalDialog(label) {
    const dialogOpener = label.closest('dialog-opener');

    if (!dialogOpener || typeof dialogOpener.publish !== 'function') return;
    if (!this.hasDialogComponent(dialogOpener)) return;

    dialogOpener.publish();
  }

  /**
   * @param {Element} dialogOpener
   * @returns {boolean}
   */
  hasDialogComponent(dialogOpener) {
    const name = dialogOpener.getAttribute('name');

    return !!name && !!DialogComponent.getDialogElement(name);
  }
}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', StickyHeader);
}
