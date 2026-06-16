import { HTMLComponent } from '@theme/HTMLComponent';
import { CSSUtils } from '@theme/utilities';


/**
 * @typedef {Object} StickyHeaderRefs
 * @property {HTMLHeadElement} header - The header element.
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

  /**
   * @type {ResizeObserver | null}
   */
  resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.onResize()) : null;

  connectedCallback() {
    super.connectedCallback();

    this.onResize();
    this.onScroll();
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

}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', StickyHeader);
}
