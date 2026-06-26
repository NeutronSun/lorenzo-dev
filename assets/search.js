/**
 * Predictive search dialog and query normalization for collection/search forms.
 */

import { DialogComponent } from '@theme/dialog';
import { HTMLComponent } from '@theme/HTMLComponent';

/**
 * Normalizes search queries for Shopify prefix matching.
 */
class SearchQuery {
  static TERM_SEPARATOR = /\s+/;

  /**
   * Converts each search term to Shopify prefix syntax.
   * @param {string} query
   * @returns {string}
   */
  static toPrefix(query) {
    const parts = [];

    for (const term of query.split(SearchQuery.TERM_SEPARATOR)) {
      const normalizedTerm = term.trim();

      if (!normalizedTerm) continue;

      parts.push(normalizedTerm.endsWith('*') ? normalizedTerm : `${normalizedTerm}*`);
    }

    return parts.join(' ');
  }
}

/**
 * @typedef {import('@theme/dialog').DialogComponentRefs & {
 *   input: HTMLInputElement,
 *   suggestions: HTMLElement,
 *   products: HTMLElement
 * }} SearchDialogRefs
 */

/**
 * Predictive search dialog with debounced product and suggestion fetch.
 * @extends {DialogComponent}
 */
class SearchDialog extends DialogComponent {
  static DEBOUNCE_DELAY = 250;
  static RESULT_LIMIT = 5;
  static OPTION_SELECTOR = '[data-search-option]';
  static PRODUCTS_SELECTOR = '[data-search-products]';
  static SUGGESTIONS_SELECTOR = '[data-search-suggestions]';

  /** @type {number} */
  searchTimer = 0;
  /** @type {number} */
  requestId = 0;
  /** @type {number} */
  activeIndex = -1;
  /** @type {((event: KeyboardEvent) => void) | null} */
  onSearchShortcut = null;

  get options() {
    return Array.from(this.querySelectorAll(SearchDialog.OPTION_SELECTOR)).filter((option) => {
      return option instanceof HTMLElement && option.offsetParent !== null;
    });
  }

  connectedCallback() {
    super.connectedCallback();

    this.onSearchDialogToggle = (event) => {
      if (!(event instanceof ToggleEvent) || event.newState !== 'open') return;

      this.reset();
      window.requestAnimationFrame(() => this.refs.input?.focus());
    };

    this.refs.dialog?.addEventListener('toggle', this.onSearchDialogToggle);

    this.onSearchShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.key.toLowerCase() !== 'f') return;

      event.preventDefault();

      if (this.refs.dialog?.open) {
        this.refs.input?.focus();
        return;
      }

