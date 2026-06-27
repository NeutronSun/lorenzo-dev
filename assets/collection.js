/**
 * Collection filters and product grid: async partial updates via Liquid views.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { DialogComponent } from '@theme/dialog';
import { OnFiltersApplyEvent } from '@theme/events';
import { TemplateHandler, UrlUtils } from '@theme/utilities';

/** URL builders for collection filter and grid Liquid partials. */
class CollectionPartial {
  static VIEW = Object.freeze({
    FILTERS: 'filters',
  });

  static SELECTOR = Object.freeze({
    FILTERS: 'collection-filters',
    GRID: 'product-grid',
  });

  /**
   * Builds a collection filter partial URL with search params and view name.
   * @param {URLSearchParams} params
   * @param {string} view
   * @returns {URL}
   */
  static buildUrl(params, view) {
    const url = UrlUtils.withSearchParams(window.location.href, params);

    return UrlUtils.withView(url, view);
  }

  /**
   * Builds a collection grid partial URL via section rendering.
   * @param {URLSearchParams} params
   * @param {string} sectionId
   * @returns {URL}
   */
  static buildGridUrl(params, sectionId) {
    const url = UrlUtils.withSearchParams(window.location.href, params);

    return UrlUtils.withSectionId(url, sectionId);
  }
}

/**
 * @typedef {Object} FiltersRefs
 * @property {HTMLInputElement[]} persistent
 */

/**
 * Collection filter form with async partial refresh.
 * @extends {HTMLComponent<FiltersRefs>}
 */
class Filters extends HTMLComponent {
  requestId = 0;

  /**
   * Applies filters on form submit and closes the filter dialog.
   * @param {SubmitEvent} event
   * @param {Element} element
   */
  handleSubmit(event, element) {
    if (!(element instanceof HTMLFormElement)) return;

    event.preventDefault();
    this.publish(this.getSearchParams(element));
    this.closeDialog();
  }

  /**
   * Applies filters on input change and refreshes the filter partial.
   * @param {Event} event
   * @param {Element} element
   */
  async handleChange(event, element) {
    if (!(element instanceof HTMLFormElement)) return;

    const params = this.getSearchParams(element);

    this.publish(params);
    await this.render(params);
  }

  /**
   * Clears the filter form while preserving persistent params.
   * @param {Event} event
   * @param {Element} element
   */
  async clear(event, element) {
    const form = element.closest('form');

    if (!(form instanceof HTMLFormElement)) return;

    event.preventDefault();
    form.reset();

    const params = this.getPersistentSearchParams(form);

    this.publish(params);
    await this.render(params);
  }

  /**
   * Closes the parent filter dialog.
   * @param {Event} event
   * @param {Element} element
   */
  close(event, element) {
    event.preventDefault();
    this.closeDialog();
  }

  /** Closes the nearest dialog-component ancestor. */
  closeDialog() {
    const host = this.closestTag('dialog-component');

    if (!(host instanceof HTMLElement)) return;

    const name = host.getAttribute('name');

    name && DialogComponent.requestClose(name);
  }

  /**
   * Serializes a filter form into URL search params.
   * @param {HTMLFormElement} form
   * @returns {URLSearchParams}
   */
  getSearchParams(form) {
    const params = new URLSearchParams();
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      if (!value) continue;

      params.append(key, value.toString());
    }

    return params;
  }

  /**
   * Reads persistent hidden inputs that survive filter clears.
   * @param {HTMLFormElement} form
   * @returns {URLSearchParams}
   */
  getPersistentSearchParams(form) {
    const params = new URLSearchParams();

    for (const input of this.refs.persistent || []) {
      if (!(input instanceof HTMLInputElement)) continue;
      if (!input.value) continue;

      params.append(input.name, input.value);
    }

    return params;
  }

  /**
   * Dispatches a filters:apply event with the current params.
   * @param {URLSearchParams} params
   */
  publish(params) {
    document.dispatchEvent(
      new OnFiltersApplyEvent({
        params,
      })
    );
  }

  /**
   * Refreshes the filter form markup from a Liquid partial.
   * @param {URLSearchParams} params
   */
  async render(params) {
    const requestId = ++this.requestId;
    const url = CollectionPartial.buildUrl(params, CollectionPartial.VIEW.FILTERS);
    const nextFilters = await TemplateHandler.fetchPartial(url, CollectionPartial.SELECTOR.FILTERS, {
      headers: { Accept: 'text/html' },
    });

    if (!this.isConnected || requestId !== this.requestId) return;
    if (!nextFilters) return;

    const form = this.querySelector('form');

    if (!(form instanceof HTMLFormElement)) return;

    TemplateHandler.replaceInner(form, nextFilters, 'form');
    this.updateRefs();
  }
}

/**
 * @typedef {Object} ProductGridRefs
 */

/**
 * Collection product grid with async partial updates on filter changes.
 * @extends {HTMLComponent<ProductGridRefs>}
 */
class ProductGrid extends HTMLComponent {
  requestId = 0;

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
   * Re-renders the grid when filters are applied.
   * @param {OnFiltersApplyEvent} event
   */
  async onFilter(event) {
    if (!event.params) return;

    await this.render(event.params);
  }

  /** Re-renders the grid when browser history changes. */
  onPopState() {
    this.render(new URLSearchParams(window.location.search));
  }

  /**
   * Refreshes grid markup from a Liquid partial and updates the URL.
   * @param {URLSearchParams} params
   */
  async render(params) {
    const requestId = ++this.requestId;
    const sectionId = this.dataset.sectionId;

    if (!sectionId) return;

    const url = CollectionPartial.buildGridUrl(params, sectionId);
    const nextGrid = await TemplateHandler.fetchPartial(url, CollectionPartial.SELECTOR.GRID, {
      headers: { Accept: 'text/html' },
    });

    if (!this.isConnected || requestId !== this.requestId) return;
    if (!nextGrid) return;

    this.innerHTML = nextGrid.innerHTML;
    this.updateUrl(params);
  }

  /**
   * Pushes filter params into browser history without reloading.
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
