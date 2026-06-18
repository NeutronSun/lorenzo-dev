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
  static LOCAL_STATE_INPUT_SELECTOR = '.header-nav-toggle, .header-product-dock-mode';

  /**
   * @type {ResizeObserver | null}
   */
  resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.onResize()) : null;

  /**
   * @type {EventListener}
   */
  boundMobileBarClick = (event) => this.transitionMobileBarState(event);

  connectedCallback() {
    super.connectedCallback();

    this.onResize();
    this.onScroll();
    this.addEventListener('click', this.boundMobileBarClick, { capture: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.removeEventListener('click', this.boundMobileBarClick, { capture: true });
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

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  publishLocalDialog(label) {
    const dialogOpener = label.closest('dialog-opener');

    if (!dialogOpener || typeof dialogOpener.publish !== 'function') return;

    dialogOpener.publish();
  }

}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', StickyHeader);
}
