import { HTMLComponent } from '@theme/HTMLComponent';
import { OnDialogClosedEvent, OnDialogOpenEvent, OnDialogOpenedEvent } from '@theme/events';
import { CSSUtils } from '@theme/utilities';


/**
 * @typedef {Object} StickyHeaderRefs
 * @property {HTMLHeadElement} header - The header element.
 * @property {HTMLElement} desktopActive - The desktop active indicator.
 * @property {HTMLElement} mobileBar - The mobile bottom navigation.
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
  static DESKTOP_MEDIA_QUERY = '(min-width: 750px)';
  static DESKTOP_ACTIVE_TARGET_CLASS = 'header-desktop-active-target';
  static DESKTOP_MENU_SELECTOR = '.header-menu-item[open] > summary';
  static DESKTOP_BAG_SELECTOR = '.header-desktop-bag';
  static DESKTOP_DIALOG_TARGETS = Object.freeze({
    'cart-drawer': StickyHeader.DESKTOP_BAG_SELECTOR,
    localization: '.header-desktop-actions > .header-localization-trigger',
    search: '.header-desktop-actions dialog-opener[name="search"] .header-desktop-action',
  });
  static LOCAL_STATE_INPUT_SELECTOR = '.header-nav-toggle, .header-product-dock-mode';
  static CART_DRAWER_SELECTOR = 'dialog-component[name="cart-drawer"] dialog';
  static DIALOG_COMPONENT_SELECTOR = 'dialog-component, search-dialog';
  static LOCALIZATION_DRAWER_NAME = 'localization';
  static LOCALIZATION_FORM_SELECTOR = 'localization-form';

  /**
   * @type {ResizeObserver | null}
   */
  resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.onResize()) : null;

  /**
   * @type {EventListener}
   */
  boundMobileBarClick = (event) => this.transitionMobileBarState(event);

  /**
   * @type {EventListener}
   */
  boundDesktopDialogOpen = (event) => this.onDesktopDialogOpen(event);

  /**
   * @type {EventListener}
   */
  boundDesktopStateChange = () => this.scheduleDesktopStateUpdate();

  /**
   * @type {EventListener}
   */
  boundDesktopMenuToggle = (event) => this.onDesktopMenuToggle(event);

  desktopStateFrame = 0;

  connectedCallback() {
    super.connectedCallback();

    this.onResize();
    this.onScroll();
    this.addEventListener('click', this.boundMobileBarClick, { capture: true });
    this.addEventListener('toggle', this.boundDesktopMenuToggle, { capture: true });
    document.addEventListener(OnDialogOpenEvent.TYPE, this.boundDesktopDialogOpen);
    document.addEventListener(OnDialogOpenedEvent.TYPE, this.boundDesktopStateChange);
    document.addEventListener(OnDialogClosedEvent.TYPE, this.boundDesktopStateChange);
    this.scheduleDesktopStateUpdate();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.removeEventListener('click', this.boundMobileBarClick, { capture: true });
    this.removeEventListener('toggle', this.boundDesktopMenuToggle, { capture: true });
    document.removeEventListener(OnDialogOpenEvent.TYPE, this.boundDesktopDialogOpen);
    document.removeEventListener(OnDialogOpenedEvent.TYPE, this.boundDesktopStateChange);
    document.removeEventListener(OnDialogClosedEvent.TYPE, this.boundDesktopStateChange);
    this.desktopStateFrame && cancelAnimationFrame(this.desktopStateFrame);
    this.desktopStateFrame = 0;
    super.disconnectedCallback();
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
    this.scheduleDesktopStateUpdate();
  }

  observeLayout() {
    this.resizeObserver?.disconnect();
    this.resizeObserver?.observe(this);

    this.observeElement(this.refs.mobileBar);
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

  onDesktopDialogOpen(event) {
    if (!window.matchMedia(StickyHeader.DESKTOP_MEDIA_QUERY).matches) return;
    if (!(event instanceof OnDialogOpenEvent)) return;
    if (!StickyHeader.DESKTOP_DIALOG_TARGETS[event.name]) return;

    this.closeMobileMenu();
    this.scheduleDesktopStateUpdate();
  }

  onDesktopMenuToggle(event) {
    if (!window.matchMedia(StickyHeader.DESKTOP_MEDIA_QUERY).matches) return;

    const details = event.target;

    if (!(details instanceof HTMLDetailsElement)) return;
    if (!details.matches('.header-menu-item')) return;

    details.open && this.closeDesktopDialogs();
    this.scheduleDesktopStateUpdate();
  }

  scheduleDesktopStateUpdate() {
    if (this.desktopStateFrame) return;

    this.desktopStateFrame = requestAnimationFrame(() => {
      this.desktopStateFrame = 0;

      this.isConnected && this.updateDesktopState();
    });
  }

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

  getDesktopState() {
    for (const dialog of document.querySelectorAll(StickyHeader.DIALOG_COMPONENT_SELECTOR)) {
      const selector = StickyHeader.DESKTOP_DIALOG_TARGETS[dialog.getAttribute('name')];

      if (!selector || !dialog.querySelector('dialog[open]')) continue;

      const target = this.querySelector(selector);

      if (target instanceof HTMLElement) return { target, open: true };
    }

    const menu = this.querySelector(StickyHeader.DESKTOP_MENU_SELECTOR);

    if (menu instanceof HTMLElement) return { target: menu, open: true };

    const bag = this.querySelector(StickyHeader.DESKTOP_BAG_SELECTOR);

    if (bag instanceof HTMLElement) return { target: bag, open: false };

    return null;
  }

  closeDesktopDialogs() {
    for (const dialog of document.querySelectorAll(StickyHeader.DIALOG_COMPONENT_SELECTOR)) {
      if (!StickyHeader.DESKTOP_DIALOG_TARGETS[dialog.getAttribute('name')]) continue;
      if (typeof dialog.close !== 'function') continue;

      dialog.close();
    }
  }

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

  getLocalStateLabel(event) {
    const target = event.target;

    if (!(target instanceof Element)) return null;

    const label = target.closest('label');

    if (!(label instanceof HTMLLabelElement)) return null;
    if (!this.contains(label)) return null;

    return label;
  }

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

  closeCartDrawer() {
    const dialog = document.querySelector(StickyHeader.CART_DRAWER_SELECTOR);

    if (!(dialog instanceof HTMLDialogElement)) return;

    dialog.open && dialog.close();
  }

  openLocalization() {
    const open = () => {
      this.closeMobileMenu();
      this.resetLocalizationSearch();
      document.dispatchEvent(
        new OnDialogOpenEvent({
          name: StickyHeader.LOCALIZATION_DRAWER_NAME,
        })
      );
    };

    if (!('startViewTransition' in document) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      open();
      return;
    }

    document.startViewTransition(open);
  }

  resetLocalizationSearch() {
    const localizationForm = document.querySelector(StickyHeader.LOCALIZATION_FORM_SELECTOR);

    if (!localizationForm || typeof localizationForm.resetSearch !== 'function') return;

    localizationForm.resetSearch();
  }

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

  publishLocalDialog(label) {
    const dialogOpener = label.closest('dialog-opener');

    if (!dialogOpener || typeof dialogOpener.publish !== 'function') return;
    if (!this.hasDialogComponent(dialogOpener)) return;

    dialogOpener.publish();
  }

  hasDialogComponent(dialogOpener) {
    const name = dialogOpener.getAttribute('name');

    if (!name) return false;

    for (const dialog of document.querySelectorAll(StickyHeader.DIALOG_COMPONENT_SELECTOR)) {
      if (dialog.getAttribute('name') === name) return true;
    }

    return false;
  }

}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', StickyHeader);
}