      DialogComponent.showModal('search');
    };

    document.addEventListener('keydown', this.onSearchShortcut);
  }

  disconnectedCallback() {
    this.searchTimer && window.clearTimeout(this.searchTimer);
    this.onSearchDialogToggle && this.refs.dialog?.removeEventListener('toggle', this.onSearchDialogToggle);
    this.onSearchShortcut && document.removeEventListener('keydown', this.onSearchShortcut);
    this.onSearchDialogToggle = null;
    this.onSearchShortcut = null;
    super.disconnectedCallback();
  }

  /** Clears search state, attributes, and result containers. */
  reset() {
    this.searchTimer && window.clearTimeout(this.searchTimer);
    this.searchTimer = 0;
    this.requestId += 1;
    this.activeIndex = -1;
    this.removeAttribute('searching');
    this.removeAttribute('loading');
    this.removeAttribute('has-results');
    this.removeAttribute('empty');

    if (this.refs.input) {
      this.refs.input.value = '';
      this.refs.input.setAttribute('aria-expanded', 'false');
      this.refs.input.setAttribute('aria-busy', 'false');
      this.refs.input.removeAttribute('aria-activedescendant');
    }

    if (this.refs.suggestions) this.refs.suggestions.innerHTML = '';
    if (this.refs.products) this.refs.products.innerHTML = '';
  }

  /**
   * Debounces predictive search requests while typing.
   * @param {Event} event
   */
  handleInput(event) {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) return;

    this.searchTimer && window.clearTimeout(this.searchTimer);
    this.searchTimer = 0;

    const query = input.value.trim();

    if (!query) {
      this.reset();
      input.focus();
      return;
    }

    this.setAttribute('searching', '');
    this.setAttribute('loading', '');
    this.removeAttribute('has-results');
    this.removeAttribute('empty');
    input.setAttribute('aria-busy', 'true');

    this.searchTimer = window.setTimeout(() => this.search(query), SearchDialog.DEBOUNCE_DELAY);
  }

  /**
   * Normalizes the query to Shopify prefix search before submit.
   * @param {SubmitEvent} event
   */
  handleSubmit(event) {
    if (!this.refs.input) return;

    this.refs.input.value = SearchQuery.toPrefix(this.refs.input.value);
  }

  /**
   * Moves keyboard focus between visible search options.
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;

    const options = this.options;

    if (!options.length) return;

    event.preventDefault();

    const focusedIndex = options.indexOf(document.activeElement);
    const currentIndex = focusedIndex >= 0 ? focusedIndex : this.activeIndex;

    if (event.key === 'ArrowDown') {
      this.activeIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else {
      this.activeIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    }

    const option = options[this.activeIndex];

    if (!(option instanceof HTMLElement)) return;

    option.focus();
    option.id ||= `search-option-${this.requestId}-${this.activeIndex}`;
    this.refs.input?.setAttribute('aria-activedescendant', option.id);
  }

  /**
   * Fetches predictive products and suggestions for a query.
   * @param {string} query
   */
  async search(query) {
    const requestId = ++this.requestId;
    const productsUrl = this.getProductsUrl(query);
    const suggestionsUrl = this.getSuggestionsUrl(query);
    const responses = await Promise.allSettled([fetch(productsUrl), fetch(suggestionsUrl)]);
    const markup = await Promise.all([
      SearchDialog.getMarkup(responses[0], SearchDialog.PRODUCTS_SELECTOR),
      SearchDialog.getMarkup(responses[1], SearchDialog.SUGGESTIONS_SELECTOR),
    ]);

    if (!this.isConnected || requestId !== this.requestId) return;
    if (this.refs.input?.value.trim() !== query) return;

    const [products, suggestions] = markup;

    if (this.refs.products) this.refs.products.innerHTML = products.html;
    if (this.refs.suggestions) this.refs.suggestions.innerHTML = suggestions.html;

    const hasResults = products.count + suggestions.count > 0;

    this.toggleAttribute('has-results', hasResults);
    this.toggleAttribute('empty', !hasResults);
    this.removeAttribute('loading');
    this.activeIndex = -1;
    this.refs.input?.setAttribute('aria-expanded', hasResults ? 'true' : 'false');
    this.refs.input?.setAttribute('aria-busy', 'false');
    this.refs.input?.removeAttribute('aria-activedescendant');
  }

  /**
   * Builds the predictive product search URL.
   * @param {string} query
   * @returns {URL}
   */
  getProductsUrl(query) {
    const url = new URL(window.Theme.routes.search_url, window.location.origin);

    url.searchParams.set('view', 'predictive');
    url.searchParams.set('type', 'product');
    url.searchParams.set('q', SearchQuery.toPrefix(query));
    url.searchParams.set('options[prefix]', 'last');

    return url;
  }

  /**
   * Builds the predictive suggestions section URL.
   * @param {string} query
   * @returns {URL}
   */
  getSuggestionsUrl(query) {
    const url = new URL(window.Theme.routes.predictive_search_url, window.location.origin);

    url.searchParams.set('q', query);
    url.searchParams.set('resources[type]', 'collection');
    url.searchParams.set('resources[limit]', SearchDialog.RESULT_LIMIT.toString());
    url.searchParams.set('section_id', this.getAttribute('section-id') ?? '');

    return url;
  }

  /**
   * Extracts result markup and count from a settled fetch response.
   * @param {PromiseSettledResult<Response>} responseResult
   * @param {string} selector
   * @returns {Promise<{ html: string, count: number }>}
   */
  static async getMarkup(responseResult, selector) {
    if (responseResult.status !== 'fulfilled') return { html: '', count: 0 };
    if (!responseResult.value.ok) return { html: '', count: 0 };

    const bodyResult = await Promise.allSettled([responseResult.value.text()]);

    if (bodyResult[0].status !== 'fulfilled') return { html: '', count: 0 };

    const parsed = new DOMParser().parseFromString(bodyResult[0].value, 'text/html');
    const content = parsed.querySelector(selector);

    if (!(content instanceof HTMLElement)) return { html: '', count: 0 };

    return {
      html: content.innerHTML,
      count: Number(content.dataset.count) || 0,
    };
  }
}

if (!customElements.get('search-dialog')) {
  customElements.define('search-dialog', SearchDialog);
}

/**
 * @typedef {Object} SearchFormRefs
 * @property {HTMLInputElement} query
 */

/**
 * Collection/search form that normalizes queries to prefix search.
 * @extends {HTMLComponent<SearchFormRefs>}
 */
class SearchForm extends HTMLComponent {
  /**
   * Normalizes the query input before native form submit.
   * @param {SubmitEvent} event
   */
  handleSubmit(event) {
    if (!this.refs.query) return;

    this.refs.query.value = SearchQuery.toPrefix(this.refs.query.value);
  }
}

if (!customElements.get('search-form')) {
  customElements.define('search-form', SearchForm);
}
