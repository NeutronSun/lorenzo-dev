import { HTMLComponent } from '@theme/HTMLComponent';
import { OnFiltersApplyEvent } from '@theme/events';
import { TemplateHandler, UrlUtils } from '@theme/utilities';
import { CollectionPartial } from '@theme/CollectionPartial';

/**
 * @typedef {Record<string, Element | Element[]>} ProductGridRefs
 */

/**
 * Collection product grid with async partial updates on filter changes.
 * @extends {HTMLComponent<ProductGridRefs>}
 */
class ProductGrid extends HTMLComponent {
  constructor() {
    super();

    this.onFilter = this.onFilter.bind(this);
    this.onPopState = this.onPopState.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(OnFiltersApplyEvent.TYPE, this.onFilter);
    window.addEventListener('popstate', this.onPopState);
  }

  disconnectedCallback() {
    document.removeEventListener(OnFiltersApplyEvent.TYPE, this.onFilter);
    window.removeEventListener('popstate', this.onPopState);
    super.disconnectedCallback();
  }

  /**
   * @param {OnFiltersApplyEvent} event
   */
  async onFilter(event) {
    if (!event.params) return;

    const rendered = await this.render(event.params);

    rendered && this.updateUrl(event.params);
  }

  onPopState() {
    this.render(new URLSearchParams(window.location.search));
  }

  /**
   * @param {URLSearchParams} params
   * @returns {Promise<boolean>}
   */
  async render(params) {
    const sectionId = this.dataset.sectionId;

    if (!sectionId) return false;

    const url = CollectionPartial.buildGridUrl(params, sectionId);
    const nextGrid = await TemplateHandler.fetch(url, CollectionPartial.SELECTOR.GRID);

    if (!(nextGrid instanceof HTMLElement)) return false;

    this.innerHTML = nextGrid.innerHTML;

    return true;
  }

  /**
   * @param {URLSearchParams} params
   */
  updateUrl(params) {
    const url = UrlUtils.withSearchParams(window.location.href, params);

    history.pushState({}, '', url.toString());
  }
}

if (!customElements.get('collection-filters')) {
  customElements.define('collection-filters', Filters);
}

if (!customElements.get('product-grid')) {
  customElements.define('product-grid', ProductGrid);
}
