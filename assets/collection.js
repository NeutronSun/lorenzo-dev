import { HTMLComponent } from "@theme/HTMLComponent";

class Filters {
  static EVENT_FILTER = 'filters:apply';
  static SELECTOR = 'filters';
  static CLEAR_SELECTOR = '[data-filters-clear]';
  static CLOSE_SELECTOR = '[data-filters-close]';
  static TEMPLATE_VIEW = 'filters';

  constructor() {
    this.onSubmit = this.onSubmit.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  connectedCallback() {
    try {
      document.addEventListener('submit', this.onSubmit);
      document.addEventListener('click', this.onClick);
      document.addEventListener('change', this.onChange);
    } catch (error) {
      console.error(error);
    }
  }

  disconnectedCallback() {
    document.removeEventListener('submit', this.onSubmit);
    document.removeEventListener('click', this.onClick);
    document.removeEventListener('change', this.onChange);
  }

  /**
   * @param {SubmitEvent} event
   */
  onSubmit(event) {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) return;
    if (!form.closest(Filters.SELECTOR)) return;

    event.preventDefault();
    this.publish(this.getSearchParams(form));
    this.close(form);
  }

  /**
   * @param {MouseEvent} event
   */
  async onClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const clear = target.closest(Filters.CLEAR_SELECTOR);
    const close = target.closest(Filters.CLOSE_SELECTOR);

    if (clear instanceof HTMLElement) {
      const form = clear.closest('form');

      if (!(form instanceof HTMLFormElement)) return;

      event.preventDefault();
      form.reset();
      this.publish(new URLSearchParams());
      await this.render(new URLSearchParams(), form.closest(Filters.SELECTOR));
    }

    if (close instanceof HTMLElement) {
      event.preventDefault();
      this.close(close);
    }
  }

  /**
   * @param {Event} event
   */
  async onChange(event) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    const filters = target.closest(Filters.SELECTOR);
    const form = target.form;

    if (!filters || !(form instanceof HTMLFormElement)) return;

    const params = this.getSearchParams(form);

    this.publish(params);
    await this.render(params, filters);
  }

  /**
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
   * @param {Element} element
   */
  close(element) {
    const dialog = element.closest('dialog');

    if (dialog instanceof HTMLDialogElement) {
      dialog.close();
    }
  }

  /**
   * @param {URLSearchParams} params
   */
  publish(params) {
    document.dispatchEvent(
      new CustomEvent(Filters.EVENT_FILTER, {
        bubbles: true,
        composed: true,
        detail: { params },
      })
    );
  }

  /**
   * @param {URLSearchParams} params
   * @param {Element | null} filters
   */
  async render(params, filters) {
    if (!filters) return;

    try {
      const url = this.getTemplateUrl(params);
      const response = await fetch(url.toString());
      const text = await response.text();
      const html = new DOMParser().parseFromString(text, 'text/html');
      const nextFilters = html.querySelector(Filters.SELECTOR);

      if (!nextFilters) return;

      filters.innerHTML = nextFilters.innerHTML;
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @param {URLSearchParams} params
   * @returns {URL}
   */
  getTemplateUrl(params) {
    const url = new URL(window.location.href);

    url.search = params.toString();
    url.searchParams.set('view', Filters.TEMPLATE_VIEW);

    return url;
  }
}

/**
 * @typedef {Object} ProductGridRefs
 */

/**
 * @extends {HTMLComponent<ProductGridRefs>}
 */
class ProductGrid extends HTMLComponent {
  static EVENT_FILTER = Filters.EVENT_FILTER;
  static TEMPLATE_VIEW = 'grid';

  constructor() {
    super();

    this.onFilter = this.onFilter.bind(this);
  }

  connectedCallback() {
    try {
      super.connectedCallback();
      document.addEventListener(ProductGrid.EVENT_FILTER, this.onFilter);
    } catch (error) {
      console.error(error);
    }
  }

  disconnectedCallback() {
    document.removeEventListener(ProductGrid.EVENT_FILTER, this.onFilter);
    super.disconnectedCallback();
  }

  /**
   * @param {CustomEvent<{ params: URLSearchParams }>} event
   */
  async onFilter(event) {
    await this.render(event.detail.params);
  }

  /**
   * @param {URLSearchParams} params
   */
  async render(params) {
    try {
      const url = this.getTemplateUrl(params);
      const response = await fetch(url.toString());
      const text = await response.text();
      const html = new DOMParser().parseFromString(text, 'text/html');
      const nextGrid = html.querySelector('product-grid');

      this.innerHTML = nextGrid?.innerHTML ?? html.body.innerHTML;
      this.updateUrl(params);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @param {URLSearchParams} params
   * @returns {URL}
   */
  getTemplateUrl(params) {
    const url = new URL(window.location.href);

    url.search = params.toString();
    url.searchParams.set('view', ProductGrid.TEMPLATE_VIEW);

    return url;
  }

  /**
   * @param {URLSearchParams} params
   */
  updateUrl(params) {
    const url = new URL(window.location.href);

    url.search = params.toString();
    history.pushState({}, '', url.toString());
  }
}

const filters = new Filters();
filters.connectedCallback();

if (!customElements.get('product-grid')) {
  customElements.define('product-grid', ProductGrid);
}
