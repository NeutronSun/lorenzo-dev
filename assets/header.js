import { HTMLComponent } from '@theme/HTMLComponent';
import { CSSUtils } from '@theme/utilities';


/**
 * @typedef {Object} StickyHeaderRefs
 * @property {HTMLHeadElement} header - The header element.
 */

/**
 * Sticky header component.
 * 
 * @extends {HTMLComponent<StickyHeaderRefs>}
 */
class StickyHeader extends HTMLComponent {

  connectedCallback() {
    super.connectedCallback();

    this.onResize();
    this.onScroll();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  onScroll() {
    const sticking = !(window.scrollY > 0);
    this.toggleAttribute('sticking', sticking);
  }

  onResize() {
    CSSUtils.setValue('--header-height', this.offsetHeight);
  }


}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', StickyHeader);
}
